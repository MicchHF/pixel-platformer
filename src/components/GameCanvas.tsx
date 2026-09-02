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

interface GameCanvasProps {
  level: LevelData;
  theme: ThemeColors;
  scanlines: boolean;
  screenShakeEnabled: boolean;
  touchMode: 'auto' | 'always' | 'hidden';
  isPaused: boolean;
  restartSignal?: number;
  onUpdateHUD: (player: GameEngineState['player'], time: number, deaths: number) => void;
  onLevelComplete: (levelId: number, time: number, deaths: number) => void;
  onPlayerDeath: (levelId: number, totalDeaths: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  theme,
  scanlines,
  screenShakeEnabled,
  touchMode,
  isPaused,
  restartSignal = 0,
  onUpdateHUD,
  onLevelComplete,
  onPlayerDeath,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const shouldShowTouch = 
    touchMode === 'always' || (touchMode === 'auto' && isTouchDevice);

  // Restart function
  const handleRestart = useCallback(() => {
    const state = gameStateRef.current;
    state.levelTime = 0;
    state.isCompleted = false;
    deathsCountRef.current += 1;
    onPlayerDeath(state.level.id, deathsCountRef.current);
    respawnPlayer(state);
    sounds.playDeath();
  }, [onPlayerDeath]);

  // Re-initialize state when level changes
  useEffect(() => {
    gameStateRef.current = initLevelState(level);
    deathsCountRef.current = 0;
    onPlayerDeath(level.id, 0);
  }, [level, onPlayerDeath]);

  // External restart trigger listener
  const prevRestartSignalRef = useRef<number>(restartSignal);
  useEffect(() => {
    if (restartSignal > 0 && restartSignal !== prevRestartSignalRef.current) {
      prevRestartSignalRef.current = restartSignal;
      handleRestart();
    }
  }, [restartSignal, handleRestart]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default page scroll on game keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyX', 'KeyZ', 'KeyR'].includes(e.code)) {
        e.preventDefault();
      }

      const keys = keysRef.current;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true;
      if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'ArrowUp' || e.code === 'KeyW') keys.jump = true;
      if (e.code === 'KeyX' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') keys.dash = true;
      if (e.code === 'KeyR') {
        if (!keys.restart) {
          handleRestart();
        }
        keys.restart = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keys = keysRef.current;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false;
      if (e.code === 'Space' || e.code === 'KeyZ') keys.jump = false;
      if (e.code === 'KeyX' || e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') keys.dash = false;
      if (e.code === 'KeyR') keys.restart = false;
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleRestart]);

  // Touch control callback
  const handleTouchKey = (key: keyof ControlKeys, pressed: boolean) => {
    keysRef.current[key] = pressed;
  };

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

      // Poll Gamepad if connected
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      if (gp) {
        const keys = keysRef.current;
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
          keysRef.current,
          prevKeysRef.current,
          dt,
          // On Death Callback
          () => {
            deathsCountRef.current += 1;
            onPlayerDeath(state.level.id, deathsCountRef.current);
            onUpdateHUD(state.player, state.levelTime, deathsCountRef.current);
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
            onLevelComplete(state.level.id, state.levelTime, deathsCountRef.current);
            onUpdateHUD(state.player, state.levelTime, deathsCountRef.current);
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

        // Throttle HUD state update to ~20 FPS to prevent React render saturation while keeping smooth numbers
        hudThrottleCounter++;
        if (hudThrottleCounter % 3 === 0) {
          onUpdateHUD(state.player, state.levelTime, deathsCountRef.current);
        }
      }

      // Store current keys for next frame's edge-trigger checks
      prevKeysRef.current = { ...keysRef.current };

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
  }, [theme, scanlines, screenShakeEnabled, onLevelComplete, onPlayerDeath, onUpdateHUD]);

  return (
    <div 
      ref={containerRef}
      id="game-viewport-container"
      className="relative flex-1 w-full max-w-4xl mx-auto flex flex-col items-center justify-center overflow-hidden bg-zinc-950 p-1 sm:p-3 select-none"
    >
      {/* Canvas Frame with responsive aspect-ratio containment */}
      <div 
        id="pixel-canvas-frame"
        className="relative w-full max-w-[620px] aspect-[26/16] flex items-center justify-center shadow-2xl rounded-xl overflow-hidden border-2 border-zinc-800 bg-black shrink-0"
        style={{
          boxShadow: `0 0 25px ${theme.background}66, 0 10px 25px rgba(0,0,0,0.8)`,
        }}
      >
        <canvas
          ref={canvasRef}
          id="main-pixel-canvas"
          width={level.cols * TILE_SIZE}
          height={level.rows * TILE_SIZE}
          className="w-full h-full block object-contain"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center font-mono text-zinc-100 animate-fadeIn z-20">
            <h3 className="text-2xl font-black tracking-widest text-cyan-400 mb-2">ПАУЗА</h3>
            <p className="text-xs text-zinc-400">Нажмите кнопку ▶ Продолжить</p>
          </div>
        )}
      </div>

      {/* Touch D-Pad / Ergonomic Controls for vertical mobile view */}
      {shouldShowTouch && (
        <div className="w-full max-w-xl mt-auto pt-2 pb-safe">
          <TouchControls onKeyChange={handleTouchKey} />
        </div>
      )}
    </div>
  );
};
