/**
 * SpriteManager - Sistema de carga y gestión de sprites para avatares 3D
 */
export class SpriteManager {
  constructor() {
    this.sprites = new Map();
    this.loading = new Map();
    this.baseUrl = '/assets/sprites/';
  }

  /**
   * Carga un sprite desde URL con cache
   */
  async loadSprite(path) {
    if (this.sprites.has(path)) {
      return this.sprites.get(path);
    }

    if (this.loading.has(path)) {
      return this.loading.get(path);
    }

    const loadPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.sprites.set(path, img);
        this.loading.delete(path);
        resolve(img);
      };
      img.onerror = () => {
        this.loading.delete(path);
        reject(new Error(`Failed to load sprite: ${path}`));
      };
      img.src = this.baseUrl + path;
    });

    this.loading.set(path, loadPromise);
    return loadPromise;
  }

  /**
   * Carga múltiples sprites en paralelo
   */
  async loadSprites(paths) {
    const promises = paths.map(path => this.loadSprite(path));
    return Promise.all(promises);
  }

  /**
   * Dibuja un sprite en el canvas
   */
  drawSprite(ctx, spritePath, x, y, options = {}) {
    const sprite = this.sprites.get(spritePath);
    if (!sprite) return false;

    const {
      width = sprite.width,
      height = sprite.height,
      offsetX = 0,
      offsetY = 0,
      alpha = 1,
      flipX = false
    } = options;

    ctx.save();
    
    if (alpha !== 1) {
      ctx.globalAlpha = alpha;
    }

    if (flipX) {
      ctx.scale(-1, 1);
      x = -x - width;
    }

    ctx.drawImage(
      sprite,
      x + offsetX,
      y + offsetY,
      width,
      height
    );

    ctx.restore();
    return true;
  }

  /**
   * Dibuja frame específico de un spritesheet
   */
  drawSpriteFrame(ctx, spritePath, x, y, frameConfig, options = {}) {
    const sprite = this.sprites.get(spritePath);
    if (!sprite) return false;

    const {
      frameWidth,
      frameHeight,
      frameIndex,
      framesPerRow = 1
    } = frameConfig;

    const {
      scale = 1,
      alpha = 1,
      flipX = false,
      offsetX = 0,
      offsetY = 0
    } = options;

    const col = frameIndex % framesPerRow;
    const row = Math.floor(frameIndex / framesPerRow);
    
    const srcX = col * frameWidth;
    const srcY = row * frameHeight;

    ctx.save();
    
    if (alpha !== 1) {
      ctx.globalAlpha = alpha;
    }

    if (flipX) {
      ctx.scale(-1, 1);
      x = -x - (frameWidth * scale);
    }

    ctx.drawImage(
      sprite,
      srcX, srcY, frameWidth, frameHeight,
      x + offsetX, y + offsetY, 
      frameWidth * scale, frameHeight * scale
    );

    ctx.restore();
    return true;
  }

  /**
   * Verifica si un sprite está cargado
   */
  isLoaded(path) {
    return this.sprites.has(path);
  }

  /**
   * Precarga assets críticos - all spritesheets from the asset pack
   */
  async preloadCriticalAssets() {
    const { getAllSpritePaths } = await import('../data/spriteConfig.js');
    
    // Chibi character sprites
    const criticalSprites = getAllSpritePaths();
    
    // Environment tiles
    criticalSprites.push(
      'pack/Walls_interior.png',
      'pack/Interior_objects.png',
      'pack/Windows_doors.png',
      'pack/Fire.png',
      'pack/Flags_animation.png',
      'pack/Decorative_cracks.png',
    );

    const results = await Promise.allSettled(
      criticalSprites.map(path => this.loadSprite(path))
    );
    
    const loaded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`✅ Sprites preloaded: ${loaded} loaded, ${failed} failed`);
    
    return loaded > 0;
  }

  /**
   * Limpia cache de sprites
   */
  clear() {
    this.sprites.clear();
    this.loading.clear();
  }
}

// Singleton instance
export const spriteManager = new SpriteManager();
