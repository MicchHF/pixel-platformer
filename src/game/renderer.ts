import { ThemeColors } from '../types/game';
import { TILES, TILE_SIZE } from './constants';
import { GameEngineState } from './physics';

export interface RenderOptions {
  theme: ThemeColors;
  showGrid?: boolean;
  scanlines?: boolean;
  screenShakeEnabled?: boolean;
}

export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameEngineState,
  options: RenderOptions
) {
  const { theme, showGrid = true, scanlines = false, screenShakeEnabled = true } = options;
  const { level, player, saws, lasers, crumbles, crystals, particles, screenShake } = state;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Screen shake
  if (screenShakeEnabled && screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * screenShake;
    const shakeY = (Math.random() - 0.5) * screenShake;
    ctx.translate(shakeX, shakeY);
  }

  const width = level.cols * TILE_SIZE;
  const height = level.rows * TILE_SIZE;

  // Background
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);

  // Subtle background grid
  if (showGrid) {
    ctx.strokeStyle = theme.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= level.cols; c++) {
      ctx.moveTo(c * TILE_SIZE, 0);
      ctx.lineTo(c * TILE_SIZE, height);
    }
    for (let r = 0; r <= level.rows; r++) {
      ctx.moveTo(0, r * TILE_SIZE);
      ctx.lineTo(width, r * TILE_SIZE);
    }
    ctx.stroke();
  }

  // 1. Draw Lasers (Background Layer)
  lasers.forEach((laser) => {
    const cycleTime = (state.levelTime + laser.phaseOffset) % laser.period;
    const isActive = cycleTime < laser.activeTime;
    const warnTime = laser.period - cycleTime;
    const isWarning = !isActive && warnTime <= 0.4;

    const startX = laser.gridX * TILE_SIZE;
    const startY = laser.gridY * TILE_SIZE;

    // Laser emitter base
    ctx.fillStyle = '#475569';
    ctx.fillRect(startX + 4, startY + 4, 8, 8);

    if (isActive) {
      // Active fatal beam
      ctx.fillStyle = theme.laserOn;
      ctx.shadowColor = theme.laserOn;
      ctx.shadowBlur = 8;

      if (laser.type === 'laser_h') {
        const beamW = laser.length * TILE_SIZE;
        ctx.fillRect(startX, startY + 6, beamW, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(startX, startY + 7, beamW, 2);
      } else {
        const beamH = laser.length * TILE_SIZE;
        ctx.fillRect(startX + 6, startY, 4, beamH);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(startX + 7, startY, 2, beamH);
      }
      ctx.shadowBlur = 0;
    } else if (isWarning) {
      // Warning telegraph flashing line
      ctx.strokeStyle = theme.laserOff;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      if (laser.type === 'laser_h') {
        ctx.moveTo(startX, startY + 8);
        ctx.lineTo(startX + laser.length * TILE_SIZE, startY + 8);
      } else {
        ctx.moveTo(startX + 8, startY);
        ctx.lineTo(startX + 8, startY + laser.length * TILE_SIZE);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  // 2. Draw Tiles
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      const tile = level.grid[r][c];
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;

      switch (tile) {
        case TILES.SOLID:
          drawSolidBlock(ctx, x, y, theme, c, r, level.cols, level.rows);
          break;

        case TILES.SMOOTH:
          drawSmoothBlock(ctx, x, y, theme);
          break;

        case TILES.CRUMBLE: {
          const key = `${c},${r}`;
          const crumble = crumbles.get(key);
          if (crumble && crumble.state !== 'broken') {
            const shake = crumble.state === 'triggered' ? crumble.shakeOffset : 0;
            drawCrumbleBlock(ctx, x + shake, y, theme, crumble.state === 'triggered');
          }
          break;
        }

        case TILES.SPIKE_UP:
          drawSpike(ctx, x, y, 'up', theme);
          break;

        case TILES.SPIKE_DOWN:
          drawSpike(ctx, x, y, 'down', theme);
          break;

        case TILES.SPIKE_LEFT:
          drawSpike(ctx, x, y, 'left', theme);
          break;

        case TILES.SPIKE_RIGHT:
          drawSpike(ctx, x, y, 'right', theme);
          break;

        case TILES.SPRING:
          drawSpring(ctx, x, y, theme);
          break;

        case TILES.DASH_CRYSTAL: {
          const key = `${c},${r}`;
          const crystal = crystals.get(key);
          if (crystal?.active) {
            drawDashCrystal(ctx, x, y, state.levelTime, theme);
          }
          break;
        }

        case TILES.KEY:
          drawKey(ctx, x, y, state.levelTime, theme);
          break;

        case TILES.DOOR:
          if (!player.hasKey) {
            drawDoor(ctx, x, y, theme);
          }
          break;

        case TILES.GOAL:
          drawGoal(ctx, x, y, state.levelTime, theme);
          break;
      }
    }
  }

  // 3. Draw Moving Saws
  saws.forEach((saw) => {
    drawSaw(ctx, saw.x, saw.y, saw.radius, saw.angle, theme);
  });

  // 3.5. Draw Seeker Enemies
  (state.seekers || []).forEach((seeker) => {
    drawSeeker(ctx, seeker, state.levelTime, theme);
  });

  // 4. Draw Particles
  particles.forEach((part) => {
    ctx.fillStyle = part.color;
    ctx.globalAlpha = part.alpha;
    if (part.type === 'ring') {
      ctx.strokeStyle = part.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size * (1 - part.alpha + 0.2) * 6, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillRect(
        Math.floor(part.x - part.size / 2),
        Math.floor(part.y - part.size / 2),
        part.size,
        part.size
      );
    }
  });
  ctx.globalAlpha = 1.0;

  // 5. Draw Player Character
  drawPlayer(ctx, player, state.levelTime, theme);

  // 6. Optional Scanlines overlay for authentic CRT monitor feel
  if (scanlines) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  ctx.restore();
}

function drawSolidBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: ThemeColors,
  c?: number,
  r?: number,
  cols?: number,
  rows?: number
) {
  // If this solid block is on the outer border boundary, draw it with the slick border style
  const isBorder = (c !== undefined && cols !== undefined && (c === 0 || c === cols - 1)) ||
                   (r !== undefined && rows !== undefined && (r === 0 || r === rows - 1));

  if (isBorder) {
    drawSmoothBlock(ctx, x, y, theme);
    return;
  }

  ctx.fillStyle = theme.solid;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  // Pixel edge bevel
  ctx.fillStyle = theme.solidHighlight;
  ctx.fillRect(x, y, TILE_SIZE, 1);
  ctx.fillRect(x, y, 1, TILE_SIZE);

  ctx.fillStyle = theme.solidBorder;
  ctx.fillRect(x, y + TILE_SIZE - 1, TILE_SIZE, 1);
  ctx.fillRect(x + TILE_SIZE - 1, y, 1, TILE_SIZE);

  // Center subtle detail
  ctx.fillStyle = theme.solidBorder;
  ctx.fillRect(x + 4, y + 4, 2, 2);
  ctx.fillRect(x + 10, y + 10, 2, 2);
}

function drawSmoothBlock(ctx: CanvasRenderingContext2D, x: number, y: number, theme: ThemeColors) {
  // Slick non-cling surface: darker gunmetal base with glossy shine lines and polished hazard notches
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  // Subtle metallic inner body
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

  // High gloss sheen (signals ultra-smooth glass / slick metal)
  ctx.fillStyle = '#38bdf844';
  ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 2);
  ctx.fillRect(x + 2, y + 5, TILE_SIZE - 6, 1);

  // Slick diagonal lines indicating non-grip / anti-cling
  ctx.fillStyle = '#475569';
  ctx.fillRect(x + 4, y + 8, 3, 2);
  ctx.fillRect(x + 8, y + 10, 3, 2);
  ctx.fillRect(x + 12, y + 12, 3, 2);

  // Dark boundary border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
}

function drawCrumbleBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  theme: ThemeColors,
  triggered: boolean
) {
  ctx.fillStyle = triggered ? '#64748b' : '#475569';
  ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

  ctx.strokeStyle = triggered ? '#ef4444' : '#94a3b8';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

  // Cracks
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x + 3, y + 5, 4, 1);
  ctx.fillRect(x + 6, y + 6, 1, 4);
  ctx.fillRect(x + 9, y + 8, 4, 1);
}

function drawSpike(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: 'up' | 'down' | 'left' | 'right',
  theme: ThemeColors
) {
  ctx.fillStyle = theme.spike;
  ctx.beginPath();

  if (dir === 'up') {
    // 2 mini spikes per 16px tile
    ctx.moveTo(x, y + TILE_SIZE);
    ctx.lineTo(x + 4, y + 4);
    ctx.lineTo(x + 8, y + TILE_SIZE);
    ctx.lineTo(x + 12, y + 4);
    ctx.lineTo(x + 16, y + TILE_SIZE);
  } else if (dir === 'down') {
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4, y + 12);
    ctx.lineTo(x + 8, y);
    ctx.lineTo(x + 12, y + 12);
    ctx.lineTo(x + 16, y);
  } else if (dir === 'left') {
    ctx.moveTo(x + TILE_SIZE, y);
    ctx.lineTo(x + 4, y + 4);
    ctx.lineTo(x + TILE_SIZE, y + 8);
    ctx.lineTo(x + 4, y + 12);
    ctx.lineTo(x + TILE_SIZE, y + 16);
  } else if (dir === 'right') {
    ctx.moveTo(x, y);
    ctx.lineTo(x + 12, y + 4);
    ctx.lineTo(x, y + 8);
    ctx.lineTo(x + 12, y + 12);
    ctx.lineTo(x, y + 16);
  }
  ctx.closePath();
  ctx.fill();

  // Spike highlight outline
  ctx.strokeStyle = theme.spikeBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawSpring(ctx: CanvasRenderingContext2D, x: number, y: number, theme: ThemeColors) {
  ctx.fillStyle = '#475569';
  ctx.fillRect(x + 1, y + 12, 14, 4);

  ctx.fillStyle = theme.spring;
  // Spring coil
  ctx.fillRect(x + 3, y + 8, 10, 2);
  ctx.fillRect(x + 2, y + 5, 12, 3);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(x + 3, y + 5, 10, 1);
}

