import { 
  ControlKeys, 
  CrumbleBlock, 
  DashCrystal, 
  LevelData, 
  MovingSaw, 
  Particle, 
  PlayerState, 
  Rect, 
  TimedLaser 
} from '../types/game';
import { PHYSICS, TILES, TILE_SIZE } from './constants';
import { sounds } from '../audio/soundManager';

export interface GameEngineState {
  player: PlayerState;
  level: LevelData;
  initialGrid: number[][];
  saws: MovingSaw[];
  lasers: TimedLaser[];
  crumbles: Map<string, CrumbleBlock>;
  crystals: Map<string, DashCrystal>;
  particles: Particle[];
  screenShake: number;
  levelTime: number;
  timerStarted: boolean;
  isCompleted: boolean;
  spawnPoint: { x: number; y: number };
  goalPoint: { x: number; y: number };
}

export function initLevelState(rawLevel: LevelData): GameEngineState {
  let spawnX = 32;
  let spawnY = 192;
  let goalX = 360;
  let goalY = 64;

  const crumbles = new Map<string, CrumbleBlock>();
  const crystals = new Map<string, DashCrystal>();

  // Deep clone initial grid and level so gameplay modifications never taint parent state
  const initialGrid = rawLevel.grid.map((row) => [...row]);
  const level: LevelData = {
    ...rawLevel,
    grid: rawLevel.grid.map((row) => [...row]),
    saws: rawLevel.saws ? JSON.parse(JSON.stringify(rawLevel.saws)) : undefined,
    lasers: rawLevel.lasers ? JSON.parse(JSON.stringify(rawLevel.lasers)) : undefined,
  };

  // Parse grid for spawn, goal, crumbles, crystals
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      const tile = level.grid[r][c];
      const key = `${c},${r}`;
      if (tile === TILES.SPAWN) {
        spawnX = c * TILE_SIZE + 2;
        spawnY = r * TILE_SIZE + 2;
      } else if (tile === TILES.GOAL) {
        goalX = c * TILE_SIZE;
        goalY = r * TILE_SIZE;
      } else if (tile === TILES.CRUMBLE) {
        crumbles.set(key, {
          id: key,
          gridX: c,
          gridY: r,
          state: 'idle',
          timer: 0,
          shakeOffset: 0,
        });
      } else if (tile === TILES.DASH_CRYSTAL) {
        crystals.set(key, {
          id: key,
          gridX: c,
          gridY: r,
          active: true,
          respawnTimer: 0,
        });
      }
    }
  }

  // Setup saws
  const saws: MovingSaw[] = (level.saws || []).map((s, idx) => ({
    id: `saw_${idx}`,
    x: s.startX,
    y: s.startY,
    startX: s.startX,
    startY: s.startY,
    targetX: s.targetX,
    targetY: s.targetY,
    speed: s.speed,
    radius: 10,
    angle: 0,
    progress: 0,
    direction: 1,
  }));

  // Setup lasers
  const lasers: TimedLaser[] = (level.lasers || []).map((l, idx) => ({
    id: `laser_${idx}`,
    gridX: l.gridX,
    gridY: l.gridY,
    type: l.type,
    length: l.length,
    period: l.period,
    activeTime: l.activeTime,
    phaseOffset: l.phaseOffset || 0,
  }));

  const player: PlayerState = {
    x: spawnX,
    y: spawnY,
    vx: 0,
    vy: 0,
    w: 10,
    h: 12,
    isGrounded: false,
    facingRight: true,
    isWallSliding: false,
    wallDirection: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    isDashing: false,
    dashTimer: 0,
    dashCooldown: 0,
    hasDash: true,
    hasAirJump: false,
    dashDirX: 1,
    dashDirY: 0,
    hasKey: false,
    state: 'idle',
    stateTime: 0,
  };

  return {
    player,
    level,
    initialGrid,
    saws,
    lasers,
    crumbles,
    crystals,
    particles: [],
    screenShake: 0,
    levelTime: 0,
    timerStarted: false,
    isCompleted: false,
    spawnPoint: { x: spawnX, y: spawnY },
    goalPoint: { x: goalX, y: goalY },
  };
}

