import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HUD } from './components/HUD';
import { GameCanvas } from './components/GameCanvas';
import { LevelSelectModal } from './components/LevelSelectModal';
import { SettingsModal } from './components/SettingsModal';
import { LevelEditor } from './components/LevelEditor';
import { EmbedDrawer } from './components/EmbedDrawer';
import { VictoryModal } from './components/VictoryModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { NavigationBar } from './components/NavigationBar';
import { LEVELS } from './game/levels';
import { THEMES } from './game/themes';
import { sounds } from './audio/soundManager';
import { GameEngineState, initLevelState } from './game/physics';
import { LevelData, LevelRecord, ThemeName } from './types/game';
import { initTelegram, haptics, shareScoreToTelegram, TelegramUserData } from './utils/telegram';
import { submitScoreToLeaderboard, batchSyncRecords } from './services/leaderboardApi';
import { fetchServerBaseLevels } from './services/levelsApi';
import { formatHundredths } from './utils/time';
import { Swords, X as CloseIcon } from 'lucide-react';

const STORAGE_KEY = 'hardcore_pixel_platformer_v1';
const LIFETIME_DEATHS_KEY = 'hardcore_pixel_platformer_lifetime_deaths';
const CUSTOM_LEVELS_STORAGE_KEY = 'hardcore_pixel_platformer_custom_levels_v5_20x30';
const PLAYER_NAME_KEY = 'pixel_platformer_player_name';
const CREATOR_MODE_KEY = 'hardcore_platformer_creator_mode';

