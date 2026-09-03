import React, { useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp,
  ChevronUp 
} from 'lucide-react';
import { ControlKeys } from '../types/game';
import { haptics } from '../utils/telegram';

interface TouchControlsProps {
  onKeyChange: (key: keyof ControlKeys, pressed: boolean) => void;
  onQuickRestart?: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ 
  onKeyChange, 
}) => {
  // Key states ref to avoid redundant notifications
  const keyStatesRef = useRef<{ [K in keyof ControlKeys]?: boolean }>({});
  
  // Track active pointer IDs per key: key -> Set of pointerIds
  const keyPointersRef = useRef<Map<keyof ControlKeys, Set<number | string>>>(new Map());

  const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
    if (style === 'medium') {
      haptics.medium();
    } else {
      haptics.light();
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(style === 'medium' ? 20 : 10);
      } catch {}
    }
  };

  const handlePointerDown = (key: keyof ControlKeys, haptic: 'light' | 'medium' = 'light') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    let pointerSet = keyPointersRef.current.get(key);
    if (!pointerSet) {
      pointerSet = new Set();
      keyPointersRef.current.set(key, pointerSet);
    }
    pointerSet.add(e.pointerId);

    triggerHaptic(haptic);

    if (!keyStatesRef.current[key]) {
      keyStatesRef.current[key] = true;
      onKeyChange(key, true);
    }
  };

  const handlePointerUp = (key: keyof ControlKeys) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const pointerSet = keyPointersRef.current.get(key);
    if (pointerSet) {
      pointerSet.delete(e.pointerId);
      if (pointerSet.size === 0) {
        keyStatesRef.current[key] = false;
        onKeyChange(key, false);
      }
    } else {
      keyStatesRef.current[key] = false;
      onKeyChange(key, false);
    }
  };

  const handlePointerCancel = (key: keyof ControlKeys) => (e: React.PointerEvent) => {
    const pointerSet = keyPointersRef.current.get(key);
    if (pointerSet) {
      pointerSet.delete(e.pointerId);
      if (pointerSet.size === 0) {
        keyStatesRef.current[key] = false;
        onKeyChange(key, false);
      }
    }
  };

  return (
    <div 
      id="touch-controls-container"
      className="w-full flex items-center justify-between px-1.5 py-0.5 select-none touch-none pointer-events-auto z-30"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* LEFT THUMB: Dedicated discrete steering buttons (Left & Right) with instant response */}
      <div 
        id="touch-steer-cluster"
        className="flex items-center gap-1.5 w-[140px] sm:w-[165px] h-[70px] sm:h-[76px] bg-zinc-950/95 p-1 rounded-2xl border-2 border-zinc-800 shadow-xl select-none touch-none shrink-0"
        style={{ touchAction: 'none' }}
      >
        {/* Left Button */}
        <button
          id="touch-btn-left"
          type="button"
          onPointerDown={handlePointerDown('left', 'light')}
          onPointerUp={handlePointerUp('left')}
          onPointerCancel={handlePointerCancel('left')}
          className="flex-1 h-full flex flex-col items-center justify-center rounded-xl border bg-zinc-900/95 border-zinc-700/80 text-zinc-200 transition-all pointer-events-auto select-none cursor-pointer active:bg-cyan-600 active:border-cyan-300 active:text-white active:scale-95"
          style={{ touchAction: 'none' }}
        >
          <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 pointer-events-none stroke-[2.5]" />
          <span className="text-[9px] font-mono font-bold text-zinc-300 tracking-wider pointer-events-none">ВЛЕВО</span>
        </button>

        {/* Right Button */}
        <button
          id="touch-btn-right"
          type="button"
          onPointerDown={handlePointerDown('right', 'light')}
          onPointerUp={handlePointerUp('right')}
          onPointerCancel={handlePointerCancel('right')}
          className="flex-1 h-full flex flex-col items-center justify-center rounded-xl border bg-zinc-900/95 border-zinc-700/80 text-zinc-200 transition-all pointer-events-auto select-none cursor-pointer active:bg-cyan-600 active:border-cyan-300 active:text-white active:scale-95"
          style={{ touchAction: 'none' }}
        >
          <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 pointer-events-none stroke-[2.5]" />
          <span className="text-[9px] font-mono font-bold text-zinc-300 tracking-wider pointer-events-none">ВПРАВО</span>
        </button>
      </div>

      {/* RIGHT THUMB: 3 DASH BUTTONS (Left, Up, Right) + JUMP */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 select-none touch-none">
        {/* 3 Dash Buttons Cluster */}
        <div className="flex flex-col gap-1 w-[110px] sm:w-[124px] h-[70px] sm:h-[76px] justify-between">
          {/* Top Row: DASH UP */}
          <button
            id="touch-btn-dash-up"
            type="button"
            onPointerDown={handlePointerDown('dashUp', 'medium')}
            onPointerUp={handlePointerUp('dashUp')}
            onPointerCancel={handlePointerCancel('dashUp')}
            className="flex items-center justify-center gap-1 w-full h-[32px] sm:h-[35px] rounded-xl border bg-rose-950/90 border-rose-600/90 text-rose-200 shadow-lg transition-all cursor-pointer touch-none select-none active:bg-rose-500 active:border-rose-100 active:text-white active:scale-95"
            title="Рывок Вверх"
            style={{ touchAction: 'none' }}
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5] pointer-events-none" />
            <span className="text-[9px] font-mono font-black tracking-wider pointer-events-none">ВВЕРХ</span>
          </button>

          {/* Bottom Row: DASH LEFT & DASH RIGHT */}
          <div className="flex items-center gap-1 w-full h-[32px] sm:h-[35px]">
            {/* Dash Left */}
            <button
              id="touch-btn-dash-left"
              type="button"
              onPointerDown={handlePointerDown('dashLeft', 'medium')}
              onPointerUp={handlePointerUp('dashLeft')}
              onPointerCancel={handlePointerCancel('dashLeft')}
              className="flex-1 h-full flex items-center justify-center gap-0.5 rounded-xl border bg-rose-950/90 border-rose-600/90 text-rose-200 shadow-lg transition-all cursor-pointer touch-none select-none active:bg-rose-500 active:border-rose-100 active:text-white active:scale-95"
              title="Рывок Влево"
              style={{ touchAction: 'none' }}
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5] pointer-events-none" />
              <span className="text-[9px] font-mono font-black pointer-events-none">L</span>
            </button>

            {/* Dash Right */}
            <button
              id="touch-btn-dash-right"
              type="button"
              onPointerDown={handlePointerDown('dashRight', 'medium')}
              onPointerUp={handlePointerUp('dashRight')}
              onPointerCancel={handlePointerCancel('dashRight')}
              className="flex-1 h-full flex items-center justify-center gap-0.5 rounded-xl border bg-rose-950/90 border-rose-600/90 text-rose-200 shadow-lg transition-all cursor-pointer touch-none select-none active:bg-rose-500 active:border-rose-100 active:text-white active:scale-95"
              title="Рывок Вправо"
              style={{ touchAction: 'none' }}
            >
              <span className="text-[9px] font-mono font-black pointer-events-none">R</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] pointer-events-none" />
            </button>
          </div>
        </div>

        {/* PRIMARY JUMP BUTTON */}
        <button
          id="touch-btn-jump"
          type="button"
          onPointerDown={handlePointerDown('jump', 'light')}
          onPointerUp={handlePointerUp('jump')}
          onPointerCancel={handlePointerCancel('jump')}
          className="flex flex-col items-center justify-center w-[70px] sm:w-[78px] h-[70px] sm:h-[76px] rounded-2xl border-2 bg-cyan-950/90 border-cyan-500 text-cyan-200 shadow-2xl transition-all cursor-pointer shrink-0 touch-none select-none active:bg-cyan-500 active:border-white active:text-white active:scale-95"
          title="Прыжок"
          style={{ touchAction: 'none' }}
        >
          <ChevronUp className="w-8 h-8 pointer-events-none" />
          <span className="text-[10px] font-mono font-black tracking-wider pointer-events-none">ПРЫЖОК</span>
        </button>
      </div>
    </div>
  );
};

