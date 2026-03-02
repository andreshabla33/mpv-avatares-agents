import { useState, useEffect, useCallback, useRef } from 'react';
import { mapAgentsFromAPI, getFallbackAgents } from '../data/agents';

const SUPABASE_URL = 'https://vecspltvmyopwbjzerow.supabase.co';
const FUNCTION_NAME = 'agent-office-status';
const API_URL = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`;

const MOCK_STATUSES = ['responding', 'scheduling', 'working', 'idle', 'waiting', 'overloaded'];

function generateMockStates(agents) {
  const states = {};
  agents.forEach(a => {
    states[a.id] = MOCK_STATUSES[Math.floor(Math.random() * MOCK_STATUSES.length)];
  });
  return states;
}

function generateMockExtras(agents) {
  const canales = ['whatsapp', 'instagram', 'messenger', 'manychat', null];
  const actions = ['Respondiendo...', 'Agendando cita...', 'Calificando lead...', 'Sin actividad', '3 convos simultáneas'];
  const extras = {};
  agents.forEach(a => {
    extras[a.id] = {
      canal: canales[Math.floor(Math.random() * canales.length)],
      msgs5min: Math.floor(Math.random() * 15),
      msgs1h: Math.floor(Math.random() * 50),
      msgs24hAgent: Math.floor(Math.random() * 200),
      msgs24hUser: Math.floor(Math.random() * 250),
      convsActive5min: Math.floor(Math.random() * 6),
      convsOpen: Math.floor(Math.random() * 30),
      actionText: actions[Math.floor(Math.random() * actions.length)],
      lastTool: null,
      role: a.role || 'General',
    };
  });
  return extras;
}

function generateMockKpis(agents, states) {
  const active = Object.values(states).filter(s => s !== 'idle').length;
  return {
    total_agents: agents.length,
    active_agents: active,
    total_msgs_1h: Math.floor(Math.random() * 100 + 20),
    total_msgs_24h: Math.floor(Math.random() * 1500 + 500),
    total_convs_open: Math.floor(Math.random() * 200 + 50),
    overloaded_agents: Object.values(states).filter(s => s === 'overloaded').length,
  };
}

// Activity log entries
function generateLogEntry(agents, states, extras) {
  const activeAgents = agents.filter(a => states[a.id] && states[a.id] !== 'idle');
  if (activeAgents.length === 0) return null;
  const agent = activeAgents[Math.floor(Math.random() * activeAgents.length)];
  const ext = extras[agent.id] || {};
  return {
    id: Date.now() + Math.random(),
    ts: new Date().toLocaleTimeString(),
    agentId: agent.id,
    agentName: agent.name,
    agentColor: agent.color,
    status: states[agent.id],
    text: ext.actionText || states[agent.id],
    canal: ext.canal,
  };
}

export function useAgentStates(pollInterval = 5000) {
  const [agents, setAgents] = useState(() => getFallbackAgents());
  const [states, setStates] = useState(() => generateMockStates(getFallbackAgents()));
  const [extras, setExtras] = useState(() => generateMockExtras(getFallbackAgents()));
  const [kpis, setKpis] = useState(() => generateMockKpis(getFallbackAgents(), {}));
  const [activityLog, setActivityLog] = useState([]);
  const [apiAvailable, setApiAvailable] = useState(false);
  const apiAvailableRef = useRef(false);
  const prevStatesRef = useRef({});

  const fetchStates = useCallback(async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      // v3 API returns { agents: [...], kpis: {...} }
      const agentData = data.agents || data;
      const kpiData = data.kpis || null;

      if (Array.isArray(agentData) && agentData.length > 0) {
        const mapped = mapAgentsFromAPI(agentData);
        setAgents(mapped);

        const newStates = {};
        const newExtras = {};
        agentData.forEach(item => {
          newStates[item.id] = item.status || 'idle';
          newExtras[item.id] = {
            canal: item.canal || null,
            msgs5min: item.msgs_5min || 0,
            msgs2min: item.msgs_2min || 0,
            msgs1h: item.msgs_1h || 0,
            msgs24hAgent: item.msgs_24h_agent || 0,
            msgs24hUser: item.msgs_24h_user || 0,
            convsActive5min: item.convs_active_5min || 0,
            convsOpen: item.convs_open || 0,
            actionText: item.action_text || '',
            lastTool: item.last_tool || null,
            role: item.role || 'General',
          };
        });

        // Generate activity log entries for state changes
        const prev = prevStatesRef.current;
        const logEntries = [];
        agentData.forEach(item => {
          const prevStatus = prev[item.id];
          if (prevStatus && prevStatus !== item.status && item.status !== 'idle') {
            logEntries.push({
              id: Date.now() + Math.random(),
              ts: new Date().toLocaleTimeString(),
              agentId: item.id,
              agentName: item.name,
              agentColor: mapped.find(m => m.id === item.id)?.color || '#fff',
              status: item.status,
              text: item.action_text || item.status,
              canal: item.canal,
            });
          }
        });

        if (logEntries.length > 0) {
          setActivityLog(prev => [...logEntries, ...prev].slice(0, 50));
        }

        prevStatesRef.current = newStates;
        setStates(newStates);
        setExtras(newExtras);
        if (kpiData) setKpis(kpiData);
        apiAvailableRef.current = true;
        setApiAvailable(true);
      }
    } catch {
      if (!apiAvailableRef.current) {
        const fb = getFallbackAgents();
        const mockStates = generateMockStates(fb);
        const mockExtras = generateMockExtras(fb);
        setAgents(fb);
        setStates(mockStates);
        setExtras(mockExtras);
        setKpis(generateMockKpis(fb, mockStates));
        // Generate mock log entry
        const entry = generateLogEntry(fb, mockStates, mockExtras);
        if (entry) setActivityLog(prev => [entry, ...prev].slice(0, 50));
      }
    }
  }, []);

  useEffect(() => {
    fetchStates();
    const id = setInterval(fetchStates, pollInterval);
    return () => clearInterval(id);
  }, [fetchStates, pollInterval]);

  return { agents, states, extras, kpis, activityLog, apiAvailable };
}