export function respawnPlayer(state: GameEngineState) {
  state.levelTime = 0;
  state.timerStarted = false;
  state.player.x = state.spawnPoint.x;
  state.player.y = state.spawnPoint.y;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.isGrounded = false;
  state.player.facingRight = true;
  state.player.isWallSliding = false;
  state.player.wallDirection = 0;
  state.player.coyoteTimer = 0;
  state.player.jumpBufferTimer = 0;
  state.player.isDashing = false;
  state.player.dashTimer = 0;
  state.player.dashCooldown = 0;
  state.player.hasDash = true;
  state.player.hasAirJump = false;
  state.player.hasKey = false;
  state.player.state = 'idle';
  state.player.stateTime = 0;

  // Restore grid tiles (re-spawns collected keys, reset doors, etc.)
  if (state.initialGrid) {
    state.level.grid = state.initialGrid.map((row) => [...row]);
  }

  // Reset all crumble blocks
  state.crumbles.forEach((crumb) => {
    crumb.state = 'idle';
    crumb.timer = 0;
    crumb.shakeOffset = 0;
  });

  // Reset all dash crystals
  state.crystals.forEach((cryst) => {
    cryst.active = true;
    cryst.respawnTimer = 0;
  });

  // Reset moving saws
  state.saws.forEach((saw) => {
    saw.x = saw.startX;
    saw.y = saw.startY;
    saw.progress = 0;
    saw.direction = 1;
    saw.angle = 0;
  });

  // Clear transient particles
  state.particles = [];
  state.screenShake = 0;
}

