import { CANAL_ICONS } from '../data/agents';

const STATUS_COLORS = {
  responding: '#2ecc71', scheduling: '#3498db', qualifying: '#9b59b6',
  sending: '#e67e22', thinking: '#1abc9c', working: '#2ecc71',
  waiting: '#f39c12', overloaded: '#e74c3c', idle: '#636e72',
};

export default function AgentDetail({ agent, state, extra, onClose }) {
  if (!agent) return null;

  const sColor = STATUS_COLORS[state] || '#636e72';
  const canal = extra?.canal;
  const canalIcon = canal && CANAL_ICONS[canal];
  const isOff = !agent.hasRealData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#0d0d1a] border-2 rounded-lg w-[360px] max-h-[480px] overflow-hidden"
        style={{ borderColor: agent.color + '66' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a4e]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: agent.color }} />
            <div>
              <div className="text-sm font-mono font-bold" style={{ color: agent.color }}>
                {agent.name}
              </div>
              <div className="text-[9px] font-mono text-[#4a4a6a]">
                {agent.role || 'General'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#4a4a6a] hover:text-white text-lg font-mono px-2"
          >
            ×
          </button>
        </div>

        {/* Status */}
        <div className="px-4 py-3 border-b border-[#1a1a2e]">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs font-mono font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: sColor + '22', color: sColor }}
            >
              {isOff ? 'SIN DATOS' : (state || 'idle').toUpperCase()}
            </span>
            {canalIcon && (
              <span
                className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                style={{ backgroundColor: canalIcon.color + '22', color: canalIcon.color }}
              >
                {canalIcon.symbol} {canal}
              </span>
            )}
          </div>
          {extra?.actionText && (
            <div className="text-[10px] font-mono text-[#aaa] bg-[#0a0a14] px-2 py-1 rounded">
              {extra.actionText}
            </div>
          )}
        </div>

        {/* Metrics */}
        <div className="px-4 py-3 border-b border-[#1a1a2e]">
          <div className="text-[9px] font-mono text-[#4a4a6a] mb-2 font-bold tracking-wider">MÉTRICAS</div>
          <div className="grid grid-cols-3 gap-2">
            <MetricBox label="Msgs 2min" value={extra?.msgs2min || 0} color="#2ecc71" />
            <MetricBox label="Msgs 5min" value={extra?.msgs5min || 0} color="#4ecdc4" />
            <MetricBox label="Msgs 1h" value={extra?.msgs1h || 0} color="#74b9ff" />
            <MetricBox label="Enviados 24h" value={extra?.msgs24hAgent || 0} color="#a29bfe" />
            <MetricBox label="Recibidos 24h" value={extra?.msgs24hUser || 0} color="#fd79a8" />
            <MetricBox label="Convos abiertas" value={extra?.convsOpen || 0} color="#fdcb6e" />
          </div>
          {(extra?.convsActive5min || 0) > 0 && (
            <div className="mt-2">
              <div className="text-[9px] font-mono text-[#4a4a6a] mb-1">CARGA DE TRABAJO</div>
              <LoadBar value={extra.convsActive5min} max={10} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-4 py-3">
          <div className="text-[9px] font-mono text-[#4a4a6a] mb-2 font-bold tracking-wider">INFO</div>
          <InfoRow label="LLM" value={(agent.llm || '').split('/').pop() || '?'} />
          <InfoRow label="ID" value={agent.db_id || agent.id} />
          {extra?.lastTool && <InfoRow label="Última tool" value={extra.lastTool} />}
          {agent.lastActivity && (
            <InfoRow
              label="Última actividad"
              value={new Date(agent.lastActivity).toLocaleString()}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }) {
  return (
    <div className="bg-[#0a0a14] rounded px-2 py-1.5 border border-[#1a1a2e]">
      <div className="text-[7px] font-mono text-[#3a3a5a]">{label}</div>
      <div className="text-sm font-mono font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

function LoadBar({ value, max }) {
  const pct = Math.min(value / max, 1);
  const color = pct >= 0.8 ? '#e74c3c' : pct >= 0.5 ? '#e67e22' : pct >= 0.3 ? '#f1c40f' : '#2ecc71';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-[#1a1a2e] rounded overflow-hidden">
        <div className="h-full rounded transition-all duration-500" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[9px] font-mono" style={{ color }}>{value} convos</span>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[9px] font-mono text-[#3a3a5a]">{label}</span>
      <span className="text-[9px] font-mono text-[#8a8aaa] max-w-[200px] truncate text-right">{value}</span>
    </div>
  );
}
