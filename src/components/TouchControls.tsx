import React, { useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Zap, 
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
  // Active pressed keys set
  const activeKeysRef = useRef<Set<keyof ControlKeys>>(new Set());

  // Left & Right element refs for accurate continuous hit testing
  const leftZoneRef = useRef<HTMLDivElement | null>(null);
  const leftBtnRef = useRef<HTMLDivElement | null>(null);
  const rightBtnRef = useRef<HTMLDivElement | null>(null);

  // Right thumb buttons
  const dashBtnRef = useRef<HTMLButtonElement | null>(null);
  const jumpBtnRef = useRef<HTMLButtonElement | null>(null);

  // Swipe-to-Dash gesture detection on right zone
  const rightTouchStartRef = useRef<{ id: number; x: number; y: number; time: number } | null>(null);
  const lastJumpTapTimeRef = useRef<number>(0);

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

  const syncKeys = useCallback((newActiveKeys: Set<keyof ControlKeys>) => {
    const prev = activeKeysRef.current;
    
    // Released keys
    prev.forEach((key) => {
      if (!newActiveKeys.has(key)) {
        onKeyChange(key, false);
      }
    });

    // Newly pressed keys
    newActiveKeys.forEach((key) => {
      if (!prev.has(key)) {
        triggerHaptic('light');
        onKeyChange(key, true);
      }
    });

    activeKeysRef.current = newActiveKeys;
  }, [onKeyChange]);

  const triggerDashPulse = useCallback((dirKey: keyof ControlKeys = 'dash') => {
    triggerHaptic('medium');
    onKeyChange(dirKey, true);
    setTimeout(() => {
      onKeyChange(dirKey, false);
    }, 110);
  }, [onKeyChange]);

  // Spatial hit-test for active touches
  const hitTestKey = (clientX: number, clientY: number): keyof ControlKeys | null => {
    // 1. JUMP Button
    const jRect = jumpBtnRef.current?.getBoundingClientRect();
    if (jRect && clientX >= jRect.left - 10 && clientX <= jRect.right + 10 && clientY >= jRect.top - 10 && clientY <= jRect.bottom + 10) {
      return 'jump';
    }

    // 2. DASH Button
    const dRect = dashBtnRef.current?.getBoundingClientRect();
    if (dRect && clientX >= dRect.left - 10 && clientX <= dRect.right + 10 && clientY >= dRect.top - 10 && clientY <= dRect.bottom + 10) {
      return 'dash';
    }

    // 3. Left / Right Steer Pad (Continuous glide support)
    const leftPadRect = leftZoneRef.current?.getBoundingClientRect();
    if (leftPadRect && clientX >= leftPadRect.left - 12 && clientX <= leftPadRect.right + 12 && clientY >= leftPadRect.top - 12 && clientY <= leftPadRect.bottom + 12) {
      const mid = leftPadRect.left + leftPadRect.width / 2;
      return clientX < mid ? 'left' : 'right';
    }

    return null;
  };

  // Multi-touch handler
  const handleGlobalTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    const newKeys = new Set<keyof ControlKeys>();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];

      // Check swipe gesture on right side of screen
      if (dashBtnRef.current || jumpBtnRef.current) {
        const jRect = jumpBtnRef.current?.getBoundingClientRect();
        const dRect = dashBtnRef.current?.getBoundingClientRect();
        const rightBoundLeft = Math.min(jRect?.left || 9999, dRect?.left || 9999) - 30;

        if (touch.clientX >= rightBoundLeft) {
          if (!rightTouchStartRef.current || rightTouchStartRef.current.id !== touch.identifier) {
            rightTouchStartRef.current = {
              id: touch.identifier,
              x: touch.clientX,
              y: touch.clientY,
              time: performance.now(),
            };
          } else {
            const dx = touch.clientX - rightTouchStartRef.current.x;
            const dy = touch.clientY - rightTouchStartRef.current.y;
            const dist = Math.hypot(dx, dy);
            const duration = performance.now() - rightTouchStartRef.current.time;

            if (dist > 25 && duration < 240) {
              if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) triggerDashPulse('dashRight');
                else triggerDashPulse('dashLeft');
              } else {
                if (dy < 0) triggerDashPulse('dashUp');
                else triggerDashPulse('dashDown');
              }
              rightTouchStartRef.current = null;
            }
          }
        }
      }

      const key = hitTestKey(touch.clientX, touch.clientY);
      if (key) {
        newKeys.add(key);
      }
    }

    syncKeys(newKeys);
  };

  const handleGlobalTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const newKeys = new Set<keyof ControlKeys>();

    if (e.touches.length === 0) {
      rightTouchStartRef.current = null;
    }

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const key = hitTestKey(touch.clientX, touch.clientY);
      if (key) {
        newKeys.add(key);
      }
    }

    syncKeys(newKeys);
  };

  // Mouse handlers for desktop browser preview
  const handleMouseKey = (key: keyof ControlKeys, pressed: boolean) => (e: React.MouseEvent) => {
    e.preventDefault();
    const next = new Set(activeKeysRef.current);
    if (pressed) {
      next.add(key);
      triggerHaptic('light');
    } else {
      next.delete(key);
    }
    syncKeys(next);
  };

  const handleJumpClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const now = performance.now();
    // Double tap Jump -> Instant Dash forward
    if (now - lastJumpTapTimeRef.current < 260) {
      triggerDashPulse('dash');
    }
    lastJumpTapTimeRef.current = now;
  };

  const handleDashClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    triggerDashPulse('dash');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeKeysRef.current.forEach((k) => onKeyChange(k, false));
      activeKeysRef.current.clear();
    };
  }, [onKeyChange]);

  return (
    <div 
      id="touch-controls-container"
      onTouchStart={handleGlobalTouch}
      onTouchMove={handleGlobalTouch}
      onTouchEnd={handleGlobalTouchEnd}
      onTouchCancel={handleGlobalTouchEnd}
      className="w-full flex items-center justify-between px-3 py-1 select-none touch-none pointer-events-auto z-30"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* LEFT THUMB: Wide continuous steering pad (Left & Right) */}
      <div 
        ref={leftZoneRef}
        id="touch-move-zone"
        className="flex items-center gap-1.5 w-[165px] sm:w-[190px] h-[72px] sm:h-[80px] bg-zinc-950/95 p-1 rounded-2xl border-2 border-zinc-800 shadow-xl cursor-pointer shrink-0"
      >
        {/* Left Button */}
        <div
          ref={leftBtnRef}
          id="touch-btn-left"
          onMouseDown={handleMouseKey('left', true)}
          onMouseUp={handleMouseKey('left', false)}
          className={`flex-1 h-full flex flex-col items-center justify-center rounded-xl border transition-all ${
            activeKeysRef.current.has('left')
              ? 'bg-cyan-600 border-cyan-300 text-white shadow-lg scale-98 ring-2 ring-cyan-400/50'
              : 'bg-zinc-900/90 border-zinc-700/80 text-zinc-200'
          }`}
        >
          <ArrowLeft className="w-8 h-8" />
          <span className="text-[10px] font-mono font-bold text-zinc-300 tracking-wider">ВЛЕВО</span>
        </div>

        {/* Right Button */}
        <div
          ref={rightBtnRef}
          id="touch-btn-right"
          onMouseDown={handleMouseKey('right', true)}
          onMouseUp={handleMouseKey('right', false)}
          className={`flex-1 h-full flex flex-col items-center justify-center rounded-xl border transition-all ${
            activeKeysRef.current.has('right')
              ? 'bg-cyan-600 border-cyan-300 text-white shadow-lg scale-98 ring-2 ring-cyan-400/50'
              : 'bg-zinc-900/90 border-zinc-700/80 text-zinc-200'
          }`}
        >
          <ArrowRight className="w-8 h-8" />
          <span className="text-[10px] font-mono font-bold text-zinc-300 tracking-wider">ВПРАВО</span>
        </div>
      </div>

      {/* RIGHT THUMB: Clean Two-Button Layout (DASH + JUMP) */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* DASH BUTTON */}
        <button
          ref={dashBtnRef}
          id="touch-btn-main-dash"
          type="button"
          onClick={handleDashClick}
          onMouseDown={handleMouseKey('dash', true)}
          onMouseUp={handleMouseKey('dash', false)}
          className={`flex flex-col items-center justify-center w-[72px] sm:w-[80px] h-[72px] sm:h-[80px] rounded-2xl border-2 shadow-2xl transition-all active:scale-95 cursor-pointer ${
            activeKeysRef.current.has('dash')
              ? 'bg-rose-500 border-rose-200 text-white scale-98 shadow-rose-500/60 ring-2 ring-rose-400'
              : 'bg-rose-950/90 border-rose-600 text-rose-200'
          }`}
          title="Рывок"
        >
          <Zap className="w-7 h-7 fill-rose-300" />
          <span className="text-[10px] font-mono font-black tracking-wider">DASH</span>
        </button>

        {/* JUMP BUTTON */}
        <button
          ref={jumpBtnRef}
          id="touch-btn-jump"
          type="button"
          onClick={handleJumpClick}
          onMouseDown={handleMouseKey('jump', true)}
          onMouseUp={handleMouseKey('jump', false)}
          className={`flex flex-col items-center justify-center w-[76px] sm:w-[84px] h-[72px] sm:h-[80px] rounded-2xl border-2 shadow-2xl transition-all active:scale-95 cursor-pointer ${
            activeKeysRef.current.has('jump')
              ? 'bg-cyan-500 border-white text-white scale-98 shadow-cyan-500/60 ring-2 ring-cyan-300'
              : 'bg-cyan-950/90 border-cyan-500 text-cyan-200'
          }`}
          title="Прыжок"
        >
          <ChevronUp className="w-8 h-8" />
          <span className="text-[10px] font-mono font-black tracking-wider">ПРЫЖОК</span>
        </button>
      </div>
    </div>
  );
};