export function updatePhysics(
  state: GameEngineState, 
  keys: ControlKeys, 
  prevKeys: ControlKeys, 
  dt: number,
  onDeath: () => void,
  onWin: () => void
): void {
  // Start level timer on first player movement/action
  const hasInput = keys.left || keys.right || keys.jump || keys.dash || keys.up || keys.down;
  if (!state.timerStarted && hasInput) {
    state.timerStarted = true;
  }

  // Cap delta time to prevent physics tunneling during frame drops
  const fixedDt = Math.min(dt, 0.033);
  if (state.timerStarted) {
    state.levelTime += fixedDt;
  }

  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - fixedDt * 20);
  }

  const p = state.player;
  p.stateTime += fixedDt;

  // 1. Update Crumbling blocks
  state.crumbles.forEach((crumble) => {
    if (crumble.state === 'triggered') {
      crumble.timer += fixedDt;
      crumble.shakeOffset = (Math.random() - 0.5) * 3;
      if (crumble.timer >= PHYSICS.CRUMBLE_TIME) {
        crumble.state = 'broken';
        crumble.timer = 0;
        // Crumble dust particles
        for (let i = 0; i < 6; i++) {
          state.particles.push({
            x: crumble.gridX * TILE_SIZE + Math.random() * TILE_SIZE,
            y: crumble.gridY * TILE_SIZE + Math.random() * TILE_SIZE,
            vx: (Math.random() - 0.5) * 60,
            vy: Math.random() * 40,
            color: '#a3a3a3',
            size: 2,
            alpha: 0.9,
            life: 0.4,
            maxLife: 0.4,
            type: 'smoke',
          });
        }
      }
    } else if (crumble.state === 'broken') {
      crumble.timer += fixedDt;
      if (crumble.timer >= PHYSICS.CRUMBLE_RESPAWN) {
        crumble.state = 'idle';
        crumble.timer = 0;
        crumble.shakeOffset = 0;
      }
    }
  });

  // 2. Update Dash Crystals
  state.crystals.forEach((crystal) => {
    if (!crystal.active) {
      crystal.respawnTimer += fixedDt;
      if (crystal.respawnTimer >= PHYSICS.CRYSTAL_RESPAWN) {
        crystal.active = true;
        crystal.respawnTimer = 0;
      }
    }
  });

  // 3. Update Moving Saws
  state.saws.forEach((saw) => {
    saw.angle += fixedDt * 12; // Fast rotation
    const dx = saw.targetX - saw.startX;
    const dy = saw.targetY - saw.startY;
    const totalDist = Math.hypot(dx, dy);

    if (totalDist > 0) {
      saw.progress += (saw.speed / totalDist) * fixedDt * saw.direction;
      if (saw.progress >= 1) {
        saw.progress = 1;
        saw.direction = -1;
      } else if (saw.progress <= 0) {
        saw.progress = 0;
        saw.direction = 1;
      }
      saw.x = saw.startX + dx * saw.progress;
      saw.y = saw.startY + dy * saw.progress;
    }
  });

  // 4. Update Timers (Coyote, Jump Buffer, Dash Cooldown)
  if (p.isGrounded) {
    p.coyoteTimer = PHYSICS.COYOTE_TIME;
    p.hasDash = true;
    p.hasAirJump = false;
  } else {
    p.coyoteTimer = Math.max(0, p.coyoteTimer - fixedDt);
  }

  // Jump buffer (triggered if key pressed down this frame)
  if (keys.jump && !prevKeys.jump) {
    p.jumpBufferTimer = PHYSICS.JUMP_BUFFER;
  } else {
    p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - fixedDt);
  }

  if (p.dashCooldown > 0) {
    p.dashCooldown = Math.max(0, p.dashCooldown - fixedDt);
  }

  // 5. Check Dash Initiation
  const dashJustPressed = 
    (keys.dash && !prevKeys.dash) ||
    (keys.dashLeft && !prevKeys.dashLeft) ||
    (keys.dashRight && !prevKeys.dashRight) ||
    (keys.dashUp && !prevKeys.dashUp) ||
    (keys.dashDown && !prevKeys.dashDown);

  if (dashJustPressed && p.hasDash && p.dashCooldown <= 0 && !p.isDashing) {
    p.isDashing = true;
    p.hasDash = false;
    p.dashTimer = PHYSICS.DASH_DURATION;
    p.dashCooldown = PHYSICS.DASH_COOLDOWN;

    // Determine dash direction from keys (explicit directional buttons take priority)
    let dirX = 0;
    let dirY = 0;

    if (keys.dashLeft) {
      dirX = -1;
      p.facingRight = false;
    } else if (keys.dashRight) {
      dirX = 1;
      p.facingRight = true;
    } else {
      if (keys.left) dirX -= 1;
      if (keys.right) dirX += 1;
    }

    if (keys.dashUp) {
      dirY = -1;
    } else if (keys.dashDown) {
      dirY = 1;
    } else {
      if (keys.up) dirY -= 1;
      if (keys.down) dirY += 1;
    }

    // If no direction held, dash forward horizontally
    if (dirX === 0 && dirY === 0) {
      dirX = p.facingRight ? 1 : -1;
    }

    // Normalize diagonal dash
    const len = Math.hypot(dirX, dirY);
    p.dashDirX = dirX / len;
    p.dashDirY = dirY / len;

    p.vx = p.dashDirX * PHYSICS.DASH_SPEED;
    p.vy = p.dashDirY * PHYSICS.DASH_SPEED;

    sounds.playDash();
    state.screenShake = 4;

    // Dash trail particles
    for (let i = 0; i < 8; i++) {
      state.particles.push({
        x: p.x + p.w / 2 + (Math.random() - 0.5) * 6,
        y: p.y + p.h / 2 + (Math.random() - 0.5) * 6,
        vx: -p.dashDirX * 40 + (Math.random() - 0.5) * 30,
        vy: -p.dashDirY * 40 + (Math.random() - 0.5) * 30,
        color: '#ff0055',
        size: 3,
        alpha: 0.9,
        life: 0.25,
        maxLife: 0.25,
        type: 'trail',
      });
    }
  }

  // 6. Dash State Processing
  if (p.isDashing) {
    p.dashTimer -= fixedDt;
    p.vx = p.dashDirX * PHYSICS.DASH_SPEED;
    p.vy = p.dashDirY * PHYSICS.DASH_SPEED;

    // Spawn subtle dash ghost particles
    if (Math.random() < 0.7) {
      state.particles.push({
        x: p.x + p.w / 2,
        y: p.y + p.h / 2,
        vx: 0,
        vy: 0,
        color: '#00f0ff',
        size: 3,
        alpha: 0.7,
        life: 0.15,
        maxLife: 0.15,
        type: 'pixel',
      });
    }

    if (p.dashTimer <= 0) {
      p.isDashing = false;
      // Retain a portion of dash momentum
      p.vx = p.dashDirX * (PHYSICS.MAX_WALK_SPEED * 1.1);
      p.vy = p.dashDirY * (PHYSICS.JUMP_FORCE * 0.4);
    }
  } else {
    // Standard Movement & Gravity
    let moveInput = 0;
    if (keys.left) moveInput -= 1;
    if (keys.right) moveInput += 1;

    if (moveInput !== 0) {
      p.facingRight = moveInput > 0;
      const targetSpeed = moveInput * PHYSICS.MAX_WALK_SPEED;
      const accel = p.isGrounded ? PHYSICS.WALK_ACCEL : PHYSICS.AIR_ACCEL;
      
      if (Math.sign(p.vx) === moveInput) {
        // Accelerating in current direction
        p.vx = approach(p.vx, targetSpeed, accel * fixedDt);
      } else {
        // Turning around
        p.vx = approach(p.vx, targetSpeed, (accel * 1.5) * fixedDt);
      }
    } else {
      // Friction deceleration
      const decel = p.isGrounded ? PHYSICS.WALK_DECEL : PHYSICS.AIR_DECEL;
      p.vx = approach(p.vx, 0, decel * fixedDt);
    }

    // Gravity
    if (p.isWallSliding && p.vy > 0) {
      // Wall slide friction
      p.vy = approach(p.vy, PHYSICS.WALL_SLIDE_SPEED, PHYSICS.GRAVITY * 0.6 * fixedDt);
    } else {
      p.vy = approach(p.vy, PHYSICS.MAX_FALL_SPEED, PHYSICS.GRAVITY * fixedDt);
    }

    // Variable jump height: release jump button cuts upward velocity
    if (!keys.jump && p.vy < 0) {
      p.vy *= PHYSICS.JUMP_RELEASE_CUT;
    }

    // 7. Jump Handling (Ground Jump / Coyote Jump / Air Jump from Crystal)
    if (p.jumpBufferTimer > 0 && (p.coyoteTimer > 0 || p.hasAirJump)) {
      const isAirJump = p.coyoteTimer <= 0 && p.hasAirJump;
      p.vy = PHYSICS.JUMP_FORCE;
      p.jumpBufferTimer = 0;
      p.coyoteTimer = 0;
      p.hasAirJump = false;
      p.isGrounded = false;
      sounds.playJump();

      // Jump dust or sparkling air jump effect
      const pColor = isAirJump ? '#38bdf8' : '#ffffff';
      for (let i = 0; i < (isAirJump ? 7 : 5); i++) {
        state.particles.push({
          x: p.x + p.w / 2 + (Math.random() - 0.5) * 8,
          y: p.y + p.h,
          vx: (Math.random() - 0.5) * 50,
          vy: -Math.random() * 25,
          color: pColor,
          size: 2,
          alpha: 0.8,
          life: 0.2,
          maxLife: 0.2,
          type: isAirJump ? 'spark' : 'smoke',
        });
      }
    }
    // Wall Jump
    else if (p.jumpBufferTimer > 0 && p.isWallSliding && p.wallDirection !== 0) {
      p.vy = PHYSICS.WALL_JUMP_FORCE_Y;
      p.vx = -p.wallDirection * PHYSICS.WALL_JUMP_FORCE_X;
      p.facingRight = p.wallDirection < 0; // face away from wall
      p.jumpBufferTimer = 0;
      p.isWallSliding = false;
      p.hasDash = true; // reset dash on wall jump
      sounds.playWallJump();

      // Wall jump spark particles
      for (let i = 0; i < 6; i++) {
        state.particles.push({
          x: p.wallDirection > 0 ? p.x + p.w : p.x,
          y: p.y + p.h / 2 + (Math.random() - 0.5) * 8,
          vx: -p.wallDirection * (30 + Math.random() * 40),
          vy: (Math.random() - 0.5) * 40,
          color: '#00f0ff',
          size: 2,
          alpha: 0.9,
          life: 0.25,
          maxLife: 0.25,
          type: 'spark',
        });
      }
    }
  }

  // 8. Collision Detection & Resolution (X-axis & Y-axis separated for solid physics)
  moveAndCollide(state, fixedDt);

  // 9. Check Hazard and Interactive Overlaps
  checkInteractions(state, onDeath, onWin);

  // 10. Update Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const part = state.particles[i];
    part.life -= fixedDt;
    part.x += part.vx * fixedDt;
    part.y += part.vy * fixedDt;
    part.alpha = Math.max(0, part.life / part.maxLife);
    if (part.life <= 0) {
      state.particles.splice(i, 1);
    }
  }

  // Determine animation state
  if (p.isDashing) {
    p.state = 'dash';
  } else if (p.isWallSliding) {
    p.state = 'wall_slide';
  } else if (!p.isGrounded) {
    p.state = p.vy < 0 ? 'jump' : 'fall';
  } else if (Math.abs(p.vx) > 10) {
    p.state = 'run';
  } else {
    p.state = 'idle';
  }
}

