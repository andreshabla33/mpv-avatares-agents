// Colores asignados a cada agente por su rol/tipo
const AGENT_COLORS = [
  '#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8',
  '#00cec9', '#e17055', '#6c5ce7', '#00b894', '#fdcb6e',
  '#e84393', '#74b9ff', '#55efc4', '#fab1a0', '#81ecec',
  '#d4a5ff', '#ffa94d', '#69db7c', '#ff8787', '#66d9e8',
  '#c0eb75', '#fcc2d7', '#b2f2bb', '#e599f7', '#99e9f2',
];

// Posiciones de escritorio — alineadas con drawOfficeLayout (deskStartX=100, colSpacing=130, rowSpacing=110)
const DESK_POSITIONS = [
  // Row 0: x=100+col*130+32, y=290+row*110+36 (chair position = agent stands at chair)
  { x: 152, y: 326 }, { x: 282, y: 326 }, { x: 412, y: 326 }, { x: 542, y: 326 },
  // Row 1
  { x: 152, y: 436 }, { x: 282, y: 436 }, { x: 412, y: 436 }, { x: 542, y: 436 },
  // Row 2
  { x: 152, y: 546 }, { x: 282, y: 546 }, { x: 412, y: 546 }, { x: 542, y: 546 },
];

// Posiciones fijas en la sala OFF (wall: 740-1070, 220-680)
const OFF_POSITIONS = [
  { x: 790, y: 360 }, { x: 840, y: 360 }, { x: 890, y: 360 }, { x: 940, y: 360 }, { x: 990, y: 360 },
  { x: 790, y: 410 }, { x: 840, y: 410 }, { x: 890, y: 410 }, { x: 940, y: 410 }, { x: 990, y: 410 },
  { x: 790, y: 460 }, { x: 840, y: 460 }, { x: 890, y: 460 }, { x: 940, y: 460 }, { x: 990, y: 460 },
  { x: 790, y: 510 }, { x: 840, y: 510 }, { x: 890, y: 510 }, { x: 940, y: 510 }, { x: 990, y: 510 },
  { x: 790, y: 560 }, { x: 840, y: 560 }, { x: 890, y: 560 }, { x: 940, y: 560 }, { x: 990, y: 560 },
];

// Agentes fallback si la API no responde
export const FALLBACK_AGENTS = [
  { id: 'agent-4',  name: 'Natalia',             role: 'Agendamiento',       color: '#4ecdc4' },
  { id: 'agent-12', name: 'Camila',              role: 'Precalificador',     color: '#ff6b6b' },
  { id: 'agent-24', name: 'Dra Smile',           role: 'Scheduler',          color: '#ffe66d' },
  { id: 'agent-7',  name: 'Monica URPE',         role: 'Cerrador',           color: '#a29bfe' },
  { id: 'agent-86', name: 'Monica Real Estate',  role: 'Agendamiento',       color: '#fd79a8' },
  { id: 'agent-5',  name: 'Bob developer',       role: 'Project Manager',    color: '#00cec9' },
  { id: 'agent-32', name: 'Minerva',             role: 'Análisis de datos',  color: '#e17055' },
  { id: 'agent-35', name: 'Eva',                 role: 'Marketing',          color: '#6c5ce7' },
  { id: 'agent-37', name: 'Alejandria',          role: 'Dev Tools',          color: '#00b894' },
  { id: 'agent-38', name: 'Manager',             role: 'PM Ágil',            color: '#fdcb6e' },
];

// Convierte datos crudos de la API a formato del canvas
export function mapAgentsFromAPI(apiAgents) {
  let activeIdx = 0;
  let offIdx = 0;

  return apiAgents.map((agent, i) => {
    const hasRealData = agent.has_real_data === true;
    let desk;

    if (hasRealData) {
      desk = DESK_POSITIONS[activeIdx % DESK_POSITIONS.length];
      activeIdx++;
    } else {
      desk = OFF_POSITIONS[offIdx % OFF_POSITIONS.length];
      offIdx++;
    }

    return {
      id: agent.id,
      db_id: agent.db_id,
      name: agent.name,
      role: agent.role || 'General',
      llm: agent.llm || '',
      canal: agent.canal || null,
      msgs5min: agent.msgs_5min || 0,
      color: AGENT_COLORS[i % AGENT_COLORS.length],
      deskX: desk.x,
      deskY: desk.y,
      hasRealData,
      lastActivity: agent.last_activity || null,
    };
  });
}

// Genera lista fallback con posiciones
export function getFallbackAgents() {
  return FALLBACK_AGENTS.map((agent, i) => {
    const desk = DESK_POSITIONS[i % DESK_POSITIONS.length];
    return { ...agent, role: agent.role, deskX: desk.x, deskY: desk.y, hasRealData: true };
  });
}

export const COMMON_ZONES = [
  { x: 50,  y: 40,  w: 220, h: 150, label: 'meeting' },
  { x: 310, y: 40,  w: 180, h: 150, label: 'office' },
  { x: 530, y: 40,  w: 180, h: 150, label: 'kitchen' },
  { x: 100, y: 210, w: 560, h: 60,  label: 'corridor' },
];

// Iconos de canal para dibujar sobre agente
export const CANAL_ICONS = {
  whatsapp:  { symbol: 'WA', color: '#25D366' },
  instagram: { symbol: 'IG', color: '#E1306C' },
  messenger: { symbol: 'MS', color: '#0084FF' },
  manychat:  { symbol: 'MC', color: '#0088FF' },
  web_chat:  { symbol: 'WB', color: '#4ecdc4' },
  facebook:  { symbol: 'FB', color: '#1877F2' },
  sms:       { symbol: 'SM', color: '#aaa' },
  email:     { symbol: 'EM', color: '#EA4335' },
};
