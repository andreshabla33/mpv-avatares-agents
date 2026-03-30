/**
 * Browser runtime mock — fetches assets and injects the same postMessage
 * events the VS Code extension would send.
 *
 * In Vite dev, it prefers pre-decoded JSON endpoints from middleware.
 * In plain browser builds, it falls back to decoding PNGs at runtime.
 *
 * Only imported in browser runtime; tree-shaken from VS Code webview runtime.
 */

import {
  CHAR_FRAME_H,
  CHAR_FRAME_W,
  CHAR_FRAMES_PER_ROW,
  CHARACTER_DIRECTIONS,
  FLOOR_TILE_SIZE,
  PNG_ALPHA_THRESHOLD,
  WALL_BITMASK_COUNT,
  WALL_GRID_COLS,
  WALL_PIECE_HEIGHT,
  WALL_PIECE_WIDTH,
} from './shared/assets/constants';
import type {
  AssetIndex,
  CatalogEntry,
  CharacterDirectionSprites,
} from './shared/assets/types';

interface MockPayload {
  characters: CharacterDirectionSprites[];
  floorSprites: string[][][];
  wallSets: string[][][][];
  furnitureCatalog: CatalogEntry[];
  furnitureSprites: Record<string, string[][]>;
  layout: unknown;
}

// ── Module-level state ─────────────────────────────────────────────────────────

let mockPayload: MockPayload | null = null;

// ── PNG decode helpers (browser fallback) ───────────────────────────────────

interface DecodedPng {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  if (a < PNG_ALPHA_THRESHOLD) return '';
  const rgb =
    `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
  if (a >= 255) return rgb;
  return `${rgb}${a.toString(16).padStart(2, '0').toUpperCase()}`;
}

function getPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const idx = (y * width + x) * 4;
  return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
}

function readSprite(
  png: DecodedPng,
  width: number,
  height: number,
  offsetX = 0,
  offsetY = 0,
): string[][] {
  const sprite: string[][] = [];
  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(png.data, png.width, offsetX + x, offsetY + y);
      row.push(rgbaToHex(r, g, b, a));
    }
    sprite.push(row);
  }
  return sprite;
}

async function decodePng(url: string): Promise<DecodedPng> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch PNG: ${url} (${res.status.toString()})`);
  }
  const blob = await res.blob();
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      throw new Error('Failed to create 2d canvas context for PNG decode');
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { width: canvas.width, height: canvas.height, data: imageData.data };
  } catch (err) {
    console.error(`Failed to decode image from URL: ${url}`, err);
    throw err;
  }
}

async function fetchJsonOptional<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function getIndexedAssetPath(kind: 'characters' | 'floors' | 'walls', relPath: string): string {
  return relPath.startsWith(`${kind}/`) ? relPath : `${kind}/${relPath}`;
}

async function decodeCharactersFromPng(
  base: string,
  index: AssetIndex,
): Promise<CharacterDirectionSprites[]> {
  const sprites: CharacterDirectionSprites[] = [];
  for (const relPath of index.characters) {
    const png = await decodePng(`${base}assets/${getIndexedAssetPath('characters', relPath)}`);
    const byDir: CharacterDirectionSprites = { down: [], up: [], right: [] };

    for (let dirIdx = 0; dirIdx < CHARACTER_DIRECTIONS.length; dirIdx++) {
      const dir = CHARACTER_DIRECTIONS[dirIdx];
      const rowOffsetY = dirIdx * CHAR_FRAME_H;
      const frames: string[][][] = [];
      for (let frame = 0; frame < CHAR_FRAMES_PER_ROW; frame++) {
        frames.push(readSprite(png, CHAR_FRAME_W, CHAR_FRAME_H, frame * CHAR_FRAME_W, rowOffsetY));
      }
      byDir[dir] = frames;
    }

    sprites.push(byDir);
  }
  return sprites;
}

async function decodeFloorsFromPng(base: string, index: AssetIndex): Promise<string[][][]> {
  const floors: string[][][] = [];
  for (const relPath of index.floors) {
    const png = await decodePng(`${base}assets/${getIndexedAssetPath('floors', relPath)}`);
    floors.push(readSprite(png, FLOOR_TILE_SIZE, FLOOR_TILE_SIZE));
  }
  return floors;
}

