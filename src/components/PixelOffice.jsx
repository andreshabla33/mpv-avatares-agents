import { useRef, useEffect, useState, useCallback } from 'react';
import { CANAL_ICONS } from '../data/agents';

const W = 1100;
const H = 700;
const TILE = 16;
const SPEED = 1.8;

// Status → color mapping for enriched states
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

// Heat color based on active conversations (load)
function getHeatColor(convsActive) {
  if (convsActive >= 8) return '#e74c3c'; // red - overloaded
  if (convsActive >= 5) return '#e67e22'; // orange - heavy
  if (convsActive >= 3) return '#f1c40f'; // yellow - moderate
  if (convsActive >= 1) return '#2ecc71'; // green - active
  return null; // no heat
}

// ── drawing helpers ────────────────────────────────────────
function drawCheckerFloor(ctx) {
  const c1 = '#0d1b2a';
  const c2 = '#112240';
  for (let y = 0; y < H; y += TILE) {
    for (let x = 0; x < W; x += TILE) {
      ctx.fillStyle = ((x / TILE + y / TILE) % 2 === 0) ? c1 : c2;
      ctx.fillRect(x, y, TILE, TILE);
    }
  }
}

function drawWall(ctx, x, y, w, h) {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#2a2a4e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function drawDoor(ctx, x, y, vertical = false) {
  ctx.fillStyle = '#3a2a1a';
  if (vertical) {
    ctx.fillRect(x, y, 6, 32);
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(x + 1, y + 12, 4, 8);
  } else {
    ctx.fillRect(x, y, 32, 6);
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(x + 12, y + 1, 8, 4);
  }
}

function drawDesk(ctx, x, y) {
  ctx.fillStyle = '#5a3e28';
  ctx.fillRect(x, y, 64, 32);
  ctx.fillStyle = '#6b4c30';
  ctx.fillRect(x + 2, y + 2, 60, 28);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x + 20, y + 4, 24, 16);
  ctx.fillStyle = '#0f3460';
  ctx.fillRect(x + 22, y + 6, 20, 12);
  ctx.fillStyle = '#333';
  ctx.fillRect(x + 29, y + 20, 6, 4);
  ctx.fillStyle = '#2d2d2d';
  ctx.fillRect(x + 18, y + 24, 28, 6);
}

function drawChair(ctx, x, y) {
  ctx.fillStyle = '#2d2d44';
  ctx.fillRect(x, y, 20, 20);
  ctx.fillStyle = '#3d3d5c';
  ctx.fillRect(x + 2, y + 2, 16, 16);
}

function drawTable(ctx, x, y, w, h) {
  ctx.fillStyle = '#4a3520';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#5a4530';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
}

function drawPlant(ctx, x, y) {
  ctx.fillStyle = '#3d2b1f';
  ctx.fillRect(x + 4, y + 12, 12, 10);
  ctx.fillStyle = '#2d8a4e';
  ctx.fillRect(x + 2, y, 6, 12);
  ctx.fillRect(x + 10, y - 4, 6, 16);
  ctx.fillStyle = '#3da65e';
  ctx.fillRect(x + 6, y + 2, 6, 10);
}

function drawCoffeeMachine(ctx, x, y) {
  ctx.fillStyle = '#444';
  ctx.fillRect(x, y, 24, 28);
  ctx.fillStyle = '#666';
  ctx.fillRect(x + 2, y + 2, 20, 10);
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + 8, y + 16, 8, 6);
  ctx.fillStyle = '#f00';
  ctx.fillRect(x + 4, y + 14, 4, 4);
}

function drawCouch(ctx, x, y, horizontal = true) {
  if (horizontal) {
    ctx.fillStyle = '#4a2c6e';
    ctx.fillRect(x, y, 80, 32);
    ctx.fillStyle = '#5e3a8a';
    ctx.fillRect(x + 4, y + 4, 72, 24);
    ctx.fillStyle = '#6b44a0';
    ctx.fillRect(x + 8, y + 8, 28, 16);
    ctx.fillRect(x + 44, y + 8, 28, 16);
  } else {
    ctx.fillStyle = '#4a2c6e';
    ctx.fillRect(x, y, 32, 80);
    ctx.fillStyle = '#5e3a8a';
    ctx.fillRect(x + 4, y + 4, 24, 72);
    ctx.fillStyle = '#6b44a0';
    ctx.fillRect(x + 8, y + 8, 16, 28);
    ctx.fillRect(x + 8, y + 44, 16, 28);
  }
}

