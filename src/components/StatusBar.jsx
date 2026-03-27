import { CANAL_ICONS } from '../data/agents';
import { STATUS_COLORS, STATUS_ICONS } from '../data/statusConfig';

const CANAL_LABELS = {
  whatsapp: 'WA', instagram: 'IG', messenger: 'MS',
  manychat: 'MC', web_chat: 'Web', facebook: 'FB',
  sms: 'SMS', email: 'Email',
};

export default function StatusBar({ agents, agentStates, extras, apiAvailable, kpis }) {
  const activeAgents = agents.filter(a => a.hasRealData);
  const offAgents = agents.filter(a => !a.hasRealData);

  return (
    <div style={{
      width: '100%',
      background: 'var(--pixel-bg)',
      borderTop: '2px solid var(--pixel-border)',
      overflow: 'hidden',
      padding: '4px 8px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 8px',
        borderBottom: '2px dashed var(--pixel-border)'
      }}>
        <span style={{ fontSize: '20px', color: 'var(--pixel-text-dim)' }}>
          {apiAvailable ? '● LIVE — UAL Office Virtual Agent' : '○ DEMO MODE — No API Connection'}
        </span>
        <span style={{ fontSize: '20px', color: 'var(--pixel-text-dim)' }}>
          {activeAgents.length} active · {offAgents.length} off · {kpis?.total_msgs_1h || 0} msgs/h
        </span>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '8px',
        flexWrap: 'wrap',
        maxHeight: '48px',
        overflow: 'hidden'
      }}>
        {activeAgents.map(agent => {
          const state = agentStates[agent.id] || 'idle';
          const extra = extras[agent.id] || {};
          const activeChannels = (extra.channels || []).filter(c => c.activo !== false);
          const sColor = STATUS_COLORS[state] || '#636e72';
          const sIcon = STATUS_ICONS[state] || '○';
          return (
            <div
              key={agent.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                border: '2px solid var(--pixel-border)',
                background: 'var(--pixel-btn-bg)',
                transition: 'all 0.2s'
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: agent.color,
                  flexShrink: 0,
                  boxShadow: 'var(--pixel-shadow)'
                }}
              />
              <span
                style={{
                  fontSize: '18px',
                  color: agent.color,
                  maxWidth: '80px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textShadow: 'var(--pixel-shadow)'
                }}
              >
                {agent.name}
              </span>
              {activeChannels.slice(0, 3).map((ch, i) => {
                const key = (ch.canal || '').toLowerCase();
                const icon = CANAL_ICONS[key];
                return (
                  <span
                    key={i}
                    style={{
                      fontSize: '16px',
                      padding: '2px 4px',
                      background: 'var(--pixel-bg)',
                      border: `2px solid ${icon?.color || '#aaa'}`,
                      color: icon?.color || '#aaa',
                      flexShrink: 0
                    }}
                  >
                    {ch.canal_short || CANAL_LABELS[key] || key}
                  </span>
                );
              })}
              {activeChannels.length > 3 && (
                <span style={{ fontSize: '16px', color: 'var(--pixel-text-dim)', flexShrink: 0 }}>
                  +{activeChannels.length - 3}
                </span>
              )}
              <span style={{ fontSize: '18px', color: sColor, flexShrink: 0, textShadow: 'var(--pixel-shadow)' }}>
                {sIcon}
              </span>
              {extra.convsActive5min > 0 && (
                <span style={{ fontSize: '16px', color: 'var(--pixel-accent)', flexShrink: 0 }}>
                  {extra.convsActive5min}c
                </span>
              )}
            </div>
          );
        })}
        {offAgents.length > 0 && (
          <span style={{ fontSize: '18px', color: 'var(--pixel-text-dim)', padding: '0 8px' }}>
            +{offAgents.length} off
          </span>
        )}
      </div>
    </div>
  );
}
