/**
 * EntityManager - Manages all entities (agents) in the system using ECS pattern
 * Single source of truth for entity data and lifecycle
 */
import { Agent } from '../entities/Agent.js';
import { eventSystem, EVENT_TYPES } from './EventSystem.js';

export class EntityManager {
  constructor() {
    this.entities = new Map();
    this.entitiesByType = new Map();
    this.components = new Map();
    this.nextEntityId = 1;
  }

  /**
   * Create a new agent entity from API data
   */
  createAgent(apiData) {
    const agent = new Agent(apiData);
    this.addEntity(agent);
    
    // Emit creation event
    eventSystem.emit(EVENT_TYPES.AGENT_STATE_CHANGED, {
      action: 'created',
      agent: agent.serialize()
    });

    return agent;
  }

  /**
   * Add an entity to the manager
   */
  addEntity(entity) {
    this.entities.set(entity.id, entity);
    
    // Group by type for efficient queries
    const type = 'agent'; // Could be extended for other entity types
    if (!this.entitiesByType.has(type)) {
      this.entitiesByType.set(type, new Set());
    }
    this.entitiesByType.get(type).add(entity.id);

    return entity;
  }

  /**
   * Get entity by ID
   */
  getEntity(id) {
    return this.entities.get(id);
  }

  /**
   * Get all entities of a specific type
   */
  getEntitiesByType(type) {
    const entityIds = this.entitiesByType.get(type);
    if (!entityIds) return [];
    
    return Array.from(entityIds)
      .map(id => this.entities.get(id))
      .filter(entity => entity !== undefined);
  }

  /**
   * Get all agents
   */
  getAllAgents() {
    return this.getEntitiesByType('agent');
  }

  /**
   * Get active agents (with real data)
   */
  getActiveAgents() {
    return this.getAllAgents().filter(agent => agent.hasRealData);
  }

  /**
   * Get agents by company for grouping
   */
  getAgentsByCompany() {
    const grouped = new Map();
    
    this.getAllAgents().forEach(agent => {
      const empresa = agent.empresa || 'Sin Empresa';
      if (!grouped.has(empresa)) {
        grouped.set(empresa, []);
      }
      grouped.get(empresa).push(agent);
    });

    return grouped;
  }

  /**
   * Update entity from API data
   */
  updateAgent(apiData) {
    const existing = this.getEntity(apiData.id);
    if (!existing) {
      return this.createAgent(apiData);
    }

    // Update properties — preserve x/y so agent doesn't teleport
    const previousState = existing.hasRealData;
    existing.name = apiData.name;
    existing.empresa = apiData.empresa;
    existing.telefono = apiData.telefono;
    existing.timezone = apiData.timezone;
    existing.canal = apiData.canal;
    existing.color = apiData.color;
    existing.role = apiData.role;
    existing.hasRealData = apiData.hasRealData ?? apiData.has_real_data ?? false;
    existing.lastActivity = apiData.lastActivity ?? apiData.last_activity;
    existing.deskX = apiData.deskX ?? existing.deskX;
    existing.deskY = apiData.deskY ?? existing.deskY;
    existing.city = apiData.city ?? existing.city;
    // DO NOT overwrite x, y, targetX, targetY — movement system handles those

    // Emit update event if significant change
    if (previousState !== existing.hasRealData) {
      eventSystem.emit(EVENT_TYPES.AGENT_STATE_CHANGED, {
        action: 'updated',
        agent: existing.serialize(),
        changes: ['hasRealData']
      });
    }

    return existing;
  }

  /**
   * Update agents from API response
   * Only removes agents that have been missing for 3+ consecutive polls
   */
  updateFromAPIResponse(apiAgents) {
    const updatedIds = new Set();
    
    apiAgents.forEach(apiAgent => {
      const agent = this.updateAgent(apiAgent);
      updatedIds.add(agent.id);
    });

    // Track missing agents — only remove after 3 consecutive misses
    if (!this._missingCount) this._missingCount = new Map();
    
    const currentIds = Array.from(this.entities.keys());
    currentIds.forEach(id => {
      if (!updatedIds.has(id)) {
        const count = (this._missingCount.get(id) || 0) + 1;
        this._missingCount.set(id, count);
        if (count >= 3) {
          this.removeEntity(id);
          this._missingCount.delete(id);
        }
      } else {
        this._missingCount.delete(id);
      }
    });

    // Emit batch update event
    eventSystem.emit(EVENT_TYPES.DATA_UPDATED, {
      totalAgents: this.entities.size,
      activeAgents: this.getActiveAgents().length
    });
  }

  /**
   * Remove entity
   */
  removeEntity(id) {
    const entity = this.entities.get(id);
    if (!entity) return false;

    this.entities.delete(id);
    
    // Remove from type groups
    this.entitiesByType.forEach(typeSet => {
      typeSet.delete(id);
    });

    eventSystem.emit(EVENT_TYPES.AGENT_STATE_CHANGED, {
      action: 'removed',
      agentId: id
    });

    return true;
  }

  /**
   * Get entities in a specific area (spatial query)
   */
  getEntitiesInArea(x, y, width, height) {
    return this.getAllAgents().filter(agent => {
      return agent.x >= x && agent.x <= x + width &&
             agent.y >= y && agent.y <= y + height;
    });
  }

  /**
   * Find nearest entity to a point
   */
  findNearestEntity(x, y, maxDistance = 60) {
    let nearest = null;
    let minDistance = maxDistance;

    this.getAllAgents().forEach(agent => {
      const distance = Math.hypot(agent.x - x, agent.y - y);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = agent;
      }
    });

    return nearest;
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      totalEntities: this.entities.size,
      entitiesByType: Object.fromEntries(
        Array.from(this.entitiesByType.entries())
          .map(([type, set]) => [type, set.size])
      ),
      componentsRegistered: this.components.size
    };
  }

  /**
   * Clear all entities
   */
  clear() {
    this.entities.clear();
    this.entitiesByType.clear();
    this.components.clear();
  }
}

// Global entity manager instance
export const entityManager = new EntityManager();
