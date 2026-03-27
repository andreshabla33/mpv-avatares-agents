// Configuración estricta de CORS - requiere FRONTEND_URL configurado
const ALLOWED_ORIGIN = Deno.env.get("FRONTEND_URL");
if (!ALLOWED_ORIGIN) {
  throw new Error("FRONTEND_URL debe estar configurado en variables de entorno");
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-Transcription, X-Response-Text"
};
