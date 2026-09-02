import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HUD } from './components/HUD';
import { GameCanvas } from './components/GameCanvas';
import { LevelSelectModal } from './components/LevelSelectModal';
import { SettingsModal } from './components/SettingsModal';
import { LevelEditor } from './components/LevelEditor';
import { EmbedDrawer } from './components/EmbedDrawer';
import { VictoryModal } from './components/VictoryModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { LEVELS } from './game/levels';
import { THEMES } from './game/themes';
import { sounds } from './audio/soundManager';
import { GameEngineState, initLevelState } from './game/physics';
import { LevelData, LevelRecord, ThemeName } from './types/game';
import { initTelegram, haptics, shareScoreToTelegram, TelegramUserData } from './utils/telegram';
import { submitScoreToLeaderboard, batchSyncRecords } from './services/leaderboardApi';
import { formatHundredths } from './utils/time';
import { Swords, X as CloseIcon } from 'lucide-react';

const STORAGE_KEY = 'hardcore_pixel_platformer_v1';
const LIFETIME_DEATHS_KEY = 'hardcore_pixel_platformer_lifetime_deaths';
const CUSTOM_LEVELS_STORAGE_KEY = 'hardcore_pixel_platformer_custom_levels_v2';
const PLAYER_NAME_KEY = 'pixel_platformer_player_name';

function loadStoredLevels(): LevelData[] {
  try {
    if (typeof window === 'undefined') return LEVELS;
    const stored = localStorage.getItem(CUSTOM_LEVELS_STORAGE_KEY);
    if (!stored) return LEVELS;
    const parsed: LevelData[] = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return LEVELS;
    return parsed;
  } catch {
    return LEVELS;
  }
}

