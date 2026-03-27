/**
 * InteriorMapGenerator - Guild hall interior office layout using pixel art tiles
 * Creates a warm interior background for the agent office visualization
 */
import { spriteManager as _spriteManager } from './SpriteManager.js';

export class CityMapGenerator {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tileSize = 16;
    this.canvas = null;
  }

  /**
   * Generate the guild hall interior map
   */
  generateCityMap() {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');

    // Render layers in order
    this.drawFloor(ctx);
    this.drawWalls(ctx);
    this.drawRoomDividers(ctx);
    this.drawFurniture(ctx);
    this.drawDecorations(ctx);

    this.canvas = canvas;
    return canvas;
  }

  /**
   * Warm wooden floor with tile pattern
   */
  drawFloor(ctx) {
    const T = this.tileSize;

    // Base wooden floor color
    for (let x = 0; x < this.width; x += T) {
      for (let y = 0; y < this.height; y += T) {
        // Alternating wood plank pattern
        const isAlt = (Math.floor(x / T) + Math.floor(y / T)) % 2 === 0;
        ctx.fillStyle = isAlt ? '#5c3a1e' : '#6b4226';
        ctx.fillRect(x, y, T, T);

        // Subtle wood grain lines
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(x, y + 4, T, 1);
        ctx.fillRect(x, y + 10, T, 1);

        // Plank edge
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(x + T - 1, y, 1, T);
        ctx.fillRect(x, y + T - 1, T, 1);
      }
    }

    // Carpet/rug areas for each work zone
    this.drawRug(ctx, 60, 120, 280, 200, '#2c1810', '#3d2419');
    this.drawRug(ctx, 400, 120, 280, 200, '#1a2430', '#243040');
    this.drawRug(ctx, 60, 400, 280, 200, '#1a3020', '#243d2d');
    this.drawRug(ctx, 400, 400, 280, 200, '#2d1a30', '#3d2440');
    this.drawRug(ctx, 750, 120, 280, 480, '#2a2010', '#3a3018');
  }

  /**
   * Draw a decorative rug
   */
  drawRug(ctx, x, y, w, h, color1, color2) {
    // Outer border
    ctx.fillStyle = color1;
    ctx.fillRect(x, y, w, h);

    // Inner area
    ctx.fillStyle = color2;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);

    // Border pattern
    ctx.fillStyle = 'rgba(200,160,80,0.15)';
    ctx.fillRect(x + 2, y + 2, w - 4, 2);
    ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
    ctx.fillRect(x + 2, y + 2, 2, h - 4);
    ctx.fillRect(x + w - 4, y + 2, 2, h - 4);

    // Corner ornaments
    ctx.fillStyle = 'rgba(200,160,80,0.2)';
    [
      [x + 4, y + 4], [x + w - 10, y + 4],
      [x + 4, y + h - 10], [x + w - 10, y + h - 10]
    ].forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, 6, 6);
    });
  }

  /**
   * Stone walls along the top and sides
   */
  drawWalls(ctx) {
    const wallH = 80;

    // Top wall - stone bricks
    for (let x = 0; x < this.width; x += 32) {
      for (let y = 0; y < wallH; y += 16) {
        const offset = (Math.floor(y / 16) % 2) * 16;
        ctx.fillStyle = y < 16 ? '#8090a0' : '#7a8494';
        ctx.fillRect(x + offset, y, 32, 16);

        // Brick lines
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(x + offset, y + 15, 32, 1);
        ctx.fillRect(x + offset + 31, y, 1, 16);

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x + offset + 1, y + 1, 30, 1);
      }
    }

    // Bottom wall shadow
    const grad = ctx.createLinearGradient(0, wallH, 0, wallH + 20);
    grad.addColorStop(0, 'rgba(0,0,0,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, wallH, this.width, 20);

    // Wall trim / baseboard
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(0, wallH - 4, this.width, 8);
    ctx.fillStyle = '#7a5030';
    ctx.fillRect(0, wallH - 4, this.width, 2);

    // Pillars / columns at intervals
    for (let px = 180; px < this.width; px += 350) {
      this.drawPillar(ctx, px, 0, wallH + 20);
    }
  }

  /**
   * Draw a decorative stone pillar
   */
  drawPillar(ctx, x, y, h) {
    const w = 24;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + w, y + 4, 6, h);

    // Main pillar
    ctx.fillStyle = '#8a7a6a';
    ctx.fillRect(x, y, w, h);

    // Pillar highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x + 2, y, 4, h);

    // Pillar shade
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + w - 4, y, 4, h);

    // Capital (top ornament)
    ctx.fillStyle = '#9a8a78';
    ctx.fillRect(x - 4, y, w + 8, 8);
    ctx.fillRect(x - 2, y + 8, w + 4, 4);

    // Base
    ctx.fillStyle = '#9a8a78';
    ctx.fillRect(x - 4, y + h - 8, w + 8, 8);
    ctx.fillRect(x - 2, y + h - 12, w + 4, 4);
  }

  /**
   * Room dividers and walkways
   */
  drawRoomDividers(ctx) {
    // Horizontal divider
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(0, 350, 700, 6);
    ctx.fillStyle = '#6a4a30';
    ctx.fillRect(0, 350, 700, 2);

    // Vertical divider between main area and sidebar
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(720, 80, 6, this.height - 80);
    ctx.fillStyle = '#6a4a30';
    ctx.fillRect(720, 80, 2, this.height - 80);

    // Vertical divider in main area
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(355, 80, 4, 560);
    ctx.fillStyle = '#6a4a30';
    ctx.fillRect(355, 80, 1, 560);

    // Section labels — dark background strip + bright text for readability
    const labels = [
      { text: 'RESPONDIENDO MENSAJES', x: 190, y: 110 },
      { text: 'AGENDAR CITA',          x: 530, y: 110 },
      { text: 'PRECALIFICACIÓN',        x: 190, y: 390 },
      { text: 'SOPORTE / TRABAJO',      x: 530, y: 390 },
      { text: 'OFFLINE',                x: 830, y: 110 },
    ];
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    labels.forEach(({ text, x, y }) => {
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x - tw / 2 - 6, y - 9, tw + 12, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(text, x, y);
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  /**
   * Draw desks and workstations
   */
  drawFurniture(ctx) {
    // Desks in each zone (arranged for agents to sit at)
    // Zone 1: Agendamiento (top-left)
    this.drawDeskRow(ctx, 80, 160, 4, 'horizontal');
    this.drawDeskRow(ctx, 80, 240, 4, 'horizontal');

    // Zone 2: Cerradores (top-right)
    this.drawDeskRow(ctx, 420, 160, 4, 'horizontal');
    this.drawDeskRow(ctx, 420, 240, 4, 'horizontal');

    // Zone 3: Precalificación (bottom-left)
    this.drawDeskRow(ctx, 80, 440, 4, 'horizontal');
    this.drawDeskRow(ctx, 80, 520, 4, 'horizontal');

    // Zone 4: Soporte (bottom-right)
    this.drawDeskRow(ctx, 420, 440, 4, 'horizontal');
    this.drawDeskRow(ctx, 420, 520, 4, 'horizontal');

    // Sidebar: Guild Master area
    this.drawLargeDesk(ctx, 780, 200);
    this.drawBookshelf(ctx, 760, 350);
    this.drawBookshelf(ctx, 860, 350);
    this.drawBookshelf(ctx, 760, 440);
    this.drawBookshelf(ctx, 860, 440);
    this.drawLargeDesk(ctx, 780, 540);
  }

  /**
   * Draw a row of desks
   */
  drawDeskRow(ctx, startX, startY, count, _orientation) {
    const spacing = 65;
    for (let i = 0; i < count; i++) {
      const x = startX + i * spacing;
      this.drawDesk(ctx, x, startY);
    }
  }

  /**
   * Draw a single desk (top-down view)
   */
  drawDesk(ctx, x, y) {
    // Desk surface
    ctx.fillStyle = '#6d4c2a';
    ctx.fillRect(x, y, 48, 28);

    // Desk top edge highlight
    ctx.fillStyle = '#8a6240';
    ctx.fillRect(x, y, 48, 3);

    // Desk shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + 2, y + 28, 48, 3);

    // Monitor/screen on desk
    ctx.fillStyle = '#1a2a3a';
    ctx.fillRect(x + 14, y + 4, 20, 14);
    // Screen glow
    ctx.fillStyle = '#2a4a6a';
    ctx.fillRect(x + 16, y + 6, 16, 10);
    // Screen content lines
    ctx.fillStyle = '#4a8aba';
    ctx.fillRect(x + 18, y + 8, 10, 1);
    ctx.fillRect(x + 18, y + 11, 8, 1);
    ctx.fillRect(x + 18, y + 14, 12, 1);

    // Chair (below desk)
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x + 16, y + 32, 16, 12);
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(x + 18, y + 34, 12, 8);
  }

  /**
   * Draw a large desk (guild master)
   */
  drawLargeDesk(ctx, x, y) {
    // Large ornate desk
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(x, y, 80, 36);
    ctx.fillStyle = '#7a5030';
    ctx.fillRect(x + 2, y + 2, 76, 4);
    ctx.fillStyle = '#4a2a10';
    ctx.fillRect(x + 4, y + 8, 72, 24);

    // Papers/scrolls
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(x + 10, y + 12, 18, 14);
    ctx.fillStyle = '#d4c4a8';
    ctx.fillRect(x + 34, y + 10, 12, 18);

    // Candle
    ctx.fillStyle = '#c8a050';
    ctx.fillRect(x + 62, y + 14, 4, 8);
    ctx.fillStyle = '#ff9030';
    ctx.fillRect(x + 63, y + 10, 2, 4);
  }

  /**
   * Draw a bookshelf (top-down)
   */
  drawBookshelf(ctx, x, y) {
    // Shelf frame
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(x, y, 48, 20);

    // Books (colorful spines)
    const bookColors = ['#8b2020', '#1a4080', '#2a6030', '#6a3080', '#806020', '#204060'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = bookColors[i];
      ctx.fillRect(x + 4 + i * 7, y + 3, 5, 14);
    }

    // Shelf shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x, y + 20, 48, 3);
  }

  /**
   * Decorative elements
   */
  drawDecorations(ctx) {
    // Torches / wall lamps along top wall
    for (let tx = 100; tx < this.width; tx += 200) {
      this.drawTorch(ctx, tx, 60);
    }

    // Banner in guild master area
    this.drawBanner(ctx, 830, 140);

    // Potted plants
    this.drawPlant(ctx, 50, 100);
    this.drawPlant(ctx, 340, 100);
    this.drawPlant(ctx, 700, 100);
    this.drawPlant(ctx, 50, 640);
    this.drawPlant(ctx, 340, 640);

    // Floor candelabras
    this.drawCandelabra(ctx, 355, 340);
    this.drawCandelabra(ctx, 720, 340);
  }

  drawTorch(ctx, x, y) {
    // Bracket
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(x - 2, y - 4, 6, 12);
    // Flame
    ctx.fillStyle = '#ff8020';
    ctx.fillRect(x - 1, y - 8, 4, 5);
    ctx.fillStyle = '#ffb040';
    ctx.fillRect(x, y - 10, 2, 3);
    // Glow
    ctx.fillStyle = 'rgba(255, 160, 40, 0.12)';
    ctx.beginPath();
    ctx.arc(x + 1, y - 6, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBanner(ctx, x, y) {
    // Banner pole
    ctx.fillStyle = '#6a5a4a';
    ctx.fillRect(x - 1, y - 10, 3, 50);
    // Banner cloth
    ctx.fillStyle = '#1a3060';
    ctx.fillRect(x - 14, y, 30, 36);
    // Shield emblem
    ctx.fillStyle = '#c8a040';
    ctx.fillRect(x - 8, y + 6, 18, 18);
    ctx.fillStyle = '#1a3060';
    ctx.fillRect(x - 5, y + 9, 12, 12);
    // Star
    ctx.fillStyle = '#c8a040';
    ctx.fillRect(x - 1, y + 12, 4, 4);
    // Banner fringe
    ctx.fillStyle = '#c8a040';
    ctx.fillRect(x - 14, y + 34, 30, 3);
  }

  drawPlant(ctx, x, y) {
    // Pot
    ctx.fillStyle = '#8a5a30';
    ctx.fillRect(x - 4, y + 4, 10, 8);
    ctx.fillStyle = '#7a4a20';
    ctx.fillRect(x - 5, y + 2, 12, 4);
    // Leaves
    ctx.fillStyle = '#2a7a30';
    ctx.fillRect(x - 6, y - 4, 5, 8);
    ctx.fillRect(x + 2, y - 6, 5, 8);
    ctx.fillStyle = '#3a9a40';
    ctx.fillRect(x - 2, y - 8, 6, 10);
  }

  drawCandelabra(ctx, x, y) {
    // Base
    ctx.fillStyle = '#6a5a4a';
    ctx.fillRect(x - 4, y + 4, 10, 4);
    // Stem
    ctx.fillRect(x, y - 6, 3, 12);
    // Arms
    ctx.fillRect(x - 6, y - 6, 15, 2);
    // Candles
    ctx.fillStyle = '#e8d8b0';
    ctx.fillRect(x - 6, y - 10, 3, 5);
    ctx.fillRect(x + 1, y - 10, 3, 5);
    ctx.fillRect(x + 7, y - 10, 3, 5);
    // Flames
    ctx.fillStyle = '#ff9030';
    ctx.fillRect(x - 5, y - 13, 1, 3);
    ctx.fillRect(x + 2, y - 13, 1, 3);
    ctx.fillRect(x + 8, y - 13, 1, 3);
    // Glow
    ctx.fillStyle = 'rgba(255, 160, 40, 0.08)';
    ctx.beginPath();
    ctx.arc(x + 1, y - 8, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  getCanvas() {
    return this.canvas || this.generateCityMap();
  }
}

export const cityMapGenerator = new CityMapGenerator(1100, 700);