function drawWhiteboard(ctx, x, y) {
  ctx.fillStyle = '#ddd';
  ctx.fillRect(x, y, 80, 48);
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(x + 3, y + 3, 74, 42);
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(x + 10, y + 12, 30, 2);
  ctx.fillStyle = '#3498db';
  ctx.fillRect(x + 10, y + 20, 50, 2);
  ctx.fillStyle = '#2ecc71';
  ctx.fillRect(x + 10, y + 28, 40, 2);
}

function drawFridge(ctx, x, y) {
  ctx.fillStyle = '#bbb';
  ctx.fillRect(x, y, 28, 48);
  ctx.fillStyle = '#ccc';
  ctx.fillRect(x + 2, y + 2, 24, 20);
  ctx.fillRect(x + 2, y + 26, 24, 20);
  ctx.fillStyle = '#888';
  ctx.fillRect(x + 22, y + 8, 3, 8);
  ctx.fillRect(x + 22, y + 32, 3, 8);
}

function drawBookshelf(ctx, x, y) {
  ctx.fillStyle = '#5a3e28';
  ctx.fillRect(x, y, 48, 56);
  const colors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#e74c3c'];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      ctx.fillStyle = colors[(row * 3 + col) % colors.length];
      ctx.fillRect(x + 4 + col * 14, y + 4 + row * 18, 10, 14);
    }
  }
}

function drawClock(ctx, x, y) {
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, 20, 20);
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(x + 2, y + 2, 16, 16);
  ctx.fillStyle = '#333';
  ctx.fillRect(x + 9, y + 4, 2, 8);
  ctx.fillRect(x + 9, y + 9, 6, 2);
}

function drawWaterCooler(ctx, x, y) {
  ctx.fillStyle = '#aadaff';
  ctx.fillRect(x + 4, y, 16, 20);
  ctx.fillStyle = '#7bc8ff';
  ctx.fillRect(x + 6, y + 2, 12, 16);
  ctx.fillStyle = '#888';
  ctx.fillRect(x + 2, y + 20, 20, 16);
  ctx.fillStyle = '#999';
  ctx.fillRect(x + 4, y + 22, 16, 12);
}

function drawRug(ctx, x, y, w, h, color = '#2a1a3e') {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#4a3a5e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
}

