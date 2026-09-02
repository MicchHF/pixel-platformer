import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Play, RotateCcw, Copy, Check, Upload, Trash2, 
  Square, Zap, Shield, Key, Eye, Disc, Plus, AlertTriangle
} from 'lucide-react';
import { LevelData, ThemeColors } from '../types/game';
import { TILES, TILE_SIZE } from '../game/constants';

const TOOL_SAW = 99;

interface LevelEditorProps {
  levels: LevelData[];
  initialLevel?: LevelData;
  theme: ThemeColors;
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
  onSaveLevel,
  onResetLevel,
  onDeleteLevel,
  onPlaytest,
  onClose,
}) => {
  const cols = 26;
  const rows = 16;

  const [activeLevelId, setActiveLevelId] = useState<number>(initialLevel?.id || 1);
  const [levelName, setLevelName] = useState<string>(initialLevel?.name || 'CUSTOM HARDCORE LEVEL');
  const [difficulty, setDifficulty] = useState<LevelData['difficulty']>(initialLevel?.difficulty || 'Extreme');
  const [parTime, setParTime] = useState<number>(initialLevel?.parTime || 8.0);
  const [hint, setHint] = useState<string>(initialLevel?.hint || '');
  const [copied, setCopied] = useState<boolean>(false);
  const [savedNotification, setSavedNotification] = useState<string | null>(null);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<number>(TILES.SOLID);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Moving Saws & Lasers state
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

  const [sawDrag, setSawDrag] = useState<{ startX: number; startY: number; currX: number; currY: number } | null>(null);

  // Initialize 26x16 grid with perimeter walls
  const [grid, setGrid] = useState<number[][]>(() => {
    if (initialLevel) {
      return JSON.parse(JSON.stringify(initialLevel.grid));
    }
    const g: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < cols; c++) {
        if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
          row.push(TILES.SOLID);
        } else if (r === 13 && c === 2) {
          row.push(TILES.SPAWN);
        } else if (r === 3 && c === 23) {
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
      // Create new level
      setActiveLevelId(999);
      setLevelName(`CUSTOM LEVEL ${levels.length + 1}`);
      setDifficulty('Extreme');
      setParTime(7.0);
      setHint('');
      setSaws([]);
      setLasers([]);
      const g: number[][] = [];
      for (let r = 0; r < rows; r++) {
        const row: number[] = [];
        for (let c = 0; c < cols; c++) {
          if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
            row.push(TILES.SOLID);
          } else if (r === 13 && c === 2) {
            row.push(TILES.SPAWN);
          } else if (r === 3 && c === 23) {
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
      setLevelName(found.name);
      setDifficulty(found.difficulty);
      setParTime(found.parTime);
      setHint(found.hint || '');
      setGrid(JSON.parse(JSON.stringify(found.grid)));
      setSaws(found.saws ? JSON.parse(JSON.stringify(found.saws)) : []);
      setLasers(found.lasers ? JSON.parse(JSON.stringify(found.lasers)) : []);
    }
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

  const tools = [
    { id: TILES.EMPTY, name: 'Стереть (Empty)', icon: Trash2, color: '#64748b' },
    { id: TILES.SOLID, name: 'Блок (Solid)', icon: Square, color: theme.solid },
    { id: TILES.SMOOTH, name: 'Гладкий (No Cling)', icon: Shield, color: '#38bdf8' },
    { id: TILES.CRUMBLE, name: 'Осыпающийся (Crumble)', icon: Square, color: '#e2e8f0' },
    { id: TILES.SPIKE_UP, name: 'Шип Вверх (▲)', icon: Shield, color: theme.spike },
    { id: TILES.SPIKE_DOWN, name: 'Шип Вниз (▼)', icon: Shield, color: theme.spike },
    { id: TILES.SPIKE_LEFT, name: 'Шип Влево (◄)', icon: Shield, color: theme.spike },
    { id: TILES.SPIKE_RIGHT, name: 'Шип Вправо (►)', icon: Shield, color: theme.spike },
    { id: TOOL_SAW, name: 'Пила (Движущаяся)', icon: Disc, color: theme.saw },
    { id: TILES.SPRING, name: 'Пружина (Spring)', icon: Zap, color: theme.spring },
    { id: TILES.DASH_CRYSTAL, name: 'Алмаз Рывка', icon: Zap, color: theme.crystal },
    { id: TILES.KEY, name: 'Ключ (Key)', icon: Key, color: theme.key },
    { id: TILES.DOOR, name: 'Врата (Door)', icon: Square, color: theme.door },
    { id: TILES.SPAWN, name: 'Старт (Spawn)', icon: Eye, color: theme.player },
    { id: TILES.GOAL, name: 'Портал (Goal)', icon: Zap, color: theme.goal },
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

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, cols * TILE_SIZE, rows * TILE_SIZE);

    // Grid lines
    ctx.strokeStyle = theme.gridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      ctx.moveTo(c * TILE_SIZE, 0);
      ctx.lineTo(c * TILE_SIZE, rows * TILE_SIZE);
    }
    for (let r = 0; r <= rows; r++) {
      ctx.moveTo(0, r * TILE_SIZE);
      ctx.lineTo(cols * TILE_SIZE, r * TILE_SIZE);
    }
    ctx.stroke();

    // Tiles
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = grid[r][c];
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

    // Draw Lasers (if present)
    lasers.forEach((l) => {
      ctx.save();
      const lx = l.gridX * TILE_SIZE;
      const ly = l.gridY * TILE_SIZE;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(lx + 2, ly + 2, 12, 12);

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      if (l.type === 'laser_v') {
        ctx.moveTo(lx + 8, ly + 8);
        ctx.lineTo(lx + 8, (l.gridY + l.length) * TILE_SIZE);
      } else {
        ctx.moveTo(lx + 8, ly + 8);
        ctx.lineTo((l.gridX + l.length) * TILE_SIZE, ly + 8);
      }
      ctx.stroke();
      ctx.restore();
    });

    // Draw Moving Saws & Trajectories
    saws.forEach((saw, idx) => {
      ctx.save();

      // Motion path guide (dashed line)
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(saw.startX, saw.startY);
      ctx.lineTo(saw.targetX, saw.targetY);
      ctx.stroke();

      // Endpoint anchors
      ctx.setLineDash([]);
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(saw.startX, saw.startY, 3, 0, Math.PI * 2);
      ctx.arc(saw.targetX, saw.targetY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw Saw Blade at Start position
      renderSawBlade(ctx, saw.startX, saw.startY, 10, false);

      // Draw Ghost Saw Blade at Target position
      renderSawBlade(ctx, saw.targetX, saw.targetY, 10, true);

      // Index Badge
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(saw.startX - 6, saw.startY - 18, 12, 11);
      ctx.strokeStyle = '#f43f5e';
      ctx.strokeRect(saw.startX - 6, saw.startY - 18, 12, 11);
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}`, saw.startX, saw.startY - 9);

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
  }, [grid, theme, saws, lasers, sawDrag]);

  const applyTile = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const col = Math.floor(clickX / TILE_SIZE);
    const row = Math.floor(clickY / TILE_SIZE);

    if (selectedTool === TOOL_SAW) {
      return; // Handled via sawDrag in mouse down/up
    }

    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      // If erasing, check if user clicked on a saw to delete it
      if (selectedTool === TILES.EMPTY) {
        const sawIdx = saws.findIndex((s) => {
          const dStart = Math.hypot(s.startX - clickX, s.startY - clickY);
          const dTarget = Math.hypot(s.targetX - clickX, s.targetY - clickY);
          return dStart < 14 || dTarget < 14;
        });
        if (sawIdx !== -1) {
          setSaws((prev) => prev.filter((_, i) => i !== sawIdx));
          return;
        }
      }

      setGrid((prev) => {
        const next = prev.map((r) => [...r]);

        // If placing Spawn or Goal, remove previous instances to keep single source
        if (selectedTool === TILES.SPAWN) {
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (next[r][c] === TILES.SPAWN) next[r][c] = TILES.EMPTY;
            }
          }
        } else if (selectedTool === TILES.GOAL) {
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if (next[r][c] === TILES.GOAL) next[r][c] = TILES.EMPTY;
            }
          }
        }

        next[row][col] = selectedTool;
        return next;
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (selectedTool === TOOL_SAW) {
      setSawDrag({ startX: Math.round(clickX), startY: Math.round(clickY), currX: Math.round(clickX), currY: Math.round(clickY) });
      return;
    }

    applyTile(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    if (selectedTool === TOOL_SAW && sawDrag) {
      setSawDrag((prev) => (prev ? { ...prev, currX: Math.round(clickX), currY: Math.round(clickY) } : null));
      return;
    }

    if (isMouseDownRef.current) {
      applyTile(e);
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    if (selectedTool === TOOL_SAW && sawDrag) {
      const dx = sawDrag.currX - sawDrag.startX;
      const dy = sawDrag.currY - sawDrag.startY;
      const dist = Math.hypot(dx, dy);

      if (dist >= 14) {
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
        // Simple click without dragging: place a vertical moving saw (+/- 35px)
        const sy = Math.max(20, sawDrag.startY - 35);
        const ty = Math.min(rows * TILE_SIZE - 20, sawDrag.startY + 35);
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

  const handleClear = () => {
    setConfirmModal({
      title: 'Очистить сетку?',
      message: 'Все установленные тайлы и пилы на этой карте будут очищены.',
      confirmText: 'Очистить',
      isDanger: true,
      onConfirm: () => {
        setSaws([]);
        setLasers([]);
        const g: number[][] = [];
        for (let r = 0; r < rows; r++) {
          const row: number[] = [];
          for (let c = 0; c < cols; c++) {
            if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
              row.push(TILES.SOLID);
            } else if (r === 13 && c === 2) {
              row.push(TILES.SPAWN);
            } else if (r === 3 && c === 23) {
              row.push(TILES.GOAL);
            } else {
              row.push(TILES.EMPTY);
            }
          }
          g.push(row);
        }
        setGrid(g);
        setSavedNotification('Сетка очищена');
        setTimeout(() => setSavedNotification(null), 2000);
      },
    });
  };

  const constructLevelData = (forceNewId?: boolean): LevelData => {
    let targetId = activeLevelId;
    if (forceNewId || activeLevelId === 999) {
      // Generate a new unique ID
      const maxId = Math.max(0, ...levels.map((l) => l.id));
      targetId = Math.max(100, maxId + 1);
    }
    return {
      id: targetId,
      name: levelName || `LEVEL ${targetId}`,
      difficulty,
      parTime,
      cols,
      rows,
      hint,
      grid,
      saws: saws.length > 0 ? saws : undefined,
      lasers: lasers.length > 0 ? lasers : undefined,
    };
  };

  const handleSave = (asNew: boolean = false) => {
    const data = constructLevelData(asNew);
    onSaveLevel(data, asNew);
    if (asNew) {
      setActiveLevelId(data.id);
    }
    setSavedNotification(asNew ? 'Создан новый уровень!' : 'Карта успешно сохранена!');
    setTimeout(() => setSavedNotification(null), 2500);
  };

  const handleResetToDefault = () => {
    setConfirmModal({
      title: 'Сбросить к оригиналу?',
      message: `Восстановить изначальное состояние уровня «${levelName}» со всеми пилами и объектами?`,
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
        setTimeout(() => setSavedNotification(null), 2500);
      },
    });
  };

  const handleDeleteCurrentLevel = () => {
    // If it's a new unsaved draft (ID 999), cancel/revert to first level immediately
    if (activeLevelId === 999) {
      const fallback = levels[0];
      if (fallback) {
        handleSelectLevelToEdit(fallback.id);
        setSavedNotification('Создание отменено');
        setTimeout(() => setSavedNotification(null), 2000);
      }
      return;
    }

    if (!onDeleteLevel) return;
    if (levels.length <= 1) {
      setErrorNotification('Нельзя удалить единственный оставшийся уровень!');
      setTimeout(() => setErrorNotification(null), 3000);
      return;
    }

    setConfirmModal({
      title: 'Удалить эту карту?',
      message: `Вы действительно хотите навсегда удалить карту «${levelName}» (ID: ${activeLevelId})?`,
      confirmText: 'Удалить карту',
      isDanger: true,
      onConfirm: () => {
        const remaining = levels.filter((l) => l.id !== activeLevelId);
        const nextLvl = remaining[0];
        onDeleteLevel(activeLevelId);
        if (nextLvl) {
          handleSelectLevelToEdit(nextLvl.id);
        }
        setSavedNotification('Карта удалена!');
        setTimeout(() => setSavedNotification(null), 2500);
      },
    });
  };

  const handleCopyJson = () => {
    const data = constructLevelData();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (parsed.grid && Array.isArray(parsed.grid)) {
        setGrid(parsed.grid);
        if (parsed.name) setLevelName(parsed.name);
        if (parsed.difficulty) setDifficulty(parsed.difficulty);
        if (parsed.parTime) setParTime(parsed.parTime);
        if (parsed.hint) setHint(parsed.hint);
        if (parsed.saws) setSaws(parsed.saws);
        if (parsed.lasers) setLasers(parsed.lasers);
        setShowImportModal(false);
        setImportJsonText('');
        setSavedNotification('JSON успешно импортирован!');
        setTimeout(() => setSavedNotification(null), 2000);
      } else {
        setErrorNotification('Неверный формат карты. Требуется JSON с полем grid.');
        setTimeout(() => setErrorNotification(null), 3500);
      }
    } catch {
      setErrorNotification('Ошибка парсинга JSON.');
      setTimeout(() => setErrorNotification(null), 3500);
    }
  };

  const handlePlaytestAndSave = () => {
    const data = constructLevelData();
    onSaveLevel(data, false);
    onPlaytest(data);
  };

  const handleAddDefaultSaw = () => {
    setSaws((prev) => [
      ...prev,
      {
        startX: 180,
        startY: 60,
        targetX: 180,
        targetY: 180,
        speed: 110,
      },
    ]);
  };

  const handleToggleSawOrientation = (index: number) => {
    setSaws((prev) => {
      const copy = [...prev];
      const s = copy[index];
      const isVertical = Math.abs(s.startX - s.targetX) < 10;
      const length = Math.hypot(s.targetX - s.startX, s.targetY - s.startY) || 80;
      if (isVertical) {
        // Change to Horizontal
        copy[index] = {
          startX: Math.max(20, Math.round(s.startX - length / 2)),
          startY: s.startY,
          targetX: Math.min(cols * TILE_SIZE - 20, Math.round(s.startX + length / 2)),
          targetY: s.startY,
          speed: s.speed,
        };
      } else {
        // Change to Vertical
        copy[index] = {
          startX: s.startX,
          startY: Math.max(20, Math.round(s.startY - length / 2)),
          targetX: s.startX,
          targetY: Math.min(rows * TILE_SIZE - 20, Math.round(s.startY + length / 2)),
          speed: s.speed,
        };
      }
      return copy;
    });
  };

  const handleDeleteSaw = (index: number) => {
    setSaws((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div 
      id="level-editor-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm font-mono select-none"
      onClick={onClose}
    >
      <div 
        id="level-editor-window"
        className="w-full max-w-5xl max-h-[96vh] flex flex-col rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-950">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold">
              РЕДАКТОР КАРТ
            </span>

            {/* Level Selector Dropdown */}
            <select
              value={activeLevelId}
              onChange={(e) => handleSelectLevelToEdit(parseInt(e.target.value, 10))}
              className="bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              {levels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  Уровень #{lvl.id}: {lvl.name.split(':')[0]}
                </option>
              ))}
              <option value={-1}>+ Создать новый уровень...</option>
            </select>

            <input
              type="text"
              value={levelName}
              onChange={(e) => setLevelName(e.target.value)}
              placeholder="Название уровня..."
              className="bg-zinc-800/80 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold max-w-[180px] sm:max-w-[220px]"
            />
          </div>

          <div className="flex items-center gap-2">
            {savedNotification && (
              <span className="text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-700 px-2 py-1 rounded animate-pulse">
                ✓ {savedNotification}
              </span>
            )}

            {errorNotification && (
              <span className="text-xs text-rose-300 font-bold bg-rose-950/80 border border-rose-700 px-2 py-1 rounded animate-pulse">
                ⚠ {errorNotification}
              </span>
            )}

            {/* If creating new draft level */}
            {activeLevelId === 999 ? (
              <button
                type="button"
                onClick={handleDeleteCurrentLevel}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition cursor-pointer"
                title="Отменить создание нового уровня и вернуться назад"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Отмена</span>
              </button>
            ) : onDeleteLevel && levels.length > 1 ? (
              <button
                type="button"
                onClick={handleDeleteCurrentLevel}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 text-xs font-bold transition cursor-pointer"
                title="Удалить эту карту из игры"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Удалить</span>
              </button>
            ) : null}

            {/* Save Level Button */}
            <button
              id="editor-save-btn"
              onClick={() => handleSave(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-md shadow-cyan-600/20 cursor-pointer active:scale-95"
              title="Сохранить изменения в эту карту"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Сохранить</span>
            </button>

            {/* Playtest Button */}
            <button
              id="editor-playtest-btn"
              onClick={handlePlaytestAndSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
              title="Сохранить и сразу играть"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Играть</span>
            </button>

            <button
              id="editor-close-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col lg:flex-row gap-5 items-center lg:items-start justify-center custom-scrollbar">
          {/* Canvas Area */}
          <div className="flex flex-col items-center gap-2">
            <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 shadow-xl">
              <canvas
                id="editor-canvas"
                ref={canvasRef}
                width={cols * TILE_SIZE}
                height={rows * TILE_SIZE}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="w-[320px] sm:w-[460px] md:w-[580px] h-auto border border-zinc-800 cursor-crosshair rounded"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between w-full max-w-[580px] px-1 text-[11px] text-zinc-400">
              <span>Сетка: 26x16 • Пила: тяни курсор для траектории</span>
              <span>Ластик удаляет и тайлы, и пилы</span>
            </div>
          </div>

          {/* Palette Tools & Parameters */}
          <div className="w-full lg:w-72 flex flex-col gap-3">
            {/* Tools Grid */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Инструменты рисования
              </label>
              <div className="grid grid-cols-2 gap-1">
                {tools.map((t) => {
                  const isSelected = selectedTool === t.id;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTool(t.id)}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold ring-1 ring-cyan-500'
                          : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: t.color }} />
                      <span className="truncate">{t.name.split('(')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Saws Management Section */}
            {saws.length > 0 && (
              <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    <Disc className="w-3.5 h-3.5" />
                    Пилы ({saws.length})
                  </span>
                  <button
                    onClick={handleAddDefaultSaw}
                    className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 px-2 py-0.5 rounded transition cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Пила</span>
                  </button>
                </div>

                <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {saws.map((saw, sIdx) => {
                    const isVertical = Math.abs(saw.startX - saw.targetX) < 10;
                    return (
                      <div key={sIdx} className="flex items-center justify-between gap-1 p-1.5 rounded bg-zinc-950/80 border border-zinc-800 text-[11px]">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-200">
                            #{sIdx + 1} ({saw.startX},{saw.startY}) ➔ ({saw.targetX},{saw.targetY})
                          </span>
                          <span className="text-[10px] text-zinc-400">Скорость: {saw.speed} px/s</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleSawOrientation(sIdx)}
                            className="px-1.5 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] cursor-pointer"
                            title="Сменить направление: Вертикально / Горизонтально"
                          >
                            {isVertical ? '↕ Верт' : '↔ Гориз'}
                          </button>
                          <button
                            onClick={() => handleDeleteSaw(sIdx)}
                            className="p-1 text-rose-400 hover:text-white hover:bg-rose-950/80 rounded cursor-pointer"
                            title="Удалить пилу"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Level Settings */}
            <div className="space-y-2 pt-2 border-t border-zinc-800 text-xs">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-zinc-400 mb-0.5">Сложность:</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as LevelData['difficulty'])}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Hard">Hard</option>
                    <option value="Brutal">Brutal</option>
                    <option value="Extreme">Extreme</option>
                    <option value="Nightmare">Nightmare</option>
                    <option value="Impossible">Impossible</option>
                  </select>
                </div>

                <div className="w-24">
                  <label className="block text-zinc-400 mb-0.5">Par (сек):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={parTime}
                    onChange={(e) => setParTime(parseFloat(e.target.value) || 5.0)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-0.5">Подсказка для игрока:</label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="Например: Прыгай в тайминг!"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-zinc-800 flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleSave(false)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-bold transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Сохранить карту</span>
                </button>

                <button
                  onClick={() => handleSave(true)}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs transition cursor-pointer"
                  title="Сохранить как отдельный новый уровень"
                >
                  <span>Как новый</span>
                </button>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={handleCopyJson}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copied ? 'Скопировано!' : 'Копировать JSON'}</span>
                </button>

                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Импорт</span>
                </button>
              </div>

              <div className="flex gap-1.5 pt-1">
                {activeLevelId <= 15 && (
                  <button
                    onClick={handleResetToDefault}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/80 text-amber-300 text-[11px] transition cursor-pointer"
                    title="Сбросить карту к исходному шаблону игры"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Сбросить оригинал</span>
                  </button>
                )}

                <button
                  onClick={handleClear}
                  className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[11px] transition cursor-pointer"
                  title="Очистить все тайлы сетки"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Очистить сетку</span>
                </button>

                {onDeleteLevel && levels.length > 1 && (
                  <button
                    onClick={handleDeleteCurrentLevel}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800 text-rose-200 text-[11px] font-bold transition cursor-pointer"
                    title="Удалить эту карту целиком"
                  >
                    <Trash2 className="w-3 h-3 text-rose-400" />
                    <span>Удалить карту</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {confirmModal && (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl text-center space-y-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                confirmModal.isDanger 
                  ? 'bg-rose-950/80 border border-rose-600 text-rose-400' 
                  : 'bg-amber-950/80 border border-amber-600 text-amber-400'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
                <p className="text-xs text-zinc-300 leading-relaxed px-2">{confirmModal.message}</p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cb = confirmModal.onConfirm;
                    setConfirmModal(null);
                    cb();
                  }}
                  className={`px-5 py-2 rounded-lg text-white text-xs font-bold transition shadow-lg cursor-pointer ${
                    confirmModal.isDanger
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                  }`}
                >
                  {confirmModal.confirmText || 'Подтвердить'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg p-6 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-zinc-100">Вставить JSON карты</h3>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='Вставьте JSON {"cols": 26, "rows": 16, "grid": [[...]]}...'
                className="w-full h-40 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono focus:outline-none focus:border-cyan-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  onClick={handleImportJson}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer"
                >
                  Загрузить
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
