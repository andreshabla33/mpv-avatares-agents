const fs = require('fs');

const cols = 50;
const rows = 30;

const TileType = {
  WALL: 0,
  FLOOR_1: 1, // Office - warm wood tone
  FLOOR_2: 2, // Lounge - cozy carpet
  FLOOR_3: 3, // Bathroom - tiles
  VOID: 255,
};

const tiles = new Array(cols * rows).fill(TileType.VOID);
const tileColors = new Array(cols * rows).fill(null);
const furniture = [];

const setTile = (c, r, type, color = null) => {
  if (c < 0 || c >= cols || r < 0 || r >= rows) return;
  const idx = r * cols + c;
  tiles[idx] = type;
  if (color) {
    tileColors[idx] = color;
  }
};

// Colors - warm, inviting office
const officeColor = { h: 35, s: 25, b: 20, c: 1 };  // Warm wood
const loungeColor = { h: 25, s: 35, b: 25, c: 0 }; // Cozy beige
const bathColor = { h: 200, s: 15, b: 60, c: 1 };   // Light blue tiles

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    if (c === 0 || c === 21 || c === 35 || c === 49 || r === 0 || r === 29) {
      setTile(c, r, TileType.WALL);
    } else if (c > 0 && c < 21) {
      setTile(c, r, TileType.FLOOR_1, officeColor);
    } else if (c > 21 && c < 35) {
      setTile(c, r, TileType.FLOOR_2, loungeColor);
    } else if (c > 35 && c < 49) {
      setTile(c, r, TileType.FLOOR_3, bathColor);
    }
  }
}

// Doors
setTile(21, 14, TileType.FLOOR_1, officeColor);
setTile(21, 15, TileType.FLOOR_1, officeColor);
setTile(35, 14, TileType.FLOOR_2, loungeColor);
setTile(35, 15, TileType.FLOOR_2, loungeColor);

// === RECEPTION AREA ===
furniture.push({ type: 'DESK_SIDE', col: 3, row: 2 });
furniture.push({ type: 'PC_FRONT_ON_2', col: 3, row: 2 });
furniture.push({ type: 'CUSHIONED_CHAIR_SIDE', col: 4, row: 2 });
furniture.push({ type: 'SOFA_FRONT', col: 6, row: 2 });
furniture.push({ type: 'SOFA_FRONT', col: 9, row: 2 });
furniture.push({ type: 'COFFEE_TABLE', col: 7, row: 3 });
furniture.push({ type: 'LARGE_PLANT', col: 1, row: 1 });
furniture.push({ type: 'CLOCK', col: 10, row: 1 });

let agentIdx = 0;
const agents = [];
for(let i=0; i<12; i++) agents.push({ id: i });

// === 12 CUBICLES - DIVERSIFIED ===
const deskTypes = ['DESK_FRONT', 'DESK_FRONT', 'DESK_SIDE'];
const pcTypes = ['PC_FRONT_ON_1', 'PC_FRONT_ON_2', 'PC_FRONT_ON_3', 'PC_FRONT_OFF'];
const chairTypes = ['WOODEN_CHAIR_FRONT', 'CUSHIONED_CHAIR_FRONT', 'CUSHIONED_CHAIR_BACK'];

for (let i = 0; i < 12; i++) {
  const row = Math.floor(i / 3);
  const col = i % 3;
  const c = 3 + col * 6;
  const r = 6 + row * 5;
  
  const deskType = deskTypes[i % deskTypes.length];
  furniture.push({ type: deskType, col: c, row: r });
  
  const pcType = pcTypes[i % pcTypes.length];
  furniture.push({ type: pcType, col: c, row: r });
  
  const chairType = chairTypes[i % chairTypes.length];
  furniture.push({ type: chairType, col: c, row: r + 1 });
  
  if (i % 2 === 0) {
    furniture.push({ type: 'PLANT', col: c + 2, row: r });
  }
  if (i % 3 === 0) {
    furniture.push({ type: 'PLANT_2', col: c + 1, row: r + 2 });
  }
  
  if (i === 2 || i === 5) {
    furniture.push({ type: 'BOOKSHELF', col: 19, row: r });
  }

  agents[i].work = { x: c * 16, y: (r + 1) * 16 };
}

// Office decorations
furniture.push({ type: 'LARGE_PAINTING', col: 5, row: 1 });
furniture.push({ type: 'SMALL_PAINTING', col: 12, row: 1 });
furniture.push({ type: 'SMALL_PAINTING_2', col: 16, row: 1 });
furniture.push({ type: 'WHITEBOARD', col: 18, row: 5 });
furniture.push({ type: 'CACTUS', col: 1, row: 26 });

// Meeting area
furniture.push({ type: 'TABLE_FRONT', col: 12, row: 24 });
furniture.push({ type: 'WOODEN_CHAIR_FRONT', col: 12, row: 23 });
furniture.push({ type: 'WOODEN_CHAIR_BACK', col: 12, row: 27 });
furniture.push({ type: 'WOODEN_CHAIR_SIDE', col: 10, row: 25 });
furniture.push({ type: 'WOODEN_CHAIR_SIDE', col: 16, row: 25 });

// === LOUNGE AREA - COZY & INVITING ===
// Central coffee bar
furniture.push({ type: 'SMALL_TABLE_FRONT', col: 25, row: 3 });
furniture.push({ type: 'COFFEE', col: 26, row: 3 });
furniture.push({ type: 'COFFEE', col: 27, row: 3 });