function moveAndCollide(state: GameEngineState, dt: number) {
  const p = state.player;
  const level = state.level;

  // Move X
  p.x += p.vx * dt;
  p.wallDirection = 0;

  let playerRect: Rect = { x: p.x, y: p.y, w: p.w, h: p.h };
  let collidedX = false;
  let canClingCurrent = false;

  const minCol = Math.max(0, Math.floor(playerRect.x / TILE_SIZE) - 1);
  const maxCol = Math.min(level.cols - 1, Math.floor((playerRect.x + playerRect.w) / TILE_SIZE) + 1);
  const minRow = Math.max(0, Math.floor(playerRect.y / TILE_SIZE) - 1);
  const maxRow = Math.min(level.rows - 1, Math.floor((playerRect.y + playerRect.h) / TILE_SIZE) + 1);

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (isSolidTile(state, c, r)) {
        const tileRect: Rect = { x: c * TILE_SIZE, y: r * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
        if (rectOverlap(playerRect, tileRect)) {
          const climbable = isClimbableWall(state, c, r);
          if (p.vx > 0) {
            p.x = tileRect.x - p.w;
            if (climbable) {
              p.wallDirection = 1;
              canClingCurrent = true;
            }
          } else if (p.vx < 0) {
            p.x = tileRect.x + tileRect.w;
            if (climbable) {
              p.wallDirection = -1;
              canClingCurrent = true;
            }
          }
          p.vx = 0;
          collidedX = true;
          playerRect.x = p.x;
        }
      }
    }
  }

  // Move Y
  p.y += p.vy * dt;
  playerRect = { x: p.x, y: p.y, w: p.w, h: p.h };
  p.isGrounded = false;

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (isSolidTile(state, c, r)) {
        const tileRect: Rect = { x: c * TILE_SIZE, y: r * TILE_SIZE, w: TILE_SIZE, h: TILE_SIZE };
        if (rectOverlap(playerRect, tileRect)) {
          if (p.vy > 0) {
            p.y = tileRect.y - p.h;
            p.vy = 0;
            p.isGrounded = true;

            // Trigger crumble if stepping on crumble block
            const crumbleKey = `${c},${r}`;
            const crumble = state.crumbles.get(crumbleKey);
            if (crumble && crumble.state === 'idle') {
              crumble.state = 'triggered';
            }
          } else if (p.vy < 0) {
            p.y = tileRect.y + tileRect.h;
            p.vy = 0;
          }
          playerRect.y = p.y;
        }
      }
    }
  }

  // Check wall sliding (touching a climbable wall, falling, not grounded)
  p.isWallSliding = collidedX && canClingCurrent && !p.isGrounded && p.vy > 0;
}

