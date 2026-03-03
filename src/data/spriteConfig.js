// Sprite configuration - Fantasy Chibi characters
// All sprites in /assets/sprites/chibi/{Character}/{Animation}.png
// Frame size: 128×128, horizontal strips

// 3 character types
const CHARACTER_TYPES = ['swordsman', 'archer', 'wizard'];

// Deterministic hash — same agent always gets same character
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getCharacterType(agentId) {
  return CHARACTER_TYPES[hashCode(agentId) % CHARACTER_TYPES.length];
}

// Frame size is 128×128 for all characters
export const FRAME_SIZE = 128;

// Target render size on canvas (128 native → 64px on screen)
export const RENDER_SCALE = 0.5;

// Animation definitions per character
// Each entry: { path, frames } — path relative to /assets/sprites/
export const ANIMATIONS = {
  swordsman: {
    idle:   { path: 'chibi/Swordsman/Idle.png',     frames: 8 },
    walk:   { path: 'chibi/Swordsman/Walk.png',     frames: 8 },
    run:    { path: 'chibi/Swordsman/Run.png',      frames: 8 },
    attack: { path: 'chibi/Swordsman/Attack_1.png', frames: 6 },
    hurt:   { path: 'chibi/Swordsman/Hurt.png',     frames: 3 },
    dead:   { path: 'chibi/Swordsman/Dead.png',     frames: 3 },
  },
  archer: {
    idle:   { path: 'chibi/Archer/Idle.png',     frames: 6 },
    walk:   { path: 'chibi/Archer/Walk.png',     frames: 8 },
    run:    { path: 'chibi/Archer/Run.png',      frames: 8 },
    attack: { path: 'chibi/Archer/Attack_1.png', frames: 4 },
    hurt:   { path: 'chibi/Archer/Hurt.png',     frames: 3 },
    dead:   { path: 'chibi/Archer/Dead.png',     frames: 3 },
  },
  wizard: {
    idle:   { path: 'chibi/Wizard/Idle.png',     frames: 6 },
    walk:   { path: 'chibi/Wizard/Walk.png',     frames: 7 },
    run:    { path: 'chibi/Wizard/Run.png',      frames: 8 },
    attack: { path: 'chibi/Wizard/Attack_1.png', frames: 10 },
    hurt:   { path: 'chibi/Wizard/Hurt.png',     frames: 3 },
    dead:   { path: 'chibi/Wizard/Dead.png',     frames: 3 },
  },
};

// Agent state → animation name
export function getAnimForState(state) {
  switch (state) {
    case 'responding':
    case 'sending':
    case 'scheduling':
    case 'qualifying':
    case 'thinking':
    case 'working':
    case 'overloaded':
      return 'attack';
    case 'paused':
      return 'hurt';
    case 'idle':
    case 'waiting':
    default:
      return 'idle';
  }
}

// Collect all sprite paths for preloading
export function getAllSpritePaths() {
  const paths = [];
  Object.values(ANIMATIONS).forEach(charAnims => {
    Object.values(charAnims).forEach(anim => {
      paths.push(anim.path);
    });
  });
  return paths;
}
