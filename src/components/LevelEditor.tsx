import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Play, RotateCcw, Copy, Check, Upload, Trash2, 
  Square, Zap, Shield, Key, Eye, Disc, Plus, AlertTriangle,
  Lock, Unlock, ShieldCheck, Crown, Edit3, Globe, Save,
  FileCode, Sliders, Layers, Sparkles, HelpCircle
} from 'lucide-react';
import { LevelData, ThemeColors } from '../types/game';
import { TILES, TILE_SIZE } from '../game/constants';
import { haptics } from '../utils/telegram';
import { saveLevelAsServerBase, saveAllLevelsAsServerBase } from '../services/levelsApi';

const TOOL_SAW = 99;
const TOOL_LASER_H = 98;
const TOOL_LASER_V = 97;
const TOOL_SEEKER = 96;
const ADMIN_PIN = '7777';

interface LevelEditorProps {
  levels: LevelData[];
  initialLevel?: LevelData;
  theme: ThemeColors;
  isCreatorMode?: boolean;
  onToggleCreatorMode?: (enabled: boolean) => void;
  onSaveLevel: (level: LevelData, asNew?: boolean) => void;
  onResetLevel: (levelId: number) => void;
  onDeleteLevel?: (levelId: number) => void;
  onPlaytest: (level: LevelData) => void;
  onClose: () => void;
}

