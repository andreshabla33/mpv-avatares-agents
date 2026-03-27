/**
 * RenderingEngine - Handles all canvas rendering with separation of concerns
 * Uses Strategy pattern for different rendering modes
 */
import { eventSystem, EVENT_TYPES } from './EventSystem.js';
import { effects2D } from '../utils/Effects2D.js';

export class RenderingEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    
    // Rendering layers
    this.layers = new Map();
    this.backgroundCanvas = null;
    this.effectsEnabled = true;
    
    // Performance tracking
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.fps = 0;
    
    this.initialize();
  }

  /**
   * Initialize rendering system
   */
  initialize() {
    effects2D.initialize(this.width, this.height);
    
    // Subscribe to relevant events
    eventSystem.subscribe(EVENT_TYPES.SPRITES_LOADED, () => {
      this.invalidateBackground();
    });
  }

  /**
   * Set background map (city map, office layout, etc.)
   */
  setBackground(backgroundCanvas) {
    this.backgroundCanvas = backgroundCanvas;
  }

  /**
   * Register a rendering layer
   */
  registerLayer(name, renderFunction, zIndex = 0) {
    this.layers.set(name, {
      render: renderFunction,
      zIndex,
      enabled: true
    });
  }

  /**
   * Enable/disable a rendering layer
   */
  setLayerEnabled(name, enabled) {
    const layer = this.layers.get(name);
    if (layer) {
      layer.enabled = enabled;
    }
  }

  /**
   * Main render method - renders all layers in order
   */
  render(agents, states, extras, frame, kpis) {
    this.frameCount++;
    this.updateFPS();
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.ctx.save();
    
    // Render background
    this.renderBackground();
    
    // Render layers in z-order
    const sortedLayers = Array.from(this.layers.entries())
      .filter(([_name, layer]) => layer.enabled)
      .sort(([, a], [, b]) => a.zIndex - b.zIndex);
    
    sortedLayers.forEach(([name, layer]) => {
      try {
        layer.render(this.ctx, { agents, states, extras, frame, kpis });
      } catch (error) {
        console.error(`Error rendering layer ${name}:`, error);
      }
    });
    
    this.ctx.restore();
    
    // Emit render event for debugging/monitoring
    eventSystem.emit(EVENT_TYPES.RENDER_FRAME, {
      frame,
      fps: this.fps,
      agentCount: agents.length
    });
  }

  /**
   * Render background layer
   */
  renderBackground() {
    if (this.backgroundCanvas) {
      this.ctx.drawImage(this.backgroundCanvas, 0, 0);
    } else {
      // Fallback solid color
      this.ctx.fillStyle = '#1a1a2e';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    // Apply ambient lighting if effects enabled
    if (this.effectsEnabled) {
      const timeOfDay = effects2D.getTimeOfDay();
      effects2D.drawAmbientLighting(this.ctx, this.width, this.height, timeOfDay);
    }
  }

  /**
   * Update FPS counter
   */
  updateFPS() {
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  /**
   * Invalidate background cache (when sprites change)
   */
  invalidateBackground() {
    // Could implement background caching here for performance
  }

  /**
   * Toggle effects on/off for performance
   */
  setEffectsEnabled(enabled) {
    this.effectsEnabled = enabled;
  }

  /**
   * Get rendering statistics
   */
  getStats() {
    return {
      fps: this.fps,
      layersCount: this.layers.size,
      effectsEnabled: this.effectsEnabled
    };
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.layers.clear();
    effects2D.dispose();
    eventSystem.emit(EVENT_TYPES.RENDER_FRAME, { disposed: true });
  }
}

// Default rendering layers
export const RENDER_LAYERS = {
  BACKGROUND: 'background',
  SHADOWS: 'shadows', 
  AGENTS: 'agents',
  EFFECTS: 'effects',
  UI_OVERLAY: 'ui_overlay',
  TOOLTIPS: 'tooltips'
};
