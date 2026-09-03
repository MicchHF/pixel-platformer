import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  ControlKeys, 
  LevelData, 
  ThemeColors, 
} from '../types/game';
import { TILE_SIZE } from '../game/constants';
import { GameEngineState, initLevelState, respawnPlayer, updatePhysics } from '../game/physics';
import { renderGame } from '../game/renderer';
import { sounds } from '../audio/soundManager';
import { TouchControls } from './TouchControls';
import { haptics } from '../utils/telegram';

interface GameCanvasProps {
  level: LevelData;
  theme: ThemeColors;
  scanlines?: boolean;
  screenShakeEnabled?: boolean;
  touchMode?: 'auto' | 'always' | 'hidden';
  isPaused?: boolean;
  restartSignal?: number;
  onUpdateHUD?: (player: GameEngineState['player'], time: number, deaths: number) => void;
  onHudUpdate?: (player: GameEngineState['player'], time: number, deaths: number) => void;
  onLevelComplete?: (levelId: number, time: number, deaths: number) => void;
  onWin?: (time: number, deaths: number) => void;
  onPlayerDeath?: (levelId: number, totalDeaths: number) => void;
  onDeath?: () => void;
  onQuickRestart?: () => void;
}

const GameCanvasComponent: React.FC<GameCanvasProps> = ({
  level,
  theme,
  scanlines = false,
  screenShakeEnabled = true,
  touchMode = 'auto',
  isPaused = false,
  restartSignal = 0,
  onUpdateHUD,
  onHudUpdate,
  onLevelComplete,
  onWin,
  onPlayerDeath,
  onDeath,
  onQuickRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const callbacksRef = useRef({
    onUpdateHUD,
    onHudUpdate,
    onLevelComplete,
    onWin,
    onPlayerDeath,
    onDeath,
    onQuickRestart,
  });

  callbacksRef.current = {
    onUpdateHUD,
    onHudUpdate,
    onLevelComplete,
    onWin,
    onPlayerDeath,
    onDeath,
    onQuickRestart,
  };

  // Stable callback dispatchers
  const triggerPlayerDeath = useCallback((levelId: number, deaths: number) => {
    const cb = callbacksRef.current;
    if (typeof cb.onPlayerDeath === 'function') cb.onPlayerDeath(levelId, deaths);
    if (typeof cb.onDeath === 'function') cb.onDeath();
  }, []);

  const triggerHudUpdate = useCallback((player: GameEngineState['player'], time: number, deaths: number) => {
    const cb = callbacksRef.current;
    if (typeof cb.onUpdateHUD === 'function') cb.onUpdateHUD(player, time, deaths);
    if (typeof cb.onHudUpdate === 'function') cb.onHudUpdate(player, time, deaths);
  }, []);

  const triggerLevelWin = useCallback((levelId: number, time: number, deaths: number) => {
    const cb = callbacksRef.current;
    if (typeof cb.onLevelComplete === 'function') cb.onLevelComplete(levelId, time, deaths);
    if (typeof cb.onWin === 'function') cb.onWin(time, deaths);
  }, []);

  // Game Engine State
  const gameStateRef = useRef<GameEngineState>(initLevelState(level));
  const deathsCountRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(isPaused);
  isPausedRef.current = isPaused;

  // Key tracking
  const keysRef = useRef<ControlKeys>({
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    dash: false,
    restart: false,
  });

  const prevKeysRef = useRef<ControlKeys>({ ...keysRef.current });

  // Touch screen auto-detection
  const [isTouchDevice] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || (navigator.maxTouchPoints != null && navigator.maxTouchPoints > 0);
  });

  const shouldShowTouch = 
    touchMode === 'always' || (touchMode === 'auto' && isTouchDevice);

  // Restart function
  const handleRestart = useCallback(() => {
    const state = gameStateRef.current;
    state.levelTime = 0;
    state.timerStarted = false;
    state.isCompleted = false;
    deathsCountRef.current += 1;
    triggerPlayerDeath(state.level.id, deathsCountRef.current);
    respawnPlayer(state);
    triggerHudUpdate(state.player, 0, deathsCountRef.current);
    sounds.playDeath();
    haptics.medium();
  }, [triggerPlayerDeath, triggerHudUpdate]);

  // Re-initialize state when level changes
  const prevLevelIdRef = useRef<number>(level.id);
  useEffect(() => {
    prevLevelIdRef.current = level.id;
    gameStateRef.current = initLevelState(level);
    deathsCountRef.current = 0;
    triggerHudUpdate(gameStateRef.current.player, 0, 0);
  }, [level.id, level, triggerHudUpdate]);

  // External restart trigger listener
  const prevRestartSignalRef = useRef<number>(restartSignal);
  useEffect(() => {
    if (restartSignal > 0 && restartSignal !== prevRestartSignalRef.current) {
      prevRestartSignalRef.current = restartSignal;
      handleRestart();
    }
  }, [restartSignal, handleRestart]);

  // Focus helper
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.focus();
    }
  }, [level.id]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in input fields
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      // Prevent default page scroll on game keys
      if (
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyX', 'KeyZ', 'KeyC', 'KeyR', 'KeyJ', 'KeyK', 'ShiftLeft', 'ShiftRight'].includes(code) ||
        [' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 's', 'a', 'd', 'x', 'z', 'c', 'r', 'j', 'k', 'shift', 'ц', 'ы', 'ф', 'в', 'ч', 'я', 'с', 'к', 'о', 'л'].includes(key)
      ) {
        e.preventDefault();
      }

      const keys = keysRef.current;
      
      // LEFT
      if (code === 'ArrowLeft' || code === 'KeyA' || key === 'arrowleft' || key === 'a' || key === 'ф') {
        keys.left = true;
      }
      // RIGHT
      if (code === 'ArrowRight' || code === 'KeyD' || key === 'arrowright' || key === 'd' || key === 'в') {
        keys.right = true;
      }
      // UP
      if (code === 'ArrowUp' || code === 'KeyW' || key === 'arrowup' || key === 'w' || key === 'ц') {
        keys.up = true;
      }
      // DOWN
      if (code === 'ArrowDown' || code === 'KeyS' || key === 'arrowdown' || key === 's' || key === 'ы') {
        keys.down = true;
      }
      // JUMP
      if (
        code === 'Space' || code === 'KeyZ' || code === 'KeyC' || code === 'ArrowUp' || code === 'KeyW' ||
        key === ' ' || key === 'space' || key === 'z' || key === 'c' || key === 'arrowup' || key === 'w' || key === 'я' || key === 'с' || key === 'ц'
      ) {
        keys.jump = true;
      }
      // DASH
      if (
        code === 'KeyX' || code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyK' || code === 'KeyJ' ||
        key === 'x' || key === 'shift' || key === 'k' || key === 'j' || key === 'ч' || key === 'л' || key === 'о'
      ) {
        keys.dash = true;
      }
      // RESTART
      if (code === 'KeyR' || key === 'r' || key === 'к') {
        if (!keys.restart) {
          handleRestart();
        }
        keys.restart = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key ? e.key.toLowerCase() : '';

      const keys = keysRef.current;
      
      // LEFT
      if (code === 'ArrowLeft' || code === 'KeyA' || key === 'arrowleft' || key === 'a' || key === 'ф') {
        keys.left = false;
      }
      // RIGHT
      if (code === 'ArrowRight' || code === 'KeyD' || key === 'arrowright' || key === 'd' || key === 'в') {
        keys.right = false;
      }
      // UP
      if (code === 'ArrowUp' || code === 'KeyW' || key === 'arrowup' || key === 'w' || key === 'ц') {
        keys.up = false;
      }
      // DOWN
      if (code === 'ArrowDown' || code === 'KeyS' || key === 'arrowdown' || key === 's' || key === 'ы') {
        keys.down = false;
      }
      // JUMP
      if (
        code === 'Space' || code === 'KeyZ' || code === 'KeyC' || code === 'ArrowUp' || code === 'KeyW' ||
        key === ' ' || key === 'space' || key === 'z' || key === 'c' || key === 'arrowup' || key === 'w' || key === 'я' || key === 'с' || key === 'ц'
      ) {
        keys.jump = false;
      }
      // DASH
      if (
        code === 'KeyX' || code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyK' || code === 'KeyJ' ||
        key === 'x' || key === 'shift' || key === 'k' || key === 'j' || key === 'ч' || key === 'л' || key === 'о'
      ) {
        keys.dash = false;
      }
      // RESTART
      if (code === 'KeyR' || key === 'r' || key === 'к') {
        keys.restart = false;
      }
    };

    const resetKeys = () => {
      const keys = keysRef.current;
      keys.left = false;
      keys.right = false;
      keys.up = false;
      keys.down = false;
      keys.jump = false;
      keys.dash = false;
      keys.dashLeft = false;
      keys.dashRight = false;
      keys.dashUp = false;
      keys.dashDown = false;
      keys.restart = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });
    window.addEventListener('blur', resetKeys);
    document.addEventListener('visibilitychange', resetKeys);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', resetKeys);
      document.removeEventListener('visibilitychange', resetKeys);
    };
  }, [handleRestart]);

  // Track edge triggers / micro-taps between 60fps frames so quick taps are never dropped
  const justPressedBufferRef = useRef<{ [K in keyof ControlKeys]?: boolean }>({});

  // Touch control callback with tap buffering
  const handleTouchKey = useCallback((key: keyof ControlKeys, pressed: boolean) => {
    keysRef.current[key] = pressed;
    if (pressed) {
      justPressedBufferRef.current[key] = true;
    }
  }, []);

  // Main 60 FPS Game Loop
  useEffect(() => {
    let animFrameId: number;
    let lastTime = performance.now();
    let hudThrottleCounter = 0;

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.05); // cap frame delta
      lastTime = currentTime;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const state = gameStateRef.current;

      // Prepare active frame keys incorporating buffered taps so micro-taps never miss a frame
      const keys: ControlKeys = { ...keysRef.current };
      if (justPressedBufferRef.current.jump) keys.jump = true;
      if (justPressedBufferRef.current.dash) keys.dash = true;
      if (justPressedBufferRef.current.dashUp) keys.dashUp = true;
      if (justPressedBufferRef.current.dashLeft) keys.dashLeft = true;
      if (justPressedBufferRef.current.dashRight) keys.dashRight = true;
      if (justPressedBufferRef.current.left) keys.left = true;
      if (justPressedBufferRef.current.right) keys.right = true;
      if (justPressedBufferRef.current.up) keys.up = true;
      if (justPressedBufferRef.current.down) keys.down = true;

      // Clear buffer for next frame
      justPressedBufferRef.current = {};

      // Poll Gamepad if connected
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      if (gp) {
        const axisX = gp.axes[0] || 0;
        const axisY = gp.axes[1] || 0;
        keys.left = keys.left || axisX < -0.3 || gp.buttons[14]?.pressed;
        keys.right = keys.right || axisX > 0.3 || gp.buttons[15]?.pressed;
        keys.up = keys.up || axisY < -0.3 || gp.buttons[12]?.pressed;
        keys.down = keys.down || axisY > 0.3 || gp.buttons[13]?.pressed;
        keys.jump = keys.jump || gp.buttons[0]?.pressed || gp.buttons[1]?.pressed; // A or B
        keys.dash = keys.dash || gp.buttons[2]?.pressed || gp.buttons[3]?.pressed || gp.buttons[5]?.pressed; // X, Y, RB
      }

      if (!isPausedRef.current && !state.isCompleted) {
        // Run physics update
        updatePhysics(
          state,
          keys,
          prevKeysRef.current,
          dt,
          // On Death Callback
          () => {
            deathsCountRef.current += 1;
            triggerPlayerDeath(state.level.id, deathsCountRef.current);
            triggerHudUpdate(state.player, state.levelTime, deathsCountRef.current);
            haptics.error();
            // PostMessage to parent
            if (typeof window !== 'undefined' && window.parent) {
              window.parent.postMessage({
                source: 'HARDCORE_PIXEL_PLATFORMER',
                type: 'PLAYER_DIED',
                levelId: state.level.id,
                totalDeaths: deathsCountRef.current,
              }, '*');
            }
          },
          // On Win Callback
          () => {
            triggerLevelWin(state.level.id, state.levelTime, deathsCountRef.current);
            triggerHudUpdate(state.player, state.levelTime, deathsCountRef.current);
            haptics.success();
            // PostMessage to parent
            if (typeof window !== 'undefined' && window.parent) {
              window.parent.postMessage({
                source: 'HARDCORE_PIXEL_PLATFORMER',
                type: 'LEVEL_COMPLETED',
                levelId: state.level.id,
                time: state.levelTime,
                deaths: deathsCountRef.current,
                parTime: state.level.parTime,
              }, '*');
            }
          }
        );

        // Throttle HUD state update to ~20 FPS
        hudThrottleCounter++;
        if (hudThrottleCounter % 3 === 0) {
          triggerHudUpdate(state.player, state.levelTime, deathsCountRef.current);
        }
      }

      // Store current keys for next frame's edge-trigger checks
      prevKeysRef.current = { ...keys };

      // Render Canvas
      if (ctx && canvas) {
        renderGame(ctx, state, {
          theme,
          showGrid: true,
          scanlines,
          screenShakeEnabled,
        });
      }

      animFrameId = requestAnimationFrame(loop);
    };

    animFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameId);
  }, [theme, scanlines, screenShakeEnabled, triggerLevelWin, triggerPlayerDeath, triggerHudUpdate]);

  const levelCols = level.cols || 20;
  const levelRows = level.rows || 30;

  return (
    <div 
      ref={containerRef}
      id="game-viewport-container"
      className="relative flex-1 w-full h-full min-h-0 max-w-4xl mx-auto flex flex-col items-center justify-center overflow-hidden bg-zinc-950 px-1 py-0.5 select-none gap-0.5 outline-none"
      tabIndex={0}
      onClick={() => canvasRef.current?.focus()}
    >
      {/* Canvas Frame fitted accurately with zero aspect distortion */}
      <div className="flex-1 w-full min-h-0 flex items-center justify-center overflow-hidden p-0.5 sm:p-1">
        <div 
          id="pixel-canvas-frame"
          className="relative flex items-center justify-center shadow-2xl overflow-hidden border border-zinc-800/80 rounded-lg sm:rounded-xl bg-black"
          style={{
            aspectRatio: `${levelCols} / ${levelRows}`,
            maxHeight: '100%',
            maxWidth: '100%',
            height: '100%',
            width: 'auto',
            boxShadow: `0 0 30px ${theme.background}88, 0 12px 30px rgba(0,0,0,0.85)`,
          }}
        >
          <canvas
            ref={canvasRef}
            id="main-pixel-canvas"
            tabIndex={0}
            width={levelCols * TILE_SIZE}
            height={levelRows * TILE_SIZE}
            className="w-full h-full block cursor-default outline-none"
            style={{ 
              imageRendering: 'pixelated',
              width: '100%',
              height: '100%',
            }}
          />

          {/* Pause Overlay */}
          {isPaused && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center font-mono text-zinc-100 animate-fadeIn z-20">
              <h3 className="text-2xl font-black tracking-widest text-cyan-400 mb-2">ПАУЗА</h3>
              <p className="text-xs text-zinc-400">Нажмите ▶ Продолжить в меню</p>
            </div>
          )}
        </div>
      </div>

      {/* Touch Controls for mobile view - positioned snugly right beneath the game field */}
      {shouldShowTouch && (
        <div className="w-full max-w-lg shrink-0 pt-0 pb-0.5 px-1">
          <TouchControls 
            onKeyChange={handleTouchKey} 
            onQuickRestart={handleRestart}
          />
        </div>
      )}
    </div>
  );
};

export const GameCanvas = React.memo(GameCanvasComponent);
