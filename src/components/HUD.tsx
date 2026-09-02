import React, { useEffect, useState } from 'react';
import { Skull, Timer, Zap, Key, RotateCcw, Volume2, VolumeX, Settings, Grid, Code, Play, Pause, Trophy } from 'lucide-react';
import { LevelData, PlayerState, ThemeColors } from '../types/game';
import { formatHundredths } from '../utils/time';

interface HUDProps {
  level: LevelData;
  player: PlayerState;
  levelTime: number;
  deaths: number;
  totalLifetimeDeaths?: number;
  bestTime?: number;
  theme: ThemeColors;
  isPaused: boolean;
  isMuted: boolean;
  isBgmPlaying: boolean;
  compact?: boolean;
  onRestart: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onToggleBgm: () => void;
  onOpenLevelSelect: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onOpenEmbed: () => void;
  onOpenEditor: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  level,
  player,
  levelTime,
  deaths,
  totalLifetimeDeaths = 0,
  bestTime,
  theme,
  isPaused,
  isMuted,
  isBgmPlaying,
  compact = false,
  onRestart,
  onTogglePause,
  onToggleMute,
  onToggleBgm,
  onOpenLevelSelect,
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

  const difficultyColors = {
    Hard: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Brutal: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Extreme: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    Nightmare: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    Impossible: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  return (
    <header 
      id="main-game-hud"
      className="w-full flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-zinc-900/95 backdrop-blur border-b border-zinc-800 font-mono select-none text-xs sm:text-sm z-20 shrink-0"
    >
      {/* Top Left: Level Info & Difficulty */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          id="hud-level-select-btn"
          onClick={onOpenLevelSelect}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-bold text-xs tracking-wide transition cursor-pointer active:scale-95"
        >
          <Grid className="w-3.5 h-3.5 text-cyan-400" />
          <span className="max-w-[130px] sm:max-w-[200px] truncate">{level.name.split(':')[0]}</span>
        </button>

        <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold border ${difficultyColors[level.difficulty]}`}>
          {level.difficulty}
        </span>

        {player.hasKey && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
            <Key className="w-3 h-3" />
            <span>KEY</span>
          </div>
        )}
      </div>

      {/* Center: Live Speedrun Timer & Deaths Counter */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs font-semibold">
        {/* Deaths Counter with Visual Impact */}
        <div 
          id="hud-death-counter-badge"
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border transition-all duration-200 ${
            deathPulse 
              ? 'bg-rose-600/40 border-rose-500 text-white scale-110 shadow-lg shadow-rose-500/40' 
              : 'bg-zinc-950/90 border-zinc-800 text-rose-400'
          }`}
          title={`Смертей на этом уровне: ${deaths} | Всего за игру: ${totalLifetimeDeaths}`}
        >
          <Skull className={`w-4 h-4 text-rose-500 ${deathPulse ? 'animate-spin' : ''}`} />
          <span className="font-black tabular-nums">{deaths}</span>
          <span className="hidden sm:inline text-zinc-500 text-[10px]">
            {totalLifetimeDeaths > deaths ? `(${totalLifetimeDeaths} ВСЕГО)` : 'СМЕРТЕЙ'}
          </span>
        </div>

        {/* Timer (00:00.00 Hundredths precision) */}
        <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-zinc-950/90 border border-zinc-800 text-cyan-400">
          <Timer className="w-3.5 h-3.5 text-cyan-500" />
          <span className="tabular-nums font-bold tracking-wider">{formatHundredths(levelTime)}</span>
        </div>

        {/* Dash Status Indicator */}
        <div className={`hidden xs:flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] sm:text-[11px] font-bold transition-all ${
          player.hasDash 
            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-xs shadow-cyan-500/30' 
            : 'bg-zinc-800/80 text-zinc-600 border-zinc-700'
        }`}>
          <Zap className={`w-3 h-3 ${player.hasDash ? 'text-cyan-400 animate-pulse' : 'text-zinc-600'}`} />
          <span>DASH</span>
        </div>
      </div>

      {/* Top Right: Quick Actions */}
      <div className="flex items-center gap-1">
        {/* Leaderboard Button */}
        <button
          id="hud-leaderboard-btn"
          onClick={onOpenLeaderboard}
          title="Таблица рекордов (Online Leaderboard)"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-600/60 text-amber-300 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs shadow-amber-500/20"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Топ</span>
        </button>

        {/* Instant Restart Button */}
        <button
          id="hud-restart-btn"
          onClick={onRestart}
          title="Заново (R)"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-400 text-xs font-bold transition active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">R</span>
        </button>

        {/* Pause Button */}
        <button
          id="hud-pause-btn"
          onClick={onTogglePause}
          title={isPaused ? "Продолжить" : "Пауза"}
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition active:scale-95 cursor-pointer"
        >
          {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5" />}
        </button>

        {/* Mute Button */}
        <button
          id="hud-mute-btn"
          onClick={onToggleMute}
          title="Звук Вкл/Выкл"
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition active:scale-95 cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-500" /> : <Volume2 className="w-3.5 h-3.5 text-zinc-200" />}
        </button>

        {/* Level Editor */}
        <button
          id="hud-editor-btn"
          onClick={onOpenEditor}
          title="Редактор Уровней"
          className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 text-xs font-medium transition cursor-pointer"
        >
          <Grid className="w-3.5 h-3.5 text-indigo-400" />
          <span>Редактор</span>
        </button>

        {/* Embed Button */}
        <button
          id="hud-embed-btn"
          onClick={onOpenEmbed}
          title="Встроить"
          className="hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-medium transition cursor-pointer"
        >
          <Code className="w-3.5 h-3.5 text-cyan-400" />
          <span>Встроить</span>
        </button>

        {/* Settings Button */}
        <button
          id="hud-settings-btn"
          onClick={onOpenSettings}
          title="Настройки"
          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition active:scale-95 cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