// ── rooms & furniture layout ───────────────────────────────
function drawOfficeLayout(ctx) {
  // BRANDING
  ctx.fillStyle = 'rgba(78, 205, 196, 0.05)';
  ctx.font = 'bold 120px monospace';
  ctx.fillText('MONICA CRM', 180, 500);

  // ── Zone 1: Respondiendo Mensajes (top-left) ──
  drawWall(ctx, 40, 30, 240, 170);
  drawDoor(ctx, 160, 198, false);
  drawTable(ctx, 90, 80, 100, 50);
  drawChair(ctx, 100, 65);
  drawChair(ctx, 140, 65);
  drawChair(ctx, 100, 130);
  drawChair(ctx, 140, 130);
  drawWhiteboard(ctx, 55, 40);
  
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('RESPONDIENDO MENSAJES', 90, 180);

  // ── Zone 2: Agendando Citas (top-center) ──
  drawWall(ctx, 300, 30, 240, 170);
  drawDoor(ctx, 420, 198, false);
  drawDesk(ctx, 340, 60);
  drawChair(ctx, 360, 100);
  drawDesk(ctx, 440, 60);
  drawChair(ctx, 460, 100);
  drawClock(ctx, 410, 38);

  ctx.fillStyle = '#3498db';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('AGENDANDO CITAS', 365, 180);

  // ── Zone 3: Analizando (top-right-ish) ──
  drawWall(ctx, 560, 30, 200, 170);
  drawDoor(ctx, 660, 198, false);
  drawBookshelf(ctx, 580, 40);
  drawCouch(ctx, 640, 80, true);
  
  ctx.fillStyle = '#9b59b6';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('ANÁLISIS E IA', 620, 180);

  // ── Lounge (far-right) ──
  drawWall(ctx, 780, 30, 180, 170);
  drawDoor(ctx, 780, 130, true);
  drawRug(ctx, 800, 60, 140, 100);
  drawWaterCooler(ctx, 920, 50);

  // ── Open Work Area (desks) ──
  const deskStartX = 120;
  const deskStartY = 290;
  const colSpacing = 130;
  const rowSpacing = 110;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const dx = deskStartX + col * colSpacing;
      const dy = deskStartY + row * rowSpacing;
      drawDesk(ctx, dx, dy);
      drawChair(ctx, dx + 22, dy + 36);
      if ((row + col) % 3 === 0) drawPlant(ctx, dx - 16, dy + 10);
    }
  }

  // ── OFF Room (right side) ──
  ctx.font = '10px monospace';
  ctx.fillText('WORK AREA', 260, deskStartY + rowSpacing * 3 + 20);

  // Plants near work area
  drawPlant(ctx, deskStartX - 40, deskStartY + 10);
  drawPlant(ctx, deskStartX - 40, deskStartY + rowSpacing + 10);
  drawPlant(ctx, deskStartX + colSpacing * 4 + 10, deskStartY + 10);
  drawPlant(ctx, deskStartX + colSpacing * 4 + 10, deskStartY + rowSpacing + 10);

  // ── OFF Room (right-bottom — for agents without real data) ──
  drawWall(ctx, 740, 220, 330, 460);
  drawDoor(ctx, 740, 380, true);

  // Dim floor inside OFF room
  ctx.fillStyle = 'rgba(10, 8, 20, 0.5)';
  ctx.fillRect(742, 222, 326, 456);

  // "Zzz" decoration
  ctx.fillStyle = '#2a2a4e';
  ctx.font = '14px monospace';
  ctx.fillText('z z z', 900, 260);
  ctx.font = '11px monospace';
  ctx.fillText('z z', 860, 280);

  // Label
  ctx.fillStyle = '#3a2a2a';
  ctx.font = '12px monospace';
  ctx.fillText('SIN INTERACCION', 825, 310);
  ctx.font = '9px monospace';
  ctx.fillStyle = '#2a2a3e';
  ctx.fillText('Agentes sin datos recientes', 810, 325);

  // Power off icon pixel art
  ctx.fillStyle = '#3a1a1a';
  ctx.fillRect(940, 240, 20, 20);
  ctx.fillStyle = '#661a1a';
  ctx.fillRect(942, 242, 16, 16);
  ctx.fillStyle = '#3a1a1a';
  ctx.fillRect(948, 244, 4, 6);
}

