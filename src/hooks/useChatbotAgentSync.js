import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook React para sincronización Chatbots-Agentes CRM
 * 
 * Este hook maneja la sincronización bidireccional entre los chatbots externos
 * y los agentes del CRM:
 * 
 * - Recibe mensajes de chatbots en tiempo real (Supabase Realtime)
 * - Muestra conversaciones pendientes por agente
 * - Permite enviar respuestas que se sincronizan de vuelta al chatbot
 * - Actualiza el estado del agente basado en actividad de chatbots
 * 
 * @param {number} agenteId - ID del agente actual
 * @param {object} options - Opciones de configuración
 * @returns {object} Estado y funciones para manejar conversaciones de chatbot
 */

const CHATBOT_EVENTS = {
  NEW_MESSAGE: 'chatbot:new_message',
  CONVERSATION_ASSIGNED: 'chatbot:conversation_assigned',
  CONVERSATION_CLOSED: 'chatbot:conversation_closed',
  AGENT_RESPONSE_SENT: 'chatbot:agent_response_sent'
};

export function useChatbotAgentSync(agenteId, options = {}) {
  const { 
    pollInterval = 5000,  // Polling como fallback
    autoAssign = true,     // Auto-asignar conversaciones entrantes
    enableRealtime = true  // Usar Supabase Realtime
  } = options;

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    waiting: 0,
    unread: 0
  });
  
  const realtimeChannelRef = useRef(null);
  const pollIntervalRef = useRef(null);

  /**
   * Obtener conversaciones pendientes del agente
   */
  const fetchConversations = useCallback(async () => {
    if (!agenteId) return;
    
    try {
      setIsLoading(true);
      
      // Llamar a la función RPC para obtener conversaciones pendientes
      const { data, error: rpcError } = await supabase
        .rpc('get_agent_pending_conversations', {
          p_agente_id: agenteId
        });

      if (rpcError) throw rpcError;

      const conversationData = data || [];
      
      setConversations(conversationData);
      
      // Calcular estadísticas
      setStats({
        total: conversationData.length,
        active: conversationData.filter(c => c.mensajes_pendientes > 0).length,
        waiting: conversationData.filter(c => c.mensajes_pendientes === 0).length,
        unread: conversationData.reduce((acc, c) => acc + (c.mensajes_pendientes || 0), 0)
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [agenteId]);

  /**
   * Obtener mensajes de una conversación específica
   */
  const fetchMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('chatbot_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setMessages(data || []);
      
      // Marcar mensajes como procesados (leídos)
      const unreadMessageIds = data
        ?.filter(m => m.remitente === 'user' && !m.procesado)
        ?.map(m => m.id);
        
      if (unreadMessageIds?.length > 0) {
        await supabase
          .from('chatbot_messages')
          .update({ procesado: true })
          .in('id', unreadMessageIds);
      }
      
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Enviar respuesta del agente al chatbot
   */
  const sendResponse = useCallback(async (conversationId, content, options = {}) => {
    const { type = 'text', metadata = {} } = options;
    
    try {
      setIsLoading(true);
      
      // Llamar a la edge function para enviar respuesta
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatbot-send-response`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            content,
            type,
            metadata
          })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error enviando respuesta');
      }
      
      const result = await response.json();
      
      // Actualizar mensajes localmente
      if (result.success) {
        await fetchMessages(conversationId);
        
        // Evento para notificar a otros componentes
        window.dispatchEvent(new CustomEvent(CHATBOT_EVENTS.AGENT_RESPONSE_SENT, {
          detail: { conversationId, content }
        }));
      }
      
      return result;
    } catch (err) {
      console.error('Error sending response:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchMessages]);

  /**
   * Cerrar una conversación
   */
  const closeConversation = useCallback(async (conversationId, reason = 'completed') => {
    try {
      const { error } = await supabase
        .from('chatbot_conversations')
        .update({ 
          estado: 'closed',
          closed_at: new Date().toISOString(),
          closed_reason: reason
        })
        .eq('id', conversationId);

      if (error) throw error;
      
      // Actualizar lista local
      setConversations(prev => prev.filter(c => c.conversation_id !== conversationId));
      
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
      
      // Evento para notificar
      window.dispatchEvent(new CustomEvent(CHATBOT_EVENTS.CONVERSATION_CLOSED, {
        detail: { conversationId, reason }
      }));
      
    } catch (err) {
      console.error('Error closing conversation:', err);
      setError(err.message);
    }
  }, [activeConversation]);

  /**
   * Seleccionar conversación activa
   */
  const selectConversation = useCallback(async (conversation) => {
    setActiveConversation(conversation);
    if (conversation?.conversation_id) {
      await fetchMessages(conversation.conversation_id);
    }
  }, [fetchMessages]);

  /**
   * Configurar Supabase Realtime para mensajes en tiempo real
   */
  useEffect(() => {
    if (!agenteId || !enableRealtime) return;
    
    // Canal para nuevos mensajes asignados a este agente
    realtimeChannelRef.current = supabase
      .channel(`agent-chatbot:${agenteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chatbot_messages',
          filter: `conversation_id=in.(SELECT id FROM chatbot_conversations WHERE agente_id=${agenteId})`
        },
        async (payload) => {
          const newMessage = payload.new;
          
          // Si es mensaje del usuario, actualizar UI
          if (newMessage.remitente === 'user') {
            // Si es la conversación activa, agregar al chat
            if (activeConversation?.conversation_id === newMessage.conversation_id) {
              setMessages(prev => [...prev, newMessage]);
            }
            
            // Actualizar lista de conversaciones
            await fetchConversations();
            
            // Notificar al office virtual (animación, sonido, etc.)
            window.dispatchEvent(new CustomEvent(CHATBOT_EVENTS.NEW_MESSAGE, {
              detail: { 
                message: newMessage,
                conversationId: newMessage.conversation_id
              }
            }));
            
            // También disparar evento para el GameEngine/Phaser
            window.dispatchEvent(new CustomEvent('phaser:chatbotMessage', {
              detail: { 
                agenteId: agenteId,
                conversationId: newMessage.conversation_id,
                preview: newMessage.contenido?.substring(0, 50)
              }
            }));
          }
        }
      )
      .subscribe();

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, [agenteId, enableRealtime, activeConversation, fetchConversations]);

  /**
   * Polling como fallback o complemento a Realtime
   */
  useEffect(() => {
    if (!agenteId) return;
    
    // Fetch inicial
    fetchConversations();
    
    // Configurar polling
    pollIntervalRef.current = setInterval(fetchConversations, pollInterval);
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [agenteId, pollInterval, fetchConversations]);

  /**
   * Sincronizar estado del agente con actividad de chatbots
   * Cuando hay mensajes pendientes, el agente aparece como "responding"
   */
  useEffect(() => {
    if (!agenteId || !conversations.length) return;
    
    const hasPendingMessages = conversations.some(c => c.mensajes_pendientes > 0);
    
    if (hasPendingMessages) {
      // Actualizar estado del agente a "responding" en tiempo real
      supabase
        .channel(`agent-status:${agenteId}`)
        .send({
          type: 'broadcast',
          event: 'status_change',
          payload: {
            agente_id: agenteId,
            status: 'responding',
            source: 'chatbot_activity',
            timestamp: new Date().toISOString()
          }
        });
    }
  }, [agenteId, conversations]);

  return {
    // Estado
    conversations,
    activeConversation,
    messages,
    isLoading,
    error,
    stats,
    
    // Acciones
    fetchConversations,
    fetchMessages,
    sendResponse,
    closeConversation,
    selectConversation,
    refresh: fetchConversations,
    
    // Helpers
    hasPendingMessages: stats.unread > 0,
    isConversationActive: (id) => activeConversation?.conversation_id === id
  };
}

export default useChatbotAgentSync;
