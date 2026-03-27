// Colores asignados a cada agente por su rol/tipo
const AGENT_COLORS = [
  '#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8',
  '#00cec9', '#e17055', '#6c5ce7', '#00b894', '#fdcb6e',
  '#e84393', '#74b9ff', '#55efc4', '#fab1a0', '#81ecec',
  '#d4a5ff', '#ffa94d', '#69db7c', '#ff8787', '#66d9e8',
  '#c0eb75', '#fcc2d7', '#b2f2bb', '#e599f7', '#99e9f2',
];

// Escritorios agrupados por zona/rol (90px horizontal, 100px vertical spacing)
export const ZONE_DESKS = {
  agendamiento: [
    { x: 120, y: 180 }, { x: 210, y: 180 }, { x: 300, y: 180 },
    { x: 120, y: 280 }, { x: 210, y: 280 }, { x: 300, y: 280 },
  ],
  agendarCita: [
    { x: 470, y: 180 }, { x: 560, y: 180 }, { x: 650, y: 180 },
    { x: 470, y: 280 }, { x: 560, y: 280 }, { x: 650, y: 280 },
  ],
  precalificacion: [
    { x: 120, y: 460 }, { x: 210, y: 460 }, { x: 300, y: 460 },
    { x: 120, y: 560 }, { x: 210, y: 560 }, { x: 300, y: 560 },
  ],
  soporte: [
    { x: 470, y: 460 }, { x: 560, y: 460 }, { x: 650, y: 460 },
    { x: 470, y: 560 }, { x: 560, y: 560 }, { x: 650, y: 560 },
  ],
};

// HOME positions — idle agents sit here (center corridor, between zones)
// These are SEPARATE from zone desks so idle agents don't appear in active zones
const DESK_POSITIONS = [
  { x: 48, y: 112 }, { x: 144, y: 112 }, { x: 240, y: 112 },
  { x: 48, y: 192 }, { x: 144, y: 192 }, { x: 240, y: 192 },
  { x: 48, y: 272 }, { x: 144, y: 272 }, { x: 240, y: 272 },
  { x: 48, y: 352 }, { x: 144, y: 352 }, { x: 240, y: 352 }
];

// Posiciones fijas en la sala OFF (sidebar: x=740-1070, y=140-640)
// Spaced 70px apart for 64px sprites at 2× scale
const OFF_POSITIONS = [
  { x: 400, y: 80 }, { x: 496, y: 80 },
  { x: 400, y: 144 }, { x: 496, y: 144 },
  { x: 400, y: 208 }, { x: 496, y: 208 },
  { x: 432, y: 272 }, { x: 464, y: 272 },
  { x: 400, y: 320 }, { x: 496, y: 320 },
  { x: 432, y: 352 }, { x: 464, y: 352 }
];

export const ERROR_POSITIONS = [
  { x: 592, y: 32 }, { x: 624, y: 32 }, { x: 656, y: 32 },
  { x: 688, y: 32 }, { x: 720, y: 32 }, { x: 752, y: 32 },
  { x: 592, y: 432 }, { x: 624, y: 432 }, { x: 656, y: 432 },
  { x: 688, y: 432 }, { x: 720, y: 432 }, { x: 752, y: 432 }
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
// v10: Agents go to cubicles (working), lounge (idle), or urinals (error/overloaded)
export function mapAgentsFromAPI(apiAgents) {
  const results = [];
  let workIdx = 0;
  let loungeIdx = 0;
  let errorIdx = 0;

  apiAgents.forEach((agent, idx) => {
    const status = agent.status || 'idle';
    const isActive = (agent.active_channels || 0) > 0;
    
    // Determine location based on status
    const isErrorStatus = status === 'error' || status === 'overloaded' || status === 'crashed';
    const isWorkingStatus = status === 'working' || status === 'responding' || status === 'scheduling' || isActive;
    
    let position;
    let locationType;

    if (isErrorStatus) {
      // Error/overloaded agents go to urinals (bathroom)
      position = ERROR_POSITIONS[errorIdx % ERROR_POSITIONS.length];
      errorIdx++;
      locationType = 'error';
    } else if (isWorkingStatus) {
      // Working agents go to their cubicles
      position = DESK_POSITIONS[workIdx % DESK_POSITIONS.length];
      workIdx++;
      locationType = 'work';
    } else {
      // Idle agents go to lounge chairs
      position = OFF_POSITIONS[loungeIdx % OFF_POSITIONS.length];
      loungeIdx++;
      locationType = 'lounge';
    }

    results.push({
      id: agent.id,
      db_id: agent.db_id,
      name: agent.name,
      role: agent.role || 'General',
      llm: agent.llm || '',
      empresa: agent.empresa || '',
      color: AGENT_COLORS[idx % AGENT_COLORS.length],
      deskX: position.x,
      deskY: position.y,
      locationType: locationType,
      hasRealData: isActive,
      lastActivity: agent.last_activity || null,
    });
  });

  return results;
}

// Genera lista fallback con posiciones
export function getFallbackAgents() {
  return FALLBACK_AGENTS.map((agent, i) => {
    const desk = DESK_POSITIONS[i % DESK_POSITIONS.length];
    return { ...agent, role: agent.role, deskX: desk.x, deskY: desk.y, hasRealData: true };
  });
}

// Zonas de acción — el agente se mueve a la zona según su ESTADO actual
export const ACTION_ZONES = {
  responding:  { x: 60,  y: 130, w: 280, h: 200, label: 'RESPONDIENDO MENSAJES' },
  scheduling:  { x: 400, y: 130, w: 280, h: 200, label: 'AGENDAR CITA' },
  qualifying:  { x: 60,  y: 400, w: 280, h: 200, label: 'PRECALIFICACIÓN' },
  working:     { x: 400, y: 400, w: 280, h: 200, label: 'SOPORTE / TRABAJO' },
};

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
