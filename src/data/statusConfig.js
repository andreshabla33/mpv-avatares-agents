// Shared status configuration — single source of truth
// Used by: AgentRenderer, AgentDetail, ActivityFeed, StatusBar

export const STATUS_COLORS = {
  responding: '#2ecc71',
  scheduling: '#3498db',
  qualifying: '#9b59b6',
  sending: '#e67e22',
  thinking: '#1abc9c',
  working: '#2ecc71',
  waiting: '#f39c12',
  overloaded: '#e74c3c',
  idle: '#636e72',
  paused: '#e74c3c',
};

export const STATUS_LABELS = {
  responding: 'RESPONDING',
  scheduling: 'SCHEDULING',
  qualifying: 'QUALIFYING',
  sending: 'SENDING',
  thinking: 'THINKING',
  working: 'WORKING',
  waiting: 'WAITING',
  overloaded: 'OVERLOADED',
  idle: 'IDLE',
  paused: 'PAUSED',
};

export const STATUS_ICONS = {
  responding: '●', scheduling: '◈', qualifying: '◆',
  sending: '▶', thinking: '◎', working: '●',
  waiting: '◌', overloaded: '⚠', idle: '○',
  paused: '⏸',
};