function loadStoredLevels(): LevelData[] {
  try {
    if (typeof window === 'undefined') return LEVELS;
    
    // Check if user has custom created levels
    const stored = localStorage.getItem(CUSTOM_LEVELS_STORAGE_KEY);
    if (!stored) {
      // Save current 18x18 levels
      try {
        localStorage.setItem(CUSTOM_LEVELS_STORAGE_KEY, JSON.stringify(LEVELS));
      } catch {}
      return LEVELS;
    }

    const parsed: LevelData[] = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) return LEVELS;

    // Filter only genuine custom user levels (id > 15)
    const customOnly = parsed.filter((lvl) => lvl.id > 15);
    
    // Always guarantee the official 15 campaign levels are fresh 18x18 maps
    const merged = [...LEVELS, ...customOnly];
    return merged;
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

  // Creator Mode State (Allows admin to edit campaign levels 1-15)
  const [isCreatorMode, setIsCreatorMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(CREATOR_MODE_KEY) === 'true';
      } catch {}
    }
    return false;
  });

  const handleToggleCreatorMode = useCallback((enabled: boolean) => {
    setIsCreatorMode(enabled);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CREATOR_MODE_KEY, enabled ? 'true' : 'false');
      } catch {}
    }
  }, []);

  // Parse URL query parameters
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

  useEffect(() => {
    sounds.setMuted(isMuted);
    sounds.setSfxVolume(sfxVolume);
    sounds.setBgmVolume(bgmVolume);
  }, [isMuted, sfxVolume, bgmVolume]);

  // Synchronize server base levels across all players/devices
  useEffect(() => {
    fetchServerBaseLevels().then((serverLevels) => {
      if (serverLevels && Array.isArray(serverLevels) && serverLevels.length > 0) {
        setLevels((prev) => {
          const customOnly = prev.filter((l) => l.id > 15);
          const serverIds = new Set(serverLevels.map((l) => l.id));
          const nonConflictingCustom = customOnly.filter((l) => !serverIds.has(l.id));
          const updated = [...serverLevels, ...nonConflictingCustom];
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(CUSTOM_LEVELS_STORAGE_KEY, JSON.stringify(updated));
            } catch {}
          }
          return updated;
        });
      }
    });
  }, []);

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

  // Modal Views State
  const [showLevelSelect, setShowLevelSelect] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [showEmbedDrawer, setShowEmbedDrawer] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [victoryData, setVictoryData] = useState<{
    level: LevelData;
    time: number;
    deaths: number;
    isAllCompleted: boolean;
    rank?: number;
  } | null>(null);

  // Active Screen Calculation for bottom nav
  const activeNavScreen = useMemo<'game' | 'levels' | 'leaderboard' | 'editor' | 'settings'>(() => {
    if (showEditor) return 'editor';
    if (showLeaderboard) return 'leaderboard';
    if (showLevelSelect) return 'levels';
    if (showSettings) return 'settings';
    return 'game';
  }, [showEditor, showLeaderboard, showLevelSelect, showSettings]);

  const handleBottomNav = (screen: 'game' | 'levels' | 'leaderboard' | 'editor' | 'settings') => {
    setShowLevelSelect(false);
    setShowLeaderboard(false);
    setShowEditor(false);
    setShowSettings(false);
    setShowEmbedDrawer(false);

    if (screen === 'levels') setShowLevelSelect(true);
    else if (screen === 'leaderboard') setShowLeaderboard(true);
    else if (screen === 'editor') setShowEditor(true);
    else if (screen === 'settings') setShowSettings(true);
  };

  // Sync lifetime stats and level records to storage
  const saveRecords = (newRecords: Record<number, LevelRecord>) => {
    setRecords(newRecords);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newRecords));
      } catch {}
    }
  };

  // Sync batch records online
  useEffect(() => {
    if (Object.keys(records).length > 0) {
      batchSyncRecords(
        playerName,
        records,
        tgUser.username,
        tgUser.id,
        tgUser.id ? 'telegram' : 'web'
      ).catch(() => {});
    }
  }, [records, tgUser, playerName]);

  // Handlers
  const handleUpdateHUD = useCallback((player: GameEngineState['player'], time: number, deaths: number) => {
    setHudPlayer(player);
    setHudTime(time);
    setHudDeaths(deaths);
  }, []);

  const handlePlayerDeath = useCallback((levelId: number, currentDeaths: number) => {
    setLifetimeDeaths((prev) => {
      const next = prev + 1;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LIFETIME_DEATHS_KEY, next.toString());
        } catch {}
      }
      return next;
    });

    setRecords((prev) => {
      const existing = prev[levelId] || { completed: false, bestTime: 999999, deaths: 0 };
      const updated = {
        ...prev,
        [levelId]: {
          ...existing,
          deaths: (existing.deaths || 0) + 1,
        },
      };
      saveRecords(updated);
      return updated;
    });
  }, []);

  const handleLevelComplete = useCallback(async (levelId: number, time: number, currentDeaths: number) => {
    sounds.playWin();

    // Check if new record
    const existing = records[levelId];
    const isNewBest = !existing || !existing.completed || time < existing.bestTime;
    const bestTime = isNewBest ? time : existing.bestTime;

    const updatedRecords = {
      ...records,
      [levelId]: {
        completed: true,
        bestTime,
        deaths: (existing?.deaths || 0) + currentDeaths,
      },
    };
    saveRecords(updatedRecords);

    // Check if all levels completed
    const allCompleted = levels.every((lvl) => updatedRecords[lvl.id]?.completed);

    // Online submission
    let rank: number | undefined;
    try {
      const resp = await submitScoreToLeaderboard({
        levelId,
        time,
        deaths: currentDeaths,
        tgId: tgUser.id,
        username: tgUser.username,
        playerName,
      });
      if (resp.success && resp.rank) {
        rank = resp.rank;
      }
    } catch {}

    const completedLvl = levels.find((l) => l.id === levelId) || currentLevel;
    setVictoryData({
      level: completedLvl,
      time,
      deaths: currentDeaths,
      isAllCompleted: allCompleted,
      rank,
    });
  }, [records, levels, currentLevel, tgUser, playerName]);

  const handleNextLevel = () => {
    setVictoryData(null);
    if (currentLevelIndex < levels.length - 1) {
      setCurrentLevelIndex(currentLevelIndex + 1);
    } else {
      setShowLevelSelect(true);
    }
  };

  const handleSelectLevel = useCallback((lvl: LevelData) => {
    const idx = levels.findIndex((l) => l.id === lvl.id);
    if (idx !== -1) {
      setCurrentLevelIndex(idx);
    } else {
      setLevels((prev) => [...prev, lvl]);
      setCurrentLevelIndex(levels.length);
    }
    setHudTime(0);
    setHudDeaths(0);
    setIsPaused(false);
  }, [levels]);

  const handleRestart = useCallback(() => {
    setRestartSignal((prev) => prev + 1);
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    sounds.setMuted(nextMuted);
  };

  const handleToggleBgm = () => {
    if (isBgmPlaying) {
      sounds.stopBgm();
      setIsBgmPlaying(false);
    } else {
      sounds.startBgm();
      setIsBgmPlaying(true);
    }
  };

  const handleSfxVolume = (vol: number) => {
    setSfxVolume(vol);
    sounds.setSfxVolume(vol);
  };

  const handleBgmVolume = (vol: number) => {
    setBgmVolume(vol);
    sounds.setBgmVolume(vol);
  };

  const handleResetProgress = () => {
    setRecords({});
    setLifetimeDeaths(0);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LIFETIME_DEATHS_KEY);
      } catch {}
    }
    sounds.playDeath();
  };

  // Custom Level Management (Save/Reset/Delete)
  const handleSaveLevel = (savedLevel: LevelData, asNew?: boolean) => {
    let nextLevels: LevelData[];
    if (asNew) {
      nextLevels = [...levels, savedLevel];
    } else {
      const idx = levels.findIndex((l) => l.id === savedLevel.id);
      if (idx !== -1) {
        nextLevels = [...levels];
        nextLevels[idx] = savedLevel;
      } else {
        nextLevels = [...levels, savedLevel];
      }
    }
    setLevels(nextLevels);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CUSTOM_LEVELS_STORAGE_KEY, JSON.stringify(nextLevels));
      } catch {}
    }
  };

  const handleResetLevel = (levelId: number) => {
    const defaultLevel = LEVELS.find((l) => l.id === levelId);
    if (defaultLevel) {
      const nextLevels = levels.map((l) => (l.id === levelId ? defaultLevel : l));
      setLevels(nextLevels);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CUSTOM_LEVELS_STORAGE_KEY, JSON.stringify(nextLevels));
        } catch {}
      }
    }
  };

  const handleDeleteLevel = (levelId: number) => {
    const nextLevels = levels.filter((l) => l.id !== levelId);
    setLevels(nextLevels);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CUSTOM_LEVELS_STORAGE_KEY, JSON.stringify(nextLevels));
      } catch {}
    }
    if (currentLevel.id === levelId) {
      setCurrentLevelIndex(0);
    }
  };

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
      {/* Friend Challenge Notice Banner */}
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
        isCreatorMode={isCreatorMode}
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

      {/* Main Game Canvas Viewport */}
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

      {/* Bottom Navigation Bar */}
      <NavigationBar
        activeScreen={activeNavScreen}
        onNavigate={handleBottomNav}
        isCreatorMode={isCreatorMode}
      />

      {/* Modals */}
      {showLevelSelect && (
        <LevelSelectModal
          levels={levels}
          currentLevelId={currentLevel.id}
          records={records}
          isCreatorMode={isCreatorMode}
          onSelectLevel={handleSelectLevel}
          onDeleteLevel={handleDeleteLevel}
          onOpenEditor={() => setShowEditor(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
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
          isCreatorMode={isCreatorMode}
          onToggleCreatorMode={handleToggleCreatorMode}
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
