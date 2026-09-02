export const TILE_SIZE = 16; // 16x16 pixel grid

export const TILES = {
  EMPTY: 0,
  SOLID: 1,
  ONE_WAY: 2,
  CRUMBLE: 3,
  SPIKE_UP: 4,
  SPIKE_DOWN: 5,
  SPIKE_LEFT: 6,
  SPIKE_RIGHT: 7,
  SPRING: 8,
  DASH_CRYSTAL: 9,
  KEY: 10,
  DOOR: 11,
  SPAWN: 12,
  GOAL: 13,
  SMOOTH: 14, // Smooth anti-cling wall (cannot wall-slide or wall-jump)
} as const;

// Hardcore precision physics tuning (inspired by Celeste / Super Meat Boy / VVVVVV)
export const PHYSICS = {
  GRAVITY: 980,              // pixels/sec^2
  MAX_FALL_SPEED: 420,       // terminal velocity
  WALK_ACCEL: 2400,          // sharp responsive acceleration
  WALK_DECEL: 2800,          // instant stop friction
  AIR_ACCEL: 1800,           // air control
  AIR_DECEL: 1200,           // air drift friction
  MAX_WALK_SPEED: 145,       // horizontal speed
  
  JUMP_FORCE: -330,          // initial jump impulse
  JUMP_RELEASE_CUT: 0.45,    // cuts vertical velocity when jump released early (variable jump height)
  COYOTE_TIME: 0.09,         // ~5.5 frames forgiveness after walking off edge
  JUMP_BUFFER: 0.1,          // ~6 frames jump command queue before landing
  
  WALL_SLIDE_SPEED: 70,      // wall friction slide
  WALL_JUMP_FORCE_X: 220,    // horizontal wall push
  WALL_JUMP_FORCE_Y: -310,   // vertical wall jump boost
  WALL_JUMP_LOCK_TIME: 0.12, // brief directional lockout after wall jump
  
  DASH_SPEED: 380,           // supersonic burst
  DASH_DURATION: 0.14,       // duration of dash freeze/dash impulse
  DASH_COOLDOWN: 0.2,        // minimum time between dashes
  
  SPRING_FORCE: -460,        // launch pad boost
  CRUMBLE_TIME: 0.35,        // time before crumbling block collapses
  CRUMBLE_RESPAWN: 2.5,      // time to respawn
  CRYSTAL_RESPAWN: 2.0,      // time to replenish dash crystal
  
  CORNER_NUDGE_DIST: 3,      // pixel nudge for smooth corner clearing
};

export const DEFAULT_COLS = 18;
export const DEFAULT_ROWS = 18;
