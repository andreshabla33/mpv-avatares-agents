/**
 * EventSystem - Observer pattern for decoupled communication
 * Handles events between different systems without tight coupling
 */
export class EventSystem {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event type
   */
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit(eventType, data = {}) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * Clear all listeners for cleanup
   */
  clear() {
    this.listeners.clear();
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(eventType) {
    return this.listeners.get(eventType)?.size || 0;
  }
}

// Event types constants
export const EVENT_TYPES = {
  // Agent events
  AGENT_STATE_CHANGED: 'agent:state:changed',
  AGENT_POSITION_UPDATED: 'agent:position:updated',
  AGENT_CLICKED: 'agent:clicked',
  
  // System events
  SPRITES_LOADED: 'system:sprites:loaded',
  RENDER_FRAME: 'system:render:frame',
  DATA_UPDATED: 'system:data:updated',
  
  // Animation events
  ANIMATION_COMPLETE: 'animation:complete',
  ANIMATION_STARTED: 'animation:started',
  
  // UI events
  TOOLTIP_SHOW: 'ui:tooltip:show',
  TOOLTIP_HIDE: 'ui:tooltip:hide'
};

// Global event system instance
export const eventSystem = new EventSystem();
