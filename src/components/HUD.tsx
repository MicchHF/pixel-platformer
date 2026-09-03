import React, { useEffect, useState } from 'react';
import { Skull, Timer, Zap, Key, RotateCcw, Volume2, VolumeX, Settings, Grid, Play, Pause, Trophy, Edit3, Maximize2 } from 'lucide-react';
import { LevelData, PlayerState, ThemeColors } from '../types/game';
import { formatHundredths } from '../utils/time';
import { haptics, toggleAppFullscreen } from '../utils/telegram';

interface HUDProps {
  level: LevelData;
  player?: PlayerState;
  levelTime?: number;
  time?: number;
  deaths?: number;
  totalLifetimeDeaths?: number;
  lifetimeDeaths?: number;
  bestTime?: number;
  theme?: ThemeColors;
  isPaused?: boolean;
  isMuted?: boolean;
  isBgmPlaying?: boolean;
  compact?: boolean;
  isCreatorMode?: boolean;
  onRestart?: () => void;
  onTogglePause?: () => void;
  onToggleMute?: () => void;
  onToggleBgm?: () => void;
  onOpenLevelSelect?: () => void;
  onOpenLevels?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenSettings?: () => void;
  onOpenEmbed?: () => void;
  onOpenEditor?: () => void;
}

const HUDComponent: React.FC<HUDProps> = ({
  level,
  player,
  levelTime,
  time,
  deaths = 0,
  totalLifetimeDeaths,
  lifetimeDeaths,
  bestTime,
  theme,
  isPaused = false,
  isMuted = false,
  isBgmPlaying = false,
  compact = false,
  isCreatorMode = false,
  onRestart,
  onTogglePause,
  onToggleMute,
  onToggleBgm,
  onOpenLevelSelect,
  onOpenLevels,
  onOpenLeaderboard,
  onOpenSettings,
  onOpenEmbed,
  onOpenEditor,
}) => {
  const [deathPulse, setDeathPulse] = useState(false);

  useEffect(() => {
    if (deaths > 0) {
      setDeathPulse(true);
      const timer = setTimeout(() => setDeathPulse(false), 400);
      return () => clearTimeout(timer);
    }
  }, [deaths]);

  const activeTime = levelTime !== undefined ? levelTime : (time ?? 0);
  const activeLifetimeDeaths = totalLifetimeDeaths !== undefined ? totalLifetimeDeaths : (lifetimeDeaths ?? 0);
  const handleOpenLevels = onOpenLevelSelect || onOpenLevels || (() => {});

  const difficultyColors = {
    Hard: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Brutal: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Extreme: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Nightmare: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    Impossible: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  const handleLevelClick = () => {
    haptics.selection();
    handleOpenLevels();
  };

  const handleLeaderboardClick = () => {
    haptics.selection();
    onOpenLeaderboard?.();
  };

  const handleRestartClick = () => {
    haptics.medium();
    onRestart?.();
  };

  return (
    <header 
      id="main-game-hud"
      className="w-full flex items-center justify-between gap-1.5 px-2.5 sm:px-4 py-2 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 font-mono select-none text-xs z-20 shrink-0"
    >
      {/* Top Left: Level Selector & Badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          id="hud-level-select-btn"
          onClick={handleLevelClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-bold text-xs tracking-wide transition cursor-pointer active:scale-95 shadow-sm"
        >
          <Grid className="w-3.5 h-3.5 text-cyan-400" />
          <span className="max-w-[90px] sm:max-w-[160px] truncate">{level.name.split(':')[0]}</span>
        </button>

        <span className={`hidden xs:inline-block px-1.5 py-0.5 rounded-lg text-[10px] font-bold border ${difficultyColors[level.difficulty]}`}>
          {level.difficulty}
        </span>

        {player?.hasKey && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
            <Key className="w-3 h-3" />
            <span>KEY</span>
          </div>
        )}
      </div>

      {/* Center: Live Timer & Deaths Count */}
      <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold">
        {/* Deaths Counter */}
        <div 
          id="hud-death-counter-badge"
          className={`flex items-center gap-1 px-2 py-1 rounded-xl border transition-all duration-200 ${
            deathPulse 
              ? 'bg-rose-600/50 border-rose-500 text-white scale-105 shadow-md shadow-rose-500/40' 
              : 'bg-zinc-950/90 border-zinc-800 text-rose-400'
          }`}
          title={`Смертей на этом уровне: ${deaths} | Всего: ${activeLifetimeDeaths}`}
        >
          <Skull className={`w-3.5 h-3.5 text-rose-500 ${deathPulse ? 'animate-spin' : ''}`} />
          <span className="font-black tabular-nums">{deaths}</span>
        </div>

        {/* Live Timer */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-zinc-950/90 border border-zinc-800 text-cyan-400">
          <Timer className="w-3.5 h-3.5 text-cyan-500" />
          <span className="tabular-nums font-bold tracking-wider">{formatHundredths(activeTime)}</span>
        </div>
      </div>

      {/* Top Right: Quick Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Leaderboard Button */}
        <button
          id="hud-leaderboard-btn"
          onClick={handleLeaderboardClick}
          title="Таблица рекордов"
          className="flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-600/70 text-amber-300 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs shadow-amber-500/20"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Топ</span>
        </button>

        {/* Quick Restart */}
        <button
          id="hud-restart-btn"
          onClick={handleRestartClick}
          title="Заново (R)"
          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-400 transition active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Pause */}
        <button
          id="hud-pause-btn"
          onClick={onTogglePause}
          title={isPaused ? "Продолжить" : "Пауза"}
          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition active:scale-95 cursor-pointer"
        >
          {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
        </button>

        {/* Mute */}
        <button
          id="hud-mute-btn"
          onClick={onToggleMute}
          title="Звук"
          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition active:scale-95 cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-500" /> : <Volume2 className="w-3.5 h-3.5 text-zinc-200" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          id="hud-fullscreen-btn"
          onClick={() => {
            haptics.light();
            toggleAppFullscreen();
          }}
          title="На весь экран"
          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-cyan-400 transition active:scale-95 cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Settings */}
        <button
          id="hud-settings-btn"
          onClick={onOpenSettings}
          title="Настройки"
          className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition active:scale-95 cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};

export const HUD = React.memo(HUDComponent);