// ── Agent sprite drawing ───────────────────────────────────
function drawAgent(ctx, agent, x, y, state, frame, extra, isOff) {
  const c = agent.color;
  const isOffAgent = isOff || !agent.hasRealData;

  // Off agents: greyed out, no animation
  const alpha = isOffAgent ? 0.4 : 1;
  const bounce = isOffAgent ? 0 : (state === 'idle' ? Math.sin(frame * 0.15) * 2 : 0);
  const py = y + bounce;

  ctx.globalAlpha = alpha;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x - 6, y + 16, 16, 4);

  // Body
  ctx.fillStyle = isOffAgent ? '#444' : c;
  ctx.fillRect(x - 4, py, 12, 12);

  // Head
  ctx.fillStyle = isOffAgent ? '#777' : '#f5d5c8';
  ctx.fillRect(x - 2, py - 8, 8, 8);

  // Hair
  ctx.fillStyle = isOffAgent ? '#333' : darkenColor(c, 0.4);
  ctx.fillRect(x - 2, py - 10, 8, 4);

  // Eyes (closed for off agents)
  if (isOffAgent) {
    ctx.fillStyle = '#555';
    ctx.fillRect(x - 1, py - 4, 2, 1);
    ctx.fillRect(x + 3, py - 4, 2, 1);
  } else {
    const blinkFrame = frame % 120;
    if (blinkFrame < 115) {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(x - 1, py - 5, 2, 2);
      ctx.fillRect(x + 3, py - 5, 2, 2);
    }
  }

  // Legs (static for off agents)
  ctx.fillStyle = isOffAgent ? '#333' : '#2d2d44';
  if (!isOffAgent && state === 'idle') {
    const step = Math.floor(frame / 8) % 2;
    ctx.fillRect(x - 2, py + 12, 4, 6 + step);
    ctx.fillRect(x + 2, py + 12, 4, 6 + (1 - step));
  } else {
    ctx.fillRect(x - 2, py + 12, 4, 6);
    ctx.fillRect(x + 2, py + 12, 4, 6);
  }

  // Status indicator — color by enriched state
  const statusColor = STATUS_COLORS[state] || '#636e72';
  if (isOffAgent) {
    ctx.fillStyle = '#661a1a';
    ctx.fillRect(x + 8, py - 10, 4, 4);
  } else {
    ctx.fillStyle = statusColor;
    ctx.fillRect(x + 8, py - 10, 4, 4);
  }

  // Heat indicator aura (based on active conversations)
  if (!isOffAgent) {
    const convsActive = extra?.convsActive5min || 0;
    const heatColor = getHeatColor(convsActive);
    if (heatColor) {
      const pulse = Math.sin(frame * 0.08) * 0.15 + 0.25;
      ctx.fillStyle = heatColor;
      ctx.globalAlpha = pulse;
      const heatR = 6 + Math.min(convsActive, 10) * 2;
      ctx.beginPath();
      ctx.arc(x + 2, py + 2, heatR, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha;
    }
  }

  // Canal icon (only for active agents)
  if (!isOffAgent) {
    const canal = extra?.canal;
    if (canal && CANAL_ICONS[canal]) {
      const icon = CANAL_ICONS[canal];
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(x + 10, py - 6, 14, 8);
      ctx.fillStyle = icon.color;
      ctx.font = '6px monospace';
      ctx.fillText(icon.symbol, x + 11, py + 1);
    }
  }

  // Name tag
  ctx.font = '7px monospace';
  ctx.fillStyle = isOffAgent ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.7)';
  const nameW = ctx.measureText(agent.name).width;
  ctx.fillRect(x - nameW / 2 + 2, py - 20, nameW + 4, 10);
  ctx.fillStyle = isOffAgent ? '#555' : c;
  ctx.fillText(agent.name, x - nameW / 2 + 4, py - 12);

  // Speech bubble with action text (for non-idle active agents)
  if (!isOffAgent && state !== 'idle' && extra?.actionText) {
    drawSpeechBubble(ctx, x, py - 30, extra.actionText, statusColor, frame);
  }

  // Transition flash effect
  if (!isOffAgent && state !== 'idle' && agent._transitionFrame) {
    const elapsed = frame - agent._transitionFrame;
    if (elapsed < 30) {
      const flashAlpha = (30 - elapsed) / 30 * 0.6;
      ctx.fillStyle = statusColor;
      ctx.globalAlpha = flashAlpha;
      ctx.fillRect(x - 10, py - 14, 24, 34);
      ctx.globalAlpha = 1;
    }
  }

  ctx.globalAlpha = 1;
}

// ── Speech bubble drawing ──────────────────────────────────
function drawSpeechBubble(ctx, x, y, text, color, frame) {
  const floatY = y + Math.sin(frame * 0.06) * 1.5;
  ctx.font = '7px monospace';
  const tw = Math.min(ctx.measureText(text).width, 90);
  const truncText = text.length > 16 ? text.slice(0, 15) + '..' : text;
  const truncW = ctx.measureText(truncText).width;
  const bw = truncW + 8;
  const bh = 12;
  const bx = x - bw / 2 + 2;
  const by = floatY - bh;

  // Bubble bg
  ctx.fillStyle = 'rgba(10,10,20,0.85)';
  ctx.fillRect(bx, by, bw, bh);
  // Border color = status
  ctx.strokeStyle = color + '88';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh);
  // Tail
  ctx.fillStyle = 'rgba(10,10,20,0.85)';
  ctx.fillRect(x, by + bh, 4, 3);
  // Text
  ctx.fillStyle = color;
  ctx.fillText(truncText, bx + 4, by + 9);
}

function darkenColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (num >> 16) - Math.floor(255 * amount));
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.floor(255 * amount));
  const b = Math.max(0, (num & 0xff) - Math.floor(255 * amount));
  return `rgb(${r},${g},${b})`;
}

// ── Tooltip drawing ────────────────────────────────────────
function drawTooltip(ctx, agent, extra, state, mx, my) {
  const isOff = !agent.hasRealData;
  const stateLabel = isOff ? 'SIN DATOS' : (state || 'idle').toUpperCase();
  const lines = [
    agent.name,
    `Rol: ${agent.role || 'General'}`,
    `LLM: ${(agent.llm || '').split('/').pop() || '?'}`,
    `Estado: ${stateLabel}`,
  ];
  if (!isOff && extra?.actionText) lines.push(`> ${extra.actionText}`);
  if (!isOff && extra?.canal) lines.push(`Canal: ${extra.canal}`);
  if (!isOff && extra?.msgs5min) lines.push(`Msgs 5min: ${extra.msgs5min} | 1h: ${extra.msgs1h || 0}`);
  if (!isOff && extra?.convsActive5min) lines.push(`Convos activas: ${extra.convsActive5min}`);
  if (!isOff && extra?.convsOpen) lines.push(`Convos abiertas: ${extra.convsOpen}`);
  if (!isOff && extra?.msgs24hAgent) lines.push(`24h: ${extra.msgs24hAgent} env / ${extra.msgs24hUser || 0} rec`);
  if (agent.lastActivity) {
    const d = new Date(agent.lastActivity);
    lines.push(`Último: ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`);
  }

  const lineH = 13;
  const pad = 8;
  ctx.font = '9px monospace';
  const maxW = Math.max(...lines.map(l => ctx.measureText(l).width)) + pad * 2;
  const totalH = lines.length * lineH + pad * 2;

  let tx = mx + 12;
  let ty = my - totalH - 4;
  if (tx + maxW > W) tx = mx - maxW - 12;
  if (ty < 0) ty = my + 16;

  ctx.fillStyle = 'rgba(10,10,20,0.92)';
  ctx.fillRect(tx, ty, maxW, totalH);
  ctx.strokeStyle = agent.color + '88';
  ctx.lineWidth = 1;
  ctx.strokeRect(tx, ty, maxW, totalH);

  lines.forEach((line, i) => {
    ctx.fillStyle = i === 0 ? agent.color : '#bbb';
    ctx.font = i === 0 ? 'bold 10px monospace' : '9px monospace';
    ctx.fillText(line, tx + pad, ty + pad + (i + 1) * lineH - 3);
  });
}

// ── Movement logic ─────────────────────────────────────────
function pickIdleTarget() {
  const zone = COMMON_ZONES[Math.floor(Math.random() * COMMON_ZONES.length)];
  return {
    x: zone.x + 20 + Math.random() * (zone.w - 40),
    y: zone.y + 20 + Math.random() * (zone.h - 40),
  };
}

function moveTowards(current, target, speed) {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < speed) return { x: target.x, y: target.y, arrived: true };
  return {
    x: current.x + (dx / dist) * speed,
    y: current.y + (dy / dist) * speed,
    arrived: false,
  };
}

function getAgentAt(agentList, mx, my) {
  for (let i = agentList.length - 1; i >= 0; i--) {
    const ag = agentList[i];
    if (mx >= ag.x - 8 && mx <= ag.x + 16 && my >= ag.y - 20 && my <= ag.y + 22) {
      return ag;
    }
  }
  return null;
}