async function decodeWallsFromPng(base: string, index: AssetIndex): Promise<string[][][][]> {
  const wallSets: string[][][][] = [];
  for (const relPath of index.walls) {
    const png = await decodePng(`${base}assets/${getIndexedAssetPath('walls', relPath)}`);
    const set: string[][][] = [];
    for (let mask = 0; mask < WALL_BITMASK_COUNT; mask++) {
      const ox = (mask % WALL_GRID_COLS) * WALL_PIECE_WIDTH;
      const oy = Math.floor(mask / WALL_GRID_COLS) * WALL_PIECE_HEIGHT;
      set.push(readSprite(png, WALL_PIECE_WIDTH, WALL_PIECE_HEIGHT, ox, oy));
    }
    wallSets.push(set);
  }
  return wallSets;
}

async function decodeFurnitureFromPng(
  base: string,
  catalog: CatalogEntry[],
): Promise<Record<string, string[][]>> {
  const sprites: Record<string, string[][]> = {};
  for (const entry of catalog) {
    const png = await decodePng(`${base}assets/${entry.furniturePath}`);
    sprites[entry.id] = readSprite(png, entry.width, entry.height);
  }
  return sprites;
}

// ── Procedural Fallback Generators ─────────────────────────────────────────────

function generateFallbackCharacter(bodyColor: string): CharacterDirectionSprites {
  const makeFrame = (legShift: number): string[][] => {
    const frame: string[][] = [];
    for (let y = 0; y < CHAR_FRAME_H; y++) {
      const row: string[] = [];
      for (let x = 0; x < CHAR_FRAME_W; x++) {
        const cx = 8;
        // Head (rows 4-9)
        if (y >= 4 && y <= 9 && x >= cx - 3 && x <= cx + 2) {
          if (y === 7 && (x === cx - 2 || x === cx + 1)) row.push('#222222');
          else row.push('#FFCCAA');
        }
        // Body (rows 10-19)
        else if (y >= 10 && y <= 19 && x >= cx - 4 && x <= cx + 3) {
          row.push(bodyColor);
        }
        // Left leg (rows 20-27)
        else if (y >= 20 && y <= 27 && x >= 5 + legShift && x <= 7 + legShift) {
          row.push('#334466');
        }
        // Right leg (rows 20-27)
        else if (y >= 20 && y <= 27 && x >= 9 - legShift && x <= 11 - legShift) {
          row.push('#334466');
        }
        else {
          row.push('');
        }
      }
      frame.push(row);
    }
    return frame;
  };
  const frames: string[][][] = [];
  for (let f = 0; f < CHAR_FRAMES_PER_ROW; f++) {
    frames.push(makeFrame(f % 2 === 0 ? 0 : (f % 4 < 2 ? 1 : -1)));
  }
  return { down: frames, up: [...frames], right: [...frames] };
}

function generateFallbackCharacters(): CharacterDirectionSprites[] {
  const colors = ['#4ecdc4', '#ff6b6b', '#ffe66d', '#a29bfe', '#fd79a8', '#00cec9'];
  return colors.map((c) => generateFallbackCharacter(c));
}

function generateFallbackFloors(): string[][][] {
  const colors = ['#2a2a3e', '#333350', '#2d2d45', '#28283c', '#303048', '#2b2b40', '#272738', '#2e2e48', '#323250'];
  return colors.map((baseColor) => {
    const tile: string[][] = [];
    for (let y = 0; y < FLOOR_TILE_SIZE; y++) {
      const row: string[] = [];
      for (let x = 0; x < FLOOR_TILE_SIZE; x++) {
        row.push(baseColor);
      }
      tile.push(row);
    }
    return tile;
  });
}

