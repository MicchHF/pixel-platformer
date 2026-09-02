import React, { useEffect, useRef } from 'react';
import { LevelData } from '../types/game';
import { TILES } from '../game/constants';

interface LevelThumbnailProps {
  level: LevelData;
  size?: number;
}

export const LevelThumbnail: React.FC<LevelThumbnailProps> = ({ level, size = 80 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cols = level.cols || 32;
    const rows = level.rows || 48;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid dots
    ctx.fillStyle = '#161e2e';
    for (let r = 0; r < rows; r += 3) {
      for (let c = 0; c < cols; c += 3) {
        ctx.fillRect(c * cellW + cellW / 2 - 0.5, r * cellH + cellH / 2 - 0.5, 1, 1);
      }
    }

    // Draw Saws Trajectory if any
    if (level.saws && level.saws.length > 0) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      level.saws.forEach((saw) => {
        const sX = (saw.startX / (cols * 16)) * canvas.width;
        const sY = (saw.startY / (rows * 16)) * canvas.height;
        const tX = (saw.targetX / (cols * 16)) * canvas.width;
        const tY = (saw.targetY / (rows * 16)) * canvas.height;
        ctx.beginPath();
        ctx.moveTo(sX, sY);
        ctx.lineTo(tX, tY);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // Draw Tiles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = level.grid[r]?.[c];
        const x = c * cellW;
        const y = r * cellH;

        if (tile === TILES.SOLID || tile === TILES.SMOOTH) {
          ctx.fillStyle = tile === TILES.SMOOTH ? '#1e293b' : '#0284c7';
          ctx.fillRect(x, y, cellW, cellH);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, cellW, cellH);
        } else if (tile >= TILES.SPIKE_UP && tile <= TILES.SPIKE_RIGHT) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          if (tile === TILES.SPIKE_UP) {
            ctx.moveTo(x + cellW / 2, y + 0.5);
            ctx.lineTo(x + cellW, y + cellH);
            ctx.lineTo(x, y + cellH);
          } else if (tile === TILES.SPIKE_DOWN) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellW, y);
            ctx.lineTo(x + cellW / 2, y + cellH - 0.5);
          } else if (tile === TILES.SPIKE_LEFT) {
            ctx.moveTo(x + 0.5, y + cellH / 2);
            ctx.lineTo(x + cellW, y);
            ctx.lineTo(x + cellW, y + cellH);
          } else {
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellW - 0.5, y + cellH / 2);
            ctx.lineTo(x, y + cellH);
          }
          ctx.closePath();
          ctx.fill();
        } else if (tile === TILES.SPRING) {
          ctx.fillStyle = '#10b981';
          ctx.fillRect(x + 1, y + cellH - 2, cellW - 2, 2);
          ctx.fillStyle = '#34d399';
          ctx.fillRect(x + 1.5, y + cellH - 3.5, cellW - 3, 1.5);
        } else if (tile === TILES.DASH_CRYSTAL) {
          ctx.fillStyle = '#00f0ff';
          ctx.beginPath();
          ctx.moveTo(x + cellW / 2, y + 1);
          ctx.lineTo(x + cellW - 1, y + cellH / 2);
          ctx.lineTo(x + cellW / 2, y + cellH - 1);
          ctx.lineTo(x + 1, y + cellH / 2);
          ctx.closePath();
          ctx.fill();
        } else if (tile === TILES.KEY) {
          ctx.fillStyle = '#eab308';
          ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
        } else if (tile === TILES.DOOR) {
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(x, y, cellW, cellH);
        } else if (tile === TILES.CRUMBLE) {
          ctx.fillStyle = '#d97706';
          ctx.fillRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
        } else if (tile === TILES.ONE_WAY) {
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(x, y, cellW, 1.5);
        } else if (tile === TILES.SPAWN) {
          // Spawn marker
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(x + cellW / 2, y + cellH / 2, cellW / 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === TILES.GOAL) {
          // Goal portal
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(x + cellW / 2, y + cellH / 2, cellW / 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(x + cellW / 2, y + cellH / 2, cellW / 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw Saw Blades on top
    if (level.saws) {
      level.saws.forEach((saw) => {
        const sX = (saw.startX / (cols * 16)) * canvas.width;
        const sY = (saw.startY / (rows * 16)) * canvas.height;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(sX, sY, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Outer border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
  }, [level, size]);

  const cols = level.cols || 32;
  const rows = level.rows || 48;
  const thumbHeight = Math.round((size * rows) / cols);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={thumbHeight}
      className="rounded-lg border border-zinc-700 bg-zinc-950 shrink-0 shadow-inner"
      style={{ width: `${size}px`, height: `${thumbHeight}px`, imageRendering: 'pixelated' }}
    />
  );
};
