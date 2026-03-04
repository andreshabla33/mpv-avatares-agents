import { CANAL_ICONS } from '../data/agents';
import { STATUS_COLORS, STATUS_LABELS } from '../data/statusConfig';

export default function ActivityFeed({ log, kpis, apiAvailable }) {
  return (
    <div className="w-full h-full bg-[#0a0a14]/90 backdrop-blur-md border border-[#2a2a4e] rounded-xl flex flex-col overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.4)] relative min-h-0">
      {/* Glow top edge */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#4ecdc4]/50 to-transparent shrink-0"></div>
      {/* KPI Dashboard - Ultra Compact */}
      <div className="px-3 py-2 border-b border-[#2a2a4e] shrink-0">
        <div className="text-[9px] font-mono text-[#4ecdc4] font-bold mb-1.5 tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#4ecdc4] rounded-full animate-pulse"></span>
          MISSION CONTROL
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <KpiBox label="Msgs/1h" value={kpis.total_msgs_1h} color="#4ecdc4" />
          <KpiBox label="Msgs/24h" value={kpis.total_msgs_24h} color="#74b9ff" />
          <KpiBox label="Convos" value={kpis.total_convs_open} color="#a29bfe" />
          <KpiBox label="Activos" value={kpis.active_agents} total={kpis.total_agents} color="#2ecc71" />
        </div>
        {kpis.overloaded_agents > 0 && (
          <div className="mt-2 px-2 py-1 bg-[#e74c3c22] border border-[#e74c3c44] rounded text-[8px] font-mono text-[#e74c3c] text-center animate-pulse">
            ⚠ {kpis.overloaded_agents} AGENTE{kpis.overloaded_agents > 1 ? 'S' : ''} SOBRECARGADO{kpis.overloaded_agents > 1 ? 'S' : ''}
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-2 border-b border-[#2a2a4e] flex items-center justify-between shrink-0">
          <span className="text-[9px] font-mono text-[#4a4a6a] font-bold tracking-wider">
            ACTIVITY LOG
          </span>
          <span className="text-[8px] font-mono text-[#2a2a4e]">
            {apiAvailable ? '● LIVE' : '○ DEMO'}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1 min-h-0">
          {log.length === 0 ? (
            <div className="text-[9px] font-mono text-[#2a2a4e] text-center mt-6 flex flex-col items-center gap-1">
              <div className="w-6 h-6 border border-[#2a2a4e] rounded-full flex items-center justify-center">
                <span className="text-[10px]">○</span>
              </div>
              Esperando actividad...
            </div>
          ) : (
            log.map(entry => (
              <LogEntry key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-[#2a2a4e]">
        <div className="text-[8px] font-mono text-[#2a2a3e] mb-1">ESTADOS:</div>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <span key={key} className="text-[7px] font-mono flex items-center gap-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS[key] }} />
              <span style={{ color: STATUS_COLORS[key] + 'aa' }}>{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiBox({ label, value, total, color }) {
  return (
    <div className="bg-[#0d0d1a] rounded px-2 py-1 border border-[#1a1a2e]">
      <div className="text-[7px] font-mono text-[#3a3a5a]">{label}</div>
      <div className="text-[13px] font-mono font-bold" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : value || 0}
        {total !== undefined && (
          <span className="text-[8px] text-[#3a3a5a]">/{total}</span>
        )}
      </div>
    </div>
  );
}

function LogEntry({ entry }) {
  const statusColor = STATUS_COLORS[entry.status] || '#636e72';
  const canalIcon = entry.canal && CANAL_ICONS[entry.canal];

  return (
    <div className="flex items-start gap-1.5 py-1 border-b border-[#1a1a2e]">
      <div className="w-1.5 h-1.5 rounded-sm mt-1 shrink-0" style={{ backgroundColor: entry.agentColor }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[8px] font-mono text-[#3a3a5a]">{entry.ts}</span>
          {canalIcon && (
            <span className="text-[7px] font-mono" style={{ color: canalIcon.color }}>{canalIcon.symbol}</span>
          )}
        </div>
        <div className="text-[9px] font-mono font-bold truncate" style={{ color: entry.agentColor }}>
          {entry.agentName}
        </div>
        <div className="text-[8px] font-mono truncate" style={{ color: statusColor }}>
          {entry.text}
        </div>
      </div>
      <span
        className="text-[7px] font-mono px-1 rounded shrink-0 mt-0.5"
        style={{ backgroundColor: statusColor + '22', color: statusColor }}
      >
        {STATUS_LABELS[entry.status] || entry.status}
      </span>
    </div>
  );
}
