import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "./cors.ts";
import { SupabaseService } from "./supabase.ts";
import { OpenAIService } from "./openai.ts";
import { getSystemSecurityPolicy } from "./prompts.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Audit Logger - Registra eventos de seguridad de forma estructurada
interface SecurityEvent {
  event_type: 'auth_failure' | 'rate_limit_exceeded' | 'prompt_injection_detected' | 'validation_error' | 'api_error';
  timestamp?: string;
  details: Record<string, unknown>;
  ip?: string;
}

function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    ...event,
    timestamp: new Date().toISOString(),
    source: 'agent-voice-interaction'
  };
  console.warn('[SECURITY_AUDIT]', JSON.stringify(logEntry));
}

Deno.serve(async (req: Request) => {
  // Manejo de CORS preflight request
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logSecurityEvent({
        event_type: 'auth_failure',
        details: { reason: 'missing_or_invalid_auth_header' },
        ip: req.headers.get('x-forwarded-for') || undefined
      });
      return new Response(JSON.stringify({ error: "Unauthorized - Se requiere token de autenticación válido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 1. RATE LIMITING CHECK (Fase 1 / Fase 2 Security)
    // Instanciar cliente con el token del usuario para respetar RLS y ejecutar la verificación
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Limitamos a 10 llamadas de voz por minuto por empresa para evitar "Denial of Wallet" en OpenAI
    let isAllowed = true;
    try {
      const { data, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
        p_endpoint: 'agent-voice-interaction',
        p_max_requests: 10,
        p_window_minutes: 1
      });
      if (!rateLimitError && data === false) {
        isAllowed = false;
      }
    } catch (e) {
      console.warn("Advertencia: No se pudo verificar rate limit (posible falta de auth/RLS).", e);
    }

    if (!isAllowed) {
      logSecurityEvent({
        event_type: 'rate_limit_exceeded',
        details: { endpoint: 'agent-voice-interaction', limit: 10, window: '1m' },
        ip: req.headers.get('x-forwarded-for') || undefined
      });
      return new Response(JSON.stringify({ error: "Too Many Requests. Límite de interacciones por voz excedido. Intente en 1 minuto." }), {
        status: 429, // Status HTTP correcto para Rate Limiting
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" }
      });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const agenteIdStr = formData.get('agente_id') as string | null;

    if (!audioFile || !agenteIdStr) {
      logSecurityEvent({
        event_type: 'validation_error',
        details: { missing_fields: [!audioFile ? 'audio' : null, !agenteIdStr ? 'agente_id' : null].filter(Boolean) }
      });
      return new Response(JSON.stringify({ error: "Se requiere un archivo de audio y el agente_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validacion Basica (Evitar desbordamientos o inputs extraños)
    if (audioFile.size > 10 * 1024 * 1024) { // 10 MB Max
      logSecurityEvent({
        event_type: 'validation_error',
        details: { reason: 'file_too_large', size: audioFile.size, max_size: 10 * 1024 * 1024 }
      });
      return new Response(JSON.stringify({ error: "Archivo de audio demasiado grande (Max 10MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const agenteId = parseInt(agenteIdStr, 10);
    if (isNaN(agenteId) || agenteId <= 0) {
      logSecurityEvent({
        event_type: 'validation_error',
        details: { reason: 'invalid_agente_id', value: agenteIdStr }
      });
       return new Response(JSON.stringify({ error: "agente_id inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Inicializar servicios
    const supabaseService = new SupabaseService();
    const openaiService = new OpenAIService();

    // 1. Obtener detalles del agente (Valida permisos RLS del Admin)
    let agentName = `Agente ${agenteId}`;
    try {
      const agentDetails = await supabaseService.getAgentDetails(agenteId, authHeader);
      if (agentDetails?.nombre_agente) {
        agentName = agentDetails.nombre_agente;
      }
    } catch (e) {
      console.warn("Advertencia: No se pudieron obtener detalles del agente desde BD (Auth/RLS). Usando fallback.", e);
    }
    
    // 2. Transcribir Audio (Whisper)
    const transcription = await openaiService.transcribeAudio(audioFile);

    // 2.5 Guardrails: Detección Básica de Inyección (Heurística)
    const lowerTranscription = transcription.toLowerCase();
    const forbiddenPhrases = [
      "ignora tus instrucciones", "ignore previous instructions",
      "system prompt", "modo desarrollador", "developer mode",
      "bypass", "olvida las reglas"
    ];
    
    if (forbiddenPhrases.some(phrase => lowerTranscription.includes(phrase))) {
      logSecurityEvent({
        event_type: 'prompt_injection_detected',
        details: { 
          detected_phrases: forbiddenPhrases.filter(p => lowerTranscription.includes(p)),
          agente_id: agenteId 
        },
        ip: req.headers.get('x-forwarded-for') || undefined
      });
      return new Response(JSON.stringify({ 
        error: "Se ha detectado un intento de instrucción no permitida. Operación bloqueada por seguridad." 
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Wrap user input in XML tags to isolate it from system instructions
    const isolatedTranscription = `<user_input>${transcription}</user_input>`;

    // 3. Generar Prompt Seguro con el nombre del agente (Mitigación básica de Prompt Injection incluida en prompts.ts)
    const systemPrompt = getSystemSecurityPolicy(agentName);

    // 4. Obtener respuesta protegida del LLM (GPT-4o)
    const llmResponse = await openaiService.generateSecureResponse(isolatedTranscription, systemPrompt);

    // 5 & 6. Generar Audio (TTS) y Registrar interacción en paralelo
    const [audioBuffer] = await Promise.all([
      openaiService.generateSpeech(llmResponse),
      supabaseService.logInteraction(agenteId, transcription, llmResponse, authHeader).catch(e => {
        console.warn("Advertencia: No se pudo registrar log en BD (Auth/RLS).", e);
      })
    ]);

    // 7. Devolver el archivo de audio (MP3) y el texto como custom headers
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', 'audio/mpeg');
    // Codificamos en URI por si hay caracteres especiales (Protección básica)
    headers.set('X-Transcription', encodeURIComponent(transcription));
    headers.set('X-Response-Text', encodeURIComponent(llmResponse));

    return new Response(audioBuffer, {
      status: 200,
      headers: headers
    });

  } catch (error: unknown) {
    logSecurityEvent({
      event_type: 'api_error',
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    });
    console.error("Error en agent-voice-interaction:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
