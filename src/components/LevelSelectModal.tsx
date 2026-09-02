import React, { useState } from 'react';
import { X, Play, Trophy, Skull, Timer, Star, Edit3, Trash2, AlertTriangle, Plus, ShieldCheck, Lock } from 'lucide-react';
import { LevelData, LevelRecord } from '../types/game';
import { formatHundredths } from '../utils/time';
import { haptics } from '../utils/telegram';
import { LevelThumbnail } from './LevelThumbnail';

interface LevelSelectModalProps {
  levels: LevelData[];
  currentLevelId: number;
  records: Record<number, LevelRecord>;
  isCreatorMode?: boolean;
  onSelectLevel: (level: LevelData) => void;
  onDeleteLevel?: (levelId: number) => void;
  onOpenEditor?: () => void;
  onOpenLeaderboard?: () => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  levels,
  currentLevelId,
  records,
  isCreatorMode = false,
  onSelectLevel,
  onDeleteLevel,
  onOpenEditor,
  onOpenLeaderboard,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'campaign' | 'custom'>('campaign');
  const [levelToDelete, setLevelToDelete] = useState<LevelData | null>(null);

  const campaignLevels = levels.filter((l) => l.id <= 15);
  const customLevels = levels.filter((l) => l.id > 15);

  const difficultyColors = {
    Hard: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    Brutal: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    Extreme: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    Nightmare: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    Impossible: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  };

  const handleConfirmDelete = () => {
    if (levelToDelete && onDeleteLevel) {
      haptics.medium();
      onDeleteLevel(levelToDelete.id);
      setLevelToDelete(null);
    }
  };

  const displayedLevels = activeTab === 'campaign' ? campaignLevels : customLevels;

  return (
    <div 
      id="level-select-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md select-none font-mono animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        id="level-select-modal"
        className="w-full max-w-3xl max-h-[90dvh] flex flex-col rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Delete Confirmation Overlay */}
        {levelToDelete && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md p-6 rounded-2xl bg-zinc-900 border border-rose-700/80 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-600 flex items-center justify-center mx-auto text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Удалить эту карту?</h3>
                <p className="text-xs text-zinc-300 font-semibold truncate px-2">
                  «{levelToDelete.name}» (ID: {levelToDelete.id})
                </p>
                <p className="text-[11px] text-zinc-400">
                  Карта и статистика по ней будут навсегда удалены.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLevelToDelete(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  Да, удалить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-zinc-800 bg-zinc-950 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-700/50 text-cyan-400">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-100 uppercase tracking-wider">
                Выбор Уровня
              </h2>
              <p className="text-[11px] text-zinc-400">
                15 Испытаний Кампании + Ваши Карты
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenLeaderboard && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLeaderboard();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/70 hover:bg-amber-900 border border-amber-600/70 text-amber-300 text-xs font-bold transition cursor-pointer shadow-xs shadow-amber-500/20"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Лидерборд</span>
              </button>
            )}

            {onOpenEditor && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEditor();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 text-xs font-bold transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Конструктор</span>
              </button>
            )}

            <button
              id="close-level-select-btn"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Campaign vs Custom */}
        <div className="flex items-center px-4 sm:px-6 pt-3 pb-2 gap-2 bg-zinc-950/70 border-b border-zinc-800 shrink-0">
          <button
            onClick={() => {
              setActiveTab('campaign');
              haptics.selection();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'campaign'
                ? 'bg-cyan-500/20 border border-cyan-500/60 text-cyan-300 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Кампания ({campaignLevels.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('custom');
              haptics.selection();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-indigo-500/20 border border-indigo-500/60 text-indigo-300 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Мои Карты ({customLevels.length})</span>
          </button>

          {activeTab === 'custom' && onOpenEditor && (
            <button
              onClick={() => {
                onClose();
                onOpenEditor();
              }}
              className="ml-auto flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать Карту</span>
            </button>
          )}
        </div>

        {/* Level Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 custom-scrollbar">
          {displayedLevels.length === 0 && activeTab === 'custom' ? (
            <div className="col-span-full py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-950/80 border border-indigo-700/60 flex items-center justify-center mx-auto text-indigo-400">
                <Edit3 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-zinc-300">У вас пока нет пользовательских карт</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Создавайте свои собственные экстремальные уровни с пилами, шипами и лазерами в конструкторе!
              </p>
              {onOpenEditor && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenEditor();
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg cursor-pointer"
                >
                  ➕ Открыть Конструктор
                </button>
              )}
            </div>
          ) : (
            displayedLevels.map((lvl) => {
              const rec = records[lvl.id];
              const isCurrent = lvl.id === currentLevelId;
              const isCompleted = rec?.completed;
              const isCampaign = lvl.id <= 15;

              return (
                <div
                  key={lvl.id}
                  id={`level-card-${lvl.id}`}
                  onClick={() => {
                    haptics.selection();
                    onSelectLevel(lvl);
                    onClose();
                  }}
                  className={`group relative flex flex-col text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400'
                      : isCompleted
                      ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 hover:border-zinc-500'
                      : 'bg-zinc-900/70 hover:bg-zinc-800/80 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {/* Top Row: Title, Tag, Delete */}
                  <div className="flex items-center justify-between gap-1.5 mb-2">
                    <span className="font-bold text-xs sm:text-sm text-zinc-100 truncate flex-1">
                      {lvl.name}
                    </span>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${difficultyColors[lvl.difficulty]}`}>
                        {lvl.difficulty}
                      </span>

                      {/* Delete button: only for custom levels or if creator mode */}
                      {onDeleteLevel && (!isCampaign || isCreatorMode) && levels.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLevelToDelete(lvl);
                          }}
                          className="p-1 rounded-md text-zinc-500 hover:text-rose-300 hover:bg-rose-950/80 transition cursor-pointer"
                          title="Удалить карту"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visual Preview + Info row */}
                  <div className="flex items-start gap-2.5 mb-2.5">
                    <LevelThumbnail level={lvl} size={64} />
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-16">
                      <div className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                        {lvl.hint || 'Преодолей все шипы и доберись до портала!'}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Цель (Par): <span className="text-cyan-300 font-bold">{lvl.parTime}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Stats */}
                  <div className="mt-auto pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-zinc-300">
                      <Timer className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="tabular-nums font-semibold">{formatHundredths(rec?.bestTime)}</span>
                    </div>

                    {rec?.completed ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center text-rose-400 text-[11px]">
                          <Skull className="w-3 h-3 mr-0.5 text-rose-500" />
                          <span>{rec.deaths}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">
                          ПРОЙДЕН
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-500 uppercase">Не пройден</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-t border-zinc-800 bg-zinc-950 text-xs text-zinc-400 shrink-0">
          <span>Нажмите на карточку уровня для старта</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
