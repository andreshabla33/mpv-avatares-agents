/**
 * Agent Entity - Core agent data structure following Entity Component System pattern
 */
export class Agent {
  constructor(config) {
    // Core identity
    this.id = config.id;
    this.db_id = config.db_id;
    this.agente_id = config.agente_id;
    
    // Display properties
    this.name = config.name;
    this.originalName = config.originalName;
    this.empresa = config.empresa;
    this.role = config.role;
    this.color = config.color;
    
    // Communication details
    this.telefono = config.telefono;
    this.timezone = config.timezone;
    this.canal = config.canal;
    this.llm = config.llm;
    
    // Position and movement
    this.x = config.deskX || 0;
    this.y = config.deskY || 0;
    this.deskX = config.deskX || 0;
    this.deskY = config.deskY || 0;
    this.targetX = this.x;
    this.targetY = this.y;
    
    // State and behavior
    this.hasRealData = config.hasRealData || false;
    this.lastActivity = config.lastActivity;
    
    // Runtime properties
    this.currentZone = null;
    this.idleTimer = 0;
    this._transitionFrame = null;
  }

  /**
   * Update agent position
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Set target position for movement
   */
  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Get distance to target
   */
  getDistanceToTarget() {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    return Math.hypot(dx, dy);
  }

  /**
   * Check if agent is at target position
   */
  isAtTarget(threshold = 2) {
    return this.getDistanceToTarget() <= threshold;
  }

  /**
   * Serialize agent data for debugging/persistence
   */
  serialize() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      position: { x: this.x, y: this.y },
      target: { x: this.targetX, y: this.targetY },
      hasRealData: this.hasRealData,
    };
  }
}
