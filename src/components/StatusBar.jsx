import { CANAL_ICONS } from '../data/agents';

const CANAL_LABELS = {
  whatsapp: 'WA', instagram: 'IG', messenger: 'MS',
  manychat: 'MC', web_chat: 'Web', facebook: 'FB',
  sms: 'SMS', email: 'Email',
};

const STATUS_COLORS = {
  responding: '#2ecc71',
  scheduling: '#3498db',
  qualifying: '#9b59b6',
  sending: '#e67e22',
  thinking: '#1abc9c',
  working: '#2ecc71',
  waiting: '#f39c12',
  overloaded: '#e74c3c',
  idle: '#636e72',
};

const STATUS_ICONS = {
  responding: '●', scheduling: '◈', qualifying: '◆',
  sending: '▶', thinking: '◎', working: '●',
  waiting: '◌', overloaded: '⚠', idle: '○',
};

export default function StatusBar({ agents, agentStates, extras, apiAvailable, kpis }) {
  const activeAgents = agents.filter(a => a.hasRealData);
  const offAgents = agents.filter(a => !a.hasRealData);

  return (
    <div className="w-full max-w-[1340px] mx-auto bg-[#0d0d1a] border-t-2 border-[#2a2a4e]">
      <div className="flex items-center justify-between px-4 py-1">
        <span className="text-[9px] font-mono text-[#4a4a6a]">
          {apiAvailable ? '● LIVE — Monica CRM Inteligent' : '○ MODO DEMO — Sin conexión API'}
        </span>
        <span className="text-[9px] font-mono text-[#4a4a6a]">
          {activeAgents.length} activos · {offAgents.length} off · {kpis?.total_msgs_1h || 0} msgs/h
        </span>
      </div>
      <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 flex-wrap max-h-[56px] overflow-y-auto">
        {activeAgents.map(agent => {
          const state = agentStates[agent.id] || 'idle';
          const extra = extras[agent.id] || {};
          const canal = extra.canal;
          const canalIcon = canal && CANAL_ICONS[canal];
          const sColor = STATUS_COLORS[state] || '#636e72';
          const sIcon = STATUS_ICONS[state] || '○';
          return (
            <div
              key={agent.id}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded border"
              style={{
                borderColor: state === 'overloaded' ? '#e74c3c66' : agent.color + '33',
                backgroundColor: state === 'overloaded' ? '#e74c3c11' : agent.color + '08',
              }}
            >
              <div
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: agent.color }}
              />
              <span
                className="text-[9px] font-mono font-bold max-w-[70px] truncate"
                style={{ color: agent.color }}
              >
                {agent.name}
              </span>
              {canalIcon && (
                <span
                  className="text-[7px] font-mono px-0.5 rounded"
                  style={{ backgroundColor: canalIcon.color + '22', color: canalIcon.color }}
                >
                  {CANAL_LABELS[canal] || canal}
                </span>
              )}
              <span className="text-[8px] font-mono" style={{ color: sColor }}>
                {sIcon}
              </span>
              {extra.convsActive5min > 0 && (
                <span className="text-[7px] font-mono text-[#74b9ff]">
                  {extra.convsActive5min}c
                </span>
              )}
            </div>
          );
        })}
        {offAgents.length > 0 && (
          <span className="text-[8px] font-mono text-[#2a2a3e] px-1">
            +{offAgents.length} off
          </span>
        )}
      </div>
    </div>
  );
}
