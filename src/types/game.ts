export type EntityType = 
  | 'empty'
  | 'solid'             // Standard solid block
  | 'smooth'            // Smooth anti-cling solid block (cannot wall-jump)
  | 'one_way'           // Jump-through platform
  | 'crumble'           // Breaks 0.4s after stepping on it
  | 'spike_up'          // Deadly spike pointing up
  | 'spike_down'        // Deadly spike pointing down
  | 'spike_left'        // Deadly spike pointing left
  | 'spike_right'       // Deadly spike pointing right
  | 'saw'               // Moving spinning circular saw
  | 'laser_h'           // Horizontal pulsating laser emitter
  | 'laser_v'           // Vertical pulsating laser emitter
  | 'spring'            // Bounce pad launching player upward
  | 'dash_crystal'      // Floating gem that replenishes air dash
  | 'key'               // Collectible key to unlock gate
  | 'door'              // Gate that opens when key is collected
  | 'spawn'             // Player starting position
  | 'goal';             // Level exit portal

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MovingSaw {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  speed: number;
  radius: number;
  angle: number;
  progress: number;
  direction: number;
}

export interface TimedLaser {
  id: string;
  gridX: number;
  gridY: number;
  type: 'laser_h' | 'laser_v';
  length: number;
  period: number; // total cycle time in seconds (e.g. 2.0s)
  activeTime: number; // time active (e.g. 1.0s)
  phaseOffset: number; // start offset in seconds
}

export interface SeekerEnemy {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  speed: number;
  radius: number;
  state: 'seeking' | 'knocked_back' | 'stunned';
  knockbackTimer: number;
  stunTimer: number;
  angle: number;
  eyeAngle: number;
  pulse: number;
}

export interface CrumbleBlock {
  id: string;
  gridX: number;
  gridY: number;
  state: 'idle' | 'triggered' | 'broken' | 'respawning';
  timer: number;
  shakeOffset: number;
}

export interface DashCrystal {
  id: string;
  gridX: number;
  gridY: number;
  active: boolean;
  respawnTimer: number;
}

export interface LevelData {
  id: number;
  name: string;
  difficulty: 'Hard' | 'Brutal' | 'Extreme' | 'Nightmare' | 'Impossible';
  parTime: number; // Par time in seconds for gold medal
  cols: number;
  rows: number;
  grid: number[][]; // Map grid IDs
  saws?: Array<{
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    speed: number;
  }>;
  lasers?: Array<{
    gridX: number;
    gridY: number;
    type: 'laser_h' | 'laser_v';
    length: number;
    period: number;
    activeTime: number;
    phaseOffset?: number;
  }>;
  seekers?: Array<{
    x: number;
    y: number;
    speed?: number;
  }>;
  hint?: string;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  isGrounded: boolean;
  facingRight: boolean;
  isWallSliding: boolean;
  wallDirection: number; // -1 for left wall, 1 for right wall, 0 for none
  coyoteTimer: number;
  jumpBufferTimer: number;
  isDashing: boolean;
  dashTimer: number;
  dashCooldown: number;
  hasDash: boolean;
  hasAirJump?: boolean;
  dashDirX: number;
  dashDirY: number;
  hasKey: boolean;
  state: 'idle' | 'run' | 'jump' | 'fall' | 'wall_slide' | 'dash' | 'dead' | 'win';
  stateTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'pixel' | 'trail' | 'spark' | 'smoke' | 'ring' | 'blood';
}

export interface GhostSnapshot {
  x: number;
  y: number;
  facingRight: boolean;
  alpha: number;
  color: string;
}

export type ThemeName = 'neon' | 'gameboy' | 'noir' | 'pico' | 'cyberpunk' | 'monochrome';

export interface ThemeColors {
  id: ThemeName;
  name: string;
  background: string;
  gridLine: string;
  solid: string;
  solidBorder: string;
  solidHighlight: string;
  spike: string;
  spikeBorder: string;
  player: string;
  playerEye: string;
  playerDash: string;
  goal: string;
  goalGlow: string;
  spring: string;
  saw: string;
  laserOff: string;
  laserOn: string;
  crystal: string;
  key: string;
  door: string;
  particleSparks: string[];
}

export interface LevelRecord {
  completed: boolean;
  bestTime: number; // in seconds
  deaths: number;
  stars: number; // 0, 1, 2, 3
}

export interface GameStats {
  totalDeaths: number;
  totalTime: number;
  completedLevels: number;
  records: Record<number, LevelRecord>;
}

export interface ControlKeys {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  dash: boolean;
  restart: boolean;
  dashLeft?: boolean;
  dashRight?: boolean;
  dashUp?: boolean;
  dashDown?: boolean;
}

export interface LeaderboardEntry {
  id: string;
  levelId: number;
  playerName: string;
  username?: string;
  tgId?: string | number;
  time: number; // seconds with 2 decimals e.g. 12.34
  deaths: number;
  platform?: 'telegram' | 'web';
  timestamp: number;
  grade?: string;
}

export interface GlobalSpeedrunEntry {
  id: string;
  playerName: string;
  username?: string;
  tgId?: string | number;
  totalTime: number; // sum of best times across all levels
  totalDeaths: number;
  levelsCompleted: number;
  platform?: 'telegram' | 'web';
  timestamp: number;
}

