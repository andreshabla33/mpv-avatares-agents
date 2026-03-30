import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Canal name → short label for frontend badges
const CANAL_SHORT_MAP: Record<string, string> = {
  whatsapp: 'WA', instagram: 'IG', messenger: 'MS',
  manychat: 'MC', web_chat: 'WB', facebook: 'FB',
  sms: 'SM', email: 'EM',
};

// Status priority: higher = more active
const STATUS_PRIORITY: Record<string, number> = {
  paused: 0, idle: 1, waiting: 2, working: 3,
  thinking: 4, sending: 5, qualifying: 6, scheduling: 7,
  responding: 8, overloaded: 9,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Optional API key auth: if x-api-key header is sent, validate it
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("DASHBOARD_API_KEY");
    if (apiKey && expectedKey && apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const twentyFourHAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // ── Query 1: All ACTIVE numbers (activo = TRUE) with agent + empresa info ──
    const { data: rawNumbers, error: numbersErr } = await supabase
      .from("wp_numeros")
      .select(`
        id, agente_id, telefono, nombre, activo, empresa_id, canal, timezone,
        wp_agentes!wp_numeros_agente_id_fkey(id, nombre_agente, rol, llm, archivado),
        wp_empresa_perfil!wp_numeros_empresa_id_fkey(id, nombre, rubro, pais)
      `)
      .eq("activo", true)  // Only active numbers
      .order("empresa_id")
      .order("agente_id");

    if (numbersErr) throw numbersErr;

    // Filter: only numbers with non-archived agents and valid empresa
    const allNumbers = (rawNumbers || []).filter((n: any) =>
      n.wp_agentes && n.wp_empresa_perfil && n.wp_agentes.archivado === false
    );

    if (allNumbers.length === 0) {
      return new Response(JSON.stringify({ agents: [], kpis: { total_agents: 0, active_agents: 0, total_msgs_1h: 0, total_msgs_24h: 0, total_convs_open: 0, overloaded_agents: 0 } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Group numbers by empresa_id → 1 avatar per empresa ──
    const empresaGroupMap: Record<number, any[]> = {};
    for (const n of allNumbers) {
      if (!empresaGroupMap[n.empresa_id]) empresaGroupMap[n.empresa_id] = [];
      empresaGroupMap[n.empresa_id].push(n);
    }

    const empresaIds = Object.keys(empresaGroupMap).map(Number);

    // ── Query 2: Conversations (for all agents in these empresas) ──
    // Get all agent IDs from all empresas
    const allAgentIdsInEmpresas = new Set<number>();
    for (const numbers of Object.values(empresaGroupMap)) {
      for (const n of numbers) {
        if (n.agente_id) allAgentIdsInEmpresas.add(n.agente_id);
      }
    }
    const agentIdsArray = Array.from(allAgentIdsInEmpresas);

    const { data: convData } = await supabase
      .from("wp_conversaciones")
      .select("id, agente_id, canal, seguimiento, fecha_ultimo_mensaje_usuario, contacto_id")
      .in("agente_id", agentIdsArray)
      .order("fecha_ultimo_mensaje_usuario", { ascending: false })
      .limit(500);

    // Build maps keyed by empresa_id (aggregate conversations from all agents in empresa)
    const lastConvMap: Record<number, { canal: string; last_activity: string }> = {};
    const openConvsCount: Record<number, number> = {};
    const convIdToEmpresa: Record<number, number> = {};
    const allConvIds: number[] = [];

    // Map agent_id to empresa_id for quick lookup
    const agentToEmpresaMap: Record<number, number> = {};
    for (const [empresaId, numbers] of Object.entries(empresaGroupMap)) {
      for (const n of numbers) {
        if (n.agente_id) agentToEmpresaMap[n.agente_id] = Number(empresaId);
      }
    }

    if (convData) {
      for (const c of convData) {
        const empresaId = agentToEmpresaMap[c.agente_id];
        if (!empresaId) continue; // Skip conversations from agents not in our empresas
        convIdToEmpresa[c.id] = empresaId;
        allConvIds.push(c.id);
        if (!lastConvMap[empresaId]) {
          lastConvMap[empresaId] = { canal: c.canal, last_activity: c.fecha_ultimo_mensaje_usuario };
        }
        if (c.seguimiento === 'abierta') {
          openConvsCount[empresaId] = (openConvsCount[empresaId] || 0) + 1;
        }
      }
    }

    // ── Queries 3-7: Messages and Abandoned Convs in parallel ──
    const [
      { data: recentMsgs5 },
      { data: recentMsgs1h },
      { data: msgs24h },
      { data: unansweredMsgs },
      { data: abandonedConvs }
    ] = await Promise.all([
      supabase
        .from("wp_mensajes")
        .select("conversacion_id, created_at, remitente, contenido, uso_herramientas")
        .gte("created_at", fiveMinAgo)
        .in("conversacion_id", allConvIds.slice(0, 1000))
        .order("created_at", { ascending: false })
        .limit(2000),
      
      supabase
        .from("wp_mensajes")
        .select("conversacion_id, created_at, remitente, contenido")
        .gte("created_at", oneHourAgo)
        .in("conversacion_id", allConvIds.slice(0, 1000))
        .order("created_at", { ascending: false })
        .limit(2000),

      supabase
        .from("wp_mensajes")
        .select("conversacion_id, remitente")
        .gte("created_at", twentyFourHAgo)
        .in("conversacion_id", allConvIds.slice(0, 1000))
        .limit(5000),

      supabase
        .from("wp_mensajes")
        .select("conversacion_id, created_at, remitente")
        .gte("created_at", oneHourAgo)
        .in("conversacion_id", allConvIds.slice(0, 500))
        .order("created_at", { ascending: false })
        .limit(2000),

      supabase
        .from("wp_conversaciones")
        .select("id, agente_id, fecha_ultimo_mensaje_usuario")
        .in("agente_id", agentIdsArray)
        .gte("fecha_ultimo_mensaje_usuario", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .limit(1000)
    ]);

    // ── Build activity maps keyed by empresa_id ──
    type Activity = {
      msgs_2min_agent: number; msgs_2min_user: number;
      msgs_5min_agent: number; msgs_5min_user: number;
      msgs_1h: number; msgs_24h_agent: number; msgs_24h_user: number;
      last_tool: string | null; waiting_reply: boolean;
      convs_active_5min: Set<number>; tokens_1h: number;
      thought_traces: any[]; unanswered_msgs: number; abandoned_convs: number;
      last_agent_message_time: string | null; minutes_without_response: number;
    };
    const empresaActivity: Record<number, Activity> = {};

    for (const empId of empresaIds) {
      empresaActivity[empId] = {
        msgs_2min_agent: 0, msgs_2min_user: 0,
        msgs_5min_agent: 0, msgs_5min_user: 0,
        msgs_1h: 0, msgs_24h_agent: 0, msgs_24h_user: 0,
        last_tool: null, waiting_reply: false,
        convs_active_5min: new Set(), tokens_1h: 0,
        thought_traces: [], unanswered_msgs: 0, abandoned_convs: 0,
        last_agent_message_time: null, minutes_without_response: 0,
      };
    }

    const estimateTokens = (text: string | null) => text ? Math.ceil(text.length / 4) : 0;

    // Process 5min messages
    if (recentMsgs5) {
      for (const m of recentMsgs5) {
        const empId = convIdToEmpresa[m.conversacion_id];
        if (!empId || !empresaActivity[empId]) continue;
        const act = empresaActivity[empId];
        const isRecent = new Date(m.created_at).getTime() > new Date(twoMinAgo).getTime();

        if (m.remitente === 'agente') {
          act.msgs_5min_agent++;
          if (isRecent) act.msgs_2min_agent++;
          const msgTime = new Date(m.created_at).getTime();
          const currentLastTime = act.last_agent_message_time ? new Date(act.last_agent_message_time).getTime() : 0;
          if (msgTime > currentLastTime) act.last_agent_message_time = m.created_at;
          const conv = convData?.find((c: any) => c.id === m.conversacion_id);
          act.thought_traces.push({
            ts: m.created_at, content: m.contenido || 'Procesando mensaje...',
            tools: m.uso_herramientas, contacto_id: conv?.contacto_id || null,
            conversacion_id: m.conversacion_id
          });
          if (act.thought_traces.length > 10) act.thought_traces = act.thought_traces.slice(-10);
          if (m.uso_herramientas && !act.last_tool) {
            try {
              let tools = m.uso_herramientas;
              if (typeof tools === 'string') tools = JSON.parse(tools);
              if (Array.isArray(tools) && tools.length > 0 && tools[0]?.action?.tool) act.last_tool = tools[0].action.tool;
            } catch {}
          }
        } else {
          act.msgs_5min_user++;
          if (isRecent) act.msgs_2min_user++;
        }
        act.convs_active_5min.add(m.conversacion_id);
      }
    }

    // Process 1h messages
    if (recentMsgs1h) {
      for (const m of recentMsgs1h) {
        const empId = convIdToEmpresa[m.conversacion_id];
        if (!empId || !empresaActivity[empId]) continue;
        empresaActivity[empId].msgs_1h++;
        empresaActivity[empId].tokens_1h += estimateTokens(m.contenido);
      }
    }

    // Process 24h messages
    if (msgs24h) {
      for (const m of msgs24h) {
        const empId = convIdToEmpresa[m.conversacion_id];
        if (!empId || !empresaActivity[empId]) continue;
        if (m.remitente === 'agente') empresaActivity[empId].msgs_24h_agent++;
        else empresaActivity[empId].msgs_24h_user++;
      }
    }

    // Process unanswered messages
    if (unansweredMsgs) {
      const convLastUserMsg: Record<number, number> = {};
      const convLastAgentMsg: Record<number, number> = {};
      for (const m of unansweredMsgs) {
        const ts = new Date(m.created_at).getTime();
        if (m.remitente === 'user') {
          if (!convLastUserMsg[m.conversacion_id] || ts > convLastUserMsg[m.conversacion_id]) convLastUserMsg[m.conversacion_id] = ts;
        } else if (m.remitente === 'agente') {
          if (!convLastAgentMsg[m.conversacion_id] || ts > convLastAgentMsg[m.conversacion_id]) convLastAgentMsg[m.conversacion_id] = ts;
        }
      }
      for (const convId of Object.keys(convLastUserMsg)) {
        const cid = Number(convId);
        const empId = convIdToEmpresa[cid];
        if (!empId || !empresaActivity[empId]) continue;
        if (convLastUserMsg[cid] > (convLastAgentMsg[cid] || 0) && (Date.now() - convLastUserMsg[cid]) > 5 * 60 * 1000) {
          empresaActivity[empId].unanswered_msgs++;
        }
      }
    }

    // Process abandoned conversations
    if (abandonedConvs) {
      for (const conv of abandonedConvs) {
        const empId = agentToEmpresaMap[conv.agente_id];
        if (!empId || !empresaActivity[empId]) continue;
        const userLastMsg = conv.fecha_ultimo_mensaje_usuario ? new Date(conv.fecha_ultimo_mensaje_usuario).getTime() : 0;
        if ((Date.now() - userLastMsg) > 2 * 60 * 60 * 1000) empresaActivity[empId].abandoned_convs++;
      }
    }

    // Detect waiting_reply
    if (recentMsgs5) {
      const convLastAgentReply: Record<number, number> = {};
      const convLastUserMsg2: Record<number, number> = {};
      for (const m of recentMsgs5) {
        const ts = new Date(m.created_at).getTime();
        if (m.remitente === 'agente') {
          if (!convLastAgentReply[m.conversacion_id] || ts > convLastAgentReply[m.conversacion_id]) convLastAgentReply[m.conversacion_id] = ts;
        } else {
          if (!convLastUserMsg2[m.conversacion_id] || ts > convLastUserMsg2[m.conversacion_id]) convLastUserMsg2[m.conversacion_id] = ts;
        }
      }
      for (const convId of Object.keys(convLastUserMsg2)) {
        const cid = Number(convId);
        const empId = convIdToEmpresa[cid];
        if (!empId || !empresaActivity[empId]) continue;
        if (convLastUserMsg2[cid] > (convLastAgentReply[cid] || 0) && (Date.now() - convLastUserMsg2[cid]) > 90 * 1000) {
          empresaActivity[empId].waiting_reply = true;
        }
      }
    }

    // ── Status detection ──
    function getNumeroStatus(act: Activity, openConvs: number): { status: string; action_text: string } {
      const totalActive5min = act.convs_active_5min.size;
      if (totalActive5min >= 5) return { status: 'overloaded', action_text: `${totalActive5min} convos simultáneas` };
      if (act.msgs_2min_agent > 0 && act.last_tool) {
        const tl = act.last_tool.toLowerCase();
        if (tl.includes('cita') || tl.includes('calendly') || tl.includes('calendar') || tl.includes('schedule') || tl.includes('disponibilidad'))
          return { status: 'scheduling', action_text: 'Agendando cita...' };
        if (tl.includes('calificado') || tl.includes('calificacion') || tl.includes('qualify'))
          return { status: 'qualifying', action_text: 'Calificando lead...' };
        if (tl.includes('imagen') || tl.includes('image') || tl.includes('envio') || tl.includes('send'))
          return { status: 'sending', action_text: 'Enviando contenido...' };
        if (tl.includes('think'))
          return { status: 'thinking', action_text: 'Analizando...' };
      }
      if (act.msgs_2min_agent > 0) return { status: 'responding', action_text: `Respondiendo (${act.msgs_2min_agent} msgs)` };
      if (act.waiting_reply && act.msgs_2min_user > 0) return { status: 'waiting', action_text: 'Esperando procesar...' };
      if (act.msgs_5min_agent > 0) return { status: 'working', action_text: `${act.msgs_5min_agent} msgs en 5min` };
      return { status: 'idle', action_text: openConvs > 0 ? `${openConvs} convos abiertas` : 'Sin actividad' };
    }

    // Calculate minutes without response
    const currentTime = Date.now();
    for (const empId of empresaIds) {
      const act = empresaActivity[empId];
      if (act.last_agent_message_time) {
        act.minutes_without_response = Math.floor((currentTime - new Date(act.last_agent_message_time).getTime()) / (1000 * 60));
      } else {
        act.minutes_without_response = -1;
      }
    }

    // ── Build final response: 1 avatar per empresa ──
    const results = empresaIds.map((empId) => {
      const numbers = empresaGroupMap[empId];
      const firstNum = numbers[0]; // Use first number for empresa-level info
      const act = empresaActivity[empId];
      const conv = lastConvMap[empId];
      const openConvs = openConvsCount[empId] || 0;

      // Build channels array with all active canales
      const channels = numbers.map((n: any) => ({
        numero_id: n.id,
        canal: n.canal,
        canal_short: CANAL_SHORT_MAP[(n.canal || '').toLowerCase()] || (n.canal || '??').substring(0, 2).toUpperCase(),
        telefono: n.telefono,
        activo: n.activo === true,
        timezone: n.timezone,
        nombre: n.nombre,
      }));

      // Get unique active canales for display
      const activeCanales = [...new Set(numbers.map((n: any) => n.canal).filter(Boolean))];

      // Determine status based on empresa activity
      let status: string;
      let action_text: string;
      const result = getNumeroStatus(act, openConvs);
      status = result.status;
      action_text = result.action_text;

      return {
        id: `empresa-${empId}`,
        empresa_id: empId,
        name: firstNum.wp_empresa_perfil.nombre,
        nombre_agente: firstNum.wp_empresa_perfil.nombre,
        empresa: firstNum.wp_empresa_perfil.nombre,
        rubro: firstNum.wp_empresa_perfil.rubro || '',
        pais: firstNum.wp_empresa_perfil.pais || '',
        role: 'Empresa',
        canales: activeCanales,
        canales_display: activeCanales.join(', '),
        status,
        action_text,
        // Channel info
        channels,
        active_channels: channels.length,
        // Activity metrics (aggregated across all channels)
        msgs_2min: act.msgs_2min_agent,
        msgs_5min: act.msgs_5min_agent,
        msgs_1h: act.msgs_1h,
        msgs_24h_agent: act.msgs_24h_agent,
        msgs_24h_user: act.msgs_24h_user,
        convs_active_5min: act.convs_active_5min.size,
        convs_open: openConvs,
        last_tool: act.last_tool,
        last_activity: conv?.last_activity || null,
        has_real_data: conv?.last_activity ? true : false,
        tokens_1h: act.tokens_1h,
        thought_traces: act.thought_traces,
        unanswered_msgs: act.unanswered_msgs,
        abandoned_convs: act.abandoned_convs,
        last_agent_message_time: act.last_agent_message_time,
        minutes_without_response: act.minutes_without_response,
        number_is_active: true,
      };
    });

    // Global KPIs
    const kpis = {
      total_agents: results.length,
      active_agents: results.filter((r: any) => r.status !== 'idle' && r.status !== 'paused').length,
      total_msgs_1h: results.reduce((sum: number, r: any) => sum + r.msgs_1h, 0),
      total_msgs_24h: results.reduce((sum: number, r: any) => sum + r.msgs_24h_agent + r.msgs_24h_user, 0),
      total_convs_open: results.reduce((sum: number, r: any) => sum + r.convs_open, 0),
      overloaded_agents: results.filter((r: any) => r.status === 'overloaded').length,
    };

    return new Response(JSON.stringify({ agents: results, kpis }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=5, s-maxage=5",
      },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
