/**
 * AssetLoader - Strategy pattern for different asset loading approaches
 * Handles loading of sprites, backgrounds, and other visual assets
 */
import { eventSystem, EVENT_TYPES } from './EventSystem.js';

export class AssetLoadingStrategy {
  async load() {
    throw new Error('AssetLoadingStrategy.load must be implemented');
  }
}

export class RealAssetsStrategy extends AssetLoadingStrategy {
  constructor(spriteManager) {
    super();
    this.spriteManager = spriteManager;
  }

  async load() {
    console.log('📦 Loading real assets from /assets/sprites/...');
    try {
      await this.spriteManager.preloadCriticalAssets();
      return { success: true, type: 'real' };
    } catch (error) {
      console.warn('⚠️ Real assets failed to load:', error.message);
      return { success: false, type: 'real', error };
    }
  }
}

export class PlaceholderAssetsStrategy extends AssetLoadingStrategy {
  constructor(spriteManager, placeholderGenerator) {
    super();
    this.spriteManager = spriteManager;
    this.placeholderGenerator = placeholderGenerator;
  }

  async load() {
    console.log('🎨 Generating procedural placeholder assets...');
    try {
      await this.placeholderGenerator.generatePlaceholderSprites(this.spriteManager);
      return { success: true, type: 'placeholder' };
    } catch (error) {
      console.error('❌ Placeholder generation failed:', error);
      return { success: false, type: 'placeholder', error };
    }
  }
}

export class AssetLoader {
  constructor() {
    this.strategies = [];
    this.loadedAssets = new Map();
    this.isLoading = false;
  }

  /**
   * Add loading strategy (in priority order)
   */
  addStrategy(strategy) {
    this.strategies.push(strategy);
    return this;
  }

  /**
   * Load assets using first successful strategy
   */
  async loadAssets() {
    if (this.isLoading) {
      throw new Error('Asset loading already in progress');
    }

    this.isLoading = true;
    
    for (const strategy of this.strategies) {
      const result = await strategy.load();
      
      if (result.success) {
        eventSystem.emit(EVENT_TYPES.SPRITES_LOADED, {
          strategy: result.type,
          assetsCount: this.loadedAssets.size
        });
        
        this.isLoading = false;
        return result;
      }
    }

    this.isLoading = false;
    throw new Error('All asset loading strategies failed');
  }

  /**
   * Check if assets are loaded
   */
  areAssetsLoaded() {
    return this.loadedAssets.size > 0 && !this.isLoading;
  }

  /**
   * Register loaded asset
   */
  registerAsset(name, asset) {
    this.loadedAssets.set(name, asset);
  }

  /**
   * Get loaded asset
   */
  getAsset(name) {
    return this.loadedAssets.get(name);
  }

  /**
   * Clear all loaded assets
   */
  clear() {
    this.loadedAssets.clear();
    this.isLoading = false;
  }
}

export default AssetLoader;