export const LevelEditor: React.FC<LevelEditorProps> = ({
  levels,
  initialLevel,
  theme,
  isCreatorMode = false,
  onToggleCreatorMode,
  onSaveLevel,
  onResetLevel,
  onDeleteLevel,
  onPlaytest,
  onClose,
}) => {
  const [activeLevelId, setActiveLevelId] = useState<number>(initialLevel?.id || 1);
  const isCampaignLevel = activeLevelId <= 15 && activeLevelId !== 999;

  const [levelCols, setLevelCols] = useState<number>(initialLevel?.cols || 20);
  const [levelRows, setLevelRows] = useState<number>(initialLevel?.rows || 30);

  const [levelName, setLevelName] = useState<string>(initialLevel?.name || 'CUSTOM HARDCORE LEVEL');
  const [difficulty, setDifficulty] = useState<LevelData['difficulty']>(initialLevel?.difficulty || 'Extreme');
  const [parTime, setParTime] = useState<number>(initialLevel?.parTime || 6.0);
  const [hint, setHint] = useState<string>(initialLevel?.hint || '');
  
  const [copiedType, setCopiedType] = useState<'single' | 'all' | null>(null);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);
  const [isServerSaving, setIsServerSaving] = useState<boolean>(false);

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [showAdminPinModal, setShowAdminPinModal] = useState<boolean>(false);
  const [adminPinInput, setAdminPinInput] = useState<string>('');
  const [adminError, setAdminError] = useState<string | null>(null);

  const [selectedTool, setSelectedTool] = useState<number>(TILES.SOLID);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Moving Saws, Lasers & Seekers state
  const [saws, setSaws] = useState<Array<{
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    speed: number;
  }>>(() => (initialLevel?.saws ? JSON.parse(JSON.stringify(initialLevel.saws)) : []));

  const [lasers, setLasers] = useState<Array<{
    gridX: number;
    gridY: number;
    type: 'laser_h' | 'laser_v';
    length: number;
    period: number;
    activeTime: number;
    phaseOffset?: number;
  }>>(() => (initialLevel?.lasers ? JSON.parse(JSON.stringify(initialLevel.lasers)) : []));

  const [seekers, setSeekers] = useState<Array<{
    x: number;
    y: number;
    speed?: number;
  }>>(() => (initialLevel?.seekers ? JSON.parse(JSON.stringify(initialLevel.seekers)) : []));

  // Laser placement configuration
  const [laserConfig, setLaserConfig] = useState<{
    length: number;
    period: number;
    activeTime: number;
    phaseOffset: number;
  }>({
    length: 6,
    period: 2.0,
    activeTime: 1.0,
    phaseOffset: 0.0,
  });

  const [sawDrag, setSawDrag] = useState<{ startX: number; startY: number; currX: number; currY: number } | null>(null);

  // Initialize grid
  const [grid, setGrid] = useState<number[][]>(() => {
    if (initialLevel) {
      return JSON.parse(JSON.stringify(initialLevel.grid));
    }
    const g: number[][] = [];
    for (let r = 0; r < levelRows; r++) {
      const row: number[] = [];
      for (let c = 0; c < levelCols; c++) {
        if (r === 0 || r === levelRows - 1 || c === 0 || c === levelCols - 1) {
          row.push(TILES.SMOOTH);
        } else if (r === levelRows - 4 && c === 2) {
          row.push(TILES.SPAWN);
        } else if (r === 2 && c === levelCols - 3) {
          row.push(TILES.GOAL);
        } else {
          row.push(TILES.EMPTY);
        }
      }
      g.push(row);
    }
    return g;
  });

  // Switch level to edit from dropdown
  const handleSelectLevelToEdit = (lvlId: number) => {
    if (lvlId === -1) {
      // Create brand new custom level (ID 999 draft)
      const cols = 20;
      const rows = 30;
      setActiveLevelId(999);
      setLevelCols(cols);
      setLevelRows(rows);
      setLevelName(`КАРТА ${levels.length + 1}`);
      setDifficulty('Extreme');
      setParTime(6.0);
      setHint('');
      setSaws([]);
      setLasers([]);
      setSeekers([]);
      const g: number[][] = [];
      for (let r = 0; r < rows; r++) {
        const row: number[] = [];
        for (let c = 0; c < cols; c++) {
          if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
            row.push(TILES.SMOOTH);
          } else if (r === rows - 4 && c === 2) {
            row.push(TILES.SPAWN);
          } else if (r === 2 && c === cols - 3) {
            row.push(TILES.GOAL);
          } else {
            row.push(TILES.EMPTY);
          }
        }
        g.push(row);
      }
      setGrid(g);
      return;
    }

    const found = levels.find((l) => l.id === lvlId);
    if (found) {
      setActiveLevelId(found.id);
      setLevelCols(found.cols || 20);
      setLevelRows(found.rows || 30);
      setLevelName(found.name);
      setDifficulty(found.difficulty);
      setParTime(found.parTime);
      setHint(found.hint || '');
      setGrid(JSON.parse(JSON.stringify(found.grid)));
      setSaws(found.saws ? JSON.parse(JSON.stringify(found.saws)) : []);
      setLasers(found.lasers ? JSON.parse(JSON.stringify(found.lasers)) : []);
      setSeekers(found.seekers ? JSON.parse(JSON.stringify(found.seekers)) : []);
    }
  };

  // Clone current level as a new custom level draft
  const handleCloneAsCustom = () => {
    const nextCustomId = Math.max(16, ...levels.map((l) => l.id) + 1);
    setActiveLevelId(nextCustomId);
    setLevelName(`${levelName.replace(/^\d+:\s*/, '')} (CUSTOM)`);
    setSavedNotification('Создана редактируемая копия!');
    haptics.success();
    setTimeout(() => setSavedNotification(null), 2500);
  };

  // Admin PIN verification
  const handleVerifyAdminPin = () => {
    if (adminPinInput.trim() === ADMIN_PIN) {
      if (onToggleCreatorMode) onToggleCreatorMode(true);
      setShowAdminPinModal(false);
      setAdminPinInput('');
      setAdminError(null);
      setSavedNotification('👑 Режим Создателя активирован!');
      haptics.success();
      setTimeout(() => setSavedNotification(null), 3000);
    } else {
      setAdminError('Неверный PIN-код (попробуйте 7777)');
      haptics.error();
    }
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

  const tools = [
    { id: TILES.EMPTY, name: 'Стереть', icon: Trash2, color: '#64748b' },
    { id: TILES.SOLID, name: 'Блок', icon: Square, color: theme.solid },
    { id: TILES.SMOOTH, name: 'Гладкий', icon: Shield, color: '#38bdf8' },
    { id: TILES.CRUMBLE, name: 'Осыпающийся', icon: Square, color: '#e2e8f0' },
    { id: TILES.SPIKE_UP, name: 'Шип ▲', icon: Shield, color: theme.spike },
    { id: TILES.SPIKE_DOWN, name: 'Шип ▼', icon: Shield, color: theme.spike },
    { id: TILES.SPIKE_LEFT, name: 'Шип ◄', icon: Shield, color: theme.spike },
    { id: TILES.SPIKE_RIGHT, name: 'Шип ►', icon: Shield, color: theme.spike },
    { id: TOOL_SAW, name: 'Пила', icon: Disc, color: theme.saw },
    { id: TOOL_LASER_H, name: 'Лазер ◄►', icon: Zap, color: '#ef4444' },
    { id: TOOL_LASER_V, name: 'Лазер ▲▼', icon: Zap, color: '#f43f5e' },
    { id: TOOL_SEEKER, name: 'Ищейка (Дрон)', icon: Eye, color: '#ec4899' },
    { id: TILES.SPRING, name: 'Пружина', icon: Zap, color: theme.spring },
    { id: TILES.DASH_CRYSTAL, name: 'Алмаз', icon: Zap, color: theme.crystal },
    { id: TILES.KEY, name: 'Ключ', icon: Key, color: theme.key },
    { id: TILES.DOOR, name: 'Врата', icon: Square, color: theme.door },
    { id: TILES.SPAWN, name: 'Старт', icon: Eye, color: theme.player },
    { id: TILES.GOAL, name: 'Портал', icon: Zap, color: theme.goal },
  ];

  // Helper to draw a saw blade on canvas
  const renderSawBlade = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number = 10, isGhost: boolean = false) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = isGhost ? 0.45 : 1.0;

    // Outer blade with teeth
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

    // Center disc
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
    ctx.fill();

    // Center pivot
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Draw editor canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = levelCols * TILE_SIZE;
    const height = levelRows * TILE_SIZE;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = theme.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= levelCols; c++) {
      ctx.moveTo(c * TILE_SIZE, 0);
      ctx.lineTo(c * TILE_SIZE, height);
    }
    for (let r = 0; r <= levelRows; r++) {
      ctx.moveTo(0, r * TILE_SIZE);
      ctx.lineTo(width, r * TILE_SIZE);
    }
    ctx.stroke();

    // Tiles
    for (let r = 0; r < levelRows; r++) {
      for (let c = 0; c < levelCols; c++) {
        const tile = grid[r] && grid[r][c] !== undefined ? grid[r][c] : TILES.EMPTY;
        const x = c * TILE_SIZE;
        const y = r * TILE_SIZE;

        if (tile === TILES.SOLID) {
          ctx.fillStyle = theme.solid;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = theme.solidBorder;
          ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        } else if (tile === TILES.SMOOTH) {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.fillStyle = '#38bdf844';
          ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        } else if (tile === TILES.CRUMBLE) {
          ctx.fillStyle = '#64748b';
          ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.strokeStyle = '#94a3b8';
          ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        } else if (tile === TILES.SPIKE_UP) {
          ctx.fillStyle = theme.spike;
          ctx.beginPath();
          ctx.moveTo(x, y + TILE_SIZE);
          ctx.lineTo(x + 8, y + 2);
          ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
          ctx.closePath();
          ctx.fill();
        } else if (tile === TILES.SPIKE_DOWN) {
          ctx.fillStyle = theme.spike;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 8, y + 14);
          ctx.lineTo(x + TILE_SIZE, y);
          ctx.closePath();
          ctx.fill();
        } else if (tile === TILES.SPIKE_LEFT) {
          ctx.fillStyle = theme.spike;
          ctx.beginPath();
          ctx.moveTo(x + TILE_SIZE, y);
          ctx.lineTo(x + 2, y + 8);
          ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
          ctx.closePath();
          ctx.fill();
        } else if (tile === TILES.SPIKE_RIGHT) {
          ctx.fillStyle = theme.spike;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 14, y + 8);
          ctx.lineTo(x, y + TILE_SIZE);
          ctx.closePath();
          ctx.fill();
        } else if (tile === TILES.SPRING) {
          ctx.fillStyle = theme.spring;
          ctx.fillRect(x + 2, y + 6, 12, 8);
        } else if (tile === TILES.DASH_CRYSTAL) {
          ctx.fillStyle = theme.crystal;
          ctx.beginPath();
          ctx.arc(x + 8, y + 8, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === TILES.KEY) {
          ctx.fillStyle = theme.key;
          ctx.fillRect(x + 3, y + 5, 10, 6);
        } else if (tile === TILES.DOOR) {
          ctx.fillStyle = theme.door;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        } else if (tile === TILES.SPAWN) {
          ctx.fillStyle = theme.player;
          ctx.fillRect(x + 3, y + 3, 10, 10);
        } else if (tile === TILES.GOAL) {
          ctx.fillStyle = theme.goal;
          ctx.beginPath();
          ctx.arc(x + 8, y + 8, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw Lasers
    lasers.forEach((l) => {
      ctx.save();
      const lx = l.gridX * TILE_SIZE;
      const ly = l.gridY * TILE_SIZE;

      // Emitter base box
      ctx.fillStyle = l.type === 'laser_v' ? '#e11d48' : '#ef4444';
      ctx.fillRect(lx + 1, ly + 1, 14, 14);

      // Inner metallic core
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(lx + 3, ly + 3, 10, 10);

      // Warning laser lens
      ctx.fillStyle = '#fbbf24';
      if (l.type === 'laser_v') {
        ctx.fillRect(lx + 5, ly + 10, 6, 3);
      } else {
        ctx.fillRect(lx + 10, ly + 5, 3, 6);
      }

      // Beam path preview
      ctx.strokeStyle = l.type === 'laser_v' ? 'rgba(244, 63, 94, 0.85)' : 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      if (l.type === 'laser_v') {
        ctx.moveTo(lx + 8, ly + 14);
        ctx.lineTo(lx + 8, Math.min(levelRows * TILE_SIZE - 8, (l.gridY + l.length) * TILE_SIZE));
      } else {
        ctx.moveTo(lx + 14, ly + 8);
        ctx.lineTo(Math.min(levelCols * TILE_SIZE - 8, (l.gridX + l.length) * TILE_SIZE), ly + 8);
      }
      ctx.stroke();

      // Info badge: length & timing
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${l.length}L`, lx + 8, ly + 8);

      ctx.restore();
    });

    // Draw Seekers (Cyber Drones)
    seekers.forEach((sk, idx) => {
      ctx.save();
      const sx = Math.floor(sk.x);
      const sy = Math.floor(sk.y);
      const rad = 8;

      // Outer danger radar pulse ring
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(sx, sy, rad + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Drone hull
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Glowing cybernetic eye
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Label #
      ctx.fillStyle = '#fbcfe8';
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`D${idx + 1}`, sx, sy - 11);

      ctx.restore();
    });

    // Draw Saws
    saws.forEach((saw) => {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(saw.startX, saw.startY);
      ctx.lineTo(saw.targetX, saw.targetY);
      ctx.stroke();

      renderSawBlade(ctx, saw.startX, saw.startY, 10, false);
      renderSawBlade(ctx, saw.targetX, saw.targetY, 10, true);
      ctx.restore();
    });

    // Draw Live Saw Drag Preview
    if (sawDrag) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sawDrag.startX, sawDrag.startY);
      ctx.lineTo(sawDrag.currX, sawDrag.currY);
      ctx.stroke();

      renderSawBlade(ctx, sawDrag.startX, sawDrag.startY, 10, false);
      renderSawBlade(ctx, sawDrag.currX, sawDrag.currY, 10, true);
      ctx.restore();
    }
  }, [grid, theme, saws, lasers, seekers, sawDrag, levelCols, levelRows]);

  const applyTileAtCoord = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (clientX - rect.left) * scaleX;
    const clickY = (clientY - rect.top) * scaleY;

    const col = Math.floor(clickX / TILE_SIZE);
    const row = Math.floor(clickY / TILE_SIZE);

    if (selectedTool === TOOL_SAW) return;

    if (col >= 0 && col < levelCols && row >= 0 && row < levelRows) {
      // 1. TOOL_LASER_H
      if (selectedTool === TOOL_LASER_H) {
        setLasers((prev) => {
          const filtered = prev.filter((l) => !(l.gridX === col && l.gridY === row));
          return [
            ...filtered,
            {
              gridX: col,
              gridY: row,
              type: 'laser_h',
              length: laserConfig.length,
              period: laserConfig.period,
              activeTime: laserConfig.activeTime,
              phaseOffset: laserConfig.phaseOffset,
            },
          ];
        });
        haptics.selection();
        return;
      }

      // 2. TOOL_LASER_V
      if (selectedTool === TOOL_LASER_V) {
        setLasers((prev) => {
          const filtered = prev.filter((l) => !(l.gridX === col && l.gridY === row));
          return [
            ...filtered,
            {
              gridX: col,
              gridY: row,
              type: 'laser_v',
              length: laserConfig.length,
              period: laserConfig.period,
              activeTime: laserConfig.activeTime,
              phaseOffset: laserConfig.phaseOffset,
            },
          ];
        });
        haptics.selection();
        return;
      }

      // 3. TOOL_SEEKER
      if (selectedTool === TOOL_SEEKER) {
        setSeekers((prev) => [
          ...prev,
          {
            x: clickX,
            y: clickY,
            speed: 38,
          },
        ]);
        haptics.selection();
        return;
      }

      // 4. TILES.EMPTY (Erase tool: deletes tiles, nearby saws, lasers, and seekers)
      if (selectedTool === TILES.EMPTY) {
        // Erase moving saw
        const sawIdx = saws.findIndex((s) => {
          const dStart = Math.hypot(s.startX - clickX, s.startY - clickY);
          const dTarget = Math.hypot(s.targetX - clickX, s.targetY - clickY);
          return dStart < 14 || dTarget < 14;
        });
        if (sawIdx !== -1) {
          setSaws((prev) => prev.filter((_, i) => i !== sawIdx));
          haptics.light();
          return;
        }

        // Erase seeker
        const seekerIdx = seekers.findIndex((sk) => Math.hypot(sk.x - clickX, sk.y - clickY) < 16);
        if (seekerIdx !== -1) {
          setSeekers((prev) => prev.filter((_, i) => i !== seekerIdx));
          haptics.light();
          return;
        }

        // Erase laser emitter
        const laserIdx = lasers.findIndex((l) => {
          if (l.gridX === col && l.gridY === row) return true;
          // Also check if clicking along beam
          if (l.type === 'laser_v' && l.gridX === col && row >= l.gridY && row <= l.gridY + l.length) return true;
          if (l.type === 'laser_h' && l.gridY === row && col >= l.gridX && col <= l.gridX + l.length) return true;
          return false;
        });
        if (laserIdx !== -1) {
          setLasers((prev) => prev.filter((_, i) => i !== laserIdx));
          haptics.light();
          return;
        }
      }

      setGrid((prev) => {
        const next = prev.map((r) => [...r]);
        if (selectedTool === TILES.SPAWN) {
          for (let r = 0; r < levelRows; r++) {
            for (let c = 0; c < levelCols; c++) {
              if (next[r] && next[r][c] === TILES.SPAWN) next[r][c] = TILES.EMPTY;
            }
          }
        } else if (selectedTool === TILES.GOAL) {
          for (let r = 0; r < levelRows; r++) {
            for (let c = 0; c < levelCols; c++) {
              if (next[r] && next[r][c] === TILES.GOAL) next[r][c] = TILES.EMPTY;
            }
          }
        }
        if (next[row]) {
          next[row][col] = selectedTool;
        }
        return next;
      });
    }
  };

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    if (selectedTool === TOOL_SAW) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      setSawDrag({ startX: x, startY: y, currX: x, currY: y });
    } else {
      applyTileAtCoord(e.clientX, e.clientY);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMouseDownRef.current) return;
    if (selectedTool === TOOL_SAW && sawDrag) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      setSawDrag((prev) => prev ? { ...prev, currX: x, currY: y } : null);
    } else {
      applyTileAtCoord(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    if (sawDrag) {
      const dist = Math.hypot(sawDrag.currX - sawDrag.startX, sawDrag.currY - sawDrag.startY);
      if (dist > 15) {
        setSaws((prev) => [
          ...prev,
          {
            startX: sawDrag.startX,
            startY: sawDrag.startY,
            targetX: sawDrag.currX,
            targetY: sawDrag.currY,
            speed: 110,
          },
        ]);
      } else {
        const sy = Math.max(20, sawDrag.startY - 35);
        const ty = Math.min(levelRows * TILE_SIZE - 20, sawDrag.startY + 35);
        setSaws((prev) => [
          ...prev,
          {
            startX: sawDrag.startX,
            startY: sy,
            targetX: sawDrag.startX,
            targetY: ty,
            speed: 110,
          },
        ]);
      }
      setSawDrag(null);
    }
  };

  // Touch drawing handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    isMouseDownRef.current = true;
    if (selectedTool === TOOL_SAW) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;
      setSawDrag({ startX: x, startY: y, currX: x, currY: y });
    } else {
      applyTileAtCoord(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    if (!touch || !isMouseDownRef.current) return;
    if (selectedTool === TOOL_SAW && sawDrag) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (touch.clientX - rect.left) * scaleX;
      const y = (touch.clientY - rect.top) * scaleY;
      setSawDrag((prev) => prev ? { ...prev, currX: x, currY: y } : null);
    } else {
      applyTileAtCoord(touch.clientX, touch.clientY);
    }
  };

  const constructLevelData = useCallback((forceNewId?: boolean): LevelData => {
    let targetId = activeLevelId;
    if (forceNewId || activeLevelId === 999 || (!isCreatorMode && isCampaignLevel)) {
      const maxId = Math.max(15, ...levels.map((l) => l.id));
      targetId = maxId + 1;
    }
    return {
      id: targetId,
      name: levelName || `КАРТА ${targetId}`,
      difficulty,
      parTime,
      cols: levelCols,
      rows: levelRows,
      hint,
      grid,
      saws: saws.length > 0 ? saws : undefined,
      lasers: lasers.length > 0 ? lasers : undefined,
      seekers: seekers.length > 0 ? seekers : undefined,
    };
  }, [activeLevelId, isCreatorMode, isCampaignLevel, levels, levelName, difficulty, parTime, levelCols, levelRows, hint, grid, saws, lasers, seekers]);

  // Save level locally
  const handleSaveLocal = (asNew: boolean = false) => {
    const effectiveAsNew = asNew || (!isCreatorMode && isCampaignLevel);
    const data = constructLevelData(effectiveAsNew);
    onSaveLevel(data, effectiveAsNew);
    setActiveLevelId(data.id);
    setSavedNotification(effectiveAsNew ? 'Создана новая пользовательская карта!' : 'Карта сохранена!');
    haptics.success();
    setTimeout(() => setSavedNotification(null), 2500);
  };

  // 1. SAVE AS BASE LEVEL FOR EVERYONE ON SERVER
  const handleSaveAsServerBase = async () => {
    setIsServerSaving(true);
    try {
      const data = constructLevelData(false);
      // Save locally first
      onSaveLevel(data, false);
      
      // Save to server
      const res = await saveLevelAsServerBase(data);
      if (res.success) {
        setSavedNotification(`✅ Уровень «${data.name}» (ID: ${data.id}) сохранён как базовый для всех игроков!`);
        haptics.success();
      } else {
        setErrorNotification(`Ошибка сохранения на сервере: ${res.message || 'Неизвестная ошибка'}`);
        haptics.error();
      }
    } catch (err) {
      setErrorNotification('Ошибка сети при сохранении уровня на сервер');
      haptics.error();
    } finally {
      setIsServerSaving(false);
      setTimeout(() => {
        setSavedNotification(null);
        setErrorNotification(null);
      }, 3500);
    }
  };

  // 2. SAVE ALL LEVELS TO SERVER
  const handleSaveAllLevelsToServer = async () => {
    setIsServerSaving(true);
    try {
      const currentUpdated = constructLevelData(false);
      const allLevelsUpdated = levels.map((l) => l.id === currentUpdated.id ? currentUpdated : l);
      if (!allLevelsUpdated.some((l) => l.id === currentUpdated.id)) {
        allLevelsUpdated.push(currentUpdated);
      }
      
      const res = await saveAllLevelsAsServerBase(allLevelsUpdated);
      if (res.success) {
        setSavedNotification(`🌐 Все ${allLevelsUpdated.length} уровней сохранены на сервере для всех пользователей!`);
        haptics.success();
      } else {
        setErrorNotification(`Ошибка: ${res.message || 'Не удалось сохранить'}`);
        haptics.error();
      }
    } catch {
      setErrorNotification('Сетевая ошибка при синхронизации уровней');
      haptics.error();
    } finally {
      setIsServerSaving(false);
      setTimeout(() => {
        setSavedNotification(null);
        setErrorNotification(null);
      }, 3500);
    }
  };

  // 3. COPY THIS SINGLE LEVEL JSON
  const handleCopySingleJson = () => {
    const data = constructLevelData(false);
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedType('single');
    setSavedNotification('📄 JSON текущего уровня скопирован!');
    haptics.success();
    setTimeout(() => {
      setCopiedType(null);
      setSavedNotification(null);
    }, 2200);
  };

  // 4. COPY ALL LEVELS AS JSON ARRAY
  const handleCopyAllLevelsJson = () => {
    const currentUpdated = constructLevelData(false);
    const all = levels.map((l) => l.id === currentUpdated.id ? currentUpdated : l);
    if (!all.some((l) => l.id === currentUpdated.id)) {
      all.push(currentUpdated);
    }
    navigator.clipboard.writeText(JSON.stringify(all, null, 2));
    setCopiedType('all');
    setSavedNotification(`📋 Все ${all.length} уровней скопированы в буфер обмена (JSON)!`);
    haptics.success();
    setTimeout(() => {
      setCopiedType(null);
      setSavedNotification(null);
    }, 2500);
  };

  const handleResetToDefault = () => {
    setConfirmModal({
      title: 'Сбросить к оригиналу?',
      message: `Восстановить изначальное состояние уровня «${levelName}»?`,
      confirmText: 'Сбросить',
      isDanger: false,
      onConfirm: () => {
        onResetLevel(activeLevelId);
        const original = levels.find((l) => l.id === activeLevelId);
        if (original) {
          setGrid(JSON.parse(JSON.stringify(original.grid)));
          setSaws(original.saws ? JSON.parse(JSON.stringify(original.saws)) : []);
          setLasers(original.lasers ? JSON.parse(JSON.stringify(original.lasers)) : []);
        }
        setSavedNotification('Уровень сброшен к оригиналу!');
        haptics.medium();
        setTimeout(() => setSavedNotification(null), 2500);
      },
    });
  };

  const handleDeleteCurrentLevel = () => {
    if (!onDeleteLevel) return;
    if (isCampaignLevel && !isCreatorMode) {
      setErrorNotification('Официальные уровни кампании защищены от удаления!');
      haptics.error();
      setTimeout(() => setErrorNotification(null), 3000);
      return;
    }

    setConfirmModal({
      title: 'Удалить эту карту?',
      message: `Вы действительно хотите удалить карту «${levelName}»?`,
      confirmText: 'Удалить',
      isDanger: true,
      onConfirm: () => {
        onDeleteLevel(activeLevelId);
        const remaining = levels.filter((l) => l.id !== activeLevelId);
        const nextLvl = remaining[0];
        if (nextLvl) handleSelectLevelToEdit(nextLvl.id);
        setSavedNotification('Карта удалена!');
        haptics.medium();
        setTimeout(() => setSavedNotification(null), 2500);
      },
    });
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].grid) {
        // Multi-level array import
        parsed.forEach((lvl: LevelData) => onSaveLevel(lvl, false));
        handleSelectLevelToEdit(parsed[0].id);
        setShowImportModal(false);
        setImportJsonText('');
        setSavedNotification(`Импортировано ${parsed.length} уровней!`);
        haptics.success();
        setTimeout(() => setSavedNotification(null), 2500);
        return;
      }

      if (parsed.grid && Array.isArray(parsed.grid)) {
        // Single level import
        setGrid(parsed.grid);
        if (parsed.name) setLevelName(parsed.name);
        if (parsed.difficulty) setDifficulty(parsed.difficulty);
        if (parsed.parTime) setParTime(parsed.parTime);
        if (parsed.hint) setHint(parsed.hint);
        if (parsed.saws) setSaws(parsed.saws);
        if (parsed.lasers) setLasers(parsed.lasers);
        if (parsed.cols) setLevelCols(parsed.cols);
        if (parsed.rows) setLevelRows(parsed.rows);
        setShowImportModal(false);
        setImportJsonText('');
        setSavedNotification('JSON уровня успешно импортирован!');
        haptics.success();
        setTimeout(() => setSavedNotification(null), 2000);
      } else {
        setErrorNotification('Неверный формат JSON карты.');
        haptics.error();
        setTimeout(() => setErrorNotification(null), 3500);
      }
    } catch {
      setErrorNotification('Ошибка парсинга JSON: проверьте синтаксис.');
      haptics.error();
      setTimeout(() => setErrorNotification(null), 3500);
    }
  };

  // Helper to fill grid perimeter
  const handleFillPerimeter = () => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      for (let r = 0; r < levelRows; r++) {
        for (let c = 0; c < levelCols; c++) {
          if (r === 0 || r === levelRows - 1 || c === 0 || c === levelCols - 1) {
            next[r][c] = TILES.SMOOTH;
          }
        }
      }
      return next;
    });
    haptics.light();
  };

  // Clear inner canvas
  const handleClearInner = () => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      for (let r = 1; r < levelRows - 1; r++) {
        for (let c = 1; c < levelCols - 1; c++) {
          next[r][c] = TILES.EMPTY;
        }
      }
      return next;
    });
    setSaws([]);
    setLasers([]);
    setSeekers([]);
    haptics.light();
  };

  return (
    <div 
      id="level-editor-modal"
      className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100 font-mono select-none overflow-hidden"
    >
      {/* Toast Notifications */}
      {savedNotification && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 border border-emerald-400">
          <Check className="w-4 h-4 shrink-0" />
          <span>{savedNotification}</span>
        </div>
      )}

      {errorNotification && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 border border-rose-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorNotification}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
            <p className="text-xs text-zinc-400">{confirmModal.message}</p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold transition hover:bg-zinc-700 cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg cursor-pointer ${
                  confirmModal.isDanger ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
              >
                {confirmModal.confirmText || 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin PIN Unlock Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-zinc-900 border border-amber-600/80 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-500 flex items-center justify-center mx-auto text-amber-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Режим Создателя</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Введите PIN для редактирования официальных уровней кампании:
              </p>
            </div>

            <input
              type="password"
              maxLength={6}
              placeholder="Введите PIN (7777)"
              value={adminPinInput}
              onChange={(e) => setAdminPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyAdminPin()}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-center text-lg font-bold text-amber-300 tracking-widest focus:outline-none focus:border-amber-500"
            />

            {adminError && <p className="text-xs text-rose-400 font-semibold">{adminError}</p>}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => {
                  setShowAdminPinModal(false);
                  setAdminError(null);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold transition hover:bg-zinc-700 cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleVerifyAdminPin}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-xs font-black transition shadow-lg cursor-pointer"
              >
                Разблокировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Import/Export Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-5 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase">Импорт / Экспорт JSON</h3>
              </div>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Вставьте JSON одного уровня или массив уровней для загрузки в игру:
            </p>

            <textarea
              rows={8}
              placeholder='{"id": 1, "name": "01: FIRST ASCENT", "grid": [...] }'
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 custom-scrollbar"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex gap-2">
                <button
                  onClick={handleCopySingleJson}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Копировать этот</span>
                </button>
                <button
                  onClick={handleCopyAllLevelsJson}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Копировать ВСЕ</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleImportJson}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Применить JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Level Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-5 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase">Параметры Уровня</h3>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Название уровня:</label>
                <input
                  type="text"
                  value={levelName}
                  onChange={(e) => setLevelName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Сложность:</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as LevelData['difficulty'])}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-cyan-500 font-bold"
                  >
                    <option value="Hard">Hard (Сложно)</option>
                    <option value="Brutal">Brutal (Жесть)</option>
                    <option value="Extreme">Extreme (Экстрим)</option>
                    <option value="Nightmare">Nightmare (Кошмар)</option>
                    <option value="Impossible">Impossible (Нереально)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-semibold">Золотое время (сек):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="60.0"
                    value={parTime}
                    onChange={(e) => setParTime(parseFloat(e.target.value) || 5.0)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Подсказка в игре:</label>
                <input
                  type="text"
                  placeholder="Например: Прыгай от стены и делай рывок вверх!"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-lg cursor-pointer"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER / ACTION BAR */}
      <header className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Level Dropdown */}
          <select
            value={activeLevelId}
            onChange={(e) => handleSelectLevelToEdit(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <optgroup label="🏆 Кампания (1-15)">
              {levels.filter((l) => l.id <= 15).map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.name} {isCreatorMode ? '✏️' : '🔒'}
                </option>
              ))}
            </optgroup>
            {levels.filter((l) => l.id > 15).length > 0 && (
              <optgroup label="🛠️ Мои Карты">
                {levels.filter((l) => l.id > 15).map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name} ✏️
                  </option>
                ))}
              </optgroup>
            )}
            <option value={-1}>➕ Создать новый уровень...</option>
          </select>

          {/* Admin Unlock Badge */}
          {isCampaignLevel ? (
            isCreatorMode ? (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>ADMIN (СОЗДАТЕЛЬ)</span>
              </span>
            ) : (
              <button
                onClick={() => setShowAdminPinModal(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[10px] font-semibold transition cursor-pointer"
                title="Нажмите для ввода PIN разработчика (7777)"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Официальный уровень</span>
              </button>
            )
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold">
              <Edit3 className="w-3 h-3 text-indigo-400" />
              <span>Пользовательская Карта</span>
            </span>
          )}
        </div>

        {/* Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* PRIMARY BUTTON: SAVE THIS LEVEL AS BASE FOR EVERYONE */}
          <button
            id="btn-save-as-server-base"
            onClick={handleSaveAsServerBase}
            disabled={isServerSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition shadow-lg border border-emerald-400/50 cursor-pointer active:scale-95 shrink-0"
            title="Сохраняет эту карту на сервере как официальную базовую для всех игроков!"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
            <span>{isServerSaving ? 'Сохранение...' : 'Сохранить как базовый для всех'}</span>
          </button>

          {/* SECONDARY: SAVE ALL LEVELS TO SERVER */}
          <button
            onClick={handleSaveAllLevelsToServer}
            disabled={isServerSaving}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-teal-950/80 hover:bg-teal-900 border border-teal-600/80 text-teal-300 text-xs font-bold transition shadow-sm cursor-pointer active:scale-95"
            title="Синхронизирует все уровни на сервер"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Все на сервер</span>
          </button>

          {/* COPY ALL LEVELS JSON */}
          <button
            onClick={handleCopyAllLevelsJson}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-indigo-300 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Скопировать все уровни в формате JSON массива"
          >
            {copiedType === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Скопировать все (JSON)</span>
          </button>

          {/* COPY SINGLE JSON */}
          <button
            onClick={handleCopySingleJson}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-cyan-300 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Скопировать JSON этого уровня"
          >
            {copiedType === 'single' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileCode className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">JSON</span>
          </button>

          {/* IMPORT JSON MODAL */}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Импорт JSON"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Импорт</span>
          </button>

          {/* LEVEL SETTINGS */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Свойства карты"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Свойства</span>
          </button>

          {/* PLAYTEST */}
          <button
            onClick={() => {
              const data = constructLevelData(false);
              onPlaytest(data);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Тест</span>
          </button>

          {/* If campaign level and not admin: Show Clone Button */}
          {isCampaignLevel && !isCreatorMode && (
            <button
              onClick={handleCloneAsCustom}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Копия</span>
            </button>
          )}

          {/* Local Save */}
          <button
            onClick={() => handleSaveLocal(false)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Сохранить локально"
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Сохранить</span>
          </button>

          {/* Reset button */}
          {isCampaignLevel && (
            <button
              onClick={handleResetToDefault}
              title="Сбросить уровень к оригиналу"
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
            </button>
          )}

          {/* Delete */}
          {(!isCampaignLevel || isCreatorMode) && (
            <button
              onClick={handleDeleteCurrentLevel}
              title="Удалить карту"
              className="p-1.5 rounded-xl bg-zinc-800 hover:bg-rose-950 text-rose-400 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-full md:w-56 bg-zinc-900/90 border-r border-zinc-800 p-2 sm:p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto shrink-0 custom-scrollbar">
          <div className="text-[10px] font-bold text-zinc-500 tracking-wider hidden md:block mb-1 flex items-center justify-between">
            <span>ИНСТРУМЕНТЫ</span>
            <span className="text-[9px] text-zinc-600">{levelCols}x{levelRows}</span>
          </div>

          {/* Tiles tools */}
          {tools.map((t) => {
            const Icon = t.icon;
            const isSelected = selectedTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTool(t.id);
                  haptics.selection();
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-300 shadow-sm'
                    : 'bg-zinc-950/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-300'
                }`}
              >
                <Icon className="w-4 h-4" style={{ color: t.color }} />
                <span className="truncate">{t.name}</span>
              </button>
            );
          })}

          {/* Quick laser tuning widget when laser tool is selected */}
          {(selectedTool === TOOL_LASER_H || selectedTool === TOOL_LASER_V) && (
            <div className="p-2 rounded-xl bg-zinc-950/80 border border-red-900/60 text-[10px] space-y-1.5 mt-1 shrink-0">
              <div className="flex items-center justify-between text-rose-400 font-bold">
                <span>НАСТРОЙКА ЛАЗЕРА</span>
                <Zap className="w-3 h-3 text-rose-400" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Длина (тайлов):</span>
                <input
                  type="number"
                  min={2}
                  max={25}
                  value={laserConfig.length}
                  onChange={(e) => setLaserConfig((prev) => ({ ...prev, length: parseInt(e.target.value, 10) || 6 }))}
                  className="w-12 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-center text-white font-bold"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Период (сек):</span>
                <input
                  type="number"
                  step={0.5}
                  min={0.5}
                  max={10}
                  value={laserConfig.period}
                  onChange={(e) => setLaserConfig((prev) => ({ ...prev, period: parseFloat(e.target.value) || 2.0 }))}
                  className="w-12 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-center text-white font-bold"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Активен (сек):</span>
                <input
                  type="number"
                  step={0.5}
                  min={0.2}
                  max={10}
                  value={laserConfig.activeTime}
                  onChange={(e) => setLaserConfig((prev) => ({ ...prev, activeTime: parseFloat(e.target.value) || 1.0 }))}
                  className="w-12 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-center text-white font-bold"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Фаза / Задержка:</span>
                <input
                  type="number"
                  step={0.5}
                  min={0}
                  max={10}
                  value={laserConfig.phaseOffset}
                  onChange={(e) => setLaserConfig((prev) => ({ ...prev, phaseOffset: parseFloat(e.target.value) || 0 }))}
                  className="w-12 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-center text-white font-bold"
                />
              </div>
            </div>
          )}

          {/* Quick canvas helpers */}
          <div className="hidden md:flex flex-col gap-1 pt-3 mt-2 border-t border-zinc-800">
            <button
              onClick={handleFillPerimeter}
              className="px-2 py-1.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 font-semibold text-left transition cursor-pointer"
            >
              🧱 Заполнить рамку
            </button>
            <button
              onClick={handleClearInner}
              className="px-2 py-1.5 rounded-xl bg-zinc-950 hover:bg-rose-950/40 border border-zinc-800 text-[11px] text-rose-400 font-semibold text-left transition cursor-pointer"
            >
              🧹 Очистить внутри
            </button>
          </div>

          {/* Saws & objects counters */}
          <div className="hidden md:block text-[10px] text-zinc-500 pt-2 space-y-0.5">
            <div>Пилы: <span className="text-zinc-300 font-bold">{saws.length}</span></div>
            <div>Лазеры: <span className="text-zinc-300 font-bold">{lasers.length}</span></div>
            <div>Ищейки (Дроны): <span className="text-zinc-300 font-bold">{seekers.length}</span></div>
          </div>
        </aside>

        {/* Center: Canvas Viewport */}
        <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 bg-zinc-950 overflow-auto">
          <div 
            className="relative shadow-2xl rounded-2xl overflow-hidden border-2 border-zinc-800 bg-black cursor-crosshair select-none touch-none"
            style={{
              width: `${levelCols * TILE_SIZE}px`,
              height: `${levelRows * TILE_SIZE}px`,
              maxWidth: '100%',
              maxHeight: '100%',
              aspectRatio: `${levelCols} / ${levelRows}`,
              touchAction: 'none',
            }}
          >
            <canvas
              ref={canvasRef}
              width={levelCols * TILE_SIZE}
              height={levelRows * TILE_SIZE}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleMouseUp}
              className="w-full h-full block touch-none"
              style={{ imageRendering: 'pixelated', touchAction: 'none' }}
            />
          </div>

          {/* Bottom quick tip banner */}
          <div className="mt-2 text-[11px] text-zinc-500 text-center flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Нажмите <b>«Сохранить как базовый для всех»</b>, чтобы эта карта сразу стала официальной для всех игроков!</span>
          </div>
        </main>
      </div>
    </div>
  );
};