function checkInteractions(state: GameEngineState, onDeath: () => void, onWin: () => void) {
  const p = state.player;
  const level = state.level;

  // Generous hitbox for player (2px inner cushion for fairness)
  const playerBox: Rect = {
    x: p.x + 1,
    y: p.y + 1,
    w: p.w - 2,
    h: p.h - 2,
  };

  const minCol = Math.max(0, Math.floor(p.x / TILE_SIZE) - 1);
  const maxCol = Math.min(level.cols - 1, Math.floor((p.x + p.w) / TILE_SIZE) + 1);
  const minRow = Math.max(0, Math.floor(p.y / TILE_SIZE) - 1);
  const maxRow = Math.min(level.rows - 1, Math.floor((p.y + p.h) / TILE_SIZE) + 1);

  // Check tile hazards and items
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const tile = level.grid[r][c];
      const tileX = c * TILE_SIZE;
      const tileY = r * TILE_SIZE;

      // Spike checks with precise triangular hitboxes
      if (isSpike(tile)) {
        let spikeHitbox: Rect = { x: tileX + 3, y: tileY + 3, w: 10, h: 10 };
        if (tile === TILES.SPIKE_UP) spikeHitbox = { x: tileX + 3, y: tileY + 6, w: 10, h: 10 };
        else if (tile === TILES.SPIKE_DOWN) spikeHitbox = { x: tileX + 3, y: tileY, w: 10, h: 10 };
        else if (tile === TILES.SPIKE_LEFT) spikeHitbox = { x: tileX + 6, y: tileY + 3, w: 10, h: 10 };
        else if (tile === TILES.SPIKE_RIGHT) spikeHitbox = { x: tileX, y: tileY + 3, w: 10, h: 10 };

        if (rectOverlap(playerBox, spikeHitbox)) {
          triggerDeath(state, onDeath);
          return;
        }
      }

      // Spring Launch Pad (Trampoline)
      if (tile === TILES.SPRING) {
        const springBox: Rect = { x: tileX + 2, y: tileY + 6, w: 12, h: 10 };
        if (rectOverlap(playerBox, springBox)) {
          p.vy = PHYSICS.SPRING_FORCE;
          p.hasDash = true; // restores dash
          p.hasAirJump = false; // no mid-air double jump after spring launch
          p.coyoteTimer = 0; // cancel ground jump tolerance
          p.jumpBufferTimer = 0; // consume jump buffer so it doesn't double-jump
          p.isGrounded = false;
          sounds.playSpring();

          // Spring ring particles
          for (let i = 0; i < 6; i++) {
            state.particles.push({
              x: tileX + 8 + (Math.random() - 0.5) * 10,
              y: tileY + 8,
              vx: (Math.random() - 0.5) * 60,
              vy: -Math.random() * 80 - 40,
              color: '#ffb703',
              size: 2.5,
              alpha: 0.9,
              life: 0.3,
              maxLife: 0.3,
              type: 'spark',
            });
          }
        }
      }

      // Key Pickup
      if (tile === TILES.KEY && !p.hasKey) {
        const keyBox: Rect = { x: tileX + 2, y: tileY + 2, w: 12, h: 12 };
        if (rectOverlap(playerBox, keyBox)) {
          p.hasKey = true;
          // Clear key from grid in this run
          level.grid[r][c] = TILES.EMPTY;
          sounds.playKeyPickup();

          // Key sparkle explosion
          for (let i = 0; i < 12; i++) {
            state.particles.push({
              x: tileX + 8,
              y: tileY + 8,
              vx: (Math.random() - 0.5) * 100,
              vy: (Math.random() - 0.5) * 100,
              color: '#fbbf24',
              size: 3,
              alpha: 1,
              life: 0.4,
              maxLife: 0.4,
              type: 'spark',
            });
          }
        }
      }

      // Dash Crystal
      if (tile === TILES.DASH_CRYSTAL) {
        const crystalKey = `${c},${r}`;
        const crystal = state.crystals.get(crystalKey);
        if (crystal && crystal.active) {
          const crystalBox: Rect = { x: tileX + 2, y: tileY + 2, w: 12, h: 12 };
          if (rectOverlap(playerBox, crystalBox)) {
            crystal.active = false;
            crystal.respawnTimer = 0;
            p.hasDash = true;
            p.hasAirJump = true; // Refreshes jump so the player can jump mid-air!
            p.coyoteTimer = PHYSICS.COYOTE_TIME;
            sounds.playCrystalPickup();

            for (let i = 0; i < 8; i++) {
              state.particles.push({
                x: tileX + 8,
                y: tileY + 8,
                vx: (Math.random() - 0.5) * 80,
                vy: (Math.random() - 0.5) * 80,
                color: '#38bdf8',
                size: 2.5,
                alpha: 1,
                life: 0.3,
                maxLife: 0.3,
                type: 'spark',
              });
            }
          }
        }
      }

      // Goal Portal
      if (tile === TILES.GOAL && !state.isCompleted) {
        const goalBox: Rect = { x: tileX + 2, y: tileY + 2, w: 12, h: 12 };
        if (rectOverlap(playerBox, goalBox)) {
          state.isCompleted = true;
          sounds.playWin();

          // Portal celebration fireworks
          for (let i = 0; i < 30; i++) {
            state.particles.push({
              x: tileX + 8,
              y: tileY + 8,
              vx: (Math.random() - 0.5) * 150,
              vy: (Math.random() - 0.5) * 150 - 30,
              color: ['#00ff66', '#00f0ff', '#ffffff', '#fbbf24'][Math.floor(Math.random() * 4)],
              size: Math.random() * 3 + 2,
              alpha: 1,
              life: 0.6 + Math.random() * 0.4,
              maxLife: 1.0,
              type: 'spark',
            });
          }

          onWin();
          return;
        }
      }
    }
  }

  // Check Moving Saws
  for (const saw of state.saws) {
    const dist = Math.hypot(p.x + p.w / 2 - saw.x, p.y + p.h / 2 - saw.y);
    if (dist < saw.radius + p.w / 2 - 2) {
      triggerDeath(state, onDeath);
      return;
    }
  }

  // Check Timed Lasers
  for (const laser of state.lasers) {
    const cycleTime = (state.levelTime + laser.phaseOffset) % laser.period;
    const isActive = cycleTime < laser.activeTime;

    if (isActive) {
      const laserBox: Rect = laser.type === 'laser_h'
        ? { x: laser.gridX * TILE_SIZE, y: laser.gridY * TILE_SIZE + 6, w: laser.length * TILE_SIZE, h: 4 }
        : { x: laser.gridX * TILE_SIZE + 6, y: laser.gridY * TILE_SIZE, w: 4, h: laser.length * TILE_SIZE };

      if (rectOverlap(playerBox, laserBox)) {
        triggerDeath(state, onDeath);
        return;
      }
    }
  }

  // Void / Offscreen Pit Fall Check
  if (p.y > level.rows * TILE_SIZE + 4) {
    triggerDeath(state, onDeath);
    return;
  }
}

