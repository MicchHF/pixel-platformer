import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trophy, 
  X, 
  Send, 
  RefreshCw, 
  Award, 
  Medal, 
  Skull, 
  Timer, 
  User, 
  Copy, 
  Check, 
  Share2, 
  Flame, 
  Sparkles,
  ExternalLink,
  Bot
} from 'lucide-react';
import { LevelData, LeaderboardEntry, GlobalSpeedrunEntry } from '../types/game';
import { formatHundredths } from '../utils/time';
import { fetchLevelLeaderboard, fetchGlobalLeaderboard } from '../services/leaderboardApi';
import { shareScoreToTelegram, copyToClipboard, haptics, TelegramUserData } from '../utils/telegram';

interface LeaderboardModalProps {
  levels: LevelData[];
  currentLevelId: number;
  telegramUser?: TelegramUserData;
  tgUser?: TelegramUserData;
  theme?: any;
  localRecords?: any;
  playerName: string;
  onUpdatePlayerName?: (newName: string) => void;
  onClose: () => void;
  onSelectLevel?: (level: LevelData) => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  levels,
  currentLevelId,
  telegramUser,
  tgUser,
  playerName,
  onUpdatePlayerName,
  onClose,
  onSelectLevel,
}) => {
  const activeTgUser = telegramUser || tgUser || { isTelegram: false };
  const [activeTab, setActiveTab] = useState<'level' | 'global' | 'telegram'>('level');
  const [selectedLevelId, setSelectedLevelId] = useState<number>(currentLevelId);
  
  const [levelEntries, setLevelEntries] = useState<LeaderboardEntry[]>([]);
  const [globalEntries, setGlobalEntries] = useState<GlobalSpeedrunEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(playerName);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const selectedLevel = levels.find((l) => l.id === selectedLevelId) || levels[0];

  const [refreshKey, setRefreshKey] = useState<number>(0);
  const loadLeaderboard = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Load Leaderboard Data
  useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);

    const run = async () => {
      try {
        if (activeTab === 'level') {
          const data = await fetchLevelLeaderboard(selectedLevelId);
          if (isSubscribed) setLevelEntries(data);
        } else if (activeTab === 'global' || activeTab === 'telegram') {
          const data = await fetchGlobalLeaderboard();
          if (isSubscribed) setGlobalEntries(data);
        }
      } catch (err) {
        console.error('Failed to load leaderboard', err);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    run();

    return () => {
      isSubscribed = false;
    };
  }, [activeTab, selectedLevelId, refreshKey]);

  // Save custom nickname
  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = nameInput.trim().slice(0, 24);
    if (clean) {
      if (typeof onUpdatePlayerName === 'function') {
        onUpdatePlayerName(clean);
      }
      setIsEditingName(false);
      haptics.success();
    }
  };

  // Telegram Share
  const handleShareChallenge = () => {
    haptics.medium();
    const currentBest = levelEntries.find(
      (e) => String(e.tgId || e.username || e.playerName).toLowerCase() === String(activeTgUser.id || activeTgUser.username || playerName).toLowerCase()
    );
    const timeStr = currentBest ? formatHundredths(currentBest.time) : '00:10.00';
    const deaths = currentBest ? currentBest.deaths : 0;

    shareScoreToTelegram({
      levelName: selectedLevel.name,
      levelId: selectedLevel.id,
      timeStr,
      deaths,
    });
  };

  const handleCopyAppUrl = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedLink(true);
      haptics.success();
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div 
      id="leaderboard-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md font-mono select-none animate-in fade-in duration-200"
    >
      <div 
        id="leaderboard-modal"
        className="w-full max-w-2xl max-h-[90dvh] flex flex-col bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-zinc-950 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-zinc-100 flex items-center gap-2">
                ТАБЛИЦА РЕКОРДОВ <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700/50 text-cyan-400 font-bold">ONLINE</span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Соревнуйтесь с друзьями и игроками в реальном времени
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                haptics.light();
                loadLeaderboard();
              }}
              disabled={isLoading}
              title="Обновить таблицу"
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={() => {
                haptics.light();
                onClose();
              }}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* User Status Strip / Profile */}
        <div className="px-4 sm:px-6 py-2 bg-zinc-950/70 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[11px]">Игрок:</span>
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={24}
                  autoFocus
                  placeholder="Ваш никнейм"
                  className="px-2 py-0.5 rounded bg-zinc-900 border border-cyan-500 text-cyan-300 text-xs font-bold focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold cursor-pointer"
                >
                  OK
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-bold transition cursor-pointer text-xs"
                title="Нажмите чтобы изменить имя"
              >
                <User className="w-3 h-3 text-cyan-400" />
                <span>{playerName}</span>
                {activeTgUser.username && (
                  <span className="text-[10px] text-cyan-400">(@{activeTgUser.username})</span>
                )}
                {activeTgUser.isTelegram && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    TG
                  </span>
                )}
              </button>
            )}
          </div>

          <button
            onClick={handleShareChallenge}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-md shadow-sky-600/30 cursor-pointer active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Вызов друзьям в TG</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/90 px-4 sm:px-6 pt-2 gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => {
              haptics.selection();
              setActiveTab('level');
            }}
            className={`flex items-center gap-1.5 pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'level'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Timer className="w-3.5 h-3.5" />
            <span>По Уровням</span>
          </button>

          <button
            onClick={() => {
              haptics.selection();
              setActiveTab('global');
            }}
            className={`flex items-center gap-1.5 pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'global'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Общий Спидран Топ</span>
          </button>

          <button
            onClick={() => {
              haptics.selection();
              setActiveTab('telegram');
            }}
            className={`flex items-center gap-1.5 pb-2 px-3 text-xs font-bold transition border-b-2 cursor-pointer ${
              activeTab === 'telegram'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Telegram & Друзья</span>
          </button>
        </div>

        {/* Level Selector Bar (only visible when in 'level' tab) */}
        {activeTab === 'level' && (
          <div className="px-4 sm:px-6 py-2.5 bg-zinc-950/60 border-b border-zinc-800/80 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
            <span className="text-xs text-zinc-400 font-bold shrink-0">Уровень:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
              {levels.map((lvl) => (
                <button
                  key={`lvl-pill-${lvl.id}`}
                  onClick={() => {
                    haptics.selection();
                    setSelectedLevelId(lvl.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                    lvl.id === selectedLevelId
                      ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-600/50'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700/60'
                  }`}
                >
                  {lvl.id}. {lvl.name.split(':')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'level' && (
            <div>
              {/* Level summary banner */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {selectedLevel.name}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Par: {selectedLevel.parTime}s
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">{selectedLevel.hint || 'Доберитесь до портала за минимальное время!'}</p>
                </div>
                {onSelectLevel && (
                  <button
                    onClick={() => {
                      onSelectLevel(selectedLevel);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shrink-0"
                  >
                    Играть этот уровень
                  </button>
                )}
              </div>

              {/* Table */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs">Загрузка рекордов...</span>
                </div>
              ) : levelEntries.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 bg-zinc-950/40 rounded-xl border border-zinc-800/80 p-6">
                  <Trophy className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-zinc-300">Пока нет рекордов на этом уровне</p>
                  <p className="text-xs text-zinc-500 mt-1">Пройдите уровень чтобы стать первым в таблице лидеров!</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 overflow-hidden shadow-inner">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3">Игрок</th>
                        <th className="py-2.5 px-3 text-right">Время</th>
                        <th className="py-2.5 px-3 text-center hidden sm:table-cell">Смерти</th>
                        <th className="py-2.5 px-3 text-center hidden sm:table-cell">Ранг</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {levelEntries.map((entry, idx) => {
                        const rankNum = idx + 1;
                        const isTop1 = rankNum === 1;
                        const isTop2 = rankNum === 2;
                        const isTop3 = rankNum === 3;
                        const isMe = String(entry.tgId || entry.username || entry.playerName).toLowerCase() === 
                          String(activeTgUser.id || activeTgUser.username || playerName).toLowerCase();

                        return (
                          <tr
                            key={entry.id || `entry-${idx}`}
                            className={`transition ${
                              isMe
                                ? 'bg-cyan-950/40 font-bold text-cyan-200 border-l-2 border-cyan-400'
                                : isTop1
                                ? 'bg-amber-500/10 hover:bg-amber-500/15'
                                : 'hover:bg-zinc-800/40 text-zinc-300'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              {isTop1 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                                  🥇
                                </span>
                              ) : isTop2 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-zinc-400/20 text-zinc-200 border border-zinc-400/40 text-xs font-black">
                                  🥈
                                </span>
                              ) : isTop3 ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 text-xs font-black">
                                  🥉
                                </span>
                              ) : (
                                <span className="text-zinc-500 text-xs font-semibold">{rankNum}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                                  {entry.playerName}
                                </span>
                                {entry.username && (
                                  <span className="text-[10px] text-zinc-500 hidden xs:inline">
                                    @{entry.username}
                                  </span>
                                )}
                                {entry.platform === 'telegram' && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                    TG
                                  </span>
                                )}
                                {isMe && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                                    ВЫ
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={`tabular-nums font-bold text-sm tracking-wider ${
                                isTop1 ? 'text-amber-300' : 'text-cyan-400'
                              }`}>
                                {formatHundredths(entry.time)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center hidden sm:table-cell text-zinc-400">
                              <span className="text-rose-400 font-semibold">{entry.deaths}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center hidden sm:table-cell">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-zinc-300">
                                {entry.grade || 'S'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'global' && (
            <div>
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Абсолютный Спидран Топ
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Суммарное лучшее время прохождения всех уровней игры
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <span className="text-xs">Загрузка мирового топа...</span>
                </div>
              ) : globalEntries.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 bg-zinc-950/40 rounded-xl border border-zinc-800/80 p-6">
                  <Award className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-zinc-300">Пока нет записей полного прохождения</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 overflow-hidden shadow-inner">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3">Игрок</th>
                        <th className="py-2.5 px-3 text-center">Пройдено</th>
                        <th className="py-2.5 px-3 text-right">Общее Время</th>
                        <th className="py-2.5 px-3 text-center hidden sm:table-cell">Смертей</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {globalEntries.map((entry, idx) => {
                        const rankNum = idx + 1;
                        const isTop1 = rankNum === 1;
                        const isTop2 = rankNum === 2;
                        const isTop3 = rankNum === 3;
                        const isMe = String(entry.tgId || entry.username || entry.playerName).toLowerCase() === 
                          String(activeTgUser.id || activeTgUser.username || playerName).toLowerCase();

                        return (
                          <tr
                            key={entry.id || `global-${idx}`}
                            className={`transition ${
                              isMe
                                ? 'bg-amber-950/40 font-bold text-amber-200 border-l-2 border-amber-400'
                                : isTop1
                                ? 'bg-amber-500/10'
                                : 'hover:bg-zinc-800/40 text-zinc-300'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-bold">
                              {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : rankNum}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{entry.playerName}</span>
                                {entry.username && (
                                  <span className="text-[10px] text-zinc-500 hidden sm:inline">
                                    @{entry.username}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-300 font-bold text-[11px]">
                                {entry.levelsCompleted} / {levels.length}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className="tabular-nums font-bold text-amber-400 text-sm">
                                {formatHundredths(entry.totalTime)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center hidden sm:table-cell text-rose-400">
                              {entry.totalDeaths}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'telegram' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-200 space-y-3">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                  <Bot className="w-5 h-5" />
                  <span>Как играть в Telegram с друзьями</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Эта игра оптимизирована как <strong>Telegram WebApp / Mini App</strong>: с поддержкой тактильной отдачи (Haptic feedback), авто-распознаванием Telegram профиля и онлайн-таблицей лидеров.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleShareChallenge}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-600/30 transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Отправить приглашение друзьям в Telegram</span>
                  </button>

                  <button
                    onClick={handleCopyAppUrl}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-zinc-700 transition cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                    <span>{copiedLink ? 'Ссылка скопирована!' : 'Скопировать URL игры'}</span>
                  </button>
                </div>
              </div>

              {/* Bot Setup Instructions */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Подключение к вашему Telegram боту (@BotFather):
                </h4>
                <ol className="text-xs text-zinc-400 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Откройте официального бота <strong>@BotFather</strong> в Telegram.</li>
                  <li>Отправьте команду <code className="text-cyan-300 bg-zinc-900 px-1 py-0.5 rounded">/newapp</code> и выберите вашего бота.</li>
                  <li>Введите название приложения: <code className="text-zinc-200">Hardcore Pixel Platformer</code>.</li>
                  <li>В поле <strong>Web App URL</strong> вставьте ссылку на это приложение.</li>
                  <li>Готово! Теперь кнопка запуска приложения доступна в профиле бота и в личных сообщениях.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="px-4 sm:px-6 py-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Синхронизация с сервером включена</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition cursor-pointer"
          >
            Закрыть
          </button>
        </footer>
      </div>
    </div>
  );
};