// U-shaped seating
furniture.push({ type: 'SOFA_SIDE', col: 23, row: 6 });
furniture.push({ type: 'SOFA_SIDE', col: 23, row: 10 });
furniture.push({ type: 'SOFA_SIDE', col: 23, row: 14 });
furniture.push({ type: 'SOFA_SIDE', col: 33, row: 6 });
furniture.push({ type: 'SOFA_SIDE', col: 33, row: 10 });
furniture.push({ type: 'SOFA_SIDE', col: 33, row: 14 });
furniture.push({ type: 'SOFA_BACK', col: 25, row: 18 });
furniture.push({ type: 'SOFA_BACK', col: 29, row: 18 });

// Coffee tables
furniture.push({ type: 'COFFEE_TABLE', col: 26, row: 8 });
furniture.push({ type: 'COFFEE_TABLE', col: 26, row: 12 });
furniture.push({ type: 'COFFEE_TABLE', col: 28, row: 16 });

// Lounge chairs for agents
const loungeChairs = [
  {c: 25, r: 5}, {c: 31, r: 5},
  {c: 25, r: 9}, {c: 31, r: 9},
  {c: 25, r: 13}, {c: 31, r: 13},
  {c: 27, r: 17}, {c: 29, r: 17},
  {c: 25, r: 20}, {c: 31, r: 20},
  {c: 27, r: 22}, {c: 29, r: 22}
];

loungeChairs.forEach((pos, i) => {
  furniture.push({ type: 'CUSHIONED_BENCH', col: pos.c, row: pos.r });
  agents[i].lounge = { x: pos.c * 16, y: pos.r * 16 };
});

// Lounge decorations
furniture.push({ type: 'LARGE_PLANT', col: 22, row: 2 });
furniture.push({ type: 'PLANT', col: 34, row: 4 });
furniture.push({ type: 'CACTUS', col: 34, row: 16 });
furniture.push({ type: 'DOUBLE_BOOKSHELF', col: 24, row: 1 });
furniture.push({ type: 'BOOKSHELF', col: 30, row: 1 });
furniture.push({ type: 'HANGING_PLANT', col: 26, row: 1 });
furniture.push({ type: 'HANGING_PLANT', col: 32, row: 1 });
furniture.push({ type: 'LARGE_PAINTING', col: 28, row: 1 });

// === BATHROOM - IMPROVED ===
// Top row urinals with dividers
for (let i = 0; i < 6; i++) {
  const c = 37 + i * 2;
  if (i > 0) {
    furniture.push({ type: 'SMALL_PAINTING', col: c - 1, row: 1 });
  }
  furniture.push({ type: 'BIN', col: c, row: 1 });
  agents[i].urinal = { x: c * 16, y: 2 * 16 };
}

// Bottom row urinals
for (let i = 0; i < 6; i++) {
  const c = 37 + i * 2;
  if (i > 0) {
    furniture.push({ type: 'SMALL_PAINTING_2', col: c - 1, row: 27 });
  }
  furniture.push({ type: 'BIN', col: c, row: 27 });
  agents[i + 6].urinal = { x: c * 16, y: 26 * 16 };
}

// Sinks on side walls
furniture.push({ type: 'SMALL_TABLE_SIDE', col: 36, row: 5 });
furniture.push({ type: 'POT', col: 36, row: 5 });
furniture.push({ type: 'SMALL_TABLE_SIDE', col: 36, row: 10 });
furniture.push({ type: 'POT', col: 36, row: 10 });
furniture.push({ type: 'SMALL_TABLE_SIDE', col: 36, row: 15 });
furniture.push({ type: 'POT', col: 36, row: 15 });
furniture.push({ type: 'SMALL_TABLE_SIDE', col: 47, row: 5 });
furniture.push({ type: 'POT', col: 47, row: 5 });
furniture.push({ type: 'SMALL_TABLE_SIDE', col: 47, row: 10 });
furniture.push({ type: 'POT', col: 47, row: 10 });
furniture.push({ type: 'SMALL_TABLE_SIDE', col: 47, row: 15 });
furniture.push({ type: 'POT', col: 47, row: 15 });

// Mirrors above sinks
furniture.push({ type: 'WHITEBOARD', col: 36, row: 3 });
furniture.push({ type: 'WHITEBOARD', col: 36, row: 8 });
furniture.push({ type: 'WHITEBOARD', col: 36, row: 13 });

// Bathroom plants
furniture.push({ type: 'PLANT', col: 38, row: 14 });
furniture.push({ type: 'PLANT_2', col: 44, row: 14 });
furniture.push({ type: 'CACTUS', col: 42, row: 20 });
furniture.push({ type: 'SMALL_PAINTING', col: 42, row: 27 });
furniture.push({ type: 'BIN', col: 37, row: 25 });
furniture.push({ type: 'BIN', col: 47, row: 25 });

const layout = {
  version: 1,
  cols,
  rows,
  layoutRevision: 5,
  tiles,
  tileColors,
  furniture
};

fs.writeFileSync('public/assets/default-layout-1.json', JSON.stringify(layout));
fs.writeFileSync('agent_coords.json', JSON.stringify(agents, null, 2));

console.log("Layout v5 generated - Enhanced office with personality!");
