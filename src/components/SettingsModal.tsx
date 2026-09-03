import React, { useState } from 'react';
import { X, Volume2, VolumeX, Palette, Monitor, Gamepad2, Smartphone, RefreshCw, Music, Maximize2 } from 'lucide-react';
import { ThemeName } from '../types/game';
import { THEMES } from '../game/themes';
import { sounds } from '../audio/soundManager';
import { toggleAppFullscreen, haptics } from '../utils/telegram';

interface SettingsModalProps {
  currentTheme?: ThemeName;
  themeName?: ThemeName;
  scanlines: boolean;
  screenShake: boolean;
  touchControlsMode?: 'auto' | 'always' | 'hidden';
  touchMode?: 'auto' | 'always' | 'hidden';
  sfxVolume: number;
  bgmVolume: number;
  isBgmPlaying?: boolean;
  isMuted?: boolean;
  playerName?: string;
  onChangePlayerName?: (name: string) => void;
  isCreatorMode?: boolean;
  onToggleCreatorMode?: (enabled: boolean) => void;
  onSelectTheme: (theme: ThemeName) => void;
  onToggleScanlines: (enabled: boolean) => void;
  onToggleScreenShake: (enabled: boolean) => void;
  onChangeTouchMode?: (mode: 'auto' | 'always' | 'hidden') => void;
  onSelectTouchMode?: (mode: 'auto' | 'always' | 'hidden') => void;
  onChangeSfxVolume: (vol: number) => void;
  onChangeBgmVolume: (vol: number) => void;
  onToggleBgm?: () => void;
  onToggleMute?: () => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentTheme,
  themeName,
  scanlines,
  screenShake,
  touchControlsMode,
  touchMode,
  sfxVolume,
  bgmVolume,
  isBgmPlaying = false,
  isMuted = false,
  playerName,
  onChangePlayerName,
  isCreatorMode = false,
  onToggleCreatorMode,
  onSelectTheme,
  onToggleScanlines,
  onToggleScreenShake,
  onChangeTouchMode,
  onSelectTouchMode,
  onChangeSfxVolume,
  onChangeBgmVolume,
  onToggleBgm,
  onToggleMute,
  onResetProgress,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const activeTheme = currentTheme || themeName || 'synthwave';
  const activeTouchMode = touchControlsMode || touchMode || 'auto';
  const musicActive = isBgmPlaying && !isMuted;

  const handleTouchModeChange = (mode: 'auto' | 'always' | 'hidden') => {
    if (typeof onChangeTouchMode === 'function') onChangeTouchMode(mode);
    if (typeof onSelectTouchMode === 'function') onSelectTouchMode(mode);
  };

  const handleToggleMusic = () => {
    if (typeof onToggleBgm === 'function') onToggleBgm();
    else if (typeof onToggleMute === 'function') onToggleMute();
  };
  return (
    <div 
      id="settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        id="settings-modal"
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-zinc-100 uppercase tracking-wider">
              Настройки и Темы
            </h2>
          </div>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm">
          {/* 1. Theme Palette Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
              Цветовая Палитра (Themes)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(Object.keys(THEMES) as ThemeName[]).map((themeKey) => {
                const t = THEMES[themeKey];
                const isSelected = activeTheme === themeKey;
                return (
                  <button
                    key={themeKey}
                    id={`theme-btn-${themeKey}`}
                    onClick={() => onSelectTheme(themeKey)}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-800 border-cyan-500 ring-1 ring-cyan-500 text-white'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div className="flex -space-x-1 shrink-0">
                      <div className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: t.background }} />
                      <div className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: t.player }} />
                      <div className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: t.spike }} />
                    </div>
                    <span className="text-xs font-semibold truncate">{t.name.split('(')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Visual Effects */}
          <div className="pt-4 border-t border-zinc-800/80 space-y-3">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Визуальные Эффекты
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer">
                <span className="flex items-center gap-2 text-zinc-200">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span>CRT Scanlines (Ретро линии)</span>
                </span>
                <input
                  type="checkbox"
                  checked={scanlines}
                  onChange={(e) => onToggleScanlines(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 cursor-pointer">
                <span className="flex items-center gap-2 text-zinc-200">
                  <Gamepad2 className="w-4 h-4 text-rose-400" />
                  <span>Тряска экрана (Screen Shake)</span>
                </span>
                <input
                  type="checkbox"
                  checked={screenShake}
                  onChange={(e) => onToggleScreenShake(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* 3. Audio Settings */}
          <div className="pt-4 border-t border-zinc-800/80 space-y-3">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Звук и Музыка (Web Audio Chiptune)
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* SFX Volume */}
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Volume2 className="w-4 h-4 text-cyan-400" /> SFX (Эффекты)
                  </span>
                  <span>{Math.round(sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => onChangeSfxVolume(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* BGM Volume & Toggle */}
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <button
                    onClick={handleToggleMusic}
                    className="flex items-center gap-1.5 font-semibold text-zinc-200 hover:text-cyan-400 transition cursor-pointer"
                  >
                    <Music className="w-4 h-4 text-indigo-400" /> 
                    <span>Музыка Synthwave {musicActive ? '(Вкл)' : '(Выкл)'}</span>
                  </button>
                  <span>{Math.round(bgmVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bgmVolume}
                  onChange={(e) => onChangeBgmVolume(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Fullscreen Mode Card */}
          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Режим на весь экран</span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Разворачивает в Telegram / браузере без шторки свайпа
              </p>
            </div>
            <button
              id="settings-fullscreen-btn"
              onClick={() => {
                haptics.light();
                toggleAppFullscreen();
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600 text-cyan-300 text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm shrink-0 flex items-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>На весь экран</span>
            </button>
          </div>

          {/* 4. Touch Controls Mode */}
          <div className="pt-4 border-t border-zinc-800/80 space-y-2">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
              Сенсорное управление (Для карт и мобильных)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'auto', label: 'Авто (Auto)' },
                { id: 'always', label: 'Всегда (Always)' },
                { id: 'hidden', label: 'Скрыть (Hidden)' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTouchModeChange(item.id as 'auto' | 'always' | 'hidden')}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition cursor-pointer ${
                    activeTouchMode === item.id
                      ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Keybindings cheat sheet */}
          <div className="pt-4 border-t border-zinc-800/80">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Управление (Клавиатура & Геймпад)
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80">
                <span className="text-zinc-500">Движение:</span> <span className="font-bold text-white">A / D</span> или <span className="font-bold text-white">← / →</span>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80">
                <span className="text-zinc-500">Прыжок / Отскок:</span> <span className="font-bold text-white">Space / W / Z</span>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80">
                <span className="text-zinc-500">Рывок (Dash):</span> <span className="font-bold text-white">X / Shift / K</span>
              </div>
              <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80">
                <span className="text-zinc-500">Быстрый рестарт:</span> <span className="font-bold text-white">R</span>
              </div>
            </div>
          </div>

          {/* Reset progress */}
          <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap justify-between items-center gap-2">
            <span className="text-xs text-zinc-500">Сбросить локальные рекорды и время</span>
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-400 font-bold">Точно сбросить?</span>
                <button
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                  className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  Да
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition cursor-pointer"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Сбросить Прогресс</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
