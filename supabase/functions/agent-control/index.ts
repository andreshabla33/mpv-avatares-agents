import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { agentId, action } = await req.json();

    if (!agentId || !action) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros agentId o action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action !== 'pause' && action !== 'resume') {
      return new Response(JSON.stringify({ error: 'Acción no válida. Use pause o resume' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isActive = action === 'resume';

    // Actualizar el estado activo del número asociado al agente
    const { data, error } = await supabaseClient
      .from('wp_numeros')
      .update({ activo: isActive })
      .eq('agente_id', agentId)
      .select();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ success: true, action, updated: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
