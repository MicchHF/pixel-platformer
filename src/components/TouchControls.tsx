import React, { useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Zap, ChevronUp, Sliders, Gamepad2 } from 'lucide-react';
import { ControlKeys } from '../types/game';

interface TouchControlsProps {
  onKeyChange: (key: keyof ControlKeys, pressed: boolean) => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onKeyChange }) => {
  const [controlLayout, setControlLayout] = useState<'ergonomic' | 'classic'>('ergonomic');
  const activeKeysRef = useRef<Set<keyof ControlKeys>>(new Set());

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
  };

  const setKey = (key: keyof ControlKeys, pressed: boolean) => {
    if (pressed) {
      if (!activeKeysRef.current.has(key)) {
        activeKeysRef.current.add(key);
        triggerHaptic();
        onKeyChange(key, true);
      }
    } else {
      if (activeKeysRef.current.has(key)) {
        activeKeysRef.current.delete(key);
        onKeyChange(key, false);
      }
    }
  };

  const handleTouch = (key: keyof ControlKeys, pressed: boolean) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setKey(key, pressed);
  };

  // Directional dash instant burst trigger
  const handleDirectionalDash = (dirKey: 'dashLeft' | 'dashRight' | 'dashUp' | 'dashDown' | 'dash') => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    triggerHaptic();
    onKeyChange(dirKey, true);
    // Instant micro-pulse for dash
    setTimeout(() => {
      onKeyChange(dirKey, false);
    }, 120);
  };

  return (
    <div 
      id="touch-controls-container"
      className="w-full flex flex-col items-center justify-between px-2 sm:px-4 py-2 select-none touch-none pointer-events-auto z-30"
    >
      {/* Mode toggle bar */}
      <div className="w-full flex items-center justify-between px-2 pb-1.5 text-[10px] font-mono text-zinc-400">
        <span className="text-zinc-500 font-semibold tracking-wider">СЕНСОРНЫЙ КОНТРОЛЛЕР</span>
        <button
          id="touch-mode-toggle"
          onClick={() => setControlLayout((prev) => prev === 'ergonomic' ? 'classic' : 'ergonomic')}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[10px] transition active:scale-95"
        >
          {controlLayout === 'ergonomic' ? (
            <>
              <Sliders className="w-3 h-3 text-cyan-400" />
              <span>Режим: Эргономичный</span>
            </>
          ) : (
            <>
              <Gamepad2 className="w-3 h-3 text-amber-400" />
              <span>Режим: D-Pad 4D</span>
            </>
          )}
        </button>
      </div>

      {controlLayout === 'ergonomic' ? (
        /* ERGONOMIC MOBILE LAYOUT: Wide Horizontal Steer + Smart Directional Dash */
        <div className="w-full flex items-center justify-between gap-3 sm:gap-6">
          {/* LEFT THUMB: Horizontal Movement Slider Bar & Aux Up/Down */}
          <div className="flex flex-col gap-1.5 flex-1 max-w-[200px]">
            {/* Aux Up / Down for climbing */}
            <div className="flex items-center justify-center gap-2">
              <button
                id="touch-btn-up-aux"
                onTouchStart={handleTouch('up', true)}
                onTouchEnd={handleTouch('up', false)}
                onTouchCancel={handleTouch('up', false)}
                onMouseDown={handleTouch('up', true)}
                onMouseUp={handleTouch('up', false)}
                className="flex items-center justify-center w-12 h-9 rounded-lg bg-zinc-900/90 active:bg-cyan-500/40 border border-zinc-800 text-zinc-400 active:text-white shadow transition active:scale-95"
                title="Вверх (Краб)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                id="touch-btn-down-aux"
                onTouchStart={handleTouch('down', true)}
                onTouchEnd={handleTouch('down', false)}
                onTouchCancel={handleTouch('down', false)}
                onMouseDown={handleTouch('down', true)}
                onMouseUp={handleTouch('down', false)}
                className="flex items-center justify-center w-12 h-9 rounded-lg bg-zinc-900/90 active:bg-cyan-500/40 border border-zinc-800 text-zinc-400 active:text-white shadow transition active:scale-95"
                title="Вниз"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>

            {/* Primary Horizontal Movement Buttons */}
            <div className="flex items-center gap-2 w-full h-16">
              <button
                id="touch-btn-left"
                onTouchStart={handleTouch('left', true)}
                onTouchEnd={handleTouch('left', false)}
                onTouchCancel={handleTouch('left', false)}
                onMouseDown={handleTouch('left', true)}
                onMouseUp={handleTouch('left', false)}
                className="flex-1 h-full flex flex-col items-center justify-center rounded-2xl bg-zinc-900/95 active:bg-cyan-600/60 border border-zinc-700 active:border-cyan-400 text-zinc-200 active:text-white shadow-xl backdrop-blur transition-all active:scale-95"
              >
                <ArrowLeft className="w-7 h-7" />
                <span className="text-[10px] font-mono font-bold text-zinc-400">ВЛЕВО</span>
              </button>

              <button
                id="touch-btn-right"
                onTouchStart={handleTouch('right', true)}
                onTouchEnd={handleTouch('right', false)}
                onTouchCancel={handleTouch('right', false)}
                onMouseDown={handleTouch('right', true)}
                onMouseUp={handleTouch('right', false)}
                className="flex-1 h-full flex flex-col items-center justify-center rounded-2xl bg-zinc-900/95 active:bg-cyan-600/60 border border-zinc-700 active:border-cyan-400 text-zinc-200 active:text-white shadow-xl backdrop-blur transition-all active:scale-95"
              >
                <ArrowRight className="w-7 h-7" />
                <span className="text-[10px] font-mono font-bold text-zinc-400">ВПРАВО</span>
              </button>
            </div>
          </div>

          {/* RIGHT THUMB: Jump & Directional Dash Cluster */}
          <div className="flex items-center gap-2.5 sm:gap-4 flex-1 justify-end max-w-[220px]">
            {/* Directional Dash Cluster */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[9px] font-mono text-rose-400 font-bold tracking-wider">РЫВОК</div>
              <div className="grid grid-cols-3 gap-1">
                {/* Dash Left */}
                <button
                  id="touch-dash-left"
                  onTouchStart={handleDirectionalDash('dashLeft')}
                  onMouseDown={handleDirectionalDash('dashLeft')}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-950/80 active:bg-rose-500 border border-rose-700/80 text-rose-300 active:text-white shadow-md transition active:scale-95"
                  title="Рывок Влево"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {/* Dash Up */}
                <button
                  id="touch-dash-up"
                  onTouchStart={handleDirectionalDash('dashUp')}
                  onMouseDown={handleDirectionalDash('dashUp')}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-950/80 active:bg-rose-500 border border-rose-700/80 text-rose-300 active:text-white shadow-md transition active:scale-95"
                  title="Рывок Вверх"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>

                {/* Dash Right */}
                <button
                  id="touch-dash-right"
                  onTouchStart={handleDirectionalDash('dashRight')}
                  onMouseDown={handleDirectionalDash('dashRight')}
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-950/80 active:bg-rose-500 border border-rose-700/80 text-rose-300 active:text-white shadow-md transition active:scale-95"
                  title="Рывок Вправо"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Huge Primary JUMP Button */}
            <button
              id="touch-btn-jump"
              onTouchStart={handleTouch('jump', true)}
              onTouchEnd={handleTouch('jump', false)}
              onTouchCancel={handleTouch('jump', false)}
              onMouseDown={handleTouch('jump', true)}
              onMouseUp={handleTouch('jump', false)}
              className="flex flex-col items-center justify-center w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-cyan-950/90 active:bg-cyan-500 border-2 border-cyan-500 text-cyan-300 active:text-white shadow-2xl backdrop-blur transition-all active:scale-95 cursor-pointer"
            >
              <ChevronUp className="w-8 h-8" />
              <span className="text-[11px] font-mono font-black tracking-wider">ПРЫЖОК</span>
            </button>
          </div>
        </div>
      ) : (
        /* CLASSIC 4-WAY D-PAD */
        <div className="w-full flex items-center justify-between px-2">
          {/* 4-Way D-Pad */}
          <div className="grid grid-cols-3 gap-1 w-36 h-36">
            <div />
            <button
              id="touch-btn-up"
              onTouchStart={handleTouch('up', true)}
              onTouchEnd={handleTouch('up', false)}
              onTouchCancel={handleTouch('up', false)}
              onMouseDown={handleTouch('up', true)}
              onMouseUp={handleTouch('up', false)}
              className="flex items-center justify-center rounded-xl bg-zinc-900 active:bg-cyan-500 border border-zinc-700 text-zinc-200 active:text-white shadow-lg transition active:scale-95"
            >
              <ArrowUp className="w-6 h-6" />
            </button>
            <div />

            <button
              id="touch-btn-left-classic"
              onTouchStart={handleTouch('left', true)}
              onTouchEnd={handleTouch('left', false)}
              onTouchCancel={handleTouch('left', false)}
              onMouseDown={handleTouch('left', true)}
              onMouseUp={handleTouch('left', false)}
              className="flex items-center justify-center rounded-xl bg-zinc-900 active:bg-cyan-500 border border-zinc-700 text-zinc-200 active:text-white shadow-lg transition active:scale-95"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center justify-center bg-zinc-950/50 rounded-lg border border-zinc-800">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            </div>
            <button
              id="touch-btn-right-classic"
              onTouchStart={handleTouch('right', true)}
              onTouchEnd={handleTouch('right', false)}
              onTouchCancel={handleTouch('right', false)}
              onMouseDown={handleTouch('right', true)}
              onMouseUp={handleTouch('right', false)}
              className="flex items-center justify-center rounded-xl bg-zinc-900 active:bg-cyan-500 border border-zinc-700 text-zinc-200 active:text-white shadow-lg transition active:scale-95"
            >
              <ArrowRight className="w-6 h-6" />
            </button>

            <div />
            <button
              id="touch-btn-down"
              onTouchStart={handleTouch('down', true)}
              onTouchEnd={handleTouch('down', false)}
              onTouchCancel={handleTouch('down', false)}
              onMouseDown={handleTouch('down', true)}
              onMouseUp={handleTouch('down', false)}
              className="flex items-center justify-center rounded-xl bg-zinc-900 active:bg-cyan-500 border border-zinc-700 text-zinc-200 active:text-white shadow-lg transition active:scale-95"
            >
              <ArrowDown className="w-6 h-6" />
            </button>
            <div />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              id="touch-btn-dash-classic"
              onTouchStart={handleTouch('dash', true)}
              onTouchEnd={handleTouch('dash', false)}
              onTouchCancel={handleTouch('dash', false)}
              onMouseDown={handleTouch('dash', true)}
              onMouseUp={handleTouch('dash', false)}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-rose-950/90 active:bg-rose-500 border border-rose-600 text-rose-300 active:text-white shadow-xl transition active:scale-95"
            >
              <Zap className="w-6 h-6" />
              <span className="text-[10px] font-mono font-bold">DASH</span>
            </button>

            <button
              id="touch-btn-jump-classic"
              onTouchStart={handleTouch('jump', true)}
              onTouchEnd={handleTouch('jump', false)}
              onTouchCancel={handleTouch('jump', false)}
              onMouseDown={handleTouch('jump', true)}
              onMouseUp={handleTouch('jump', false)}
              className="flex flex-col items-center justify-center w-18 h-18 rounded-2xl bg-cyan-950/90 active:bg-cyan-500 border-2 border-cyan-500 text-cyan-300 active:text-white shadow-xl transition active:scale-95"
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