function drawDashCrystal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  theme: ThemeColors
) {
  const floatOffset = Math.sin(time * 6) * 2;
  const cx = x + 8;
  const cy = y + 8 + floatOffset;

  ctx.fillStyle = theme.crystal;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx + 5, cy);
  ctx.lineTo(cx, cy + 6);
  ctx.lineTo(cx - 5, cy);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 1, cy - 2, 2, 2);
}

function drawKey(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  theme: ThemeColors
) {
  const floatOffset = Math.sin(time * 5) * 2;
  const kx = x + 4;
  const ky = y + 4 + floatOffset;

  ctx.fillStyle = theme.key;
  // Key head loop
  ctx.fillRect(kx, ky, 6, 6);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(kx + 2, ky + 2, 2, 2);

  // Key shaft & teeth
  ctx.fillStyle = theme.key;
  ctx.fillRect(kx + 6, ky + 2, 5, 2);
  ctx.fillRect(kx + 9, ky + 4, 2, 2);
}

function drawDoor(ctx: CanvasRenderingContext2D, x: number, y: number, theme: ThemeColors) {
  ctx.fillStyle = theme.door;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = '#6b21a8';
  ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

  // Keyhole
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(x + 7, y + 5, 2, 3);
  ctx.fillRect(x + 6, y + 8, 4, 3);
}

function drawGoal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  theme: ThemeColors
) {
  const cx = x + 8;
  const cy = y + 8;
  const pulse = Math.sin(time * 8) * 2;

  // Outer portal ring
  ctx.strokeStyle = theme.goal;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 6 + pulse * 0.5, 0, Math.PI * 2);
  ctx.stroke();

  // Inner vortex
  ctx.fillStyle = theme.goalGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);
}

