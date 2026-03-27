/**
 * AgentRenderer - Renders chibi character sprites for agents
 * Uses horizontal strip spritesheets (128×128 frames)
 */
import { spriteManager } from '../utils/SpriteManager.js';
import { effects2D } from '../utils/Effects2D.js';
import { getCharacterType, ANIMATIONS, FRAME_SIZE, RENDER_SCALE } from '../data/spriteConfig.js';
import { CANAL_ICONS } from '../data/agents.js';
import { STATUS_COLORS } from '../data/statusConfig.js';

function renderAgent(ctx, agent, state, extra, frame) {
  const isOff = !agent.hasRealData;
  const charType = getCharacterType(agent.id);

  // Determine animation by movement, not by state
  // - Moving (pos != target) → walk
  // - Stationary → idle
  // - OFF/paused → hurt
  const isMoving = agent.targetX !== undefined && agent.targetY !== undefined &&
    (Math.abs(agent.x - agent.targetX) > 2 || Math.abs(agent.y - agent.targetY) > 2);
  const animName = isOff ? 'hurt' : (isMoving ? 'walk' : 'idle');

  const charAnims = ANIMATIONS[charType];
  const anim = charAnims?.[animName] || charAnims?.idle;

  if (!anim) return;

  // Animation frame index
  const speed = (animName === 'idle' || animName === 'hurt') ? 0.06 : 0.12;
  const frameIdx = Math.floor(frame * speed) % anim.frames;

  const scale = RENDER_SCALE;
  const drawW = FRAME_SIZE * scale;
  const drawH = FRAME_SIZE * scale;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(agent.x, agent.y + drawH * 0.4, drawW * 0.3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw sprite frame
  const drawn = spriteManager.drawSpriteFrame(
    ctx,
    anim.path,
    agent.x - drawW / 2,
    agent.y - drawH / 2,
    {
      frameWidth: FRAME_SIZE,
      frameHeight: FRAME_SIZE,
      frameIndex: frameIdx,
      framesPerRow: anim.frames,
    },
    {
      scale,
      alpha: isOff ? 0.45 : 1,
    }
  );

  // Fallback circle if sprite not loaded yet
  if (!drawn) {
    ctx.globalAlpha = isOff ? 0.4 : 1;
    ctx.fillStyle = agent.color || '#4ecdc4';
    ctx.beginPath();
    ctx.arc(agent.x, agent.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((agent.name || '?')[0], agent.x, agent.y);
    ctx.globalAlpha = 1;
  }

  // Status dot (top-right of sprite)
  const statusColor = STATUS_COLORS[state] || '#636e72';
  ctx.fillStyle = isOff ? '#661a1a' : statusColor;
  ctx.beginPath();
  ctx.arc(agent.x + drawW / 2 - 2, agent.y - drawH / 2 + 6, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Name label
  const displayName = agent.name?.split('(')[0]?.trim()?.split(' ')[0] || '';
  ctx.fillStyle = isOff ? '#666' : '#eee';
  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(displayName, agent.x, agent.y + drawH / 2 + 2);

  // Channel badges (multiple)
  if (!isOff && extra?.channels && extra.channels.length > 0) {
    const activeChannels = extra.channels.filter(c => c.activo !== false);
    const badgeY = agent.y - drawH / 2 + 12;
    let badgeX = agent.x - (activeChannels.length * 9) / 2;

    activeChannels.forEach(ch => {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(badgeX, badgeY, 16, 9);
      // Try to find matching icon color
      const key = (ch.canal || '').toLowerCase().replace(/\s/g, '_');
      const icon = CANAL_ICONS?.[key] || CANAL_ICONS?.[ch.canal];
      ctx.fillStyle = icon ? icon.color : '#aaa';
      ctx.font = 'bold 6px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(ch.canal_short || '?', badgeX + 1, badgeY + 2);
      badgeX += 18;
    });

    // Show paused count if any
    if (extra.pausedChannels > 0) {
      ctx.fillStyle = 'rgba(100,100,100,0.6)';
      ctx.font = '6px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`+${extra.pausedChannels} off`, agent.x, badgeY + 11);
    }
  }

  // Activity particles for active agents
  if (!isOff && effects2D) {
    if (state === 'responding' || state === 'working' || state === 'sending') {
      const level = Math.min((extra?.msgs5min || 0) / 5, 1);
      effects2D.drawActivityParticles(ctx, agent.x, agent.y, frame, level, statusColor);
    } else if (state === 'overloaded') {
      effects2D.drawHeatWave(ctx, agent.x, agent.y, frame, 1.5);
    }
  }

  // Reset text alignment
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

export class AgentRenderer {
  constructor() {
    this.debugMode = false;
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
  }

  render(ctx, agent, state, extra, frame) {
    if (this.debugMode) {
      this._renderDebug(ctx, agent, state, frame);
    } else {
      renderAgent(ctx, agent, state, extra, frame);
    }
  }

  renderAgents(ctx, agents, states, extras, frame) {
    const sorted = [...agents].sort((a, b) => a.y - b.y);
    sorted.forEach(agent => {
      this.render(ctx, agent, states[agent.id] || 'idle', extras[agent.id], frame);
    });
  }

  _renderDebug(ctx, agent, state, _frame) {
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(agent.x - 5, agent.y - 5, 10, 10);
    ctx.strokeStyle = '#f00';
    ctx.strokeRect(agent.targetX - 3, agent.targetY - 3, 6, 6);
    ctx.beginPath();
    ctx.moveTo(agent.x, agent.y);
    ctx.lineTo(agent.targetX, agent.targetY);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '8px monospace';
    ctx.fillText(`${agent.id} [${state}]`, agent.x + 8, agent.y - 4);
  }
}

export const agentRenderer = new AgentRenderer();
