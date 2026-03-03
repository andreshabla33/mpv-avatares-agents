/**
 * GameEngine - Central coordinator using Facade pattern
 * Orchestrates all systems and manages the main game loop
 */
import { entityManager } from './EntityManager.js';
import { AgentBehaviorSystem } from './AgentBehaviorSystem.js';
import { RenderingEngine, RENDER_LAYERS } from './RenderingEngine.js';
import { eventSystem, EVENT_TYPES } from './EventSystem.js';
import { animationEngine } from '../utils/AnimationEngine.js';
import { spriteManager } from '../utils/SpriteManager.js';
import { agentRenderer } from '../rendering/AgentRenderer.js';

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.isRunning = false;
    this.lastTimestamp = 0;
    this.animationId = null;
    
    // Initialize all systems
    this.renderingEngine = new RenderingEngine(canvas);
    this.behaviorSystem = new AgentBehaviorSystem(entityManager);
    
    // Game state
    this.currentStates = {};
    this.currentExtras = {};
    this.currentKpis = {};
    this.frame = 0;
    
    this.setupRenderingLayers();
    this.setupEventListeners();
  }

  /**
   * Setup rendering layers with proper separation
   */
  setupRenderingLayers() {
    // Background layer (z-index: 0)
    this.renderingEngine.registerLayer(
      RENDER_LAYERS.BACKGROUND,
      (ctx, data) => {
        // Background is handled in renderBackground()
      },
      0
    );

    // Shadows layer (z-index: 1) 
    this.renderingEngine.registerLayer(
      RENDER_LAYERS.SHADOWS,
      (ctx, { agents, frame }) => {
        agents.forEach(agent => {
          if (agent.hasRealData) {
            this.renderAgentShadow(ctx, agent, frame);
          }
        });
      },
      1
    );

    // Agents layer (z-index: 2)
    this.renderingEngine.registerLayer(
      RENDER_LAYERS.AGENTS,
      (ctx, { agents, states, extras, frame }) => {
        // Sort agents by Y for proper z-ordering
        const sortedAgents = [...agents].sort((a, b) => a.y - b.y);
        
        sortedAgents.forEach(agent => {
          this.renderAgent(ctx, agent, states[agent.id] || 'idle', extras[agent.id], frame);
        });
      },
      2
    );

    // Effects layer (z-index: 3)
    this.renderingEngine.registerLayer(
      RENDER_LAYERS.EFFECTS,
      (ctx, { agents, states, extras, frame }) => {
        this.renderPostEffects(ctx, agents, states, extras, frame);
      },
      3
    );

    // UI Overlay layer (z-index: 4)
    this.renderingEngine.registerLayer(
      RENDER_LAYERS.UI_OVERLAY,
      (ctx, { kpis, frame }) => {
        this.renderKPIOverlay(ctx, kpis, frame);
      },
      4
    );
  }

  /**
   * Setup event listeners for system communication
   */
  setupEventListeners() {
    this._lastLoggedCount = 0;
    eventSystem.subscribe(EVENT_TYPES.DATA_UPDATED, (data) => {
      if (data.totalAgents !== this._lastLoggedCount) {
        console.log(`🔄 Data updated: ${data.totalAgents} agents, ${data.activeAgents} active`);
        this._lastLoggedCount = data.totalAgents;
      }
    });

    eventSystem.subscribe(EVENT_TYPES.AGENT_STATE_CHANGED, (data) => {
      if (data.action === 'created') {
        console.log(`✨ Agent created: ${data.agent.name}`);
      }
    });
  }

  /**
   * Update game state from external data
   */
  updateGameState(agents, states, extras, kpis) {
    // Update entity manager
    entityManager.updateFromAPIResponse(agents);
    
    // Debug: log state distribution when data changes
    const stateKey = JSON.stringify(Object.values(states).sort());
    if (this._lastStateKey !== stateKey) {
      const stateCounts = {};
      Object.entries(states).forEach(([id, s]) => { stateCounts[s] = (stateCounts[s] || 0) + 1; });
      const allAgents = entityManager.getAllAgents();
      const active = allAgents.filter(a => a.hasRealData);
      const off = allAgents.filter(a => !a.hasRealData);
      console.log(`📊 Estados: ${JSON.stringify(stateCounts)} | Entities: ${allAgents.length} (${active.length} activos, ${off.length} OFF)`);
      // Log which agents have which states
      active.forEach(a => {
        console.log(`  ▸ ${a.name} → ${states[a.id] || 'NO STATE'} | pos(${Math.round(a.x)},${Math.round(a.y)}) desk(${a.deskX},${a.deskY})`);
      });
      this._lastStateKey = stateKey;
    }

    // Store current state for systems
    this.currentStates = states;
    this.currentExtras = extras;
    this.currentKpis = kpis;
  }

  /**
   * Main game loop
   */
  gameLoop = (timestamp) => {
    if (!this.isRunning) return;

    const deltaTime = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    this.frame++;

    // Update all systems
    this.update(deltaTime);
    
    // Render everything
    this.render();
    
    // Continue loop
    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  /**
   * Update all game systems
   */
  update(deltaTime) {
    const agents = entityManager.getAllAgents();
    
    // Update behaviors
    this.behaviorSystem.update(this.currentStates, deltaTime, this.frame);
    
    // Update animations
    animationEngine.update(performance.now());
  }

  /**
   * Render everything using the rendering engine
   */
  render() {
    const agents = entityManager.getAllAgents();
    
    this.renderingEngine.render(
      agents,
      this.currentStates,
      this.currentExtras,
      this.frame,
      this.currentKpis
    );
  }

  /**
   * Render individual agent (called by rendering layer)
   */
  renderAgent(ctx, agent, state, extra, frame) {
    // Use AgentRenderer - already imported synchronously
    agentRenderer.render(ctx, agent, state, extra, frame);
  }

  /**
   * Render agent shadow (called by shadow layer)
   */
  renderAgentShadow(ctx, agent, frame) {
    // Simple shadow for now
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(agent.x - 8, agent.y + 18, 20, 6);
  }

  /**
   * Render post-processing effects
   */
  renderPostEffects(ctx, agents, states, extras, frame) {
    // Scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    for (let y = 0; y < this.canvas.height; y += 3) {
      ctx.fillRect(0, y, this.canvas.width, 1);
    }

    // Vignette
    const gradient = ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.3,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Render KPI overlay
   */
  renderKPIOverlay(ctx, kpis, frame) {
    if (!kpis) return;

    ctx.fillStyle = 'rgba(10,10,20,0.8)';
    ctx.fillRect(4, 4, 130, 48);
    ctx.strokeStyle = '#2a2a4e';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, 130, 48);
    
    ctx.font = '8px monospace';
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText(`Msgs/1h: ${kpis.total_msgs_1h || 0}`, 10, 16);
    ctx.fillStyle = '#74b9ff';
    ctx.fillText(`Convos: ${kpis.total_convs_open || 0}`, 10, 28);
    ctx.fillStyle = '#2ecc71';
    ctx.fillText(`Activos: ${kpis.active_agents || 0}/${kpis.total_agents || 0}`, 10, 40);
    
    if (kpis.overloaded_agents > 0) {
      ctx.fillStyle = '#e74c3c';
      const blink = Math.sin(frame * 0.15) > 0 ? 1 : 0.3;
      ctx.globalAlpha = blink;
      ctx.fillText(`⚠ ${kpis.overloaded_agents} OVERLOADED`, 10, 50);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Set background image
   */
  setBackground(backgroundCanvas) {
    this.renderingEngine.setBackground(backgroundCanvas);
  }

  /**
   * Start the game engine
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.animationId = requestAnimationFrame(this.gameLoop);
    
    console.log('🎮 Game engine started');
  }

  /**
   * Stop the game engine
   */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    console.log('⏹️ Game engine stopped');
  }

  /**
   * Handle click events on agents
   */
  handleAgentClick(x, y, onAgentClick) {
    const clickedAgent = entityManager.findNearestEntity(x, y, 30);
    if (clickedAgent && onAgentClick) {
      eventSystem.emit(EVENT_TYPES.AGENT_CLICKED, { agent: clickedAgent });
      onAgentClick(clickedAgent);
    }
  }

  /**
   * Get engine statistics
   */
  getStats() {
    return {
      frame: this.frame,
      isRunning: this.isRunning,
      entities: entityManager.getDebugInfo(),
      rendering: this.renderingEngine.getStats(),
      behaviors: this.behaviorSystem.getStats()
    };
  }

  /**
   * Cleanup all systems
   */
  dispose() {
    this.stop();
    this.renderingEngine.dispose();
    this.behaviorSystem.clear();
    entityManager.clear();
    eventSystem.clear();
  }
}

export default GameEngine;
