import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const twoMinAgo = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const twentyFourHAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Query 1: All agent numbers (each number is a separate agent)
    const { data: agentNumbers, error: numbersErr } = await supabase
      .from("wp_numeros")  
      .select(`
        id,
        agente_id,
        telefono,
        nombre,
        activo,
        empresa_id,
        canal,
        timezone,
        wp_agentes!inner(id, nombre_agente, rol, llm),
        wp_empresa_perfil!inner(id, nombre_empresa)
      `)
      .eq("wp_agentes.archivado", false)
      .order("empresa_id")
      .order("agente_id");

    if (numbersErr) throw numbersErr;
    if (!agentNumbers || agentNumbers.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Each number is now a separate agent - use number IDs for tracking
    const numberIds = agentNumbers.map((n: any) => n.id);
    const agentIds = agentNumbers.map((n: any) => n.agente_id); // Still need agent IDs for some queries

    // Query 2: All conversations for these agents (latest per agent) + contact info
    const { data: convData } = await supabase
      .from("wp_conversaciones")
      .select("id, agente_id, canal, seguimiento, fecha_ultimo_mensaje_usuario, contacto_id")
      .in("agente_id", agentIds)
      .order("fecha_ultimo_mensaje_usuario", { ascending: false })
      .limit(500);

    // Build maps: last canal per agent + active conversations count + open conversations
    const lastConvMap: Record<number, { canal: string; last_activity: string; seguimiento: string }> = {};
    const activeConvsCount: Record<number, number> = {};
    const openConvsCount: Record<number, number> = {};
    const convIdToAgent: Record<number, number> = {};
    const convIdToNumberId: Record<number, number> = {};
    const allConvIds: number[] = [];

    if (convData) {
      for (const c of convData) {
        convIdToAgent[c.id] = c.agente_id;
        allConvIds.push(c.id);

        // Find which number this conversation belongs to
        const numberRecord = agentNumbers.find((n: any) => n.agente_id === c.agente_id);
        if (numberRecord) {
          convIdToNumberId[c.id] = numberRecord.id;
        }

        if (!lastConvMap[c.agente_id]) {
          lastConvMap[c.agente_id] = {
            canal: c.canal,
            last_activity: c.fecha_ultimo_mensaje_usuario,
            seguimiento: c.seguimiento,
          };
        }
        // Count open/active conversations
        if (c.seguimiento === 'abierta') {
          openConvsCount[c.agente_id] = (openConvsCount[c.agente_id] || 0) + 1;
        }
      }
    }

    // Query 3: Messages in last 5 min (for quick activity detection and tools usage)
    const { data: recentMsgs5 } = await supabase
      .from("wp_mensajes")
      .select("conversacion_id, created_at, remitente, contenido, uso_herramientas")
      .gte("created_at", fiveMinAgo)
      .in("conversacion_id", allConvIds.slice(0, 1000))
      .order("created_at", { ascending: false })
      .limit(2000);

    // Query 4: Messages in last hour for hourly stats
    const { data: recentMsgs1h } = await supabase
      .from("wp_mensajes")
      .select("conversacion_id, created_at, remitente, contenido")
      .gte("created_at", oneHourAgo)
      .in("conversacion_id", allConvIds.slice(0, 1000))
      .order("created_at", { ascending: false })
      .limit(2000);

    // Query 5: Messages in last 24h for daily stats
    const { data: msgs24h } = await supabase
      .from("wp_mensajes")
      .select("conversacion_id, remitente")
      .gte("created_at", twentyFourHAgo)
      .in("conversacion_id", allConvIds.slice(0, 1000))
      .limit(5000);

    // Query 6: Detect unanswered user messages (n8n failures)
    const { data: unansweredMsgs } = await supabase
      .from("wp_mensajes")
      .select("conversacion_id, created_at, remitente")
      .gte("created_at", oneHourAgo)
      .in("conversacion_id", allConvIds.slice(0, 500))
      .order("created_at", { ascending: false })
      .limit(2000);

    // Query 7: Abandoned conversations (no agent response in last 2h after user message)
    const { data: abandonedConvs } = await supabase
      .from("wp_conversaciones")
      .select("id, agente_id, fecha_ultimo_mensaje_usuario, fecha_ultimo_mensaje_agente")
      .in("agente_id", agentIds)
      .gte("fecha_ultimo_mensaje_usuario", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .limit(1000);

    // Build activity maps - now keyed by number ID since each number is a separate agent
    const agentActivity: Record<number, {
      msgs_2min_agent: number;
      msgs_2min_user: number;
      msgs_5min_agent: number;
      msgs_5min_user: number;
      msgs_1h: number;
      msgs_24h_agent: number;
      msgs_24h_user: number;
      last_tool: string | null;
      last_action_text: string | null;
      waiting_reply: boolean;
      convs_active_5min: Set<number>;
      tokens_1h: number;
      thought_traces: any[];
      unanswered_msgs: number;
      abandoned_convs: number;
      last_agent_message_time: string | null;
      minutes_without_response: number;
    }> = {};

    // Initialize activity for each number (each number is now a separate agent)
    for (const numberId of numberIds) {
      agentActivity[numberId] = {
        msgs_2min_agent: 0, msgs_2min_user: 0,
        msgs_5min_agent: 0, msgs_5min_user: 0,
        msgs_1h: 0,
        msgs_24h_agent: 0, msgs_24h_user: 0,
        last_tool: null, last_action_text: null,
        waiting_reply: false,
        convs_active_5min: new Set(),
        tokens_1h: 0,
        thought_traces: [],
        unanswered_msgs: 0,
        abandoned_convs: 0,
        last_agent_message_time: null,
        minutes_without_response: 0,
      };
    }

    // Rough token estimator: ~4 chars per token + fixed overhead for system prompt
    const estimateTokens = (text: string | null) => text ? Math.ceil(text.length / 4) : 0;

    // Process 5min messages
    if (recentMsgs5) {
      for (const m of recentMsgs5) {
        const numberId = convIdToNumberId[m.conversacion_id];
        if (!numberId || !agentActivity[numberId]) continue;
        const act = agentActivity[numberId];
        const isRecent = new Date(m.created_at).getTime() > new Date(twoMinAgo).getTime();

        if (m.remitente === 'agente') {
          act.msgs_5min_agent++;
          if (isRecent) act.msgs_2min_agent++;
          
          // Track last agent message time for "time without response" calculation
          const msgTime = new Date(m.created_at).getTime();
          const currentLastTime = act.last_agent_message_time ? new Date(act.last_agent_message_time).getTime() : 0;
          if (msgTime > currentLastTime) {
            act.last_agent_message_time = m.created_at;
          }
          
          // Save recent thought traces (tools + content + contact) - sliding window of last 10
          const conv = convData?.find((c: any) => c.id === m.conversacion_id);
          act.thought_traces.push({
            ts: m.created_at,
            content: m.contenido || 'Procesando mensaje...',
            tools: m.uso_herramientas,
            contacto_id: conv?.contacto_id || null,
            conversacion_id: m.conversacion_id
          });
          
          // Keep only the 10 most recent traces
          if (act.thought_traces.length > 10) {
            act.thought_traces = act.thought_traces.slice(-10);
          }

          // Extract tool name from uso_herramientas
          if (m.uso_herramientas && !act.last_tool) {
            try {
              let tools = m.uso_herramientas;
              if (typeof tools === 'string') tools = JSON.parse(tools);
              if (Array.isArray(tools) && tools.length > 0 && tools[0]?.action?.tool) {
                act.last_tool = tools[0].action.tool;
              }
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
        const numberId = convIdToNumberId[m.conversacion_id];
        if (!numberId || !agentActivity[numberId]) continue;
        agentActivity[numberId].msgs_1h++;
        agentActivity[numberId].tokens_1h += estimateTokens(m.contenido);
      }
    }

    // Process 24h messages
    if (msgs24h) {
      for (const m of msgs24h) {
        const numberId = convIdToNumberId[m.conversacion_id];
        if (!numberId || !agentActivity[numberId]) continue;
        if (m.remitente === 'agente') agentActivity[numberId].msgs_24h_agent++;
        else agentActivity[numberId].msgs_24h_user++;
      }
    }

    // Process unanswered messages (detect n8n failures)
    if (unansweredMsgs) {
      const convLastUserMsg: Record<number, number> = {};
      const convLastAgentMsg: Record<number, number> = {};
      
      for (const m of unansweredMsgs) {
        const ts = new Date(m.created_at).getTime();
        if (m.remitente === 'user') {
          if (!convLastUserMsg[m.conversacion_id] || ts > convLastUserMsg[m.conversacion_id]) {
            convLastUserMsg[m.conversacion_id] = ts;
          }
        } else if (m.remitente === 'agente') {
          if (!convLastAgentMsg[m.conversacion_id] || ts > convLastAgentMsg[m.conversacion_id]) {
            convLastAgentMsg[m.conversacion_id] = ts;
          }
        }
      }

      // Count unanswered user messages (user msg after agent's last response)
      for (const convId of Object.keys(convLastUserMsg)) {
        const cid = Number(convId);
        const numberId = convIdToNumberId[cid];
        if (!numberId || !agentActivity[numberId]) continue;
        
        const userTs = convLastUserMsg[cid];
        const agentTs = convLastAgentMsg[cid] || 0;
        
        if (userTs > agentTs && (Date.now() - userTs) > 5 * 60 * 1000) { // 5+ min ago
          agentActivity[numberId].unanswered_msgs++;
        }
      }
    }

    // Process abandoned conversations
    if (abandonedConvs) {
      for (const conv of abandonedConvs) {
        const numberRecord = agentNumbers.find((n: any) => n.agente_id === conv.agente_id);
        if (!numberRecord || !agentActivity[numberRecord.id]) continue;
        
        const userLastMsg = conv.fecha_ultimo_mensaje_usuario ? new Date(conv.fecha_ultimo_mensaje_usuario).getTime() : 0;
        const agentLastMsg = conv.fecha_ultimo_mensaje_agente ? new Date(conv.fecha_ultimo_mensaje_agente).getTime() : 0;
        
        // If user messaged after agent, and it's been >2h, count as abandoned
        if (userLastMsg > agentLastMsg && (Date.now() - userLastMsg) > 2 * 60 * 60 * 1000) {
          agentActivity[numberRecord.id].abandoned_convs++;
        }
      }
    }

    // Detect waiting_reply: user sent msg in last 2 min but agent hasn't replied
    if (recentMsgs5) {
      const convLastAgentReply: Record<number, number> = {};
      const convLastUserMsg: Record<number, number> = {};
      for (const m of recentMsgs5) {
        const ts = new Date(m.created_at).getTime();
        if (m.remitente === 'agente') {
          if (!convLastAgentReply[m.conversacion_id] || ts > convLastAgentReply[m.conversacion_id]) {
            convLastAgentReply[m.conversacion_id] = ts;
          }
        } else {
          if (!convLastUserMsg[m.conversacion_id] || ts > convLastUserMsg[m.conversacion_id]) {
            convLastUserMsg[m.conversacion_id] = ts;
          }
        }
      }
      for (const convId of Object.keys(convLastUserMsg)) {
        const cid = Number(convId);
        const numberId = convIdToNumberId[cid];
        if (!numberId || !agentActivity[numberId]) continue;
        const userTs = convLastUserMsg[cid];
        const agentTs = convLastAgentReply[cid] || 0;
        if (userTs > agentTs && (Date.now() - userTs) > 90 * 1000) { // 90 sec
          agentActivity[numberId].waiting_reply = true;
        }
      }
    }

    // Status detection function (existing logic adapted)
    function getStatus(act: any, openConvs: number, toolName: string | null, isPaused: boolean, isNumberActive: boolean) {
      // PAUSED: if number is inactive 
      if (isPaused || !isNumberActive) {
        return { status: 'paused', action_text: 'Número inactivo' };
      }

      // OVERLOADED: too many messages in a short time
      if (act.msgs_2min_agent >= 8) {
        return { status: 'overloaded', action_text: `¡Sobrecargado! ${act.msgs_2min_agent} msgs` };
      }

      // Tool-based statuses (only if number is active)
      if (act.msgs_2min_agent > 0 && toolName && isNumberActive) {
        const tl = toolName.toLowerCase();
        if (tl.includes('cita') || tl.includes('schedule')) {
          return { status: 'scheduling', action_text: 'Agendando cita...' };
        }
        if (tl.includes('search') || tl.includes('google') || tl.includes('web')) {
          return { status: 'qualifying', action_text: 'Calificando lead...' };
        }
        if (tl.includes('imagen') || tl.includes('image') || tl.includes('envio') || tl.includes('send')) {
          return { status: 'sending', action_text: 'Enviando contenido...' };
        }
        if (tl.includes('think')) {
          return { status: 'thinking', action_text: 'Analizando...' };
        }
      }

      // RESPONDING: sent messages in last 2 min
      if (act.msgs_2min_agent > 0) {
        return { status: 'responding', action_text: `Respondiendo (${act.msgs_2min_agent} msgs)` };
      }

      // WAITING: user sent message but agent hasn't replied yet
      if (act.waiting_reply && act.msgs_2min_user > 0) {
        return { status: 'waiting', action_text: 'Esperando procesar...' };
      }

      // WORKING: active in last 5 min but not last 2 min
      if (act.msgs_5min_agent > 0) {
        return { status: 'working', action_text: `${act.msgs_5min_agent} msgs en 5min` };
      }

      // IDLE
      return { status: 'idle', action_text: openConvs > 0 ? `${openConvs} convos abiertas` : 'Sin actividad' };
    }

    // Calculate minutes without response for all numbers
    const currentTime = Date.now();
    for (const numberId of numberIds) {
      const act = agentActivity[numberId];
      if (act.last_agent_message_time) {
        const lastMsgTime = new Date(act.last_agent_message_time).getTime();
        act.minutes_without_response = Math.floor((currentTime - lastMsgTime) / (1000 * 60));
      } else {
        act.minutes_without_response = -1; // Never sent a message
      }
    }

    // Build final response - each number becomes an agent
    const results = agentNumbers.map((numberRecord: any) => {
      const act = agentActivity[numberRecord.id];
      const conv = lastConvMap[numberRecord.agente_id]; // Conversations still keyed by agente_id
      const openConvs = openConvsCount[numberRecord.agente_id] || 0;
      const isPaused = !numberRecord.activo;
      const isNumberActive = numberRecord.activo === true;
      const { status, action_text } = getStatus(act, openConvs, act.last_tool, isPaused, isNumberActive);

      return {
        id: `number-${numberRecord.id}`, // Use number ID for unique identification
        db_id: numberRecord.id,
        agente_id: numberRecord.agente_id, // Keep reference to original agent
        name: `${numberRecord.wp_agentes.nombre_agente}`,
        empresa: numberRecord.wp_empresa_perfil.nombre_empresa,
        telefono: numberRecord.telefono,
        timezone: numberRecord.timezone,
        canal: numberRecord.canal,
        role: numberRecord.wp_agentes.rol || 'General',
        llm: numberRecord.wp_agentes.llm,
        status,
        action_text,
        // Activity metrics
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
        number_is_active: isNumberActive,
      };
    });

    // Global KPIs
    const kpis = {
      total_agents: results.length,
      active_agents: results.filter((r: any) => r.status !== 'idle' && r.status !== 'paused' && r.has_real_data).length,
      total_msgs_1h: results.reduce((sum: number, r: any) => sum + r.msgs_1h, 0),
      total_msgs_24h: results.reduce((sum: number, r: any) => sum + r.msgs_24h_agent + r.msgs_24h_user, 0),
      total_convs_open: results.reduce((sum: number, r: any) => sum + r.convs_open, 0),
      overloaded_agents: results.filter((r: any) => r.status === 'overloaded').length,
    };

    return new Response(JSON.stringify({ agents: results, kpis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
