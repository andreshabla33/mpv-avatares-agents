import { CANAL_ICONS } from '../data/agents';
import { STATUS_COLORS, STATUS_LABELS } from '../data/statusConfig';

export default function ActivityFeed({ log, kpis, apiAvailable: _apiAvailable }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--pixel-bg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* KPI Dashboard */}
      <div style={{
        padding: '12px',
        borderBottom: '2px solid var(--pixel-border)',
        flexShrink: 0
      }}>
        <div style={{
          fontSize: '22px',
          color: 'var(--pixel-accent)',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          textShadow: 'var(--pixel-shadow)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            background: 'var(--pixel-accent)',
            boxShadow: 'var(--pixel-shadow)'
          }}></span>
          MISSION CONTROL
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}>
          <KpiBox label="Msgs/1h" value={kpis.total_msgs_1h} color="var(--pixel-text)" />
          <KpiBox label="Msgs/24h" value={kpis.total_msgs_24h} color="var(--pixel-text)" />
          <KpiBox label="Convos" value={kpis.total_convs_open} color="var(--pixel-text)" />
          <KpiBox label="Activos" value={kpis.active_agents} total={kpis.total_agents} color="var(--pixel-green)" />
        </div>
        {kpis.overloaded_agents > 0 && (
          <div style={{
            marginTop: '12px',
            padding: '6px',
            background: 'var(--pixel-danger-bg)',
            color: '#fff',
            fontSize: '18px',
            textAlign: 'center',
            border: '2px solid #fff',
            boxShadow: 'var(--pixel-shadow)'
          }}>
            ! {kpis.overloaded_agents} OVERLOADED
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}>
        <div style={{
          padding: '8px 12px',
          borderBottom: '2px solid var(--pixel-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '20px', color: 'var(--pixel-text-dim)' }}>
            ACTIVITY LOG
          </span>
        </div>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }} className="custom-scrollbar">
          {log.length === 0 ? (
            <div style={{
              fontSize: '20px',
              color: 'var(--pixel-text-dim)',
              textAlign: 'center',
              marginTop: '24px'
            }}>
              Waiting for activity...
            </div>
          ) : (
            log.map(entry => (
              <LogEntry key={entry.id} entry={entry} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function KpiBox({ label, value, total, color }) {
  return (
    <div style={{
      background: 'var(--pixel-btn-bg)',
      padding: '6px 8px',
      border: '2px solid var(--pixel-border)'
    }}>
      <div style={{ fontSize: '16px', color: 'var(--pixel-text-dim)' }}>{label}</div>
      <div style={{ fontSize: '24px', color, textShadow: 'var(--pixel-shadow)' }}>
        {typeof value === 'number' ? value.toLocaleString() : value || 0}
        {total !== undefined && (
          <span style={{ fontSize: '18px', color: 'var(--pixel-text-dim)' }}>/{total}</span>
        )}
      </div>
    </div>
  );
}

function LogEntry({ entry }) {
  const _statusColor = STATUS_COLORS[entry.status] || '#636e72';
  const _canalIcon = entry.canal && CANAL_ICONS[entry.canal];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '8px',
      paddingBottom: '6px',
      borderBottom: '2px dashed var(--pixel-border)'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        marginTop: '6px',
        flexShrink: 0,
        background: entry.agentColor,
        boxShadow: 'var(--pixel-shadow)'
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '16px', color: 'var(--pixel-text-dim)' }}>{entry.ts}</span>
        </div>
        <div style={{ fontSize: '20px', color: entry.agentColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: 'var(--pixel-shadow)' }}>
          {entry.agentName}
        </div>
        <div style={{ fontSize: '18px', color: 'var(--pixel-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {entry.text}
        </div>
      </div>
    </div>
  );
}
