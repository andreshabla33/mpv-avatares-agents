/**
 * AnimationEngine - Sistema de animaciones frame-based para sprites 2D
 */
export class Animation {
  constructor(config) {
    this.frames = config.frames || [];
    this.frameDuration = config.frameDuration || 100; // ms per frame
    this.loop = config.loop !== false; // default true
    this.pingpong = config.pingpong || false;
    
    this.currentFrame = 0;
    this.lastFrameTime = 0;
    this.isPlaying = true;
    this.direction = 1; // 1 for forward, -1 for reverse (pingpong)
  }

  update(currentTime) {
    if (!this.isPlaying || this.frames.length <= 1) return;

    if (currentTime - this.lastFrameTime >= this.frameDuration) {
      if (this.pingpong) {
        this.currentFrame += this.direction;
        
        if (this.currentFrame >= this.frames.length - 1) {
          this.direction = -1;
        } else if (this.currentFrame <= 0) {
          this.direction = 1;
        }
      } else {
        this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      }
      
      this.lastFrameTime = currentTime;
    }
  }

  getCurrentFrame() {
    return this.frames[this.currentFrame] || 0;
  }

  play() {
    this.isPlaying = true;
  }

  pause() {
    this.isPlaying = false;
  }

  reset() {
    this.currentFrame = 0;
    this.direction = 1;
    this.lastFrameTime = 0;
  }
}

export class AnimationEngine {
  constructor() {
    this.animations = new Map();
    this.activeAnimations = new Map(); // entityId -> Animation instance
  }

  /**
   * Registra una animación reutilizable
   */
  registerAnimation(name, config) {
    this.animations.set(name, config);
  }

  /**
   * Crea una instancia de animación para una entidad
   */
  createAnimation(entityId, animationName) {
    const config = this.animations.get(animationName);
    if (!config) {
      if (!this._warnedAnimations) this._warnedAnimations = new Set();
      if (!this._warnedAnimations.has(animationName)) {
        this._warnedAnimations.add(animationName);
        console.warn(`Animation '${animationName}' not found`);
      }
      return null;
    }

    const animation = new Animation(config);
    this.activeAnimations.set(entityId, animation);
    return animation;
  }

  /**
   * Cambia la animación de una entidad
   */
  setAnimation(entityId, animationName, force = false) {
    const currentAnim = this.activeAnimations.get(entityId);
    
    // Si ya tiene la misma animación y no es forzado, no cambiar
    if (currentAnim && currentAnim.name === animationName && !force) {
      return currentAnim;
    }

    return this.createAnimation(entityId, animationName);
  }

  /**
   * Actualiza todas las animaciones activas
   */
  update(currentTime) {
    for (const [entityId, animation] of this.activeAnimations) {
      animation.update(currentTime);
    }
  }

  /**
   * Obtiene la animación actual de una entidad
   */
  getAnimation(entityId) {
    return this.activeAnimations.get(entityId);
  }

  /**
   * Remueve animación de una entidad
   */
  removeAnimation(entityId) {
    this.activeAnimations.delete(entityId);
  }

  /**
   * Limpia todas las animaciones
   */
  clear() {
    this.activeAnimations.clear();
  }
}

// Predefined animation configs for agent sprites
export const AGENT_ANIMATIONS = {
  // Citizen animations (base + numbered variants)
  'citizen_idle': {
    frames: [0, 1, 2, 3], // 4 frames
    frameDuration: 500,   // Slow breathing
    loop: true,
    pingpong: true
  },
  
  'citizen_walk': {
    frames: [0, 1, 2, 3], // 4 frames walking cycle
    frameDuration: 150,   // Walking speed
    loop: true,
    pingpong: false
  },

  // Citizen numbered variants
  'citizen1_idle': {
    frames: [0, 1, 2, 3],
    frameDuration: 500,
    loop: true,
    pingpong: true
  },
  'citizen1_walk': {
    frames: [0, 1, 2, 3],
    frameDuration: 150,
    loop: true,
    pingpong: false
  },
  'citizen1_working': {
    frames: [0, 1, 2, 3],
    frameDuration: 300,
    loop: true,
    pingpong: true
  },
  'citizen2_idle': {
    frames: [0, 1, 2, 3],
    frameDuration: 500,
    loop: true,
    pingpong: true
  },
  'citizen2_walk': {
    frames: [0, 1, 2, 3],
    frameDuration: 150,
    loop: true,
    pingpong: false
  },
  'citizen2_working': {
    frames: [0, 1, 2, 3],
    frameDuration: 300,
    loop: true,
    pingpong: true
  },

  // Mage animations (for AI agents)
  'mage_idle': {
    frames: [0, 1, 2, 3, 4, 5], // 6 frames
    frameDuration: 400,   // Mystical breathing
    loop: true,
    pingpong: true
  },
  
  'mage_working': {
    frames: [0, 1, 2, 3, 4, 5, 6, 7], // 8 frames casting
    frameDuration: 120,   // Active working
    loop: true,
    pingpong: false
  },

  // Mage numbered variants
  'mage1_idle': {
    frames: [0, 1, 2, 3, 4, 5],
    frameDuration: 400,
    loop: true,
    pingpong: true
  },
  'mage1_working': {
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    frameDuration: 120,
    loop: true,
    pingpong: false
  },

  // Fighter animations (for urgent/overloaded states)
  'fighter_idle': {
    frames: [0, 1, 2, 3],
    frameDuration: 300,
    loop: true,
    pingpong: true
  },
  
  'fighter_alert': {
    frames: [0, 1, 2, 3, 4, 5], // Alert/ready stance
    frameDuration: 100,   // Fast alertness
    loop: true,
    pingpong: false
  }
};

// Singleton instance
export const animationEngine = new AnimationEngine();

// Register default animations
Object.entries(AGENT_ANIMATIONS).forEach(([name, config]) => {
  animationEngine.registerAnimation(name, config);
});