function drawSaw(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  angle: number,
  theme: ThemeColors
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Saw teeth
  ctx.fillStyle = theme.saw;
  const teeth = 8;
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a = (i * Math.PI * 2) / teeth;
    const rOuter = radius + 2;
    const rInner = radius - 3;
    const tx = Math.cos(a) * rOuter;
    const ty = Math.sin(a) * rOuter;
    const bx = Math.cos(a + Math.PI / teeth) * rInner;
    const by = Math.sin(a + Math.PI / teeth) * rInner;
    if (i === 0) ctx.moveTo(tx, ty);
    else ctx.lineTo(tx, ty);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.fill();

  // Saw disc center
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1.5, -1.5, 3, 3);

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: GameEngineState['player'],
  time: number,
  theme: ThemeColors
) {
  const { x, y, w, h, facingRight, hasDash, isWallSliding, state } = player;

  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));

  // Player body color (cyan by default, pink when dash is used)
  ctx.fillStyle = hasDash ? theme.player : '#64748b';

  // Squash & Stretch based on vertical state
  let drawW = w;
  let drawH = h;
  let offX = 0;
  let offY = 0;

  if (state === 'jump') {
    drawW = w - 2;
    drawH = h + 2;
    offX = 1;
    offY = -2;
  } else if (state === 'fall' && player.vy > 200) {
    drawW = w - 1;
    drawH = h + 1;
  } else if (state === 'run') {
    // Running bobbing
    const bob = Math.sin(time * 24) > 0 ? 1 : 0;
    offY = bob;
  }

  // Draw main square body
  ctx.fillRect(offX, offY, drawW, drawH);

  // Distinctive glowing eye pixels (looks towards movement direction)
  ctx.fillStyle = theme.playerEye;
  const eyeX = facingRight ? offX + drawW - 3 : offX + 1;
  ctx.fillRect(eyeX, offY + 3, 2, 2);

  // Wall slide grip spark
  if (isWallSliding) {
    ctx.fillStyle = '#ffffff';
    const slideX = facingRight ? offX + drawW : offX - 1;
    ctx.fillRect(slideX, offY + drawH - 2, 2, 2);
  }

  // Inner core pulse when Dash ready
  if (hasDash) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(offX + Math.floor(drawW / 2) - 1, offY + Math.floor(drawH / 2) - 1, 2, 2);
  }

  ctx.restore();
}

function drawSeeker(
  ctx: CanvasRenderingContext2D,
  seeker: GameEngineState['seekers'][0],
  time: number,
  theme: ThemeColors
) {
  ctx.save();
  ctx.translate(Math.floor(seeker.x), Math.floor(seeker.y));
  ctx.rotate(seeker.angle);

  const isStunned = seeker.state === 'stunned';
  const isKnocked = seeker.state === 'knocked_back';

  // Outer danger pulse ring (when seeking)
  if (!isStunned && !isKnocked) {
    const pulseR = seeker.radius + Math.sin(time * 8) * 2;
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Hull wings/prongs (triangular sci-fi drone silhouette)
  const hullColor = isKnocked ? '#38bdf8' : isStunned ? '#64748b' : '#0f172a';
  const rimColor = isKnocked ? '#ffffff' : isStunned ? '#f59e0b' : '#f43f5e';

  ctx.fillStyle = hullColor;
  ctx.beginPath();
  const prongs = 4;
  for (let i = 0; i < prongs; i++) {
    const a = (i * Math.PI * 2) / prongs + (isKnocked ? time * 12 : 0);
    const rOut = seeker.radius + 2;
    const rIn = seeker.radius - 3;
    const px = Math.cos(a) * rOut;
    const py = Math.sin(a) * rOut;
    const bx = Math.cos(a + Math.PI / prongs) * rIn;
    const by = Math.sin(a + Math.PI / prongs) * rIn;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = rimColor;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Core drone sphere
  ctx.fillStyle = isKnocked ? '#0284c7' : isStunned ? '#475569' : '#1e1b4b';
  ctx.beginPath();
  ctx.arc(0, 0, seeker.radius - 2, 0, Math.PI * 2);
  ctx.fill();

  // Glowing cybernetic eye (tracks player angle unless stunned)
  if (isStunned) {
    // Dazed spiral/cross
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-2, -0.5, 4, 1);
    ctx.fillRect(-0.5, -2, 1, 4);

    // Stun halo stars
    const starAngle = time * 6;
    for (let s = 0; s < 3; s++) {
      const sa = starAngle + (s * Math.PI * 2) / 3;
      const sx = Math.cos(sa) * (seeker.radius + 4);
      const sy = Math.sin(sa) * (seeker.radius + 4) * 0.4 - 5;
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(sx - 1, sy - 1, 2, 2);
    }
  } else {
    // Glowing red/cyan eye looking at player
    const eyeLookX = Math.cos(seeker.eyeAngle) * 2.5;
    const eyeLookY = Math.sin(seeker.eyeAngle) * 2.5;

    ctx.fillStyle = isKnocked ? '#38bdf8' : '#e11d48';
    ctx.beginPath();
    ctx.arc(eyeLookX, eyeLookY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Bright pupil gleam
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(eyeLookX - 0.5, eyeLookY - 0.5, 1.5, 1.5);
  }

  ctx.restore();
}
