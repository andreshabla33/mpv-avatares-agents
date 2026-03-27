import { useState } from 'react';
import { CANAL_ICONS } from '../data/agents';
import { STATUS_COLORS } from '../data/statusConfig';
import VoiceControl from './VoiceControl';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export default function AgentDetail({ agent, state, extra, onClose, onStateChange }) {
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'thoughts'
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  if (!agent) return null;

  const isOff = !agent.hasRealData;
  const isPaused = state === 'paused';
  const displayState = isPaused ? 'paused' : state;
  const sColor = STATUS_COLORS[displayState] || '#636e72';
  const canal = extra?.canal;
  const canalIcon = canal && CANAL_ICONS[canal];

  const togglePause = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    setError(null);

    const action = isPaused ? 'resume' : 'pause';
    const agentId = agent.agente_id || agent.db_id;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      if (onStateChange) {
        onStateChange(agent.id, isPaused ? 'idle' : 'paused');
      }
    } catch (e) {
      console.error('agent-control error:', e);
      setError(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.7)',
      padding: '20px'
    }} onClick={onClose}>
      <div
        style={{
          background: 'var(--pixel-bg)',
          border: '2px solid var(--pixel-border)',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--pixel-shadow)',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Section */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '16px',
            position: 'relative',
            borderBottom: '2px solid var(--pixel-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10, width: '100%', paddingRight: '40px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: agent.color + '22',
                border: `2px solid ${agent.color}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                color: agent.color,
                textShadow: 'var(--pixel-shadow)'
              }}>
                {agent.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '28px',
                  color: agent.color,
                  textShadow: 'var(--pixel-shadow)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {agent.name.toUpperCase()}
                </div>
                <div style={{ fontSize: '18px', color: 'var(--pixel-text-dim)', display: 'flex', gap: '8px' }}>
                  <span>{agent.role || 'GENERAL AGENT'}</span>
                  <span>//</span>
                  <span>ID: {agent.db_id || agent.id}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--pixel-close-text)',
                fontSize: '32px',
                cursor: 'pointer',
                zIndex: 20
              }}
            >
              ×
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid var(--pixel-border)' }}>
            <button
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'metrics' ? 'var(--pixel-btn-hover-bg)' : 'transparent',
                border: 'none',
                borderRight: '2px solid var(--pixel-border)',
                color: activeTab === 'metrics' ? 'var(--pixel-accent)' : 'var(--pixel-text-dim)',
                fontSize: '20px',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('metrics')}
            >
              METRICS & CONTROL
            </button>
            <button
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'thoughts' ? 'var(--pixel-btn-hover-bg)' : 'transparent',
                border: 'none',
                color: activeTab === 'thoughts' ? 'var(--pixel-accent)' : 'var(--pixel-text-dim)',
                fontSize: '20px',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('thoughts')}
            >
              THOUGHT TRACES
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="custom-scrollbar">
          {activeTab === 'metrics' ? (
            <>

              {/* Status & Control Section */}
              <div style={{ background: 'var(--pixel-btn-bg)', border: '2px solid var(--pixel-border)', padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 12px',
                      background: 'var(--pixel-bg)',
                      border: `2px solid ${sColor}`,
                      color: sColor,
                      fontSize: '18px'
                    }}>
                      {isOff ? 'SIN DATOS' : isPaused ? 'PAUSED' : (state || 'idle').toUpperCase()}
                    </span>

                    {canalIcon && (
                      <span style={{
                        padding: '4px 12px',
                        background: 'var(--pixel-bg)',
                        border: `2px solid ${canalIcon.color}`,
                        color: canalIcon.color,
                        fontSize: '18px'
                      }}>
                        {canalIcon.symbol} {canal.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {!isOff && (
                    <>

                      <button
                        onClick={togglePause}
                        disabled={isUpdating}
                        style={{
                          width: '100%',
                          padding: '8px 16px',
                          fontSize: '20px',
                          background: isUpdating ? 'var(--pixel-bg)' : isPaused ? 'rgba(46,204,113,0.1)' : 'var(--pixel-danger-bg)',
                          border: `2px solid ${isUpdating ? 'var(--pixel-border)' : isPaused ? '#2ecc71' : '#ff4444'}`,
                          color: isUpdating ? 'var(--pixel-text-dim)' : isPaused ? '#2ecc71' : '#fff',
                          cursor: isUpdating ? 'default' : 'pointer',
                          boxShadow: 'var(--pixel-shadow)'
                        }}
                      >
                        {isUpdating ? '⏳ UPDATING...' : isPaused ? '▶ RESUME AGENT' : '⏸ PAUSE AGENT'}
                      </button>
                      {error && (
                        <div style={{ color: '#ff4444', background: 'rgba(255,0,0,0.1)', padding: '8px', border: '2px solid #ff4444', fontSize: '18px', marginTop: '4px' }}>
                          ⚠ {error}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {extra?.actionText && !isPaused && (
                  <div style={{ color: 'var(--pixel-text)', display: 'flex', gap: '8px', background: 'var(--pixel-bg)', padding: '12px', marginTop: '12px', border: '2px solid var(--pixel-border)', fontSize: '18px' }}>
                    <span style={{ color: 'var(--pixel-accent)' }}>{'>'}</span>
                    <span className="typing-effect">{extra.actionText}</span>
                  </div>
                )}

                {isPaused && (
                  <div style={{ color: '#ff4444', background: 'rgba(255,0,0,0.1)', padding: '12px', marginTop: '12px', border: '2px dashed #ff4444', fontSize: '18px', display: 'flex', gap: '8px' }}>
                    <span>⚠</span>
                    <span>Agente detenido. No procesará nuevos mensajes ni ejecutará herramientas hasta ser reanudado.</span>
                  </div>
                )}
              </div>

              {/* Voice Control Section */}
              <div style={{ background: 'var(--pixel-btn-bg)', border: '2px solid var(--pixel-border)', padding: '16px' }}>
                <VoiceControl agenteId={agent.agente_id || agent.db_id || agent.id} agentName={agent.name} />
              </div>

              {/* FinOps / Token Usage */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '20px', color: 'var(--pixel-text-dim)' }}>FINOPS (1H COST)</span>
                  {extra?.tokens_1h > 10000 && <span style={{ color: '#ff4444', background: 'rgba(255,0,0,0.1)', padding: '2px 8px', fontSize: '16px', border: '2px solid #ff4444' }}>⚠ HIGH CONSUMPTION</span>}
                </div>
                <div style={{ background: 'var(--pixel-btn-bg)', border: '2px solid var(--pixel-border)', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                    <span style={{ fontSize: '32px', color: '#f1c40f', textShadow: 'var(--pixel-shadow)' }}>~{(extra?.tokens_1h || 0).toLocaleString()}</span>
                    <span style={{ fontSize: '18px', color: 'var(--pixel-text-dim)' }}>ESTIMATED TOKENS</span>
                  </div>
                  <LoadBar value={extra?.tokens_1h || 0} max={15000} colorMode="finops" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: 'var(--pixel-text-dim)', marginTop: '8px' }}>
                    <span>0</span>
                    <span>7.5K</span>
                    <span>15K+</span>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '20px', color: 'var(--pixel-text-dim)' }}>PERFORMANCE METRICS</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <MetricBox label="MSGS/2M" value={extra?.msgs2min || 0} color="#2ecc71" />
                  <MetricBox label="MSGS/5M" value={extra?.msgs5min || 0} color="#4ecdc4" />
                  <MetricBox label="MSGS/1H" value={extra?.msgs1h || 0} color="#74b9ff" />
                  <MetricBox label="SENT/24H" value={extra?.msgs24hAgent || 0} color="#a29bfe" />
                  <MetricBox label="RECV/24H" value={extra?.msgs24hUser || 0} color="#fd79a8" />
                  <MetricBox label="OPEN CONVS" value={extra?.convsOpen || 0} color="#fdcb6e" />
                </div>
              </div>

              {/* Agent Status & Timing */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '20px', color: 'var(--pixel-accent)' }}>
                  ESTADO Y TIEMPO
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: 'var(--pixel-btn-bg)', border: '2px solid var(--pixel-border)', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '22px', color: extra?.number_is_active ? "#2ecc71" : "#e74c3c", marginBottom: '4px' }}>
                      {extra?.number_is_active ? "ACTIVO" : "INACTIVO"}
                    </div>
                    <div style={{ fontSize: '16px', color: 'var(--pixel-text-dim)' }}>NÚMERO</div>
                  </div>
                  <div style={{ background: 'var(--pixel-btn-bg)', border: '2px solid var(--pixel-border)', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '22px', color: getTimeColor(extra?.minutes_without_response || -1), marginBottom: '4px' }}>
                      {formatTimeWithoutResponse(extra?.minutes_without_response || -1)}
                    </div>
                    <div style={{ fontSize: '16px', color: 'var(--pixel-text-dim)' }}>SIN RESPONDER</div>
                  </div>
                </div>
                {extra?.last_agent_message_time && (
                  <div style={{ fontSize: '16px', color: 'var(--pixel-text-dim)', background: 'var(--pixel-bg)', border: '2px dashed var(--pixel-border)', padding: '8px', textAlign: 'center' }}>
                    Última respuesta: {new Date(extra.last_agent_message_time).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Critical Business Metrics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '20px', color: 'var(--pixel-danger-bg)' }}>
                  ⚠ TRAZABILIDAD & FALLOS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
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
                  <div style={{ fontSize: '18px', color: '#ff4444', background: 'rgba(255,0,0,0.1)', border: '2px solid #ff4444', padding: '12px', display: 'flex', gap: '8px' }}>
                    <span>⚠</span>
                    <span>REQUIERE ATENCIÓN: Posibles fallos en n8n o problemas de conectividad</span>
                  </div>
                )}
              </div>

              {/* Load Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: 'var(--pixel-btn-bg)', border: '2px solid var(--pixel-border)', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px', color: 'var(--pixel-text-dim)' }}>WORKLOAD LEVEL</span>
                    <span style={{ fontSize: '22px', background: 'var(--pixel-bg)', border: '2px solid var(--pixel-border)', padding: '4px 12px', color: getLoadColor(extra?.convsActive5min || 0, 10) }}>
                      {extra?.convsActive5min || 0} ACTIVE
                    </span>
                  </div>
                  <LoadBar value={extra?.convsActive5min || 0} max={10} />
                </div>
              </div>

              {/* System Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '20px', color: 'var(--pixel-text-dim)' }}>SYSTEM INFO</div>
                <div style={{ background: 'var(--pixel-btn-bg)', border: '2px solid var(--pixel-border)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <InfoRow label="EMPRESA" value={extra?.empresa || 'N/A'} />
                  <InfoRow label="RUBRO" value={extra?.rubro || 'N/A'} />
                  <InfoRow label="PAÍS" value={extra?.pais || 'N/A'} />
                  <InfoRow label="AGENTE" value={extra?.nombre_agente || agent.name || 'N/A'} />
                  <InfoRow label="ROL" value={extra?.role || agent.role || 'N/A'} />
                  <InfoRow label="LLM" value={(extra?.llm || agent.llm || '').split('/').pop() || 'Unknown'} />
                  {extra?.lastTool && <InfoRow label="LAST TOOL" value={extra.lastTool} />}
                </div>
              </div>
            </>
          ) : (
            /* Thought Traces Tab (Console style) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '22px', color: 'var(--pixel-accent)', borderBottom: '2px dashed var(--pixel-border)', paddingBottom: '8px', display: 'flex', gap: '8px' }}>
                <span>{'>'}</span>
                <span>LIVE EXECUTION LOGS (LAST 5 MIN)</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {!extra?.thought_traces || extra.thought_traces.length === 0 ? (
                  <div style={{ fontSize: '20px', color: 'var(--pixel-text-dim)', textAlign: 'center', padding: '32px', background: 'var(--pixel-bg)', border: '2px dashed var(--pixel-border)' }}>
                    No hay logs de ejecución recientes.
                  </div>
                ) : (
                  extra.thought_traces.map((trace, i) => (
                    <div key={i} style={{ borderLeft: '4px solid var(--pixel-border)', paddingLeft: '12px', background: 'var(--pixel-bg)', padding: '12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '18px', color: 'var(--pixel-text-dim)' }}>[ {new Date(trace.ts).toLocaleTimeString()} ]</span>
                          {trace.tools && <span style={{ color: '#ff9900', background: 'rgba(255,153,0,0.1)', border: '2px solid #ff9900', padding: '2px 8px', fontSize: '16px' }}>TOOL_CALL</span>}
                        </div>
                        {/* Traceability Info */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '16px' }}>
                          {trace.contacto_id && (
                            <span style={{ color: 'var(--pixel-accent)', border: '2px solid var(--pixel-accent)', padding: '2px 8px', background: 'var(--pixel-btn-bg)' }}>
                              CONTACT: {trace.contacto_id}
                            </span>
                          )}
                          <span style={{ color: '#74b9ff', border: '2px solid #74b9ff', padding: '2px 8px', background: 'var(--pixel-btn-bg)' }}>
                            CONV: {trace.conversacion_id}
                          </span>
                        </div>
                      </div>
                      <div style={{ color: 'var(--pixel-text)', fontSize: '18px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {trace.content || (trace.tools ? '<Empty response, executing tool...>' : '<Empty>')}
                      </div>
                      {trace.tools && (
                        <div style={{ marginTop: '12px', background: '#000', border: '2px solid var(--pixel-border)', padding: '12px', color: 'var(--pixel-accent)', fontSize: '16px', overflowX: 'auto' }} className="custom-scrollbar">
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
    <div style={{ background: 'var(--pixel-btn-bg)', border: '2px solid var(--pixel-border)', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ fontSize: '28px', color, textShadow: 'var(--pixel-shadow)', marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '16px', color: 'var(--pixel-text-dim)' }}>{label}</div>
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
  if (minutes === -1) return 'var(--pixel-text-dim)'; // Gray - never responded
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

  // Render solid bar for pixel look
  return (
    <div style={{ width: '100%', height: '16px', background: 'var(--pixel-bg)', border: '2px solid var(--pixel-border)', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, bottom: 0,
        width: `${pct * 100}%`,
        background: color,
        borderRight: pct > 0 ? `2px solid var(--pixel-bg)` : 'none'
      }} />
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '2px dashed var(--pixel-border)' }}>
      <span style={{ fontSize: '18px', color: 'var(--pixel-text-dim)' }}>{label}</span>
      <span style={{ fontSize: '20px', color: 'var(--pixel-text)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{value}</span>
    </div>
  );
}
