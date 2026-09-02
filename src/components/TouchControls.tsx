import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  // Pressed visual states for immediate visual feedback
  const [isLeftActive, setIsLeftActive] = useState(false);
  const [isRightActive, setIsRightActive] = useState(false);
  const [isJumpActive, setIsJumpActive] = useState(false);
  const [isDashUpActive, setIsDashUpActive] = useState(false);
  const [isDashLeftActive, setIsDashLeftActive] = useState(false);
  const [isDashRightActive, setIsDashRightActive] = useState(false);

  // Active key state tracking ref
  const activeKeysRef = useRef<{ [K in keyof ControlKeys]?: boolean }>({});
  const steerTouchIdRef = useRef<number | null>(null);
  const steerZoneRef = useRef<HTMLDivElement | null>(null);

  const setKeyState = useCallback((key: keyof ControlKeys, pressed: boolean) => {
    if (activeKeysRef.current[key] !== pressed) {
      activeKeysRef.current[key] = pressed;
      onKeyChange(key, pressed);
    }
  }, [onKeyChange]);

  const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
    if (style === 'medium') {
      haptics.medium();
    } else {
      haptics.light();
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(style === 'medium' ? 24 : 10);
      } catch {}
    }
  };

  // --- STEERING (LEFT / RIGHT) WITH CONTINUOUS SLIDE ---
  const updateSteerFromCoord = useCallback((clientX: number) => {
    if (!steerZoneRef.current) return;
    const rect = steerZoneRef.current.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;

    if (clientX < midX) {
      setKeyState('left', true);
      setKeyState('right', false);
      setIsLeftActive(true);
      setIsRightActive(false);
    } else {
      setKeyState('left', false);
      setKeyState('right', true);
      setIsLeftActive(false);
      setIsRightActive(true);
    }
  }, [setKeyState]);

  const handleSteerTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const touch = e.changedTouches[0];
    if (!touch) return;

    steerTouchIdRef.current = touch.identifier;
    triggerHaptic('light');
    updateSteerFromCoord(touch.clientX);
  };

  const handleSteerTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (steerTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === steerTouchIdRef.current) {
        updateSteerFromCoord(touch.clientX);
        break;
      }
    }
  };

  const handleSteerTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (steerTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === steerTouchIdRef.current) {
        steerTouchIdRef.current = null;
        setKeyState('left', false);
        setKeyState('right', false);
        setIsLeftActive(false);
        setIsRightActive(false);
        break;
      }
    }
  };

  // --- JUMP ACTION ---
  const handleJumpStart = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic('light');
    setIsJumpActive(true);
    setKeyState('jump', true);
  };

  const handleJumpEnd = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsJumpActive(false);
    setKeyState('jump', false);
  };

  // --- DASH ACTIONS (UP, LEFT, RIGHT) ---
  const triggerDash = useCallback((dir: 'dashUp' | 'dashLeft' | 'dashRight') => {
    triggerHaptic('medium');
    if (dir === 'dashUp') setIsDashUpActive(true);
    if (dir === 'dashLeft') setIsDashLeftActive(true);
    if (dir === 'dashRight') setIsDashRightActive(true);

    setKeyState(dir, true);
    setTimeout(() => {
      setKeyState(dir, false);
      if (dir === 'dashUp') setIsDashUpActive(false);
      if (dir === 'dashLeft') setIsDashLeftActive(false);
      if (dir === 'dashRight') setIsDashRightActive(false);
    }, 120);
  }, [setKeyState]);

  const handleDashTouchStart = (dir: 'dashUp' | 'dashLeft' | 'dashRight') => (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerDash(dir);
  };

  // Mouse handlers for desktop browser preview
  const handleMouseSteerDown = (key: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    triggerHaptic('light');
    setKeyState(key, true);
    if (key === 'left') setIsLeftActive(true);
    if (key === 'right') setIsRightActive(true);
  };

  const handleMouseSteerUp = (key: 'left' | 'right') => (e: React.MouseEvent) => {
    e.preventDefault();
    setKeyState(key, false);
    if (key === 'left') setIsLeftActive(false);
    if (key === 'right') setIsRightActive(false);
  };

  // Safety window cleanup for touch cancellations
  useEffect(() => {
    const handleGlobalTouchCancel = () => {
      steerTouchIdRef.current = null;
      setKeyState('left', false);
      setKeyState('right', false);
      setKeyState('jump', false);
      setKeyState('dashUp', false);
      setKeyState('dashLeft', false);
      setKeyState('dashRight', false);
      setIsLeftActive(false);
      setIsRightActive(false);
      setIsJumpActive(false);
      setIsDashUpActive(false);
      setIsDashLeftActive(false);
      setIsDashRightActive(false);
    };

    window.addEventListener('touchend', handleGlobalTouchCancel, { passive: true });
    window.addEventListener('touchcancel', handleGlobalTouchCancel, { passive: true });
    window.addEventListener('mouseup', handleGlobalTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchend', handleGlobalTouchCancel);
      window.removeEventListener('touchcancel', handleGlobalTouchCancel);
      window.removeEventListener('mouseup', handleGlobalTouchCancel);
      // Clear all keys on unmount
      (['left', 'right', 'jump', 'dash', 'dashUp', 'dashLeft', 'dashRight'] as (keyof ControlKeys)[]).forEach((k) => {
        onKeyChange(k, false);
      });
    };
  }, [onKeyChange, setKeyState]);

  return (
    <div 
      id="touch-controls-container"
      className="w-full flex items-center justify-between px-2 py-1 select-none touch-none pointer-events-auto z-30"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* LEFT THUMB: Continuous horizontal steering pad (Left & Right) */}
      <div 
        ref={steerZoneRef}
        id="touch-steer-pad"
        onTouchStart={handleSteerTouchStart}
        onTouchMove={handleSteerTouchMove}
        onTouchEnd={handleSteerTouchEnd}
        onTouchCancel={handleSteerTouchEnd}
        className="flex items-center gap-1.5 w-[140px] sm:w-[165px] h-[74px] sm:h-[80px] bg-zinc-950/95 p-1 rounded-2xl border-2 border-zinc-800 shadow-xl cursor-pointer shrink-0 select-none touch-none"
        style={{ touchAction: 'none' }}
      >
        {/* Left Button Visual */}
        <div
          id="touch-btn-left"
          onMouseDown={handleMouseSteerDown('left')}
          onMouseUp={handleMouseSteerUp('left')}
          className={`flex-1 h-full flex flex-col items-center justify-center rounded-xl border transition-all pointer-events-auto ${
            isLeftActive
              ? 'bg-cyan-600 border-cyan-300 text-white shadow-lg scale-95 ring-2 ring-cyan-400/50'
              : 'bg-zinc-900/90 border-zinc-700/80 text-zinc-200'
          }`}
        >
          <ArrowLeft className="w-7 h-7" />
          <span className="text-[9px] font-mono font-bold text-zinc-300 tracking-wider">ВЛЕВО</span>
        </div>

        {/* Right Button Visual */}
        <div
          id="touch-btn-right"
          onMouseDown={handleMouseSteerDown('right')}
          onMouseUp={handleMouseSteerUp('right')}
          className={`flex-1 h-full flex flex-col items-center justify-center rounded-xl border transition-all pointer-events-auto ${
            isRightActive
              ? 'bg-cyan-600 border-cyan-300 text-white shadow-lg scale-95 ring-2 ring-cyan-400/50'
              : 'bg-zinc-900/90 border-zinc-700/80 text-zinc-200'
          }`}
        >
          <ArrowRight className="w-7 h-7" />
          <span className="text-[9px] font-mono font-bold text-zinc-300 tracking-wider">ВПРАВО</span>
        </div>
      </div>

      {/* RIGHT THUMB: 3 DASH BUTTONS (Left, Up, Right) + JUMP */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 select-none touch-none">
        {/* 3 Dash Buttons Cluster */}
        <div className="flex flex-col gap-1 w-[110px] sm:w-[124px] h-[74px] sm:h-[80px] justify-between">
          {/* Top Row: DASH UP */}
          <button
            id="touch-btn-dash-up"
            type="button"
            onTouchStart={handleDashTouchStart('dashUp')}
            onMouseDown={handleDashTouchStart('dashUp')}
            className={`flex items-center justify-center gap-1 w-full h-[34px] sm:h-[37px] rounded-xl border shadow-lg transition-all active:scale-95 cursor-pointer touch-none select-none ${
              isDashUpActive
                ? 'bg-rose-500 border-rose-200 text-white scale-95 shadow-rose-500/60 ring-2 ring-rose-400'
                : 'bg-rose-950/90 border-rose-600/90 text-rose-200'
            }`}
            title="Рывок Вверх"
            style={{ touchAction: 'none' }}
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            <span className="text-[9px] font-mono font-black tracking-wider">ВВЕРХ</span>
          </button>

          {/* Bottom Row: DASH LEFT & DASH RIGHT */}
          <div className="flex items-center gap-1 w-full h-[34px] sm:h-[37px]">
            {/* Dash Left */}
            <button
              id="touch-btn-dash-left"
              type="button"
              onTouchStart={handleDashTouchStart('dashLeft')}
              onMouseDown={handleDashTouchStart('dashLeft')}
              className={`flex-1 h-full flex items-center justify-center gap-0.5 rounded-xl border shadow-lg transition-all active:scale-95 cursor-pointer touch-none select-none ${
                isDashLeftActive
                  ? 'bg-rose-500 border-rose-200 text-white scale-95 shadow-rose-500/60 ring-2 ring-rose-400'
                  : 'bg-rose-950/90 border-rose-600/90 text-rose-200'
              }`}
              title="Рывок Влево"
              style={{ touchAction: 'none' }}
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="text-[9px] font-mono font-black">L</span>
            </button>

            {/* Dash Right */}
            <button
              id="touch-btn-dash-right"
              type="button"
              onTouchStart={handleDashTouchStart('dashRight')}
              onMouseDown={handleDashTouchStart('dashRight')}
              className={`flex-1 h-full flex items-center justify-center gap-0.5 rounded-xl border shadow-lg transition-all active:scale-95 cursor-pointer touch-none select-none ${
                isDashRightActive
                  ? 'bg-rose-500 border-rose-200 text-white scale-95 shadow-rose-500/60 ring-2 ring-rose-400'
                  : 'bg-rose-950/90 border-rose-600/90 text-rose-200'
              }`}
              title="Рывок Вправо"
              style={{ touchAction: 'none' }}
            >
              <span className="text-[9px] font-mono font-black">R</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* PRIMARY JUMP BUTTON */}
        <button
          id="touch-btn-jump"
          type="button"
          onTouchStart={handleJumpStart}
          onTouchEnd={handleJumpEnd}
          onTouchCancel={handleJumpEnd}
          onMouseDown={handleJumpStart}
          onMouseUp={handleJumpEnd}
          onMouseLeave={handleJumpEnd}
          className={`flex flex-col items-center justify-center w-[74px] sm:w-[82px] h-[74px] sm:h-[80px] rounded-2xl border-2 shadow-2xl transition-all active:scale-95 cursor-pointer shrink-0 touch-none select-none ${
            isJumpActive
              ? 'bg-cyan-500 border-white text-white scale-95 shadow-cyan-500/60 ring-2 ring-cyan-300'
              : 'bg-cyan-950/90 border-cyan-500 text-cyan-200'
          }`}
          title="Прыжок"
          style={{ touchAction: 'none' }}
        >
          <ChevronUp className="w-8 h-8" />
          <span className="text-[10px] font-mono font-black tracking-wider">ПРЫЖОК</span>
        </button>
      </div>
    </div>
  );
};
