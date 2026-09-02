import React, { useRef, useEffect, useCallback } from 'react';
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
  // DOM element refs for direct event listeners and visual styling
  const containerRef = useRef<HTMLDivElement | null>(null);
  const steerPadRef = useRef<HTMLDivElement | null>(null);
  const leftVisualRef = useRef<HTMLDivElement | null>(null);
  const rightVisualRef = useRef<HTMLDivElement | null>(null);

  const dashUpBtnRef = useRef<HTMLButtonElement | null>(null);
  const dashLeftBtnRef = useRef<HTMLButtonElement | null>(null);
  const dashRightBtnRef = useRef<HTMLButtonElement | null>(null);
  const jumpBtnRef = useRef<HTMLButtonElement | null>(null);

  // Key states ref to avoid redundant notifications
  const keyStatesRef = useRef<{ [K in keyof ControlKeys]?: boolean }>({});
  
  // Active touches tracking map: touchId -> action/key
  const steerTouchIdRef = useRef<number | null>(null);
  const activeTouchKeysRef = useRef<Map<number, keyof ControlKeys>>(new Map());

  const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
    if (style === 'medium') {
      haptics.medium();
    } else {
      haptics.light();
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(style === 'medium' ? 22 : 10);
      } catch {}
    }
  };

  // Safe key updater that only notifies when state actually changes
  const setKey = useCallback((key: keyof ControlKeys, pressed: boolean) => {
    if (keyStatesRef.current[key] !== pressed) {
      keyStatesRef.current[key] = pressed;
      onKeyChange(key, pressed);
    }
  }, [onKeyChange]);

  // Visual helper
  const updateVisual = (el: HTMLElement | null, active: boolean, activeClasses: string[], inactiveClasses: string[]) => {
    if (!el) return;
    if (active) {
      el.classList.add(...activeClasses);
      el.classList.remove(...inactiveClasses);
    } else {
      el.classList.remove(...activeClasses);
      el.classList.add(...inactiveClasses);
    }
  };

  // --- Attach non-passive native listeners for guaranteed 0ms response and no scroll interference ---
  useEffect(() => {
    const pad = steerPadRef.current;
    const jumpBtn = jumpBtnRef.current;
    const dashUpBtn = dashUpBtnRef.current;
    const dashLeftBtn = dashLeftBtnRef.current;
    const dashRightBtn = dashRightBtnRef.current;

    // STEERING TOUCH LOGIC
    const handleSteerUpdate = (clientX: number) => {
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      const isLeft = clientX < mid;

      setKey('left', isLeft);
      setKey('right', !isLeft);

      updateVisual(leftVisualRef.current, isLeft, 
        ['bg-cyan-600', 'border-cyan-300', 'text-white', 'shadow-lg', 'scale-95', 'ring-2', 'ring-cyan-400/60'], 
        ['bg-zinc-900/95', 'border-zinc-700/80', 'text-zinc-200']
      );
      updateVisual(rightVisualRef.current, !isLeft, 
        ['bg-cyan-600', 'border-cyan-300', 'text-white', 'shadow-lg', 'scale-95', 'ring-2', 'ring-cyan-400/60'], 
        ['bg-zinc-900/95', 'border-zinc-700/80', 'text-zinc-200']
      );
    };

    const handleSteerClear = () => {
      steerTouchIdRef.current = null;
      setKey('left', false);
      setKey('right', false);

      updateVisual(leftVisualRef.current, false, 
        ['bg-cyan-600', 'border-cyan-300', 'text-white', 'shadow-lg', 'scale-95', 'ring-2', 'ring-cyan-400/60'], 
        ['bg-zinc-900/95', 'border-zinc-700/80', 'text-zinc-200']
      );
      updateVisual(rightVisualRef.current, false, 
        ['bg-cyan-600', 'border-cyan-300', 'text-white', 'shadow-lg', 'scale-95', 'ring-2', 'ring-cyan-400/60'], 
        ['bg-zinc-900/95', 'border-zinc-700/80', 'text-zinc-200']
      );
    };

    const onSteerStart = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const touch = e.changedTouches[0];
      if (!touch) return;
      steerTouchIdRef.current = touch.identifier;
      triggerHaptic('light');
      handleSteerUpdate(touch.clientX);
    };

    const onSteerMove = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (steerTouchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === steerTouchIdRef.current) {
          handleSteerUpdate(touch.clientX);
          break;
        }
      }
    };

    const onSteerEnd = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (steerTouchIdRef.current === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === steerTouchIdRef.current) {
          handleSteerClear();
          break;
        }
      }
    };

    if (pad) {
      pad.addEventListener('touchstart', onSteerStart, { passive: false });
      pad.addEventListener('touchmove', onSteerMove, { passive: false });
      pad.addEventListener('touchend', onSteerEnd, { passive: false });
      pad.addEventListener('touchcancel', onSteerEnd, { passive: false });
    }

    // BUTTON TOUCH BINDINGS HELPER
    const bindButtonTouch = (
      btn: HTMLElement | null, 
      key: keyof ControlKeys, 
      hapticStyle: 'light' | 'medium',
      activeClasses: string[], 
      inactiveClasses: string[]
    ) => {
      if (!btn) return () => {};

      const onStart = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const touch = e.changedTouches[0];
        if (touch) {
          activeTouchKeysRef.current.set(touch.identifier, key);
        }
        triggerHaptic(hapticStyle);
        setKey(key, true);
        updateVisual(btn, true, activeClasses, inactiveClasses);
      };

      const onEnd = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        for (let i = 0; i < e.changedTouches.length; i++) {
          activeTouchKeysRef.current.delete(e.changedTouches[i].identifier);
        }
        setKey(key, false);
        updateVisual(btn, false, activeClasses, inactiveClasses);
      };

      btn.addEventListener('touchstart', onStart, { passive: false });
      btn.addEventListener('touchend', onEnd, { passive: false });
      btn.addEventListener('touchcancel', onEnd, { passive: false });

      return () => {
        btn.removeEventListener('touchstart', onStart);
        btn.removeEventListener('touchend', onEnd);
        btn.removeEventListener('touchcancel', onEnd);
      };
    };

    const unbindJump = bindButtonTouch(
      jumpBtn, 
      'jump', 
      'light',
      ['bg-cyan-500', 'border-white', 'text-white', 'scale-95', 'shadow-cyan-500/70', 'ring-2', 'ring-cyan-300'],
      ['bg-cyan-950/90', 'border-cyan-500', 'text-cyan-200']
    );

    const unbindDashUp = bindButtonTouch(
      dashUpBtn, 
      'dashUp', 
      'medium',
      ['bg-rose-500', 'border-rose-100', 'text-white', 'scale-95', 'shadow-rose-500/70', 'ring-2', 'ring-rose-400'],
      ['bg-rose-950/90', 'border-rose-600/90', 'text-rose-200']
    );

    const unbindDashLeft = bindButtonTouch(
      dashLeftBtn, 
      'dashLeft', 
      'medium',
      ['bg-rose-500', 'border-rose-100', 'text-white', 'scale-95', 'shadow-rose-500/70', 'ring-2', 'ring-rose-400'],
      ['bg-rose-950/90', 'border-rose-600/90', 'text-rose-200']
    );

    const unbindDashRight = bindButtonTouch(
      dashRightBtn, 
      'dashRight', 
      'medium',
      ['bg-rose-500', 'border-rose-100', 'text-white', 'scale-95', 'shadow-rose-500/70', 'ring-2', 'ring-rose-400'],
      ['bg-rose-950/90', 'border-rose-600/90', 'text-rose-200']
    );

    return () => {
      if (pad) {
        pad.removeEventListener('touchstart', onSteerStart);
        pad.removeEventListener('touchmove', onSteerMove);
        pad.removeEventListener('touchend', onSteerEnd);
        pad.removeEventListener('touchcancel', onSteerEnd);
      }
      unbindJump();
      unbindDashUp();
      unbindDashLeft();
      unbindDashRight();
      // Reset all keys on unmount
      (['left', 'right', 'jump', 'dash', 'dashUp', 'dashLeft', 'dashRight', 'up', 'down'] as (keyof ControlKeys)[]).forEach((k) => {
        onKeyChange(k, false);
      });
    };
  }, [setKey, onKeyChange]);

  // Desktop Mouse Handlers
  const handleMouseSteer = (key: 'left' | 'right', pressed: boolean) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (pressed) triggerHaptic('light');
    setKey(key, pressed);
  };

  const handleMouseButton = (key: keyof ControlKeys, pressed: boolean, haptic: 'light' | 'medium') => (e: React.MouseEvent) => {
    e.preventDefault();
    if (pressed) triggerHaptic(haptic);
    setKey(key, pressed);
  };

  return (
    <div 
      ref={containerRef}
      id="touch-controls-container"
      className="w-full flex items-center justify-between px-1.5 py-0.5 select-none touch-none pointer-events-auto z-30"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* LEFT THUMB: Continuous horizontal steering pad (Left & Right) */}
      <div 
        ref={steerPadRef}
        id="touch-steer-pad"
        className="flex items-center gap-1.5 w-[140px] sm:w-[165px] h-[72px] sm:h-[78px] bg-zinc-950/95 p-1 rounded-2xl border-2 border-zinc-800 shadow-xl cursor-pointer shrink-0 select-none touch-none"
        style={{ touchAction: 'none' }}
      >
        {/* Left Button Visual */}
        <div
          ref={leftVisualRef}
          id="touch-btn-left"
          onMouseDown={handleMouseSteer('left', true)}
          onMouseUp={handleMouseSteer('left', false)}
          onMouseLeave={handleMouseSteer('left', false)}
          className="flex-1 h-full flex flex-col items-center justify-center rounded-xl border bg-zinc-900/95 border-zinc-700/80 text-zinc-200 transition-all pointer-events-auto select-none"
        >
          <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 pointer-events-none" />
          <span className="text-[9px] font-mono font-bold text-zinc-300 tracking-wider pointer-events-none">ВЛЕВО</span>
        </div>

        {/* Right Button Visual */}
        <div
          ref={rightVisualRef}
          id="touch-btn-right"
          onMouseDown={handleMouseSteer('right', true)}
          onMouseUp={handleMouseSteer('right', false)}
          onMouseLeave={handleMouseSteer('right', false)}
          className="flex-1 h-full flex flex-col items-center justify-center rounded-xl border bg-zinc-900/95 border-zinc-700/80 text-zinc-200 transition-all pointer-events-auto select-none"
        >
          <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 pointer-events-none" />
          <span className="text-[9px] font-mono font-bold text-zinc-300 tracking-wider pointer-events-none">ВПРАВО</span>
        </div>
      </div>

      {/* RIGHT THUMB: 3 DASH BUTTONS (Left, Up, Right) + JUMP */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 select-none touch-none">
        {/* 3 Dash Buttons Cluster */}
        <div className="flex flex-col gap-1 w-[110px] sm:w-[124px] h-[72px] sm:h-[78px] justify-between">
          {/* Top Row: DASH UP */}
          <button
            ref={dashUpBtnRef}
            id="touch-btn-dash-up"
            type="button"
            onMouseDown={handleMouseButton('dashUp', true, 'medium')}
            onMouseUp={handleMouseButton('dashUp', false, 'medium')}
            onMouseLeave={handleMouseButton('dashUp', false, 'medium')}
            className="flex items-center justify-center gap-1 w-full h-[33px] sm:h-[36px] rounded-xl border bg-rose-950/90 border-rose-600/90 text-rose-200 shadow-lg transition-all cursor-pointer touch-none select-none"
            title="Рывок Вверх"
            style={{ touchAction: 'none' }}
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5] pointer-events-none" />
            <span className="text-[9px] font-mono font-black tracking-wider pointer-events-none">ВВЕРХ</span>
          </button>

          {/* Bottom Row: DASH LEFT & DASH RIGHT */}
          <div className="flex items-center gap-1 w-full h-[33px] sm:h-[36px]">
            {/* Dash Left */}
            <button
              ref={dashLeftBtnRef}
              id="touch-btn-dash-left"
              type="button"
              onMouseDown={handleMouseButton('dashLeft', true, 'medium')}
              onMouseUp={handleMouseButton('dashLeft', false, 'medium')}
              onMouseLeave={handleMouseButton('dashLeft', false, 'medium')}
              className="flex-1 h-full flex items-center justify-center gap-0.5 rounded-xl border bg-rose-950/90 border-rose-600/90 text-rose-200 shadow-lg transition-all cursor-pointer touch-none select-none"
              title="Рывок Влево"
              style={{ touchAction: 'none' }}
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5] pointer-events-none" />
              <span className="text-[9px] font-mono font-black pointer-events-none">L</span>
            </button>

            {/* Dash Right */}
            <button
              ref={dashRightBtnRef}
              id="touch-btn-dash-right"
              type="button"
              onMouseDown={handleMouseButton('dashRight', true, 'medium')}
              onMouseUp={handleMouseButton('dashRight', false, 'medium')}
              onMouseLeave={handleMouseButton('dashRight', false, 'medium')}
              className="flex-1 h-full flex items-center justify-center gap-0.5 rounded-xl border bg-rose-950/90 border-rose-600/90 text-rose-200 shadow-lg transition-all cursor-pointer touch-none select-none"
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
          ref={jumpBtnRef}
          id="touch-btn-jump"
          type="button"
          onMouseDown={handleMouseButton('jump', true, 'light')}
          onMouseUp={handleMouseButton('jump', false, 'light')}
          onMouseLeave={handleMouseButton('jump', false, 'light')}
          className="flex flex-col items-center justify-center w-[72px] sm:w-[80px] h-[72px] sm:h-[78px] rounded-2xl border-2 bg-cyan-950/90 border-cyan-500 text-cyan-200 shadow-2xl transition-all cursor-pointer shrink-0 touch-none select-none"
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