function generateFallbackWalls(): string[][][][] {
  const wallColor = '#4a4a6a';
  const set: string[][][] = [];
  for (let mask = 0; mask < WALL_BITMASK_COUNT; mask++) {
    const piece: string[][] = [];
    for (let y = 0; y < WALL_PIECE_HEIGHT; y++) {
      const row: string[] = [];
      for (let x = 0; x < WALL_PIECE_WIDTH; x++) {
        row.push(y < 2 || y >= WALL_PIECE_HEIGHT - 1 ? '#5a5a7a' : wallColor);
      }
      piece.push(row);
    }
    set.push(piece);
  }
  return [set];
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Call before createRoot() in main.tsx.
 * Fetches all pre-decoded assets from the Vite dev server and stores them
 * for dispatchMockMessages().
 */
export async function initBrowserMock(): Promise<void> {
  console.log('[BrowserMock] Loading assets...');

  const base = import.meta.env.BASE_URL; // '/' in dev, '/sub/' with a subpath, './' in production

  let assetIndex: AssetIndex;
  let catalog: CatalogEntry[];
  try {
    [assetIndex, catalog] = await Promise.all([
      fetch(`${base}assets/asset-index.json`).then((r) => r.json()) as Promise<AssetIndex>,
      fetch(`${base}assets/furniture-catalog.json`).then((r) => r.json()) as Promise<CatalogEntry[]>,
    ]);
  } catch (err) {
    console.warn('[BrowserMock] Failed to load asset index, using empty defaults:', err);
    assetIndex = { characters: [], floors: [], walls: [], defaultLayout: 'default-layout-1.json' } as unknown as AssetIndex;
    catalog = [];
  }

  const shouldTryDecoded = import.meta.env.DEV;
  const [decodedCharacters, decodedFloors, decodedWalls, decodedFurniture] = shouldTryDecoded
    ? await Promise.all([
        fetchJsonOptional<CharacterDirectionSprites[]>(`${base}assets/decoded/characters.json`),
        fetchJsonOptional<string[][][]>(`${base}assets/decoded/floors.json`),
        fetchJsonOptional<string[][][][]>(`${base}assets/decoded/walls.json`),
        fetchJsonOptional<Record<string, string[][]>>(`${base}assets/decoded/furniture.json`),
      ])
    : [null, null, null, null];

  const hasDecoded = !!(decodedCharacters && decodedFloors && decodedWalls && decodedFurniture);

  let characters: CharacterDirectionSprites[];
  let floorSprites: string[][][];
  let wallSets: string[][][][];
  let furnitureSprites: Record<string, string[][]>;

  if (hasDecoded) {
    characters = decodedCharacters!;
    floorSprites = decodedFloors!;
    wallSets = decodedWalls!;
    furnitureSprites = decodedFurniture!;
  } else {
    // Try PNG decode, fall back to procedural generation per asset type
    try {
      characters = await decodeCharactersFromPng(base, assetIndex);
    } catch (err) {
      console.warn('[BrowserMock] Character PNGs missing, generating procedural fallbacks:', (err as Error).message);
      characters = generateFallbackCharacters();
    }

    try {
      floorSprites = await decodeFloorsFromPng(base, assetIndex);
    } catch (err) {
      console.warn('[BrowserMock] Floor PNGs missing, generating procedural fallbacks:', (err as Error).message);
      floorSprites = generateFallbackFloors();
    }

    try {
      wallSets = await decodeWallsFromPng(base, assetIndex);
    } catch (err) {
      console.warn('[BrowserMock] Wall PNGs missing, generating procedural fallbacks:', (err as Error).message);
      wallSets = generateFallbackWalls();
    }

    try {
      furnitureSprites = await decodeFurnitureFromPng(base, catalog);
    } catch (err) {
      console.warn('[BrowserMock] Furniture PNGs missing, using empty set:', (err as Error).message);
      furnitureSprites = {};
    }
  }

  let layout: unknown = null;
  try {
    if (assetIndex.defaultLayout) {
      layout = await fetch(`${base}assets/${assetIndex.defaultLayout}`).then((r) => r.json());
    }
  } catch (err) {
    console.warn('[BrowserMock] Default layout failed to load:', (err as Error).message);
  }

  mockPayload = {
    characters,
    floorSprites,
    wallSets,
    furnitureCatalog: catalog,
    furnitureSprites,
    layout,
  };

  const source = hasDecoded ? 'decoded-json' : 'png+fallback';
  console.log(
    `[BrowserMock] Ready (${source}) — ${characters.length} chars, ${floorSprites.length} floors, ${wallSets.length} wall sets, ${catalog.length} furniture items`,
  );
}

/**
 * Call inside a useEffect in App.tsx — after the window message listener
 * in useExtensionMessages has been registered.
 */
export function dispatchMockMessages(): void {
  if (!mockPayload) return;

  const { characters, floorSprites, wallSets, furnitureCatalog, furnitureSprites, layout } =
    mockPayload;

  function dispatch(data: unknown): void {
    window.dispatchEvent(new MessageEvent('message', { data }));
  }

  // Must match the load order defined in CLAUDE.md:
  // characterSpritesLoaded → floorTilesLoaded → wallTilesLoaded → furnitureAssetsLoaded → layoutLoaded
  dispatch({ type: 'characterSpritesLoaded', characters });
  dispatch({ type: 'floorTilesLoaded', sprites: floorSprites });
  dispatch({ type: 'wallTilesLoaded', sets: wallSets });
  dispatch({ type: 'furnitureAssetsLoaded', catalog: furnitureCatalog, sprites: furnitureSprites });
  dispatch({ type: 'layoutLoaded', layout });
  dispatch({ type: 'settingsLoaded', soundEnabled: false });

  console.log('[BrowserMock] Messages dispatched');
}
