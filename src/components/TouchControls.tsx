import React, { useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  ChevronUp, 
  Zap, 
  RotateCcw 
} from 'lucide-react';
import { ControlKeys } from '../types/game';
import { haptics } from '../utils/telegram';

interface TouchControlsProps {
  onKeyChange: (key: keyof ControlKeys, pressed: boolean) => void;
  onQuickRestart?: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ 
  onKeyChange,
  onQuickRestart,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const steerClusterRef = useRef<HTMLDivElement>(null);

  // Latest callback references to avoid re-subscribing DOM listeners
  const callbacksRef = useRef({ onKeyChange, onQuickRestart });
  callbacksRef.current = { onKeyChange, onQuickRestart };

  // Current aggregate pressed states: key -> boolean
  const pressedKeysRef = useRef<{ [K in keyof ControlKeys]?: boolean }>({
    left: false,
    right: false,
    jump: false,
    dash: false,
    dashUp: false,
  });

  // Active touch fingers mapping: touchIdentifier -> key | 'restart' | null
  const activeTouchesRef = useRef<Map<number, keyof ControlKeys | 'restart'>>(new Map());

  // Trigger crisp haptics safely
  const triggerHaptic = (style: 'light' | 'medium' = 'light') => {
    if (style === 'medium') {
      haptics.medium();
    } else {
      haptics.light();
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(style === 'medium' ? 22 : 12);
      } catch {}
    }
  };

  // Synchronously update button DOM elements for 0ms visual responsiveness
  const updateButtonVisual = (key: string, isActive: boolean) => {
    if (!containerRef.current) return;
    const btn = containerRef.current.querySelector(`[data-control-key="${key}"]`) as HTMLElement | null;
    if (btn) {
      if (isActive) {
        btn.setAttribute('data-active', 'true');
      } else {
        btn.removeAttribute('data-active');
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Helper: Find which control key is under the given screen coordinate
    const resolveKeyAtPoint = (x: number, y: number): keyof ControlKeys | 'restart' | null => {
      // 1. Check steer cluster first (allows fluid sliding between left and right)
      if (steerClusterRef.current) {
        const rect = steerClusterRef.current.getBoundingClientRect();
        // Expand hit-box slightly by 8px for generous thumb margins
        if (
          x >= rect.left - 8 &&
          x <= rect.right + 8 &&
          y >= rect.top - 12 &&
          y <= rect.bottom + 12
        ) {
          const midX = rect.left + rect.width * 0.5;
          return x < midX ? 'left' : 'right';
        }
      }

      // 2. Element hit-test via document.elementFromPoint
      const el = document.elementFromPoint(x, y);
      if (el) {
        const btn = el.closest('[data-control-key]') as HTMLElement | null;
        if (btn) {
          const key = btn.getAttribute('data-control-key') as keyof ControlKeys | null;
          if (key) return key;
        }

        const restartBtn = el.closest('[data-control-action="restart"]') as HTMLElement | null;
        if (restartBtn) return 'restart';
      }

      // 3. Distance-based fallback for action buttons (generous 14px expansion)
      const actionButtons = container.querySelectorAll('[data-control-key]');
      for (let i = 0; i < actionButtons.length; i++) {
        const btn = actionButtons[i] as HTMLElement;
        const key = btn.getAttribute('data-control-key') as keyof ControlKeys | null;
        if (!key || key === 'left' || key === 'right') continue;
        const rect = btn.getBoundingClientRect();
        if (
          x >= rect.left - 10 &&
          x <= rect.right + 10 &&
          y >= rect.top - 10 &&
          y <= rect.bottom + 10
        ) {
          return key;
        }
      }

      return null;
    };

    // Reconcile all currently active touches and dispatch state changes
    const reconcileTouches = (e: TouchEvent) => {
      const activeKeys = new Set<keyof ControlKeys>();
      let restartTriggered = false;

      // Update mapping for all active touches on the screen
      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        const key = resolveKeyAtPoint(touch.clientX, touch.clientY);
        
        if (key === 'restart') {
          if (!activeTouchesRef.current.has(touch.identifier)) {
            restartTriggered = true;
          }
          activeTouchesRef.current.set(touch.identifier, 'restart');
        } else if (key) {
          activeKeys.add(key);
          activeTouchesRef.current.set(touch.identifier, key);
        } else {
          activeTouchesRef.current.delete(touch.identifier);
        }
      }

      // Clean up touches that ended
      const currentTouchIds = new Set<number>();
      for (let i = 0; i < e.touches.length; i++) {
        currentTouchIds.add(e.touches[i].identifier);
      }
      for (const touchId of activeTouchesRef.current.keys()) {
        if (!currentTouchIds.has(touchId)) {
          activeTouchesRef.current.delete(touchId);
        }
      }

      // Quick restart action
      if (restartTriggered && typeof callbacksRef.current.onQuickRestart === 'function') {
        triggerHaptic('medium');
        callbacksRef.current.onQuickRestart();
      }

      // Diff against previous aggregate state
      const monitoredKeys: (keyof ControlKeys)[] = ['left', 'right', 'jump', 'dash', 'dashUp'];
      monitoredKeys.forEach((key) => {
        const isNowActive = activeKeys.has(key);
        const wasActive = Boolean(pressedKeysRef.current[key]);

        if (isNowActive !== wasActive) {
          pressedKeysRef.current[key] = isNowActive;
          callbacksRef.current.onKeyChange(key, isNowActive);
          updateButtonVisual(key, isNowActive);

          if (isNowActive) {
            triggerHaptic(key === 'dash' || key === 'dashUp' ? 'medium' : 'light');
          }
        }
      });
    };

    // Touch event handlers with explicit non-passive preventDefault
    const handleTouchStart = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      reconcileTouches(e);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      reconcileTouches(e);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      reconcileTouches(e);
    };

    const handleTouchCancel = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      reconcileTouches(e);
    };

    const handleResetAll = () => {
      activeTouchesRef.current.clear();
      const monitoredKeys: (keyof ControlKeys)[] = ['left', 'right', 'jump', 'dash', 'dashUp'];
      monitoredKeys.forEach((key) => {
        if (pressedKeysRef.current[key]) {
          pressedKeysRef.current[key] = false;
          callbacksRef.current.onKeyChange(key, false);
          updateButtonVisual(key, false);
        }
      });
    };

    // Attach native touch listeners to container
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    container.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    // Track finger sliding outside or lifting off-screen
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: false });
    window.addEventListener('blur', handleResetAll);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchCancel);

      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
      window.removeEventListener('blur', handleResetAll);
    };
  }, []);

  // Desktop Mouse / Pointer click fallback for non-touch dev testing
  const handlePointerDownFallback = (key: keyof ControlKeys | 'restart') => (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return; // Handled natively by touch listeners
    e.preventDefault();
    if (key === 'restart') {
      if (typeof callbacksRef.current.onQuickRestart === 'function') {
        triggerHaptic('medium');
        callbacksRef.current.onQuickRestart();
      }
      return;
    }

    if (!pressedKeysRef.current[key]) {
      pressedKeysRef.current[key] = true;
      callbacksRef.current.onKeyChange(key, true);
      updateButtonVisual(key, true);
      triggerHaptic(key === 'dash' || key === 'dashUp' ? 'medium' : 'light');
    }
  };

  const handlePointerUpFallback = (key: keyof ControlKeys | 'restart') => (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    e.preventDefault();
    if (key === 'restart') return;

    if (pressedKeysRef.current[key]) {
      pressedKeysRef.current[key] = false;
      callbacksRef.current.onKeyChange(key, false);
      updateButtonVisual(key, false);
    }
  };

  return (
    <div 
      id="touch-controls-container"
      ref={containerRef}
      className="w-full flex items-center justify-between px-1 py-0 select-none touch-none pointer-events-auto z-30"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* 1. LEFT THUMB: DUAL-DIRECTION STEERING CLUSTER (LEFT / RIGHT) */}
      <div 
        id="touch-steer-cluster"
        ref={steerClusterRef}
        data-zone="steer"
        className="flex items-center gap-1.5 w-[142px] sm:w-[160px] h-[72px] sm:h-[76px] bg-zinc-950/95 p-1 rounded-2xl border-2 border-zinc-800 shadow-xl select-none touch-none shrink-0"
        style={{ touchAction: 'none' }}
      >
        {/* Left Steering Button */}
        <button
          id="touch-btn-left"
          data-control-key="left"
          type="button"
          onPointerDown={handlePointerDownFallback('left')}
          onPointerUp={handlePointerUpFallback('left')}
          onPointerCancel={handlePointerUpFallback('left')}
          className="flex-1 h-full flex flex-col items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/90 text-zinc-300 transition-all select-none touch-none cursor-pointer data-[active=true]:bg-cyan-500 data-[active=true]:border-cyan-200 data-[active=true]:text-white data-[active=true]:scale-95 data-[active=true]:shadow-[0_0_15px_rgba(6,182,212,0.6)]"
          style={{ touchAction: 'none' }}
        >
          <ArrowLeft className="w-6 h-6 sm:w-7 sm:h-7 pointer-events-none stroke-[2.5]" />
          <span className="text-[9px] font-mono font-bold text-zinc-300 tracking-wider pointer-events-none">ВЛЕВО</span>
        </button>

        {/* Right Steering Button */}
        <button
          id="touch-btn-right"
          data-control-key="right"
          type="button"
          onPointerDown={handlePointerDownFallback('right')}
          onPointerUp={handlePointerUpFallback('right')}
          onPointerCancel={handlePointerUpFallback('right')}
          className="flex-1 h-full flex flex-col items-center justify-center rounded-xl border border-zinc-700/80 bg-zinc-900/90 text-zinc-300 transition-all select-none touch-none cursor-pointer data-[active=true]:bg-cyan-500 data-[active=true]:border-cyan-200 data-[active=true]:text-white data-[active=true]:scale-95 data-[active=true]:shadow-[0_0_15px_rgba(6,182,212,0.6)]"
          style={{ touchAction: 'none' }}
        >
          <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 pointer-events-none stroke-[2.5]" />
          <span className="text-[9px] font-mono font-bold text-zinc-300 tracking-wider pointer-events-none">ВПРАВО</span>
        </button>
      </div>

      {/* 2. CENTER: QUICK RETRY / RESTART BUTTON */}
      <div className="flex flex-col items-center justify-center px-1 shrink-0">
        <button
          id="touch-btn-quick-restart"
          data-control-action="restart"
          type="button"
          onPointerDown={handlePointerDownFallback('restart')}
          className="w-10 h-10 sm:w-11 sm:h-11 flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/90 text-zinc-400 hover:text-amber-300 active:text-amber-400 active:scale-90 active:bg-zinc-900 transition-all cursor-pointer shadow-lg select-none touch-none"
          title="Быстрый рестарт (R)"
          style={{ touchAction: 'none' }}
        >
          <RotateCcw className="w-4 h-4 pointer-events-none stroke-[2]" />
          <span className="text-[7px] font-mono font-semibold tracking-tighter text-zinc-400 pointer-events-none mt-0.5">РЕСЕТ</span>
        </button>
      </div>

      {/* 3. RIGHT THUMB: ACTION CLUSTER (JUMP + MAIN DASH + UP DASH) */}
      <div 
        id="touch-action-cluster"
        className="flex items-center gap-1.5 sm:gap-2 shrink-0 select-none touch-none"
        style={{ touchAction: 'none' }}
      >
        {/* DASH COLUMN: UP-DASH + PRIMARY DASH */}
        <div className="flex flex-col gap-1 w-[68px] sm:w-[74px] h-[72px] sm:h-[76px] justify-between">
          {/* UP DASH BUTTON */}
          <button
            id="touch-btn-dash-up"
            data-control-key="dashUp"
            type="button"
            onPointerDown={handlePointerDownFallback('dashUp')}
            onPointerUp={handlePointerUpFallback('dashUp')}
            onPointerCancel={handlePointerUpFallback('dashUp')}
            className="w-full h-[25px] sm:h-[27px] flex items-center justify-center gap-1 rounded-lg border border-rose-600/70 bg-rose-950/80 text-rose-300 shadow-md transition-all select-none touch-none cursor-pointer data-[active=true]:bg-rose-500 data-[active=true]:border-white data-[active=true]:text-white data-[active=true]:scale-95 data-[active=true]:shadow-[0_0_12px_rgba(244,63,94,0.7)]"
            title="Рывок вверх"
            style={{ touchAction: 'none' }}
          >
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5] pointer-events-none" />
            <span className="text-[8px] font-mono font-black tracking-wider pointer-events-none">ВВЕРХ</span>
          </button>

          {/* PRIMARY DASH BUTTON (Dashes in held direction, or facing direction) */}
          <button
            id="touch-btn-dash"
            data-control-key="dash"
            type="button"
            onPointerDown={handlePointerDownFallback('dash')}
            onPointerUp={handlePointerUpFallback('dash')}
            onPointerCancel={handlePointerUpFallback('dash')}
            className="w-full flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-rose-500/90 bg-gradient-to-b from-rose-950/95 to-rose-900/90 text-rose-100 shadow-xl transition-all select-none touch-none cursor-pointer data-[active=true]:bg-rose-500 data-[active=true]:border-white data-[active=true]:text-white data-[active=true]:scale-95 data-[active=true]:shadow-[0_0_18px_rgba(244,63,94,0.85)]"
            title="Рывок (Dash)"
            style={{ touchAction: 'none' }}
          >
            <Zap className="w-5 h-5 pointer-events-none stroke-[2.5] text-rose-300" />
            <span className="text-[9px] font-mono font-black tracking-wider pointer-events-none text-rose-200">РЫВОК</span>
          </button>
        </div>

        {/* PRIMARY JUMP BUTTON (LARGE & PROMINENT) */}
        <button
          id="touch-btn-jump"
          data-control-key="jump"
          type="button"
          onPointerDown={handlePointerDownFallback('jump')}
          onPointerUp={handlePointerUpFallback('jump')}
          onPointerCancel={handlePointerUpFallback('jump')}
          className="w-[72px] sm:w-[78px] h-[72px] sm:h-[76px] flex flex-col items-center justify-center rounded-2xl border-2 border-cyan-400/90 bg-gradient-to-b from-cyan-950/95 to-cyan-900/90 text-cyan-100 shadow-2xl transition-all select-none touch-none cursor-pointer data-[active=true]:bg-cyan-400 data-[active=true]:border-white data-[active=true]:text-zinc-950 data-[active=true]:scale-95 data-[active=true]:shadow-[0_0_22px_rgba(34,211,238,0.9)]"
          title="Прыжок (Space)"
          style={{ touchAction: 'none' }}
        >
          <ChevronUp className="w-8 h-8 pointer-events-none stroke-[3] text-cyan-300" />
          <span className="text-[10px] font-mono font-black tracking-widest pointer-events-none text-cyan-200">ПРЫЖОК</span>
        </button>
      </div>
    </div>
  );
};
