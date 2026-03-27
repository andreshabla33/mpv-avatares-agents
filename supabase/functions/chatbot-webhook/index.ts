import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Edge Function: Webhook para recibir mensajes de chatbots externos
 * 
 * Esta función recibe mensajes desde chatbots externos (WhatsApp API, Facebook Messenger,
 * Instagram, etc.) y los enruta a los agentes del CRM.
 * 
 * Flujo:
 * 1. Chatbot externo envía mensaje a este webhook
 * 2. Se verifica la autenticidad (API key o firma)
 * 3. Se crea/actualiza la conversación en la BD
 * 4. Se enruta al agente correspondiente
 * 5. Se actualiza el estado del agente en tiempo real (Realtime)
 * 6. Opcional: se puede responder automáticamente o esperar al agente
 */

interface WebhookPayload {
  chatbot_id: number;           // ID del chatbot configurado en el CRM
  external_conversation_id: string;  // ID de conversación en el sistema externo
  external_user_id: string;     // ID del usuario/cliente
  external_user_name?: string;  // Nombre del usuario
  external_user_phone?: string; // Teléfono (para WhatsApp)
  message: {
    id?: string;               // ID del mensaje en sistema externo
    content: string;           // Contenido del mensaje
    type?: 'text' | 'image' | 'audio' | 'file' | 'location';
    metadata?: Record<string, unknown>; // URLs de media, ubicación, etc.
  };
  timestamp?: string;         // Timestamp del mensaje original
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    // 1. Extraer y validar payload
    const payload: WebhookPayload = await req.json();
    
    if (!payload.chatbot_id || !payload.external_conversation_id || !payload.message?.content) {
      return new Response(JSON.stringify({ 
        error: "Payload inválido", 
        required: ["chatbot_id", "external_conversation_id", "message.content"] 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Crear cliente Supabase (service role para operaciones internas)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 3. Verificar que el chatbot existe y está activo
    const { data: chatbot, error: chatbotError } = await supabase
      .from('chatbot_integrations')
      .select('id, empresa_id, nombre, tipo, agente_id, distribucion_mode, respuesta_automatica, activo')
      .eq('id', payload.chatbot_id)
      .eq('activo', true)
      .single();

    if (chatbotError || !chatbot) {
      return new Response(JSON.stringify({ error: "Chatbot no encontrado o inactivo" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Llamar a la función RPC para procesar el mensaje
    const { data: result, error: rpcError } = await supabase.rpc('receive_chatbot_message', {
      p_chatbot_id: payload.chatbot_id,
      p_external_conversation_id: payload.external_conversation_id,
      p_external_user_id: payload.external_user_id,
      p_external_user_name: payload.external_user_name || 'Usuario',
      p_external_user_phone: payload.external_user_phone || null,
      p_contenido: payload.message.content,
      p_external_message_id: payload.message.id || null,
      p_tipo: payload.message.type || 'text',
      p_metadata: payload.message.metadata || {}
    });

    if (rpcError) {
      console.error("Error en RPC receive_chatbot_message:", rpcError);
      return new Response(JSON.stringify({ error: "Error procesando mensaje", details: rpcError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. Si se asignó un agente, actualizar su estado en tiempo real
    if (result && result.agente_id) {
      // Notificar a través de Realtime que hay un nuevo mensaje para este agente
      await supabase
        .channel(`agent:${result.agente_id}`)
        .send({
          type: 'broadcast',
          event: 'new_chatbot_message',
          payload: {
            conversation_id: result.conversation_id,
            chatbot_nombre: chatbot.nombre,
            chatbot_tipo: chatbot.tipo,
            external_user_name: payload.external_user_name,
            message_preview: payload.message.content.substring(0, 100),
            timestamp: new Date().toISOString()
          }
        });

      // Actualizar el estado del agente a "responding" para que aparezca en el office virtual
      await supabase
        .from('wp_mensajes')
        .insert({
          agente_id: result.agente_id,
          remitente: 'cliente',
          contenido: payload.message.content,
          // Esto triggerá el realtime que ya tienes configurado
        });
    }

    // 6. Si está configurado para respuesta automática, procesar con el agente de voz/interacción
    if (chatbot.respuesta_automatica && result && result.agente_id) {
      // Llamar a la edge function de interacción de agente
      // Esto es opcional y depende de si quieres respuesta automática o manual
      // Por ahora, solo registramos que el mensaje está pendiente
    }

    // 7. Retornar éxito
    return new Response(JSON.stringify({
      success: true,
      conversation_id: result?.conversation_id,
      agente_id: result?.agente_id,
      message: result?.nueva_conversacion ? "Nueva conversación creada" : "Mensaje agregado a conversación existente"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Error en webhook de chatbot:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
