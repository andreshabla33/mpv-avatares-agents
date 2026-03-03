import { useState } from 'react';
import { CANAL_ICONS } from '../data/agents';
import './AgentDetail.css';

const STATUS_COLORS = {
  responding: '#2ecc71', scheduling: '#3498db', qualifying: '#9b59b6',
  sending: '#e67e22', thinking: '#1abc9c', working: '#2ecc71',
  waiting: '#f39c12', overloaded: '#e74c3c', idle: '#636e72',
  paused: '#e74c3c'
};

const SUPABASE_URL = 'https://vecspltvmyopwbjzerow.supabase.co';

export default function AgentDetail({ agent, state, extra, onClose, onStateChange }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'thoughts'
  
  if (!agent) return null;

  const isOff = !agent.hasRealData;
  const isPaused = state === 'paused';
  const displayState = isPaused ? 'paused' : state;
  const sColor = STATUS_COLORS[displayState] || '#636e72';
  const canal = extra?.canal;
  const canalIcon = canal && CANAL_ICONS[canal];

  const togglePause = async () => {
    if (isUpdating || isOff) return;
    setIsUpdating(true);
    
    const action = isPaused ? 'resume' : 'pause';
    
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.db_id, action })
      });
      
      if (!res.ok) throw new Error('API error');
      
      // Optimistic update
      if (onStateChange) {
        onStateChange(agent.id, isPaused ? 'idle' : 'paused');
      }
    } catch (e) {
      console.error('Failed to update agent status:', e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 lg:p-6" onClick={onClose}>
      <div
        className="bg-[#0a0a14]/95 backdrop-blur-md border border-[#2a2a4e] rounded-xl w-full max-w-[95vw] sm:max-w-[500px] max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col font-mono relative"
        style={{ boxShadow: `0 0 20px ${agent.color}33, inset 0 0 20px ${agent.color}11`, borderColor: `${agent.color}44` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Glow Top Edge */}
        <div className="h-[2px] w-full shrink-0" style={{ background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)` }}></div>

        {/* Header Section */}
        <div className="flex flex-col shrink-0">
          <div className="flex items-start justify-between px-4 sm:px-6 py-4 sm:py-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 opacity-10 blur-2xl rounded-full" style={{ backgroundColor: agent.color }}></div>
            
            <div className="flex items-center gap-3 sm:gap-4 relative z-10 w-full pr-10 sm:pr-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border flex items-center justify-center text-lg sm:text-xl font-bold shadow-lg shrink-0" 
                   style={{ backgroundColor: agent.color + '22', borderColor: agent.color, color: agent.color, textShadow: `0 0 8px ${agent.color}` }}>
                {agent.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base sm:text-lg font-bold tracking-wide truncate" style={{ color: agent.color, textShadow: `0 0 10px ${agent.color}88` }}>
                  {agent.name.toUpperCase()}
                </div>
                <div className="text-[10px] sm:text-[11px] text-[#8a8aaa] mt-1 flex flex-wrap items-center gap-1 sm:gap-2">
                  <span>{agent.role || 'GENERAL AGENT'}</span>
                  <span className="text-[#3a3a5a] hidden sm:inline">//</span>
                  <span>ID: {agent.db_id || agent.id}</span>
                </div>
              </div>
            </div>
            
            <button onClick={onClose} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[#4a4a6a] hover:text-white text-xl sm:text-2xl w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center transition-colors z-20 rounded hover:bg-[#1a1a2e]">
              ×
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex px-4 sm:px-6 gap-4 sm:gap-6 border-b border-[#1a1a2e] relative">
            <button 
              className={`pb-3 text-[10px] sm:text-[11px] font-bold tracking-wider sm:tracking-widest transition-colors relative ${
                activeTab === 'metrics' ? 'text-[#4ecdc4]' : 'text-[#4a4a6a] hover:text-[#8a8aaa]'
              }`}
              onClick={() => setActiveTab('metrics')}
            >
              <span className="hidden sm:inline">METRICS & CONTROL</span>
              <span className="sm:hidden">METRICS</span>
              {activeTab === 'metrics' && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#4ecdc4] shadow-[0_0_8px_#4ecdc4]"></div>
              )}
            </button>
            <button 
              className={`pb-3 text-[10px] sm:text-[11px] font-bold tracking-wider sm:tracking-widest transition-colors relative ${
                activeTab === 'thoughts' ? 'text-[#a29bfe]' : 'text-[#4a4a6a] hover:text-[#8a8aaa]'
              }`}
              onClick={() => setActiveTab('thoughts')}
            >
              <span className="hidden sm:inline">THOUGHT TRACES</span>
              <span className="sm:hidden">TRACES</span>
              {activeTab === 'thoughts' && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#a29bfe] shadow-[0_0_8px_#a29bfe]"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto flex-1 custom-scrollbar agent-modal-content agent-modal-spacing">
          {activeTab === 'metrics' ? (
            <>
              {/* Status & Control Section */}
              <div className="bg-[#050508]/80 border border-[#1a1a2e] rounded-xl shadow-inner agent-modal-section">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-md shadow-sm"
                          style={{ backgroundColor: sColor + '15', color: sColor, border: `1px solid ${sColor}44` }}>
                      <span className={`w-2 h-2 rounded-full ${isPaused ? '' : 'animate-pulse'}`} style={{ backgroundColor: sColor }}></span>
                      {isOff ? 'SIN DATOS' : isPaused ? 'PAUSED' : (state || 'idle').toUpperCase()}
                    </span>
                    
                    {canalIcon && (
                      <span className="text-[9px] sm:text-[10px] px-2 sm:px-2.5 py-1.5 rounded-md border shadow-sm"
                            style={{ backgroundColor: canalIcon.color + '10', color: canalIcon.color, borderColor: canalIcon.color + '33' }}>
                        {canalIcon.symbol} {canal.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {!isOff && (
                    <button 
                      onClick={togglePause}
                      disabled={isUpdating}
                      className={`w-full px-4 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-bold tracking-wider rounded-md transition-all duration-300 border ${
                        isUpdating ? 'opacity-50 cursor-not-allowed' :
                        isPaused 
                          ? 'bg-[#2ecc71]/10 text-[#2ecc71] border-[#2ecc71]/50 hover:bg-[#2ecc71]/20 hover:shadow-[0_0_15px_rgba(46,204,113,0.3)]'
                          : 'bg-[#e74c3c]/10 text-[#e74c3c] border-[#e74c3c]/50 hover:bg-[#e74c3c]/20 hover:shadow-[0_0_15px_rgba(231,76,60,0.3)]'
                      }`}
                    >
                      {isUpdating ? 'UPDATING...' : isPaused ? '▶ RESUME AGENT' : '⏸ PAUSE AGENT'}
                    </button>
                  )}
                </div>

                {extra?.actionText && !isPaused && (
                  <div className="text-xs text-[#bbb] font-mono flex items-start gap-3 bg-[#1a1a2e]/30 p-3 mt-4 rounded-md border border-[#2a2a4e]/50">
                    <span className="text-[#4ecdc4] mt-0.5 animate-pulse">❯</span>
                    <span className="typing-effect leading-relaxed">{extra.actionText}</span>
                  </div>
                )}
                
                {isPaused && (
                  <div className="text-[10px] sm:text-[11px] text-[#e74c3c] mt-4 flex items-start gap-3 bg-[#e74c3c]/10 p-3 rounded-md border border-[#e74c3c]/30">
                    <span className="text-sm">⚠</span> 
                    <span className="leading-relaxed">Agente detenido. No procesará nuevos mensajes ni ejecutará herramientas hasta ser reanudado.</span>
                  </div>
                )}
              </div>

              {/* FinOps / Token Usage */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-[10px] text-[#4a4a6a] font-bold tracking-[0.2em]">FINOPS (1H COST)</span>
                  {extra?.tokens_1h > 10000 && <span className="text-[#e74c3c] animate-pulse bg-[#e74c3c]/10 px-2 py-0.5 rounded text-[9px] font-bold">⚠ HIGH CONSUMPTION</span>}
                </div>
                <div className="bg-[#050508]/80 border border-[#1a1a2e] rounded-xl agent-modal-section">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 sm:gap-0 mb-4">
                    <span className="text-xl sm:text-2xl font-bold text-[#f1c40f] drop-shadow-[0_0_5px_rgba(241,196,15,0.3)]">~{(extra?.tokens_1h || 0).toLocaleString()}</span>
                    <span className="text-[9px] sm:text-[10px] text-[#8a8aaa] tracking-widest font-semibold">ESTIMATED TOKENS</span>
                  </div>
                  <LoadBar value={extra?.tokens_1h || 0} max={15000} colorMode="finops" />
                  <div className="flex justify-between text-[8px] sm:text-[9px] text-[#4a4a6a] mt-2 sm:mt-3 font-semibold">
                    <span>0</span>
                    <span>7.5K</span>
                    <span>15K+</span>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="space-y-3">
                <div className="text-[10px] text-[#4a4a6a] font-bold tracking-[0.2em]">PERFORMANCE METRICS</div>
                <div className="agent-metrics-grid">
                  <MetricBox label="MSGS/2M" value={extra?.msgs2min || 0} color="#2ecc71" />
                  <MetricBox label="MSGS/5M" value={extra?.msgs5min || 0} color="#4ecdc4" />
                  <MetricBox label="MSGS/1H" value={extra?.msgs1h || 0} color="#74b9ff" />
                  <MetricBox label="SENT/24H" value={extra?.msgs24hAgent || 0} color="#a29bfe" />
                  <MetricBox label="RECV/24H" value={extra?.msgs24hUser || 0} color="#fd79a8" />
                  <MetricBox label="OPEN CONVS" value={extra?.convsOpen || 0} color="#fdcb6e" />
                </div>
              </div>

              {/* Agent Status & Timing */}
              <div className="space-y-3">
                <div className="text-[10px] text-[#4ecdc4] font-bold tracking-[0.2em] flex items-center gap-2">
                  🕒 ESTADO Y TIEMPO
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#050508]/80 rounded-xl p-3 border border-[#1a1a2e] flex flex-col items-center justify-center">
                    <div className="text-sm font-bold mb-1" style={{ 
                      color: extra?.number_is_active ? "#2ecc71" : "#e74c3c" 
                    }}>
                      {extra?.number_is_active ? "🟢 ACTIVO" : "🔴 INACTIVO"}
                    </div>
                    <div className="text-[8px] text-[#6a6a8a] tracking-widest text-center font-bold">NÚMERO</div>
                  </div>
                  <div className="bg-[#050508]/80 rounded-xl p-3 border border-[#1a1a2e] flex flex-col items-center justify-center">
                    <div className="text-sm font-bold mb-1" style={{ 
                      color: getTimeColor(extra?.minutes_without_response || -1)
                    }}>
                      {formatTimeWithoutResponse(extra?.minutes_without_response || -1)}
                    </div>
                    <div className="text-[8px] text-[#6a6a8a] tracking-widest text-center font-bold">SIN RESPONDER</div>
                  </div>
                </div>
                {extra?.last_agent_message_time && (
                  <div className="text-[9px] text-[#8a8aaa] bg-[#050508]/50 border border-[#1a1a2e] rounded-lg p-2 text-center">
                    Última respuesta: {new Date(extra.last_agent_message_time).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Critical Business Metrics */}
              <div className="space-y-3">
                <div className="text-[10px] text-[#e74c3c] font-bold tracking-[0.2em] flex items-center gap-2">
                  ⚠ TRAZABILIDAD & FALLOS
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricBox 
                    label="SIN RESPUESTA" 
                    value={extra?.unanswered_msgs || 0} 
                    color={extra?.unanswered_msgs > 0 ? "#e74c3c" : "#2ecc71"} 
                  />
                  <MetricBox 
                    label="ABANDONADAS" 
                    value={extra?.abandoned_convs || 0} 
                    color={extra?.abandoned_convs > 0 ? "#e74c3c" : "#2ecc71"} 
                  />
                </div>
                {(extra?.unanswered_msgs > 0 || extra?.abandoned_convs > 0) && (
                  <div className="text-[9px] text-[#e74c3c] bg-[#e74c3c]/10 border border-[#e74c3c]/30 rounded-lg p-3 flex items-center gap-2">
                    <span className="animate-pulse">⚠</span>
                    <span>REQUIERE ATENCIÓN: Posibles fallos en n8n o problemas de conectividad</span>
                  </div>
                )}
              </div>
                
              {/* Load Bar */}
              <div className="space-y-3">
                <div className="bg-[#050508]/80 rounded-xl border border-[#1a1a2e] agent-modal-section">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 mb-4">
                    <span className="text-[10px] text-[#4a4a6a] font-bold tracking-widest">WORKLOAD LEVEL</span>
                    <span className="text-[10px] sm:text-[11px] font-bold bg-[#1a1a2e] px-3 sm:px-4 py-2 rounded-md w-fit" style={{ color: getLoadColor(extra?.convsActive5min || 0, 10) }}>
                      {extra?.convsActive5min || 0} ACTIVE
                    </span>
                  </div>
                  <LoadBar value={extra?.convsActive5min || 0} max={10} />
                </div>
              </div>

              {/* System Info */}
              <div className="flex flex-col space-y-4">
                <div className="text-[10px] text-[#4a4a6a] font-bold tracking-[0.2em]">SYSTEM INFO</div>
                <div className="bg-[#050508]/80 rounded-xl border border-[#1a1a2e] agent-modal-section flex flex-col space-y-4">
                  <InfoRow label="MODEL" value={(agent.llm || '').split('/').pop() || 'Unknown'} />
                  <InfoRow label="CANAL" value={agent.canal || 'N/A'} />
                  <InfoRow label="TIMEZONE" value={extra?.timezone || 'N/A'} />
                  <InfoRow label="TELÉFONO" value={extra?.telefono || 'N/A'} />
                  <InfoRow label="EMPRESA" value={extra?.empresa || 'N/A'} />
                  {extra?.lastTool && <InfoRow label="LAST TOOL" value={extra.lastTool} />}
                  <InfoRow 
                    label="LAST SYNC" 
                    value={agent.last_activity ? new Date(agent.last_activity).toLocaleTimeString() : 'N/A'} 
                  />
                </div>
              </div>
            </>
          ) : (
            /* Thought Traces Tab (Console style) */
            <div className="bg-[#000] border border-[#1a1a2e] rounded-xl p-4 sm:p-5 font-mono min-h-[350px] sm:min-h-[400px] flex flex-col shadow-inner relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#a29bfe]/30 to-transparent"></div>
              
              <div className="text-[10px] sm:text-[11px] text-[#a29bfe] mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3 border-b border-[#1a1a2e] pb-3 sm:pb-4 tracking-widest font-bold">
                <span className="animate-pulse">▶</span> 
                <span className="hidden sm:inline">LIVE EXECUTION LOGS (LAST 5 MIN)</span>
                <span className="sm:hidden">EXECUTION LOGS</span>
              </div>
              
              <div className="space-y-4 sm:space-y-5 flex-1 pr-2">
                {!extra?.thought_traces || extra.thought_traces.length === 0 ? (
                  <div className="text-xs text-[#4a4a6a] italic flex items-center justify-center h-32 sm:h-40 bg-[#050508]/50 rounded-lg border border-[#1a1a2e] border-dashed">
                    No hay logs de ejecución recientes.
                  </div>
                ) : (
                  extra.thought_traces.map((trace, i) => (
                    <div key={i} className="text-[10px] sm:text-[11px] border-l-2 border-[#2a2a4e] pl-4 sm:pl-5 py-2 sm:py-3 bg-[#050508]/30 rounded-r-lg hover:bg-[#0a0a14] transition-colors">
                      <div className="text-[#8a8aaa] mb-2 sm:mb-3 flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <span className="font-bold opacity-70">[ {new Date(trace.ts).toLocaleTimeString()} ]</span>
                          {trace.tools && <span className="text-[#e67e22] text-[8px] sm:text-[9px] font-bold tracking-wider bg-[#e67e22]/10 border border-[#e67e22]/30 px-2 py-0.5 rounded w-fit">TOOL_CALL</span>}
                        </div>
                        {/* Traceability Info */}
                        <div className="flex flex-wrap gap-2 text-[8px] opacity-60">
                          {trace.contacto_id && (
                            <span className="bg-[#4ecdc4]/10 text-[#4ecdc4] px-2 py-0.5 rounded border border-[#4ecdc4]/20">
                              CONTACT: {trace.contacto_id}
                            </span>
                          )}
                          <span className="bg-[#74b9ff]/10 text-[#74b9ff] px-2 py-0.5 rounded border border-[#74b9ff]/20">
                            CONV: {trace.conversacion_id}
                          </span>
                        </div>
                      </div>
                      <div className="text-[#dcdcdc] whitespace-pre-wrap break-words leading-relaxed font-light text-xs">
                        {trace.content || (trace.tools ? '<Empty response, executing tool...>' : '<Empty>')}
                      </div>
                      {trace.tools && (
                        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-[#0a0a14] rounded-md border border-[#1a1a2e] text-[#a29bfe] text-[10px] sm:text-[11px] overflow-x-auto shadow-inner">
                          {typeof trace.tools === 'string' ? trace.tools : JSON.stringify(trace.tools, null, 2)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }) {
  return (
    <div className="bg-[#050508]/80 rounded-xl p-3 border border-[#1a1a2e] flex flex-col items-center justify-center transition-all duration-300 hover:border-[#2a2a4e] hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)] group">
      <div className="text-xl font-bold drop-shadow-md mb-1 transition-transform group-hover:scale-110" style={{ color }}>{value}</div>
      <div className="text-[8px] sm:text-[9px] text-[#6a6a8a] tracking-widest text-center font-bold">{label}</div>
    </div>
  );
}

function getLoadColor(value, max) {
  const percentage = (value / max) * 100;
  if (percentage < 30) return '#2ecc71'; // Green
  if (percentage < 70) return '#f39c12'; // Orange  
  return '#e74c3c'; // Red
}

function formatTimeWithoutResponse(minutes) {
  if (minutes === -1) return 'NUNCA';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function getTimeColor(minutes) {
  if (minutes === -1) return '#6a6a8a'; // Gray - never responded
  if (minutes < 5) return '#2ecc71'; // Green - very recent
  if (minutes < 30) return '#f39c12'; // Orange - moderate
  if (minutes < 120) return '#e67e22'; // Orange-red - concerning
  return '#e74c3c'; // Red - critical
}

function LoadBar({ value, max, colorMode = 'load' }) {
  const pct = Math.min(value / max, 1);
  
  let color;
  if (colorMode === 'finops') {
    color = pct >= 0.8 ? '#e74c3c' : pct >= 0.5 ? '#f39c12' : '#2ecc71';
  } else {
    color = getLoadColor(value, max);
  }
  
  // Render segmented bar for sci-fi look
  const segments = 20;
  const activeSegments = Math.floor(pct * segments);
  
  return (
    <div className="flex gap-0.5 h-2">
      {Array.from({ length: segments }).map((_, i) => (
        <div 
          key={i} 
          className="flex-1 rounded-sm transition-all duration-300"
          style={{ 
            backgroundColor: i < activeSegments ? color : '#1a1a2e',
            boxShadow: i < activeSegments ? `0 0 4px ${color}88` : 'none',
            opacity: i < activeSegments ? 1 : 0.5
          }}
        />
      ))}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[#1a1a2e] last:border-0 last:pb-0">
      <span className="text-[9px] text-[#4a4a6a] tracking-widest">{label}</span>
      <span className="text-[10px] text-[#8a8aaa] max-w-[200px] truncate text-right font-semibold">{value}</span>
    </div>
  );
}