// ── Main component ─────────────────────────────────────────
export default function PixelOffice({ agents, agentStates, extras, kpis, onAgentClick }) {
  const canvasRef = useRef(null);
  const agentsRef = useRef([]);
  const frameRef = useRef(0);
  const statesRef = useRef(agentStates);
  const extrasRef = useRef(extras);
  const prevStatesRef = useRef({});
  const mouseRef = useRef({ x: -1, y: -1 });
  const hoveredRef = useRef(null);
  const kpisRef = useRef(kpis);

  // Sync agent list when API returns new agents
  useEffect(() => {
    const current = agentsRef.current;
    const currentIds = new Set(current.map(a => a.id));
    const newIds = new Set(agents.map(a => a.id));

    agents.forEach(a => {
      if (!currentIds.has(a.id)) {
        current.push({
          ...a,
          x: a.deskX,
          y: a.deskY,
          targetX: a.deskX,
          targetY: a.deskY,
          idleTimer: 0,
          _transitionFrame: 0,
        });
      } else {
        const existing = current.find(c => c.id === a.id);
        if (existing) {
          existing.deskX = a.deskX;
          existing.deskY = a.deskY;
          existing.color = a.color;
          existing.name = a.name;
          existing.role = a.role;
          existing.hasRealData = a.hasRealData;
          existing.lastActivity = a.lastActivity;
          existing.llm = a.llm;
        }
      }
    });

    agentsRef.current = current.filter(a => newIds.has(a.id));
  }, [agents]);

  useEffect(() => {
    const prev = prevStatesRef.current;
    const frame = frameRef.current;

    statesRef.current = agentStates;
    extrasRef.current = extras;
    kpisRef.current = kpis;

    agentsRef.current.forEach(ag => {
      const state = agentStates[ag.id] || 'idle';
      const prevState = prev[ag.id] || 'idle';

      // Detect any non-idle transition
      if (prevState === 'idle' && state !== 'idle') {
        ag._transitionFrame = frame;
      }

      if (!ag.hasRealData) {
        ag.targetX = ag.deskX;
        ag.targetY = ag.deskY;
      } else if (state !== 'idle') {
        // All active states: go to desk
        ag.targetX = ag.deskX;
        ag.targetY = ag.deskY;
        ag.idleTimer = 0;
      }
    });

    prevStatesRef.current = { ...agentStates };
  }, [agentStates, extras, kpis]);

  // Mouse tracking for tooltips
  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    mouseRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleMouseLeave = useCallback(() => {
    mouseRef.current = { x: -1, y: -1 };
    hoveredRef.current = null;
  }, []);

  const handleClick = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const clicked = getAgentAt(agentsRef.current, mx, my);
    if (clicked && onAgentClick) {
      onAgentClick(clicked);
    }
  }, [onAgentClick]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    let animId;

    function loop() {
      frameRef.current++;
      const frame = frameRef.current;
      const agentList = agentsRef.current;
      const states = statesRef.current;
      const ext = extrasRef.current;

      // Update agent positions
      agentList.forEach(ag => {
        // OFF agents don't move
        if (!ag.hasRealData) {
          ag.x = ag.deskX;
          ag.y = ag.deskY;
          return;
        }

        const state = states[ag.id] || 'idle';
        
        // Target assignment based on state
        if (state === 'idle' || state === 'waiting') {
          // Go back to desk
          ag.targetX = ag.deskX;
          ag.targetY = ag.deskY;
        } else {
          // Working, responding, scheduling, etc. -> Go to action zone
          // If already at a zone, maybe wander slightly inside it, otherwise pick a spot
          if (!ag.currentZone || ag.idleTimer > 150) {
            import('../data/agents').then(module => {
              const { ACTION_ZONES } = module;
              let zone = ACTION_ZONES.responding; // default
              if (state === 'scheduling') zone = ACTION_ZONES.scheduling;
              if (state === 'thinking' || state === 'qualifying') zone = ACTION_ZONES.analyzing;
              
              // Pick random point inside zone
              ag.targetX = zone.x + 20 + Math.random() * (zone.w - 40);
              ag.targetY = zone.y + 30 + Math.random() * (zone.h - 60);
              ag.currentZone = zone;
              ag.idleTimer = 0;
            });
          } else {
            ag.idleTimer++;
          }
        }

        // Avoidance: push away from other agents if too close
        let dx = ag.targetX - ag.x;
        let dy = ag.targetY - ag.y;
        
        // Basic repulsion from other active agents
        agentList.forEach(other => {
          if (other.id !== ag.id && other.hasRealData) {
            const dist = Math.hypot(other.x - ag.x, other.y - ag.y);
            if (dist < 20 && dist > 0) {
              dx -= (other.x - ag.x) * 0.5;
              dy -= (other.y - ag.y) * 0.5;
            }
          }
        });

        const distToTarget = Math.hypot(dx, dy);
        if (distToTarget > SPEED) {
          const moveX = (dx / distToTarget) * SPEED;
          const moveY = (dy / distToTarget) * SPEED;
          
          // Basic corridor pathfinding (avoid walls)
          // If trying to cross y=210 (corridor) from y>220 to y<200 or vice versa
          // force them to go through the doors
          let nextX = ag.x + moveX;
          let nextY = ag.y + moveY;
          
          if (ag.y > 210 && nextY < 210) {
            // Going UP. Force to a door X
            const doors = [170, 430, 670];
            const nearestDoor = doors.reduce((a, b) => Math.abs(b - ag.x) < Math.abs(a - ag.x) ? b : a);
            if (Math.abs(ag.x - nearestDoor) > 20) {
              nextX = ag.x + Math.sign(nearestDoor - ag.x) * SPEED;
              nextY = ag.y; // don't move up yet
            }
          } else if (ag.y < 210 && nextY > 210) {
            // Going DOWN. Force to a door X
            const doors = [170, 430, 670];
            const nearestDoor = doors.reduce((a, b) => Math.abs(b - ag.x) < Math.abs(a - ag.x) ? b : a);
            if (Math.abs(ag.x - nearestDoor) > 20) {
              nextX = ag.x + Math.sign(nearestDoor - ag.x) * SPEED;
              nextY = ag.y; // don't move down yet
            }
          }

          ag.x = nextX;
          ag.y = nextY;
        } else {
          ag.x = ag.targetX;
          ag.y = ag.targetY;
        }
      });

      // Draw
      ctx.clearRect(0, 0, W, H);
      drawCheckerFloor(ctx);
      drawOfficeLayout(ctx);

      // Draw agents sorted by y for z-ordering
      const sorted = [...agentList].sort((a, b) => a.y - b.y);
      sorted.forEach(ag => {
        const isOff = !ag.hasRealData;
        drawAgent(ctx, ag, ag.x, ag.y, states[ag.id] || 'idle', frame, ext[ag.id], isOff);
      });

      // Scanline effect
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }

      // Vignette
      const gradient = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.7);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      // Mini KPI overlay (top-left corner)
      const k = kpisRef.current;
      if (k) {
        ctx.fillStyle = 'rgba(10,10,20,0.8)';
        ctx.fillRect(4, 4, 130, 48);
        ctx.strokeStyle = '#2a2a4e';
        ctx.lineWidth = 1;
        ctx.strokeRect(4, 4, 130, 48);
        ctx.font = '8px monospace';
        ctx.fillStyle = '#4ecdc4';
        ctx.fillText(`Msgs/1h: ${k.total_msgs_1h || 0}`, 10, 16);
        ctx.fillStyle = '#74b9ff';
        ctx.fillText(`Convos: ${k.total_convs_open || 0}`, 10, 28);
        ctx.fillStyle = '#2ecc71';
        ctx.fillText(`Activos: ${k.active_agents || 0}/${k.total_agents || 0}`, 10, 40);
        if (k.overloaded_agents > 0) {
          ctx.fillStyle = '#e74c3c';
          const blink = Math.sin(frame * 0.15) > 0 ? 1 : 0.3;
          ctx.globalAlpha = blink;
          ctx.fillText(`⚠ ${k.overloaded_agents} OVERLOADED`, 10, 50);
          ctx.globalAlpha = 1;
        }
      }

      // Tooltip
      const { x: mx, y: my } = mouseRef.current;
      if (mx >= 0) {
        const hovered = getAgentAt(sorted, mx, my);
        hoveredRef.current = hovered;
        if (hovered) {
          drawTooltip(ctx, hovered, ext[hovered.id], states[hovered.id] || 'idle', mx, my);
        }
      }

      animId = requestAnimationFrame(loop);
    }

    loop();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className="block mx-auto border-2 border-[#2a2a4e] rounded cursor-crosshair"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
