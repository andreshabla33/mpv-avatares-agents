import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export class SupabaseService {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    this.supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  }

  // Create a client on behalf of the user to enforce RLS
  getClientForUser(authHeader: string) {
    return createClient(this.supabaseUrl, this.supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
  }

  async getAgentDetails(agenteId: number, authHeader: string) {
    const client = this.getClientForUser(authHeader);
    const { data, error } = await client
      .from('wp_agentes')
      .select('nombre_agente, rol')
      .eq('id', agenteId)
      .single();

    if (error) throw new Error(`No se pudo obtener el agente. Asegúrate de tener permisos: ${error.message}`);
    return data;
  }

  async logInteraction(agenteId: number, transcription: string, llmResponse: string, authHeader: string) {
    const client = this.getClientForUser(authHeader);
    // Call the RPC stored procedure created in Day 1 migration
    const { data, error } = await client.rpc('log_agent_voice_interaction', {
      p_agente_id: agenteId,
      p_transcription: transcription,
      p_llm_response: llmResponse
    });

    if (error) throw new Error(`Error al registrar interacción: ${error.message}`);
    return data;
  }
}
