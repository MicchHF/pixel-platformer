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
  Gamepad2,
  Sparkles
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
  const [controlLayout, setControlLayout] = useState<'ergonomic' | 'joystick' | 'classic'>('ergonomic');
  
  // Track active keys
  const activeKeysRef = useRef<Set<keyof ControlKeys>>(new Set());

  // Element DOM references for accurate spatial hit testing on touches
  const leftZoneRef = useRef<HTMLDivElement | null>(null);
  const leftBtnRef = useRef<HTMLDivElement | null>(null);
  const rightBtnRef = useRef<HTMLDivElement | null>(null);
  const upBtnRef = useRef<HTMLButtonElement | null>(null);
  const downBtnRef = useRef<HTMLButtonElement | null>(null);
  const restartBtnRef = useRef<HTMLButtonElement | null>(null);

  const rightActionZoneRef = useRef<HTMLDivElement | null>(null);
  const jumpBtnRef = useRef<HTMLButtonElement | null>(null);
  const mainDashBtnRef = useRef<HTMLButtonElement | null>(null);
  const dashLeftBtnRef = useRef<HTMLButtonElement | null>(null);
  const dashUpBtnRef = useRef<HTMLButtonElement | null>(null);
  const dashRightBtnRef = useRef<HTMLButtonElement | null>(null);
  const dashDownBtnRef = useRef<HTMLButtonElement | null>(null);

  // Joystick touch tracking
  const joystickBaseRef = useRef<HTMLDivElement | null>(null);
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState<boolean>(false);

  // Swipe-to-Dash gesture tracking on right thumb
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
    
    // Deactivated keys
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
    }, 120);
  }, [onKeyChange]);

  // Spatial hit-test for a touch coordinate
  const hitTestKey = (clientX: number, clientY: number): keyof ControlKeys | 'restart' | 'dash_swipe' | null => {
    // 1. Restart Button
    const rstRect = restartBtnRef.current?.getBoundingClientRect();
    if (rstRect && clientX >= rstRect.left && clientX <= rstRect.right && clientY >= rstRect.top && clientY <= rstRect.bottom) {
      return 'restart';
    }

    // 2. Jump Button (Large forgiving bounding box for responsiveness)
    const jRect = jumpBtnRef.current?.getBoundingClientRect();
    if (jRect && clientX >= jRect.left - 12 && clientX <= jRect.right + 12 && clientY >= jRect.top - 12 && clientY <= jRect.bottom + 12) {
      return 'jump';
    }

    // 3. Main Easy-Dash Button
    const mdRect = mainDashBtnRef.current?.getBoundingClientRect();
    if (mdRect && clientX >= mdRect.left - 8 && clientX <= mdRect.right + 8 && clientY >= mdRect.top - 8 && clientY <= mdRect.bottom + 8) {
      return 'dash';
    }

    // 4. Directional Dash Cluster
    const dLRect = dashLeftBtnRef.current?.getBoundingClientRect();
    if (dLRect && clientX >= dLRect.left && clientX <= dLRect.right && clientY >= dLRect.top && clientY <= dLRect.bottom) return 'dashLeft';
    const dURect = dashUpBtnRef.current?.getBoundingClientRect();
    if (dURect && clientX >= dURect.left && clientX <= dURect.right && clientY >= dURect.top && clientY <= dURect.bottom) return 'dashUp';
    const dRRect = dashRightBtnRef.current?.getBoundingClientRect();
    if (dRRect && clientX >= dRRect.left && clientX <= dRRect.right && clientY >= dRRect.top && clientY <= dRRect.bottom) return 'dashRight';
    const dDRect = dashDownBtnRef.current?.getBoundingClientRect();
    if (dDRect && clientX >= dDRect.left && clientX <= dDRect.right && clientY >= dDRect.top && clientY <= dDRect.bottom) return 'dashDown';

    // 5. Left Thumb Movement Pad (Ergonomic Swipe Bar)
    const leftPadRect = leftZoneRef.current?.getBoundingClientRect();
    if (leftPadRect && clientX >= leftPadRect.left - 8 && clientX <= leftPadRect.right + 8 && clientY >= leftPadRect.top - 8 && clientY <= leftPadRect.bottom + 8) {
      const mid = leftPadRect.left + leftPadRect.width / 2;
      return clientX < mid ? 'left' : 'right';
    }

    // 6. Up / Down auxiliary buttons
    const uRect = upBtnRef.current?.getBoundingClientRect();
    if (uRect && clientX >= uRect.left && clientX <= uRect.right && clientY >= uRect.top && clientY <= uRect.bottom) return 'up';
    const dRect = downBtnRef.current?.getBoundingClientRect();
    if (dRect && clientX >= dRect.left && clientX <= dRect.right && clientY >= dRect.top && clientY <= dRect.bottom) return 'down';

    return null;
  };

  // Process all active touches on the screen
  const handleGlobalTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    const newKeys = new Set<keyof ControlKeys>();

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];

      // Check for Swipe-to-Dash gesture on the right half
      if (rightActionZoneRef.current) {
        const rightRect = rightActionZoneRef.current.getBoundingClientRect();
        if (touch.clientX >= rightRect.left && touch.clientX <= rightRect.right + 20 && touch.clientY >= rightRect.top - 20 && touch.clientY <= rightRect.bottom + 20) {
          if (!rightTouchStartRef.current || rightTouchStartRef.current.id !== touch.identifier) {
            rightTouchStartRef.current = {
              id: touch.identifier,
              x: touch.clientX,
              y: touch.clientY,
              time: performance.now(),
            };
          } else {
            // Check swipe distance
            const dx = touch.clientX - rightTouchStartRef.current.x;
            const dy = touch.clientY - rightTouchStartRef.current.y;
            const dist = Math.hypot(dx, dy);
            const duration = performance.now() - rightTouchStartRef.current.time;

            if (dist > 22 && duration < 240) {
              // Valid flick/swipe! Determine primary direction
              if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) triggerDashPulse('dashRight');
                else triggerDashPulse('dashLeft');
              } else {
                if (dy < 0) triggerDashPulse('dashUp');
                else triggerDashPulse('dashDown');
              }
              // Reset so we don't re-trigger continuously
              rightTouchStartRef.current = null;
            }
          }
        }
      }

      // Check Joystick if active
      if (controlLayout === 'joystick' && joystickBaseRef.current) {
        const jbRect = joystickBaseRef.current.getBoundingClientRect();
        if (touch.clientX >= jbRect.left - 30 && touch.clientX <= jbRect.right + 30 && touch.clientY >= jbRect.top - 30 && touch.clientY <= jbRect.bottom + 30) {
          const centerX = jbRect.left + jbRect.width / 2;
          const centerY = jbRect.top + jbRect.height / 2;
          const deltaX = touch.clientX - centerX;
          const deltaY = touch.clientY - centerY;
          const dist = Math.hypot(deltaX, deltaY);
          const maxDist = 36;
          const angle = Math.atan2(deltaY, deltaX);

          const clampedDist = Math.min(dist, maxDist);
          setJoystickPos({
            x: Math.cos(angle) * clampedDist,
            y: Math.sin(angle) * clampedDist,
          });
          setIsJoystickActive(true);

          if (deltaX < -10) newKeys.add('left');
          if (deltaX > 10) newKeys.add('right');
          if (deltaY < -15) newKeys.add('up');
          if (deltaY > 15) newKeys.add('down');
          continue;
        }
      }

      const key = hitTestKey(touch.clientX, touch.clientY);
      if (key === 'restart') {
        if (onQuickRestart) {
          onQuickRestart();
        } else {
          onKeyChange('restart', true);
          setTimeout(() => onKeyChange('restart', false), 80);
        }
      } else if (key && key !== 'dash_swipe') {
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
      setIsJoystickActive(false);
      setJoystickPos({ x: 0, y: 0 });
    }

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const key = hitTestKey(touch.clientX, touch.clientY);
      if (key && key !== 'restart' && key !== 'dash_swipe') {
        newKeys.add(key);
      }
    }

    syncKeys(newKeys);
  };

  // Mouse handlers for desktop testing
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
    // Double tap Jump -> Instant forward Dash!
    if (now - lastJumpTapTimeRef.current < 250) {
      triggerDashPulse('dash');
    }
    lastJumpTapTimeRef.current = now;
  };

  const handleRestartClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    triggerHaptic('medium');
    if (onQuickRestart) {
      onQuickRestart();
    } else {
      onKeyChange('restart', true);
      setTimeout(() => onKeyChange('restart', false), 80);
    }
  };

  return (
    <div 
      id="touch-controls-container"
      onTouchStart={handleGlobalTouch}
      onTouchMove={handleGlobalTouch}
      onTouchEnd={handleGlobalTouchEnd}
      onTouchCancel={handleGlobalTouchEnd}
      className="w-full flex flex-col items-center justify-between px-2 sm:px-4 py-1 select-none touch-none pointer-events-auto z-30"
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Top Controller Bar */}
      <div className="w-full flex items-center justify-between px-2 pb-1 text-[10px] font-mono text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 font-bold tracking-wider">TOUCH DECK</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-800/60 text-rose-300 font-bold">
            СВАЙП = РЫВОК
          </span>
        </div>

        {/* Layout switcher */}
        <div className="flex items-center gap-1">
          <button
            id="touch-mode-ergonomic"
            type="button"
            onClick={() => setControlLayout('ergonomic')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
              controlLayout === 'ergonomic'
                ? 'bg-cyan-600 text-white shadow'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Слайдер
          </button>
          <button
            id="touch-mode-joystick"
            type="button"
            onClick={() => setControlLayout('joystick')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
              controlLayout === 'joystick'
                ? 'bg-cyan-600 text-white shadow'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Стик
          </button>
          <button
            id="touch-mode-classic"
            type="button"
            onClick={() => setControlLayout('classic')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition cursor-pointer ${
              controlLayout === 'classic'
                ? 'bg-amber-600 text-white shadow'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            D-Pad
          </button>
        </div>
      </div>

      {controlLayout === 'ergonomic' && (
        /* ERGONOMIC TWO-THUMB ARCADE DECK */
        <div className="w-full flex items-center justify-between gap-2 sm:gap-4 max-w-lg mx-auto">
          {/* LEFT THUMB: Continuous Glide Steer Pad */}
          <div className="flex flex-col gap-1.5 flex-1 max-w-[210px]">
            {/* Aux Up / Down & Quick Restart Bar */}
            <div className="flex items-center justify-between gap-1.5 px-0.5">
              <div className="flex items-center gap-1">
                <button
                  ref={upBtnRef}
                  id="touch-btn-up-aux"
                  type="button"
                  onMouseDown={handleMouseKey('up', true)}
                  onMouseUp={handleMouseKey('up', false)}
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
                  ref={downBtnRef}
                  id="touch-btn-down-aux"
                  type="button"
                  onMouseDown={handleMouseKey('down', true)}
                  onMouseUp={handleMouseKey('down', false)}
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
                ref={restartBtnRef}
                id="touch-btn-quick-restart"
                type="button"
                onClick={handleRestartClick}
                className="flex items-center gap-1 px-2.5 h-8 rounded-lg bg-amber-950/80 active:bg-amber-600 border border-amber-600/70 text-amber-300 active:text-white text-[10px] font-bold shadow transition active:scale-95 cursor-pointer"
                title="Мгновенный рестарт"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>R</span>
              </button>
            </div>

            {/* Left & Right Dual Glide Zone */}
            <div 
              ref={leftZoneRef}
              id="touch-move-zone"
              className="flex items-center gap-1.5 w-full h-16 bg-zinc-950/90 p-1 rounded-2xl border border-zinc-800 shadow-inner cursor-pointer"
            >
              <div
                ref={leftBtnRef}
                id="touch-btn-left"
                onMouseDown={handleMouseKey('left', true)}
                onMouseUp={handleMouseKey('left', false)}
                className={`flex-1 h-full flex flex-col items-center justify-center rounded-xl border transition-all ${
                  activeKeysRef.current.has('left')
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-md scale-98 ring-2 ring-cyan-400/50'
                    : 'bg-zinc-900/95 border-zinc-700 text-zinc-200'
                }`}
              >
                <ArrowLeft className="w-7 h-7" />
                <span className="text-[9px] font-mono font-bold text-zinc-300">ВЛЕВО</span>
              </div>

              <div
                ref={rightBtnRef}
                id="touch-btn-right"
                onMouseDown={handleMouseKey('right', true)}
                onMouseUp={handleMouseKey('right', false)}
                className={`flex-1 h-full flex flex-col items-center justify-center rounded-xl border transition-all ${
                  activeKeysRef.current.has('right')
                    ? 'bg-cyan-600 border-cyan-400 text-white shadow-md scale-98 ring-2 ring-cyan-400/50'
                    : 'bg-zinc-900/95 border-zinc-700 text-zinc-200'
                }`}
              >
                <ArrowRight className="w-7 h-7" />
                <span className="text-[9px] font-mono font-bold text-zinc-300">ВПРАВО</span>
              </div>
            </div>
          </div>

          {/* RIGHT THUMB: Jump & Effortless Dash Cluster */}
          <div 
            ref={rightActionZoneRef}
            className="flex items-center gap-2 sm:gap-3 flex-1 justify-end max-w-[230px]"
          >
            {/* Direct Instant Action Dash Button & Directional Arc */}
            <div className="flex flex-col items-center gap-1">
              {/* Mega Fast DASH button right beside jump */}
              <button
                ref={mainDashBtnRef}
                id="touch-btn-main-dash"
                type="button"
                onClick={() => triggerDashPulse('dash')}
                className={`flex flex-col items-center justify-center w-14 h-12 rounded-2xl border shadow-lg transition active:scale-95 cursor-pointer ${
                  activeKeysRef.current.has('dash')
                    ? 'bg-rose-500 border-rose-300 text-white shadow-rose-500/50 scale-95'
                    : 'bg-rose-950/90 border-rose-600 text-rose-300'
                }`}
                title="Рывок"
              >
                <Zap className="w-5 h-5 fill-rose-300" />
                <span className="text-[9px] font-mono font-black">DASH</span>
              </button>

              {/* Directional mini buttons */}
              <div className="grid grid-cols-3 gap-1">
                <button
                  ref={dashLeftBtnRef}
                  id="touch-dash-left"
                  type="button"
                  onClick={() => triggerDashPulse('dashLeft')}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 active:bg-rose-600 border border-zinc-700 text-rose-400 active:text-white shadow-sm transition active:scale-90 cursor-pointer"
                  title="Рывок Влево"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  ref={dashUpBtnRef}
                  id="touch-dash-up"
                  type="button"
                  onClick={() => triggerDashPulse('dashUp')}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 active:bg-rose-600 border border-zinc-700 text-rose-400 active:text-white shadow-sm transition active:scale-90 cursor-pointer"
                  title="Рывок Вверх"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  ref={dashRightBtnRef}
                  id="touch-dash-right"
                  type="button"
                  onClick={() => triggerDashPulse('dashRight')}
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-900 active:bg-rose-600 border border-zinc-700 text-rose-400 active:text-white shadow-sm transition active:scale-90 cursor-pointer"
                  title="Рывок Вправо"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Massive Primary JUMP Button */}
            <button
              ref={jumpBtnRef}
              id="touch-btn-jump"
              type="button"
              onClick={handleJumpClick}
              onMouseDown={handleMouseKey('jump', true)}
              onMouseUp={handleMouseKey('jump', false)}
              className={`flex flex-col items-center justify-center w-18 h-18 sm:w-20 sm:h-20 rounded-3xl border-2 shadow-2xl backdrop-blur transition-all active:scale-95 cursor-pointer ${
                activeKeysRef.current.has('jump')
                  ? 'bg-cyan-500 border-white text-white scale-98 shadow-cyan-500/50 ring-2 ring-cyan-300'
                  : 'bg-cyan-950/90 border-cyan-500 text-cyan-300'
              }`}
            >
              <ChevronUp className="w-8 h-8" />
              <span className="text-[10px] font-mono font-black tracking-wider">ПРЫЖОК</span>
            </button>
          </div>
        </div>
      )}

      {controlLayout === 'joystick' && (
        /* VIRTUAL ANALOG JOYSTICK MODE */
        <div className="w-full flex items-center justify-between gap-4 max-w-lg mx-auto">
          {/* Virtual Joystick Disc */}
          <div 
            ref={joystickBaseRef}
            className="relative w-28 h-28 rounded-full bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center shadow-inner"
          >
            <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900/50" />
            <div 
              className={`absolute w-12 h-12 rounded-full border-2 transition-transform duration-75 shadow-lg flex items-center justify-center ${
                isJoystickActive 
                  ? 'bg-cyan-500 border-white shadow-cyan-500/50 scale-105' 
                  : 'bg-zinc-800 border-zinc-600'
              }`}
              style={{
                transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
              }}
            >
              <div className="w-3 h-3 rounded-full bg-white/60" />
            </div>
          </div>

          {/* Action cluster */}
          <div ref={rightActionZoneRef} className="flex items-center gap-3">
            <button
              ref={mainDashBtnRef}
              id="touch-btn-main-dash-stick"
              type="button"
              onClick={() => triggerDashPulse('dash')}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-rose-950/90 border border-rose-600 text-rose-300 shadow-xl active:bg-rose-600 active:text-white transition active:scale-95 cursor-pointer"
            >
              <Zap className="w-6 h-6 fill-rose-300" />
              <span className="text-[10px] font-mono font-bold">DASH</span>
            </button>

            <button
              ref={jumpBtnRef}
              id="touch-btn-jump-stick"
              type="button"
              onClick={handleJumpClick}
              onMouseDown={handleMouseKey('jump', true)}
              onMouseUp={handleMouseKey('jump', false)}
              className="flex flex-col items-center justify-center w-18 h-18 rounded-3xl border-2 border-cyan-500 bg-cyan-950/90 text-cyan-300 shadow-xl active:bg-cyan-500 active:text-white transition active:scale-95 cursor-pointer"
            >
              <ChevronUp className="w-8 h-8" />
              <span className="text-[10px] font-mono font-bold">JUMP</span>
            </button>
          </div>
        </div>
      )}

      {controlLayout === 'classic' && (
        /* CLASSIC 4-WAY D-PAD */
        <div className="w-full flex items-center justify-between px-2 max-w-md mx-auto">
          {/* 4-Way D-Pad */}
          <div className="grid grid-cols-3 gap-1 w-36 h-36">
            <div />
            <button
              ref={upBtnRef}
              id="touch-btn-up"
              type="button"
              onMouseDown={handleMouseKey('up', true)}
              onMouseUp={handleMouseKey('up', false)}
              className={`flex items-center justify-center rounded-xl border shadow-lg transition active:scale-95 cursor-pointer ${
                activeKeysRef.current.has('up') ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-zinc-900 border-zinc-700 text-zinc-200'
              }`}
            >
              <ArrowUp className="w-6 h-6" />
            </button>
            <div />

            <button
              ref={leftBtnRef}
              id="touch-btn-left-classic"
              type="button"
              onMouseDown={handleMouseKey('left', true)}
              onMouseUp={handleMouseKey('left', false)}
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
              ref={rightBtnRef}
              id="touch-btn-right-classic"
              type="button"
              onMouseDown={handleMouseKey('right', true)}
              onMouseUp={handleMouseKey('right', false)}
              className={`flex items-center justify-center rounded-xl border shadow-lg transition active:scale-95 cursor-pointer ${
                activeKeysRef.current.has('right') ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-zinc-900 border-zinc-700 text-zinc-200'
              }`}
            >
              <ArrowRight className="w-6 h-6" />
            </button>

            <div />
            <button
              ref={downBtnRef}
              id="touch-btn-down"
              type="button"
              onMouseDown={handleMouseKey('down', true)}
              onMouseUp={handleMouseKey('down', false)}
              className={`flex items-center justify-center rounded-xl border shadow-lg transition active:scale-95 cursor-pointer ${
                activeKeysRef.current.has('down') ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-zinc-900 border-zinc-700 text-zinc-200'
              }`}
            >
              <ArrowDown className="w-6 h-6" />
            </button>
            <div />
          </div>

          {/* Action Buttons */}
          <div ref={rightActionZoneRef} className="flex items-center gap-3">
            <button
              ref={mainDashBtnRef}
              id="touch-btn-dash-classic"
              type="button"
              onClick={() => triggerDashPulse('dash')}
              className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl border shadow-xl transition active:scale-95 cursor-pointer ${
                activeKeysRef.current.has('dash') ? 'bg-rose-500 border-rose-400 text-white' : 'bg-rose-950/90 border-rose-600 text-rose-300'
              }`}
            >
              <Zap className="w-6 h-6 fill-rose-300" />
              <span className="text-[10px] font-mono font-bold">DASH</span>
            </button>

            <button
              ref={jumpBtnRef}
              id="touch-btn-jump-classic"
              type="button"
              onClick={handleJumpClick}
              onMouseDown={handleMouseKey('jump', true)}
              onMouseUp={handleMouseKey('jump', false)}
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
