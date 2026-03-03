import React, { useEffect, useRef, useState } from 'react';
import GameEngine from '../systems/GameEngine.js';
import AssetLoader, { RealAssetsStrategy, PlaceholderAssetsStrategy } from '../systems/AssetLoader.js';
import { spriteManager } from '../utils/SpriteManager';
import { placeholderGenerator } from '../utils/PlaceholderSprites';
import { cityMapGenerator } from '../utils/CityMapGenerator';
import { eventSystem, EVENT_TYPES } from '../systems/EventSystem.js';

const BASE_W = 1100;
const BASE_H = 700;

export default function PixelOffice({ 
  agents, 
  states, 
  extras, 
  kpis, 
  onAgentClick, 
  className = '' 
}) {
  const canvasRef = useRef(null);
  const gameEngineRef = useRef(null);
  const mouseRef = useRef({ x: -1, y: -1 });
  const [isInitialized, setIsInitialized] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');

  // Initialize modular game systems
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    let gameEngine;
    try {
      gameEngine = new GameEngine(canvas);
      gameEngineRef.current = gameEngine;
    } catch (error) {
      console.error('❌ GameEngine creation failed:', error);
      setLoadingStatus(`Error creating GameEngine: ${error.message}`);
      return;
    }

    const initializeModularSystems = async () => {
      try {
        console.log('🎮 Step 1: Initializing modular game systems...');
        setLoadingStatus('🎮 Initializing modular game systems...');

        // 1. Setup asset loading strategies
        const assetLoader = new AssetLoader()
          .addStrategy(new RealAssetsStrategy(spriteManager))
          .addStrategy(new PlaceholderAssetsStrategy(spriteManager, placeholderGenerator));

        // 2. Generate interior guild hall background
        setLoadingStatus('�️ Building guild hall interior...');
        const backgroundCanvas = cityMapGenerator.generateCityMap();
        gameEngine.setBackground(backgroundCanvas);
        console.log('✅ Interior map generated');

        // 3. Load sprite assets using strategies
        setLoadingStatus('📦 Loading agent sprites...');
        const assetResult = await assetLoader.loadAssets();
        console.log(`✅ Assets loaded: ${assetResult.type}`);

        // 4. Start the modular game engine
        setLoadingStatus('🚀 Starting game engine...');
        gameEngine.start();
        setIsInitialized(true);
        
        console.log('✅ Modular game systems initialized successfully');
        setLoadingStatus('');
        
      } catch (error) {
        console.error('❌ Failed to initialize modular systems:', error);
        setLoadingStatus(`Error: ${error.message}`);
        setIsInitialized(false);
      }
    };

    initializeModularSystems();

    // Cleanup on unmount
    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.dispose();
      }
      eventSystem.clear();
    };
  }, []);

  // Update game state when props change
  useEffect(() => {
    if (isInitialized && gameEngineRef.current && agents) {
      gameEngineRef.current.updateGameState(agents, states, extras, kpis);
    }
  }, [agents, states, extras, kpis, isInitialized]);

  // Mouse event handlers
  const handleMouseMove = React.useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = BASE_W / rect.width;
    const scaleY = BASE_H / rect.height;
    
    mouseRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    mouseRef.current = { x: -1, y: -1 };
  }, []);

  const handleClick = React.useCallback((e) => {
    if (!gameEngineRef.current || !onAgentClick) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = BASE_W / rect.width;
    const scaleY = BASE_H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    gameEngineRef.current.handleAgentClick(x, y, onAgentClick);
  }, [onAgentClick]);

  return (
    <div className="relative w-full h-full">
      {/* Canvas is ALWAYS in the DOM so canvasRef is available for initialization */}
      <canvas
        ref={canvasRef}
        width={BASE_W}
        height={BASE_H}
        className={`block mx-auto border-2 border-[#2a2a4e] rounded cursor-crosshair w-full h-auto max-w-full pixelated ${className}`}
        style={{ 
          imageRendering: 'pixelated',
          background: '#0f0f23'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      
      {/* Loading overlay - shown until game engine is ready */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f23]/90 z-10">
          <div className="text-[#4ecdc4] font-mono text-sm space-y-2 text-center">
            <div>🏗️ UAL Office Virtual Agent</div>
            <div className="text-[#74b9ff] text-xs">Loading...</div>
            <div className="text-[#636e72] text-xs">{loadingStatus}</div>
          </div>
        </div>
      )}
    </div>
  );
}
