/**
 * Effects2D - Sistema de efectos visuales 2.5D para profundidad e inmersión
 */
export class Effects2D {
  constructor() {
    this.shadowCanvas = null;
    this.shadowCtx = null;
  }

  /**
   * Inicializa el sistema de efectos
   */
  initialize(width, height) {
    // Canvas para pre-renderizar sombras
    this.shadowCanvas = document.createElement('canvas');
    this.shadowCanvas.width = width;
    this.shadowCanvas.height = height;
    this.shadowCtx = this.shadowCanvas.getContext('2d');
  }

  /**
   * Dibuja sombra dinámica basada en posición y estado
   */
  drawDynamicShadow(ctx, x, y, width, height, intensity = 0.3, angle = 0) {
    const shadowLength = intensity * 15;
    const shadowX = x + Math.cos(angle) * shadowLength;
    const shadowY = y + Math.sin(angle) * shadowLength;

    // Gradiente de sombra
    const gradient = ctx.createRadialGradient(
      x, y, 0,
      shadowX, shadowY, width * 1.5
    );
    gradient.addColorStop(0, `rgba(0,0,0,${intensity})`);
    gradient.addColorStop(0.5, `rgba(0,0,0,${intensity * 0.5})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(shadowX, shadowY + height/2, width/2, height/4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Efecto de profundidad por posición Y (z-sorting visual)
   */
  calculateDepthScale(y, baseY, maxDepth = 0.2) {
    const depthFactor = (y - baseY) / 500; // Normalize depth
    return 1 + (depthFactor * maxDepth);
  }

  /**
   * Efecto de lighting ambiental
   */
  drawAmbientLighting(ctx, width, height, timeOfDay = 'day') {
    const lightingConfigs = {
      dawn: {
        color: 'rgba(255, 180, 120, 0.15)',
        gradient: ['rgba(255, 200, 150, 0.1)', 'rgba(255, 160, 80, 0.05)']
      },
      day: {
        color: 'rgba(255, 255, 200, 0.08)',
        gradient: ['rgba(255, 255, 220, 0.05)', 'rgba(200, 220, 255, 0.03)']
      },
      dusk: {
        color: 'rgba(255, 100, 150, 0.2)',
        gradient: ['rgba(255, 120, 180, 0.1)', 'rgba(120, 60, 200, 0.08)']
      },
      night: {
        color: 'rgba(100, 150, 255, 0.25)',
        gradient: ['rgba(80, 120, 200, 0.15)', 'rgba(40, 60, 120, 0.1)']
      }
    };

    const config = lightingConfigs[timeOfDay] || lightingConfigs.day;
    
    // Gradiente global de iluminación
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, config.gradient[0]);
    gradient.addColorStop(1, config.gradient[1]);
    
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  /**
   * Partículas de actividad para agentes trabajando
   */
  drawActivityParticles(ctx, x, y, frame, activityLevel = 1, color = '#74b9ff') {
    const particleCount = Math.min(activityLevel * 3, 8);
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (frame * 0.02 + i * (Math.PI * 2 / particleCount)) % (Math.PI * 2);
      const radius = 20 + Math.sin(frame * 0.03 + i) * 8;
      const particleX = x + Math.cos(angle) * radius;
      const particleY = y + Math.sin(angle) * radius - 15;
      
      const alpha = 0.4 + Math.sin(frame * 0.05 + i) * 0.3;
      const size = 2 + Math.sin(frame * 0.08 + i) * 1;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(particleX, particleY, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Efecto de calor/stress para agentes sobrecargados
   */
  drawHeatWave(ctx, x, y, frame, intensity = 1) {
    const waveCount = 5;
    
    for (let i = 0; i < waveCount; i++) {
      const waveY = y - 30 + (i * 6);
      const waveOffset = Math.sin(frame * 0.1 + i * 0.5) * 3;
      
      ctx.save();
      ctx.globalAlpha = 0.3 * intensity;
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 15 + waveOffset, waveY);
      ctx.quadraticCurveTo(x + waveOffset, waveY - 3, x + 15 + waveOffset, waveY);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Aura de estado para visualización rápida
   */
  drawStatusAura(ctx, x, y, status, frame) {
    const auraConfigs = {
      responding: { color: '#00b894', size: 25, pulse: true },
      working: { color: '#74b9ff', size: 20, pulse: true },
      overloaded: { color: '#ff6b6b', size: 30, pulse: true, fast: true },
      idle: { color: '#636e72', size: 15, pulse: false },
      paused: { color: '#2d3436', size: 18, pulse: false }
    };

    const config = auraConfigs[status] || auraConfigs.idle;
    if (!config) return;

    let radius = config.size;
    let alpha = 0.15;

    if (config.pulse) {
      const pulseSpeed = config.fast ? 0.15 : 0.08;
      const pulseFactor = Math.sin(frame * pulseSpeed) * 0.3 + 0.7;
      radius *= pulseFactor;
      alpha *= pulseFactor;
    }

    // Gradiente radial para el aura
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `${config.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(0.7, `${config.color}${Math.floor(alpha * 0.5 * 255).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, `${config.color}00`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Efecto parallax para elementos de fondo
   */
  drawParallaxLayer(ctx, elements, scrollX = 0, scrollY = 0, depth = 0.5) {
    ctx.save();
    
    // Aplicar offset parallax basado en profundidad
    const offsetX = scrollX * depth;
    const offsetY = scrollY * depth;
    
    ctx.translate(-offsetX, -offsetY);
    
    // Dibujar elementos con escala basada en profundidad
    const scale = 0.8 + (depth * 0.4);
    ctx.scale(scale, scale);
    
    // Aquí dibujarías los elementos de fondo
    // Por ahora solo aplicamos el efecto para futuras implementaciones
    
    ctx.restore();
  }

  /**
   * Sistema de tiempo dinámico para cambiar iluminación
   */
  getTimeOfDay(hour = null) {
    const currentHour = hour || new Date().getHours();
    
    if (currentHour >= 5 && currentHour < 8) return 'dawn';
    if (currentHour >= 8 && currentHour < 18) return 'day';
    if (currentHour >= 18 && currentHour < 21) return 'dusk';
    return 'night';
  }

  /**
   * Cleanup de recursos
   */
  dispose() {
    if (this.shadowCanvas) {
      this.shadowCanvas = null;
      this.shadowCtx = null;
    }
  }
}

export const effects2D = new Effects2D();
