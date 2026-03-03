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
    <div className="w-full bg-[#0d0d1a]/95 backdrop-blur-md border-t border-[#2a2a4e] shadow-inner overflow-hidden">
      <div className="flex items-center justify-between px-4 py-1">
        <span className="text-[9px] font-mono text-[#4a4a6a]">
          {apiAvailable ? '● LIVE — UAL Office Virtual Agent' : '○ MODO DEMO — Sin conexión API'}
        </span>
        <span className="text-[9px] font-mono text-[#4a4a6a]">
          {activeAgents.length} activos · {offAgents.length} off · {kpis?.total_msgs_1h || 0} msgs/h
        </span>
      </div>
      <div className="flex items-center justify-center gap-1 py-1 px-3 flex-wrap max-h-[40px] overflow-hidden">
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
              className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-md border text-xs sm:text-sm transition-all hover:scale-105"
              style={{
                borderColor: state === 'overloaded' ? '#e74c3c66' : agent.color + '33',
                backgroundColor: state === 'overloaded' ? '#e74c3c11' : agent.color + '08',
              }}
            >
              <div
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: agent.color }}
              />
              <span
                className="text-[8px] sm:text-[9px] font-mono font-bold max-w-[50px] sm:max-w-[70px] truncate"
                style={{ color: agent.color }}
              >
                {agent.name}
              </span>
              {canalIcon && (
                <span
                  className="text-[7px] font-mono px-1 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: canalIcon.color + '22', color: canalIcon.color }}
                >
                  {CANAL_LABELS[canal] || canal}
                </span>
              )}
              <span className="text-[8px] font-mono shrink-0" style={{ color: sColor }}>
                {sIcon}
              </span>
              {extra.convsActive5min > 0 && (
                <span className="text-[7px] font-mono text-[#74b9ff] shrink-0">
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
