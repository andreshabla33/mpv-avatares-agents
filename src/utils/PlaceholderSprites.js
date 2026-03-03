/**
 * PlaceholderSprites - Genera sprites básicos en canvas para desarrollo
 */
export class PlaceholderSpriteGenerator {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Genera un sprite de ciudadano en canvas
   */
  generateCitizenSprite(frameIndex = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Clear background
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, 32, 32);

    // Animation offset for idle breathing
    const breathe = frameIndex % 4;
    const yOffset = Math.sin(breathe * Math.PI / 2) * 1;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(6, 28, 20, 4);

    // Body
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(10, 16 + yOffset, 12, 10);

    // Head
    ctx.fillStyle = '#f5d5c8';
    ctx.fillRect(12, 8 + yOffset, 8, 8);

    // Hair
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(12, 6 + yOffset, 8, 4);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(13, 11 + yOffset, 2, 1);
    ctx.fillRect(17, 11 + yOffset, 2, 1);

    // Legs (slight movement for walking)
    ctx.fillStyle = '#2d2d44';
    const legOffset = frameIndex % 2;
    ctx.fillRect(12, 26, 3, 6 + legOffset);
    ctx.fillRect(17, 26, 3, 6 - legOffset);

    return canvas;
  }

  /**
   * Genera un sprite de mago en canvas
   */
  generateMageSprite(frameIndex = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Animation offset
    const magical = frameIndex % 6;
    const yOffset = Math.sin(magical * Math.PI / 3) * 0.5;
    const sparkle = Math.sin(magical * Math.PI / 3) * 0.5 + 0.5;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(6, 28, 20, 4);

    // Robe
    ctx.fillStyle = '#6c5ce7';
    ctx.fillRect(9, 18 + yOffset, 14, 8);

    // Head
    ctx.fillStyle = '#f5d5c8';
    ctx.fillRect(12, 8 + yOffset, 8, 8);

    // Hat
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(11, 4 + yOffset, 10, 6);
    ctx.fillRect(13, 2 + yOffset, 6, 4);

    // Eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(13, 11 + yOffset, 2, 1);
    ctx.fillRect(17, 11 + yOffset, 2, 1);

    // Staff (for mages)
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(8, 12 + yOffset, 2, 12);
    
    // Magical orb
    ctx.fillStyle = `rgba(116, 185, 255, ${sparkle})`;
    ctx.fillRect(7, 10 + yOffset, 4, 4);

    // Legs
    ctx.fillStyle = '#2d2d44';
    ctx.fillRect(12, 26, 3, 6);
    ctx.fillRect(17, 26, 3, 6);

    return canvas;
  }

  /**
   * Genera spritesheet completo para un tipo de personaje
   */
  generateSpriteSheet(type, frameCount = 4) {
    const canvas = document.createElement('canvas');
    canvas.width = 32 * frameCount;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < frameCount; i++) {
      let frameCanvas;
      if (type === 'citizen') {
        frameCanvas = this.generateCitizenSprite(i);
      } else if (type === 'mage') {
        frameCanvas = this.generateMageSprite(i);
      }

      if (frameCanvas) {
        ctx.drawImage(frameCanvas, i * 32, 0);
      }
    }

    return canvas;
  }

  /**
   * Convierte canvas a blob URL para usar como imagen
   */
  canvasToImageUrl(canvas) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        resolve(url);
      });
    });
  }

  /**
   * Genera y registra sprites placeholder en el SpriteManager
   */
  async generatePlaceholderSprites(spriteManager) {
    try {
      // Generate citizen sprites
      const citizenIdleSheet = this.generateSpriteSheet('citizen', 4);
      const citizenWalkSheet = this.generateSpriteSheet('citizen', 4);
      
      // Generate mage sprites  
      const mageIdleSheet = this.generateSpriteSheet('mage', 6);
      const mageWorkingSheet = this.generateSpriteSheet('mage', 8);

      // Convert to image objects and register
      const sprites = {
        'characters/citizen1-idle.png': citizenIdleSheet,
        'characters/citizen1-walk.png': citizenWalkSheet,
        'characters/citizen2-idle.png': citizenIdleSheet,
        'characters/citizen2-walk.png': citizenWalkSheet,
        'characters/mage1-idle.png': mageIdleSheet,
        'characters/mage1-working.png': mageWorkingSheet,
        'characters/mage2-idle.png': mageIdleSheet,
        'characters/mage2-working.png': mageWorkingSheet,
      };

      // Register sprites in manager
      for (const [path, canvas] of Object.entries(sprites)) {
        // Create image from canvas
        const img = new Image();
        img.src = canvas.toDataURL();
        spriteManager.sprites.set(path, img);
      }

      console.log('🎨 Placeholder sprites generated successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to generate placeholder sprites:', error);
      return false;
    }
  }
}

export const placeholderGenerator = new PlaceholderSpriteGenerator();
