import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Edge Function: Enviar respuestas desde agentes a chatbots externos
 * 
 * Esta función envía respuestas de los agentes del CRM de vuelta a los
 * chatbots externos (WhatsApp, Facebook, Instagram, etc.)
 * 
 * Flujo:
 * 1. Agente del CRM envía respuesta (vía voice interaction, UI, o automático)
 * 2. Se registra el mensaje en chatbot_messages
 * 3. Esta función es llamada para enviar al webhook externo
 * 4. El chatbot externo recibe la respuesta y la muestra al usuario
 */

interface SendMessagePayload {
  conversation_id: number;      // ID interno de la conversación
  content: string;           // Contenido de la respuesta
  type?: 'text' | 'image' | 'audio' | 'template';
  metadata?: Record<string, unknown>; // URLs de media, quick replies, etc.
}

interface WebhookPayload {
  event: 'message_sent';
  conversation: {
    external_conversation_id: string;
    external_user_id: string;
    external_user_name: string;
  };
  message: {
    id: number;              // ID interno del mensaje
    content: string;
    type: string;
    metadata: Record<string, unknown>;
    timestamp: string;
  };
  chatbot: {
    id: number;
    nombre: string;
    tipo: string;
  };
}

// Helper para enviar al webhook externo con timeout y reintentos
async function sendToExternalWebhook(
  url: string, 
  payload: WebhookPayload, 
  headers: Record<string, string>,
  secret?: string
): Promise<{ success: boolean; status: number; response?: string }> {
  const maxRetries = 3;
  const timeoutMs = 10000;
  
  // Si hay secret, firmar el payload (HMAC simple)
  const bodyToSend = secret 
    ? JSON.stringify({ ...payload, signature: await signPayload(payload, secret) })
    : JSON.stringify(payload);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: bodyToSend,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      
      if (response.ok) {
        return { success: true, status: response.status, response: responseText };
      }
      
      // Si no es 5xx, no reintentar
      if (response.status < 500) {
        return { success: false, status: response.status, response: responseText };
      }
      
      // Esperar antes de reintentar (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
      
    } catch (error) {
      if (attempt === maxRetries) {
        return { 
          success: false, 
          status: 0, 
          response: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
      // Esperar antes de reintentar
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  
  return { success: false, status: 0, response: 'Max retries exceeded' };
}

// Helper para firmar payload (HMAC-SHA256 simple)
async function signPayload(payload: WebhookPayload, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload) + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
    const payload: SendMessagePayload = await req.json();
    
    if (!payload.conversation_id || !payload.content) {
      return new Response(JSON.stringify({ 
        error: "Payload inválido", 
        required: ["conversation_id", "content"] 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Crear cliente Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 3. Obtener datos de la conversación y chatbot
    const { data: conversation, error: convError } = await supabase
      .from('chatbot_conversations')
      .select(`
        id,
        external_conversation_id,
        external_user_id,
        external_user_name,
        chatbot_id,
        chatbot_integrations (
          id,
          nombre,
          tipo,
          webhook_url,
          webhook_secret,
          webhook_headers
        )
      `)
      .eq('id', payload.conversation_id)
      .eq('estado', 'active')
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: "Conversación no encontrada o inactiva" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const chatbot = conversation.chatbot_integrations;
    
    if (!chatbot || !chatbot.webhook_url) {
      return new Response(JSON.stringify({ error: "Chatbot no configurado para envío" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Registrar mensaje en la BD (vía RPC)
    const { data: messageResult, error: msgError } = await supabase.rpc('send_chatbot_response', {
      p_conversation_id: payload.conversation_id,
      p_contenido: payload.content,
      p_tipo: payload.type || 'text',
      p_metadata: payload.metadata || {}
    });

    if (msgError || !messageResult?.success) {
      console.error("Error registrando mensaje:", msgError);
      return new Response(JSON.stringify({ error: "Error registrando mensaje" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. Construir payload para el webhook externo
    const webhookPayload: WebhookPayload = {
      event: 'message_sent',
      conversation: {
        external_conversation_id: conversation.external_conversation_id,
        external_user_id: conversation.external_user_id,
        external_user_name: conversation.external_user_name || 'Usuario'
      },
      message: {
        id: messageResult.message_id,
        content: payload.content,
        type: payload.type || 'text',
        metadata: payload.metadata || {},
        timestamp: new Date().toISOString()
      },
      chatbot: {
        id: chatbot.id,
        nombre: chatbot.nombre,
        tipo: chatbot.tipo
      }
    };

    // 6. Enviar al webhook externo
    const webhookResult = await sendToExternalWebhook(
      chatbot.webhook_url,
      webhookPayload,
      chatbot.webhook_headers || {},
      chatbot.webhook_secret || undefined
    );

    // 7. Actualizar estado del mensaje en BD
    if (webhookResult.success) {
      await supabase
        .from('chatbot_messages')
        .update({ 
          enviado_externo: true 
        })
        .eq('id', messageResult.message_id);
    } else {
      await supabase
        .from('chatbot_messages')
        .update({ 
          enviado_externo: false,
          externo_error: `HTTP ${webhookResult.status}: ${webhookResult.response}`
        })
        .eq('id', messageResult.message_id);
    }

    // 8. Retornar resultado
    return new Response(JSON.stringify({
      success: webhookResult.success,
      message_id: messageResult.message_id,
      webhook_status: webhookResult.status,
      message: webhookResult.success 
        ? "Mensaje enviado exitosamente" 
        : `Error enviando mensaje: ${webhookResult.response}`
    }), {
      status: webhookResult.success ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Error en envío de respuesta:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