export default function App() {
  // Telegram User & Initialization
  const [tgUser] = useState<TelegramUserData>(() => initTelegram());
  const [playerName, setPlayerName] = useState<string>(() => {
    if (tgUser.firstName) return tgUser.firstName;
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(PLAYER_NAME_KEY);
        if (saved) return saved;
      } catch {}
    }
    return 'Бегущий';
  });

  const handleUpdatePlayerName = useCallback((newName: string) => {
    setPlayerName(newName);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PLAYER_NAME_KEY, newName);
      } catch {}
    }
  }, []);

  // Parse URL query parameters for embedded mode & Telegram challenges
  const urlParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const initialEmbed = urlParams.get('embed') === 'true' || urlParams.get('embed') === '1';
  const initialCompact = urlParams.get('compact') === 'true' || initialEmbed;
  const initialLevelParam = parseInt(urlParams.get('level') || '1', 10);
  const initialThemeParam = (urlParams.get('theme') as ThemeName) || 'neon';
  const initialMutedParam = urlParams.get('muted') === 'true' || urlParams.get('mute') === '1';
  
  // Friend challenge banner from Telegram URL query
  const challengeTimeParam = urlParams.get('challengeTime');
  const [challengeBanner, setChallengeBanner] = useState<string | null>(() => {
    return challengeTimeParam ? challengeTimeParam : null;
  });

  // Game Levels (Persistent with localStorage support)
  const [levels, setLevels] = useState<LevelData[]>(() => loadStoredLevels());
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(() => {
    const validId = isNaN(initialLevelParam) ? 1 : Math.max(1, Math.min(LEVELS.length, initialLevelParam));
    const idx = LEVELS.findIndex((l) => l.id === validId);
    return idx !== -1 ? idx : 0;
  });

  const currentLevel = levels[currentLevelIndex] || levels[0];

  // Appearance & Audio Settings
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    return THEMES[initialThemeParam] ? initialThemeParam : 'neon';
  });
  const currentTheme = THEMES[themeName] || THEMES.neon;

  const [scanlines, setScanlines] = useState<boolean>(false);
  const [screenShakeEnabled, setScreenShakeEnabled] = useState<boolean>(true);
  const [touchMode, setTouchMode] = useState<'auto' | 'always' | 'hidden'>('auto');
  const [isCompact] = useState<boolean>(initialCompact);

  // Audio State
  const [isMuted, setIsMuted] = useState<boolean>(initialMutedParam);
  const [sfxVolume, setSfxVolume] = useState<number>(0.6);
  const [bgmVolume, setBgmVolume] = useState<number>(0.3);
  const [isBgmPlaying, setIsBgmPlaying] = useState<boolean>(false);

  // Apply initial audio settings
  useEffect(() => {
    sounds.setMuted(isMuted);
    sounds.setSfxVolume(sfxVolume);
    sounds.setBgmVolume(bgmVolume);
  }, [isMuted, sfxVolume, bgmVolume]);

  // In-Game Live HUD Tracking
  const [hudPlayer, setHudPlayer] = useState<GameEngineState['player']>(() => initLevelState(currentLevel).player);
  const [hudTime, setHudTime] = useState<number>(0);
  const [hudDeaths, setHudDeaths] = useState<number>(0);
  const [lifetimeDeaths, setLifetimeDeaths] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LIFETIME_DEATHS_KEY);
        if (saved) return parseInt(saved, 10) || 0;
      } catch {}
    }
    return 0;
  });

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [restartSignal, setRestartSignal] = useState<number>(0);

  // Progress & Records Storage
  const [records, setRecords] = useState<Record<number, LevelRecord>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {};
  });

  // Modals
  const [showLevelSelect, setShowLevelSelect] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showEmbedDrawer, setShowEmbedDrawer] = useState<boolean>(false);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [victoryData, setVictoryData] = useState<{
    level: LevelData;
    time: number;
    deaths: number;
    isAllCompleted: boolean;
    rank?: number;
  } | null>(null);

  // Initial batch sync of records with online leaderboard server
  useEffect(() => {
    if (Object.keys(records).length > 0) {
      batchSyncRecords(
        playerName,
        records,
        tgUser.username,
        tgUser.id,
        tgUser.isTelegram ? 'telegram' : 'web'
      );
    }
  }, []);

  // Save records to LocalStorage and Submit to Online Leaderboard
  const saveRecord = useCallback((levelId: number, time: number, deaths: number) => {
    setRecords((prev) => {
      const existing = prev[levelId];
      const isFaster = !existing || time < existing.bestTime;
      const updated: LevelRecord = {
        completed: true,
        bestTime: isFaster ? time : existing.bestTime,
        deaths: existing ? Math.min(existing.deaths, deaths) : deaths,
        stars: 3,
      };
      const next = { ...prev, [levelId]: updated };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Send score to server online leaderboard
    submitScoreToLeaderboard({
      levelId,
      time,
      deaths,
      playerName,
      username: tgUser.username,
      tgId: tgUser.id,
      platform: tgUser.isTelegram ? 'telegram' : 'web',
    }).then((res) => {
      if (res.rank) {
        setVictoryData((curr) => curr ? { ...curr, rank: res.rank } : null);
      }
    });
  }, [playerName, tgUser]);

  // HUD Update from game loop
  const handleUpdateHUD = useCallback((player: GameEngineState['player'], time: number, deaths: number) => {
    setHudPlayer(player);
    setHudTime(time);
    setHudDeaths(deaths);
  }, []);

  // Level Complete Event
  const handleLevelComplete = useCallback((levelId: number, time: number, deaths: number) => {
    haptics.success();
    saveRecord(levelId, time, deaths);
    const isLast = currentLevelIndex >= levels.length - 1;
    setVictoryData({
      level: currentLevel,
      time,
      deaths,
      isAllCompleted: isLast,
    });
  }, [currentLevel, currentLevelIndex, levels.length, saveRecord]);

  // Player Death Event (Increment Level & Lifetime Deaths)
  const handlePlayerDeath = useCallback((_levelId: number, currentLevelDeaths: number) => {
    haptics.heavy();
    setHudDeaths(currentLevelDeaths);
    if (currentLevelDeaths > 0) {
      setLifetimeDeaths((prev) => {
        const next = prev + 1;
        try {
          localStorage.setItem(LIFETIME_DEATHS_KEY, String(next));
        } catch {}
        return next;
      });
    }
  }, []);

  // Next Level Handler
  const handleNextLevel = useCallback(() => {
    setVictoryData(null);
    if (currentLevelIndex < levels.length - 1) {
      setCurrentLevelIndex((prev) => prev + 1);
    }
  }, [currentLevelIndex, levels.length]);

  // Restart Handler (triggers instant canvas reset)
  const handleRestart = useCallback(() => {
    setVictoryData(null);
    setIsPaused(false);
    setRestartSignal((prev) => prev + 1);
  }, []);

  // Level Select Handler
  const handleSelectLevel = useCallback((lvl: LevelData) => {
    const idx = levels.findIndex((l) => l.id === lvl.id);
    if (idx !== -1) {
      setCurrentLevelIndex(idx);
    } else {
      // Custom level added from editor
      setLevels((prev) => [...prev, lvl]);
      setCurrentLevelIndex(levels.length);
    }
    setVictoryData(null);
    setIsPaused(false);
  }, [levels]);

  // Save level to memory & localStorage (works for both base levels and custom levels)
  const handleSaveLevel = useCallback((lvl: LevelData, asNew: boolean = false) => {
    setLevels((prev) => {
      let updated: LevelData[];
      if (asNew) {
        updated = [...prev, lvl];
      } else {
        const existingIdx = prev.findIndex((l) => l.id === lvl.id);
        if (existingIdx !== -1) {
          updated = [...prev];
          updated[existingIdx] = lvl;
        } else {
          updated = [...prev, lvl];
        }
      }

      try {
        localStorage.setItem(CUSTOM_LEVELS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save level:', err);
      }
      return updated;
    });

    if (lvl.id === currentLevel.id) {
      setRestartSignal((prev) => prev + 1);
    }
  }, [currentLevel.id]);

  // Reset a base level to its original default layout
  const handleResetLevel = useCallback((levelId: number) => {
    const defaultLevel = LEVELS.find((l) => l.id === levelId);
    if (!defaultLevel) return;

    setLevels((prev) => {
      const updated = prev.map((l) => (l.id === levelId ? JSON.parse(JSON.stringify(defaultLevel)) : l));
      try {
        localStorage.setItem(CUSTOM_LEVELS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (currentLevel.id === levelId) {
      setRestartSignal((prev) => prev + 1);
    }
  }, [currentLevel.id]);

  // Delete a level (custom level or any level from playlist)
  const handleDeleteLevel = useCallback((levelId: number) => {
    setLevels((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      const updated = prev.filter((l) => l.id !== levelId);
      try {
        localStorage.setItem(CUSTOM_LEVELS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save levels after deletion:', err);
      }
      return updated;
    });

    // Clean up records for deleted level
    setRecords((prev) => {
      const next = { ...prev };
      delete next[levelId];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    // Adjust active level index
    setCurrentLevelIndex((prevIdx) => {
      const remainingLevels = levels.filter((l) => l.id !== levelId);
      const remainingLength = Math.max(1, remainingLevels.length);
      return Math.min(prevIdx, remainingLength - 1);
    });

    setRestartSignal((prev) => prev + 1);
  }, [levels]);

  // Audio Toggles
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      sounds.setMuted(next);
      return next;
    });
  }, []);

  const handleToggleBgm = useCallback(() => {
    const isPlaying = sounds.toggleBgm();
    setIsBgmPlaying(isPlaying);
  }, []);

  const handleSfxVolume = useCallback((vol: number) => {
    setSfxVolume(vol);
    sounds.setSfxVolume(vol);
  }, []);

  const handleBgmVolume = useCallback((vol: number) => {
    setBgmVolume(vol);
    sounds.setBgmVolume(vol);
  }, []);

  const handleResetProgress = useCallback(() => {
    setRecords({});
    setLifetimeDeaths(0);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LIFETIME_DEATHS_KEY);
    } catch {}
  }, []);

  // Parent window postMessage command listener
  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;

      if (data.type === 'LOAD_LEVEL' && typeof data.levelId === 'number') {
        const target = levels.find((l) => l.id === data.levelId);
        if (target) handleSelectLevel(target);
      } else if (data.type === 'RESTART') {
        handleRestart();
      } else if (data.type === 'PAUSE') {
        setIsPaused(true);
      } else if (data.type === 'RESUME') {
        setIsPaused(false);
      } else if (data.type === 'SET_THEME' && data.theme && THEMES[data.theme as ThemeName]) {
        setThemeName(data.theme as ThemeName);
      } else if (data.type === 'SET_MUTED' && typeof data.muted === 'boolean') {
        setIsMuted(data.muted);
        sounds.setMuted(data.muted);
      }
    };

    window.addEventListener('message', handlePostMessage);
    return () => window.removeEventListener('message', handlePostMessage);
  }, [levels, handleSelectLevel, handleRestart]);

  // Speedrun stats calculation
  const totalSpeedrunTime = (Object.values(records) as LevelRecord[]).reduce((acc, r) => acc + (r?.bestTime || 0), 0);

  // Handle Telegram Share from Victory Modal
  const handleShareVictoryTelegram = () => {
    if (!victoryData) return;
    shareScoreToTelegram({
      levelName: victoryData.level.name,
      levelId: victoryData.level.id,
      timeStr: formatHundredths(victoryData.time),
      deaths: victoryData.deaths,
    });
  };

  return (
    <main 
      id="app-root-container"
      className="w-full h-[100dvh] flex flex-col justify-between bg-zinc-950 text-zinc-100 overflow-hidden font-mono select-none"
    >
      {/* Friend Challenge Notice Banner (if opened via Telegram challenge link) */}
      {challengeBanner && (
        <div className="bg-gradient-to-r from-sky-950 via-sky-900 to-indigo-950 border-b border-sky-600/50 px-3 py-1.5 flex items-center justify-between text-xs text-sky-200 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>
              🔥 <strong>Вызов от друга!</strong> Рекорд для побития: <span className="text-amber-300 font-bold underline">{challengeBanner}</span>
            </span>
          </div>
          <button
            onClick={() => setChallengeBanner(null)}
            className="p-1 rounded text-sky-300 hover:text-white transition cursor-pointer"
          >
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top HUD */}
      <HUD
        level={currentLevel}
        player={hudPlayer}
        levelTime={hudTime}
        deaths={hudDeaths}
        totalLifetimeDeaths={lifetimeDeaths}
        bestTime={records[currentLevel.id]?.bestTime}
        theme={currentTheme}
        isPaused={isPaused}
        isMuted={isMuted}
        isBgmPlaying={isBgmPlaying}
        compact={isCompact}
        onRestart={handleRestart}
        onTogglePause={() => setIsPaused((prev) => !prev)}
        onToggleMute={handleToggleMute}
        onToggleBgm={handleToggleBgm}
        onOpenLevelSelect={() => setShowLevelSelect(true)}
        onOpenLeaderboard={() => setShowLeaderboard(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenEmbed={() => setShowEmbedDrawer(true)}
        onOpenEditor={() => setShowEditor(true)}
      />

      {/* Main Canvas Viewport with stable mount key */}
      <GameCanvas
        key={`game-canvas-${currentLevel.id}`}
        level={currentLevel}
        theme={currentTheme}
        scanlines={scanlines}
        screenShakeEnabled={screenShakeEnabled}
        touchMode={touchMode}
        isPaused={isPaused}
        restartSignal={restartSignal}
        onUpdateHUD={handleUpdateHUD}
        onLevelComplete={handleLevelComplete}
        onPlayerDeath={handlePlayerDeath}
      />

      {/* Modals & Drawers */}
      {showLevelSelect && (
        <LevelSelectModal
          levels={levels}
          currentLevelId={currentLevel.id}
          records={records}
          onSelectLevel={handleSelectLevel}
          onDeleteLevel={handleDeleteLevel}
          onOpenEditor={() => setShowEditor(true)}
          onClose={() => setShowLevelSelect(false)}
        />
      )}

      {/* Online Leaderboard Modal */}
      {showLeaderboard && (
        <LeaderboardModal
          levels={levels}
          currentLevelId={currentLevel.id}
          telegramUser={tgUser}
          playerName={playerName}
          onUpdatePlayerName={handleUpdatePlayerName}
          onSelectLevel={handleSelectLevel}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentTheme={themeName}
          scanlines={scanlines}
          screenShake={screenShakeEnabled}
          touchControlsMode={touchMode}
          sfxVolume={sfxVolume}
          bgmVolume={bgmVolume}
          isBgmPlaying={isBgmPlaying}
          onSelectTheme={setThemeName}
          onToggleScanlines={setScanlines}
          onToggleScreenShake={setScreenShakeEnabled}
          onChangeTouchMode={setTouchMode}
          onChangeSfxVolume={handleSfxVolume}
          onChangeBgmVolume={handleBgmVolume}
          onToggleBgm={handleToggleBgm}
          onResetProgress={handleResetProgress}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showEditor && (
        <LevelEditor
          levels={levels}
          initialLevel={currentLevel}
          theme={currentTheme}
          onSaveLevel={handleSaveLevel}
          onResetLevel={handleResetLevel}
          onDeleteLevel={handleDeleteLevel}
          onPlaytest={(customLevel) => {
            setShowEditor(false);
            handleSelectLevel(customLevel);
          }}
          onClose={() => setShowEditor(false)}
        />
      )}

      {showEmbedDrawer && (
        <EmbedDrawer
          currentTheme={themeName}
          currentLevelId={currentLevel.id}
          onClose={() => setShowEmbedDrawer(false)}
        />
      )}

      {victoryData && (
        <VictoryModal
          level={victoryData.level}
          levelTime={victoryData.time}
          deaths={victoryData.deaths}
          isAllCompleted={victoryData.isAllCompleted}
          totalSpeedrunTime={totalSpeedrunTime}
          totalDeaths={lifetimeDeaths}
          rankSubmitted={victoryData.rank}
          onNextLevel={handleNextLevel}
          onReplay={handleRestart}
          onOpenLevelSelect={() => {
            setVictoryData(null);
            setShowLevelSelect(true);
          }}
          onOpenLeaderboard={() => {
            setVictoryData(null);
            setShowLeaderboard(true);
          }}
          onShareTelegram={handleShareVictoryTelegram}
        />
      )}
    </main>
  );
}