export function triggerDeath(state: GameEngineState, onDeath: () => void) {
  const p = state.player;
  sounds.playDeath();
  state.screenShake = 8;

  // Death blood / spark explosion
  for (let i = 0; i < 24; i++) {
    const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.4;
    const speed = 60 + Math.random() * 140;
    state.particles.push({
      x: p.x + p.w / 2,
      y: p.y + p.h / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: ['#ff0055', '#ff2a5f', '#ffffff', '#ffb703'][Math.floor(Math.random() * 4)],
      size: Math.random() * 3 + 2,
      alpha: 1,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      type: 'blood',
    });
  }

  onDeath();
  respawnPlayer(state);
}

function isSolidTile(state: GameEngineState, c: number, r: number): boolean {
  if (c < 0 || c >= state.level.cols || r < 0 || r >= state.level.rows) {
    return true; // Map bounds are solid
  }
  const tile = state.level.grid[r][c];
  if (tile === TILES.SOLID || tile === TILES.SMOOTH) return true;
  if (tile === TILES.DOOR && !state.player.hasKey) return true; // Gate is solid until unlocked
  if (tile === TILES.CRUMBLE) {
    const key = `${c},${r}`;
    const crumble = state.crumbles.get(key);
    return crumble?.state !== 'broken';
  }
  return false;
}

function isClimbableWall(state: GameEngineState, c: number, r: number): boolean {
  // Border perimeter walls (left and right outer bounds) cannot be climbed or wall-jumped on
  if (c <= 0 || c >= state.level.cols - 1 || r <= 0 || r >= state.level.rows - 1) {
    return false;
  }
  const tile = state.level.grid[r][c];
  // TILES.SMOOTH is specifically anti-cling / smooth wall
  if (tile === TILES.SMOOTH) {
    return false;
  }
  // Standard solid blocks and intact crumbles allow wall jumping
  if (tile === TILES.SOLID) return true;
  if (tile === TILES.CRUMBLE) {
    const key = `${c},${r}`;
    const crumble = state.crumbles.get(key);
    return crumble?.state !== 'broken';
  }
  return false;
}

function isSpike(tile: number): boolean {
  return (
    tile === TILES.SPIKE_UP ||
    tile === TILES.SPIKE_DOWN ||
    tile === TILES.SPIKE_LEFT ||
    tile === TILES.SPIKE_RIGHT
  );
}

function rectOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function approach(val: number, target: number, maxDelta: number): number {
  if (val < target) {
    return Math.min(val + maxDelta, target);
  }
  return Math.max(val - maxDelta, target);
}
