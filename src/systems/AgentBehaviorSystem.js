/**
 * AgentBehaviorSystem - Simple movement like original monolith
 * Each state maps to a zone with specific desks. Agents walk to desks.
 */
import { ZONE_DESKS } from '../data/agents.js';

// State → zone desk group mapping
// Only 'idle' and 'paused' stay at home desk (corridor)
const STATE_TO_ZONE = {
  responding:  'agendamiento',
  sending:     'agendamiento',
  overloaded:  'agendamiento',
  scheduling:  'agendarCita',
  qualifying:  'precalificacion',
  thinking:    'precalificacion',
  waiting:     'soporte',
  working:     'soporte',
};

// Simple moveTowards — same as monolith
function moveTowards(ax, ay, tx, ty, speed) {
  const dx = tx - ax;
  const dy = ty - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < speed) return { x: tx, y: ty, arrived: true };
  return {
    x: ax + (dx / dist) * speed,
    y: ay + (dy / dist) * speed,
    arrived: false,
  };
}

export class AgentBehaviorSystem {
  constructor(entityManager) {
    this.entityManager = entityManager;
    this.speed = 1.5;
    this._prevStates = new Map();   // id → previous state string
    this._zoneSlots = new Map();    // id → { zoneKey, slotIdx } assigned zone desk
  }

  update(states, deltaTime, frame) {
    const agents = this.entityManager.getAllAgents();

    // Clean up slots for agents that no longer exist
    const agentIds = new Set(agents.map(a => a.id));
    this._zoneSlots.forEach((_, id) => {
      if (!agentIds.has(id)) {
        this._zoneSlots.delete(id);
        this._prevStates.delete(id);
      }
    });

    agents.forEach(agent => {
      // Paused agents sit at their OFF desk, no movement
      if (!agent.hasRealData) {
        agent.x = agent.deskX;
        agent.y = agent.deskY;
        return;
      }

      const state = states[agent.id] || 'idle';
      const prevState = this._prevStates.get(agent.id);

      // Reassign target on state change OR first time
      if (prevState !== state) {
        this._prevStates.set(agent.id, state);
        this._assignTarget(agent, state, agents);
      }

      // Safety: if agent has no target yet, assign one
      if (agent.targetX === undefined || agent.targetY === undefined) {
        this._assignTarget(agent, state, agents);
      }

      // Move toward target
      const result = moveTowards(agent.x, agent.y, agent.targetX, agent.targetY, this.speed);
      agent.x = result.x;
      agent.y = result.y;
    });

    // Collision avoidance — push overlapping agents apart
    const MIN_DIST = 70;
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const a = agents[i];
        const b = agents[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MIN_DIST && dist > 0.1) {
          const overlap = (MIN_DIST - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x -= nx * overlap * 0.3;
          a.y -= ny * overlap * 0.3;
          b.x += nx * overlap * 0.3;
          b.y += ny * overlap * 0.3;
        } else if (dist < 0.1) {
          a.x += (Math.random() - 0.5) * 10;
          b.x += (Math.random() - 0.5) * 10;
        }
      }
    }
  }

  _assignTarget(agent, state, allAgents) {
    const zoneKey = STATE_TO_ZONE[state];

    if (!zoneKey) {
      // idle, paused, overloaded, waiting → go home to desk
      agent.targetX = agent.deskX;
      agent.targetY = agent.deskY;
      this._zoneSlots.delete(agent.id);
      return;
    }

    const desks = ZONE_DESKS[zoneKey];
    if (!desks || desks.length === 0) {
      agent.targetX = agent.deskX;
      agent.targetY = agent.deskY;
      return;
    }

    // Find which desks are already taken by other agents in this zone
    const takenSlots = new Set();
    this._zoneSlots.forEach((slot, id) => {
      if (id !== agent.id && slot.zoneKey === zoneKey) {
        takenSlots.add(slot.slotIdx);
      }
    });

    // Pick first available desk, or cycle if full
    let slotIdx = 0;
    for (let i = 0; i < desks.length; i++) {
      if (!takenSlots.has(i)) {
        slotIdx = i;
        break;
      }
      slotIdx = i; // fallback: last desk
    }

    this._zoneSlots.set(agent.id, { zoneKey, slotIdx });
    agent.targetX = desks[slotIdx].x;
    agent.targetY = desks[slotIdx].y;
  }

  setSpeed(speed) {
    this.speed = speed;
  }

  getStats() {
    return { activeBehaviors: this._prevStates.size };
  }

  clear() {
    this._prevStates.clear();
    this._zoneSlots.clear();
  }
}

export default AgentBehaviorSystem;
