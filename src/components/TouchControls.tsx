import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  Zap, 
  ChevronUp, 
  RotateCcw, 
  Sliders, 
  Gamepad2 
} from 'lucide-react';
import { ControlKeys } from '../types/game';
import { haptics } from '../utils/telegram';

interface TouchControlsProps {
  onKeyChange: (key: keyof ControlKeys, pressed: boolean) => void;
  onQuickRestart?: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ 
  onKeyChange, 
  onQuickRestart 
}) => {
  const [controlLayout, setControlLayout] = useState<'ergonomic' | 'classic'>('ergonomic');
  
  // Track active keys and which pointer/touch controls which key
  const activeKeysRef = useRef<Set<keyof ControlKeys>>(new Set());
  const pointerMapRef = useRef<Map<number, keyof ControlKeys | 'movePad'>>(new Map());

  // Left move pad zone ref for swipe detection
  const movePadRef = useRef<HTMLDivElement | null>(null);

  const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
    if (style === 'medium') {
      haptics.medium();
    } else {
      haptics.light();
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(style === 'medium' ? 25 : 12);
      } catch {}
    }
  };

  const setKeyState = useCallback((key: keyof ControlKeys, pressed: boolean) => {
    const isCurrentlyActive = activeKeysRef.current.has(key);
    if (pressed) {
      if (!isCurrentlyActive) {
        activeKeysRef.current.add(key);
        triggerHaptic('light');
        onKeyChange(key, true);
      }
    } else {
      if (isCurrentlyActive) {
        activeKeysRef.current.delete(key);
        onKeyChange(key, false);
      }
    }
  }, [onKeyChange]);

  // Pointer Handlers for discrete buttons (Jump, Dash, Up, Down, Restart)
  const handleButtonPointerDown = (key: keyof ControlKeys) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    pointerMapRef.current.set(e.pointerId, key);
    setKeyState(key, true);
  };

  const handleButtonPointerUp = (key: keyof ControlKeys) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    pointerMapRef.current.delete(e.pointerId);
    setKeyState(key, false);
  };

  const handleButtonPointerCancel = (key: keyof ControlKeys) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    pointerMapRef.current.delete(e.pointerId);
    setKeyState(key, false);
  };

  // Directional Dash Instant Impulse
  const handleDashPulse = (dirKey: 'dashLeft' | 'dashRight' | 'dashUp' | 'dashDown' | 'dash') => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic('medium');
    onKeyChange(dirKey, true);
    setTimeout(() => {
      onKeyChange(dirKey, false);
    }, 120);
  };

  // Quick Restart Trigger
  const handleRestartClick = (e: React.PointerEvent<HTMLButtonElement> | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic('medium');
    if (onQuickRestart) {
      onQuickRestart();
    } else {
      onKeyChange('restart', true);
      setTimeout(() => onKeyChange('restart', false), 80);
    }
  };

  // Continuous Swipe Movement Pad (Left Thumb Zone)
  const updateMovePadFromPointer = (clientX: number) => {
    if (!movePadRef.current) return;
    const rect = movePadRef.current.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const deadzone = 8;

    if (clientX < midX - deadzone) {
      setKeyState('right', false);
      setKeyState('left', true);
    } else if (clientX > midX + deadzone) {
      setKeyState('left', false);
      setKeyState('right', true);
    } else {
      setKeyState('left', false);
      setKeyState('right', false);
    }
  };

  const handleMovePadPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    pointerMapRef.current.set(e.pointerId, 'movePad');
    updateMovePadFromPointer(e.clientX);
  };

  const handleMovePadPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerMapRef.current.get(e.pointerId) === 'movePad') {
      e.preventDefault();
      e.stopPropagation();
      updateMovePadFromPointer(e.clientX);
    }
  };

  const handleMovePadPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    pointerMapRef.current.delete(e.pointerId);
    setKeyState('left', false);
    setKeyState('right', false);
  };

  // Clean up all keys on unmount
  useEffect(() => {
    return () => {
      activeKeysRef.current.forEach((k) => onKeyChange(k, false));
      activeKeysRef.current.clear();
      pointerMapRef.current.clear();
    };
  }, [onKeyChange]);

  return (
    <div 
      id="touch-controls-container"
      className="w-full flex flex-col items-center justify-between px-2 sm:px-4 py-1 select-none touch-none pointer-events-auto z-30"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Top Controller Bar */}
      <div className="w-full flex items-center justify-between px-2 pb-1 text-[10px] font-mono text-zinc-400">
        <span className="text-zinc-500 font-bold tracking-wider">СЕНСОРНЫЙ КОНТРОЛЛЕР (MULTI-TOUCH)</span>
        <button
          id="touch-mode-toggle"
          type="button"
          onClick={() => setControlLayout((prev) => prev === 'ergonomic' ? 'classic' : 'ergonomic')}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-[10px] transition active:scale-95 cursor-pointer shadow-sm"
        >
          {controlLayout === 'ergonomic' ? (
            <>
              <Sliders className="w-3 h-3 text-cyan-400" />
              <span>Эргономика</span>
            </>
          ) : (
            <>
              <Gamepad2 className="w-3 h-3 text-amber-400" />
              <span>D-Pad</span>
            </>
          )}
        </button>
      </div>

      {controlLayout === 'ergonomic' ? (
        /* ERGONOMIC TWO-THUMB ARCADE DECK */
        <div className="w-full flex items-center justify-between gap-2 sm:gap-4 max-w-lg mx-auto">
          {/* LEFT THUMB: Continuous Swipe Move Pad + Aux Up/Down */}
          <div className="flex flex-col gap-1.5 flex-1 max-w-[210px]">
            {/* Aux Up / Down & Quick Restart Bar */}
            <div className="flex items-center justify-between gap-1.5 px-0.5">
              <div className="flex items-center gap-1">
                <button
                  id="touch-btn-up-aux"
                  type="button"
                  onPointerDown={handleButtonPointerDown('up')}
                  onPointerUp={handleButtonPointerUp('up')}
                  onPointerCancel={handleButtonPointerCancel('up')}
                  className={`flex items-center justify-center w-9 h-8 rounded-lg border text-xs shadow transition active:scale-95 cursor-pointer ${
                    activeKeysRef.current.has('up')
                      ? 'bg-cyan-500 text-white border-cyan-400'
                      : 'bg-zinc-900/90 border-zinc-800 text-zinc-400'
                  }`}
                  title="Вверх"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  id="touch-btn-down-aux"
                  type="button"
                  onPointerDown={handleButtonPointerDown('down')}
                  onPointerUp={handleButtonPointerUp('down')}
                  onPointerCancel={handleButtonPointerCancel('down')}
                  className={`flex items-center justify-center w-9 h-8 rounded-lg border text-xs shadow transition active:scale-95 cursor-pointer ${
                    activeKeysRef.current.has('down')
                      ? 'bg-cyan-500 text-white border-cyan-400'
                      : 'bg-zinc-900/90 border-zinc-800 text-zinc-400'
                  }`}
                  title="Вниз"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Restart (R) Button */}
              <button
                id="touch-btn-quick-restart"
                type="button"
                onPointerDown={handleRestartClick}
                className="flex items-center gap-1 px-2.5 h-8 rounded-lg bg-amber-950/80 active:bg-amber-600 border border-amber-600/70 text-amber-300 active:text-white text-[10px] font-bold shadow transition active:scale-95 cursor-pointer"
                title="Мгновенный рестарт"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>R</span>
              </button>
            </div>

            {/* Left & Right Dual Pad with smooth continuous multi-touch slide */}
            <div 
              ref={movePadRef}
              id="touch-move-zone"
              onPointerDown={handleMovePadPointerDown}
              onPointerMove={handleMovePadPointerMove}
              onPointerUp={handleMovePadPointerUp}
              onPointerCancel={handleMovePadPointerUp}
              className="flex items-center gap-1.5 w-full h-16 bg-zinc-950/90 p-1 rounded-2xl border border-zinc-800 shadow-inner cursor-pointer"
            >
              <div
                id="touch-btn-left"
                className={`flex-1 h-full flex flex-col items-center justify-center rounded-xl border transition-all ${
                  activeKeysRef.current.has('left')
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-md scale-98'
                    : 'bg-zinc-900/95 border-zinc-700 text-zinc-200'
                }`}
              >
                <ArrowLeft className="w-7 h-7" />
                <span className="text-[9px] font-mono font-bold text-zinc-300">ВЛЕВО</span>
              </div>

              <div
                id="touch-btn-right"
                className={`flex-1 h-full flex flex-col items-center justify-center rounded-xl border transition-all ${
                  activeKeysRef.current.has('right')
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-md scale-98'
                    : 'bg-zinc-900/95 border-zinc-700 text-zinc-200'
                }`}
              >
                <ArrowRight className="w-7 h-7" />
                <span className="text-[9px] font-mono font-bold text-zinc-300">ВПРАВО</span>
              </div>
            </div>
          </div>

          {/* RIGHT THUMB: Jump & Dash Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end max-w-[220px]">
            {/* Directional Dash Cluster */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="text-[9px] font-mono text-rose-400 font-bold tracking-wider mb-0.5">РЫВОК</div>
              <div className="grid grid-cols-3 gap-1">
                {/* Dash Left */}
                <button
                  id="touch-dash-left"
                  type="button"
                  onPointerDown={handleDashPulse('dashLeft')}
                  className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-950/80 active:bg-rose-600 border border-rose-700/80 text-rose-300 active:text-white shadow-md transition active:scale-95 cursor-pointer"
                  title="Рывок Влево"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {/* Dash Up */}
                <button
                  id="touch-dash-up"
                  type="button"
                  onPointerDown={handleDashPulse('dashUp')}
                  className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-950/80 active:bg-rose-600 border border-rose-700/80 text-rose-300 active:text-white shadow-md transition active:scale-95 cursor-pointer"
                  title="Рывок Вверх"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>

                {/* Dash Right */}
                <button
                  id="touch-dash-right"
                  type="button"
                  onPointerDown={handleDashPulse('dashRight')}
                  className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-950/80 active:bg-rose-600 border border-rose-700/80 text-rose-300 active:text-white shadow-md transition active:scale-95 cursor-pointer"
                  title="Рывок Вправо"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Massive Primary JUMP Button (Dedicated Pointer Capture - Never blocked by Left thumb) */}
            <button
              id="touch-btn-jump"
              type="button"
              onPointerDown={handleButtonPointerDown('jump')}
              onPointerUp={handleButtonPointerUp('jump')}
              onPointerCancel={handleButtonPointerCancel('jump')}
              className={`flex flex-col items-center justify-center w-18 h-18 sm:w-20 sm:h-20 rounded-3xl border-2 shadow-2xl backdrop-blur transition-all active:scale-95 cursor-pointer ${
                activeKeysRef.current.has('jump')
                  ? 'bg-cyan-500 border-white text-white scale-98 shadow-cyan-500/50'
                  : 'bg-cyan-950/90 border-cyan-500 text-cyan-300'
              }`}
            >
              <ChevronUp className="w-8 h-8" />
              <span className="text-[10px] font-mono font-black tracking-wider">ПРЫЖОК</span>
            </button>
          </div>
        </div>
      ) : (
        /* CLASSIC 4-WAY D-PAD */
        <div className="w-full flex items-center justify-between px-2 max-w-md mx-auto">
          {/* 4-Way D-Pad */}
          <div className="grid grid-cols-3 gap-1 w-36 h-36">
            <div />
            <button
              id="touch-btn-up"
              type="button"
              onPointerDown={handleButtonPointerDown('up')}
              onPointerUp={handleButtonPointerUp('up')}
              onPointerCancel={handleButtonPointerCancel('up')}
              className={`flex items-center justify-center rounded-xl border shadow-lg transition active:scale-95 cursor-pointer ${
                activeKeysRef.current.has('up') ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-zinc-900 border-zinc-700 text-zinc-200'
              }`}
            >
              <ArrowUp className="w-6 h-6" />
            </button>
            <div />

            <button
              id="touch-btn-left-classic"
              type="button"
              onPointerDown={handleButtonPointerDown('left')}
              onPointerUp={handleButtonPointerUp('left')}
              onPointerCancel={handleButtonPointerCancel('left')}
              className={`flex items-center justify-center rounded-xl border shadow-lg transition active:scale-95 cursor-pointer ${
                activeKeysRef.current.has('left') ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-zinc-900 border-zinc-700 text-zinc-200'
              }`}
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center justify-center bg-zinc-950/50 rounded-lg border border-zinc-800">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            </div>
            <button
              id="touch-btn-right-classic"
              type="button"
              onPointerDown={handleButtonPointerDown('right')}
              onPointerUp={handleButtonPointerUp('right')}
              onPointerCancel={handleButtonPointerCancel('right')}
              className={`flex items-center justify-center rounded-xl border shadow-lg transition active:scale-95 cursor-pointer ${
                activeKeysRef.current.has('right') ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-zinc-900 border-zinc-700 text-zinc-200'
              }`}
            >
              <ArrowRight className="w-6 h-6" />
            </button>

            <div />
            <button
              id="touch-btn-down"
              type="button"
              onPointerDown={handleButtonPointerDown('down')}
              onPointerUp={handleButtonPointerUp('down')}
              onPointerCancel={handleButtonPointerCancel('down')}
              className={`flex items-center justify-center rounded-xl border shadow-lg transition active:scale-95 cursor-pointer ${
                activeKeysRef.current.has('down') ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-zinc-900 border-zinc-700 text-zinc-200'
              }`}
            >
              <ArrowDown className="w-6 h-6" />
            </button>
            <div />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              id="touch-btn-dash-classic"
              type="button"
              onPointerDown={handleButtonPointerDown('dash')}
              onPointerUp={handleButtonPointerUp('dash')}
              onPointerCancel={handleButtonPointerCancel('dash')}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border shadow-xl transition active:scale-95 cursor-pointer ${
                activeKeysRef.current.has('dash') ? 'bg-rose-500 border-rose-400 text-white' : 'bg-rose-950/90 border-rose-600 text-rose-300'
              }`}
            >
              <Zap className="w-6 h-6" />
              <span className="text-[10px] font-mono font-bold">DASH</span>
            </button>

            <button
              id="touch-btn-jump-classic"
              type="button"
              onPointerDown={handleButtonPointerDown('jump')}
              onPointerUp={handleButtonPointerUp('jump')}
              onPointerCancel={handleButtonPointerCancel('jump')}
              className={`flex flex-col items-center justify-center w-18 h-18 rounded-2xl border-2 shadow-xl transition active:scale-95 cursor-pointer ${
                activeKeysRef.current.has('jump') ? 'bg-cyan-500 border-white text-white' : 'bg-cyan-950/90 border-cyan-500 text-cyan-300'
              }`}
            >
              <ChevronUp className="w-8 h-8" />
              <span className="text-[11px] font-mono font-bold">JUMP</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
