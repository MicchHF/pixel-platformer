import React, { useState } from 'react';
import { X, Play, Trophy, Skull, Timer, Star, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { LevelData, LevelRecord } from '../types/game';
import { formatHundredths } from '../utils/time';

interface LevelSelectModalProps {
  levels: LevelData[];
  currentLevelId: number;
  records: Record<number, LevelRecord>;
  onSelectLevel: (level: LevelData) => void;
  onDeleteLevel?: (levelId: number) => void;
  onOpenEditor?: () => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  levels,
  currentLevelId,
  records,
  onSelectLevel,
  onDeleteLevel,
  onOpenEditor,
  onClose,
}) => {
  const [levelToDelete, setLevelToDelete] = useState<LevelData | null>(null);

  const difficultyColors = {
    Hard: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    Brutal: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    Extreme: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    Nightmare: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
    Impossible: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  };

  const handleConfirmDelete = () => {
    if (levelToDelete && onDeleteLevel) {
      onDeleteLevel(levelToDelete.id);
      setLevelToDelete(null);
    }
  };

  return (
    <div 
      id="level-select-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div 
        id="level-select-modal"
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden font-mono relative"
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
                  Карта и вся статистика по ней будут навсегда удалены.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLevelToDelete(null)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30 cursor-pointer"
                >
                  Да, удалить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-zinc-100 uppercase tracking-wider">
              Выбор Уровня ({levels.length} Испытаний)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onOpenEditor && (
              <button
                onClick={() => {
                  onClose();
                  onOpenEditor();
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 text-xs font-bold transition cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Редактор карт</span>
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

        {/* Level Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 custom-scrollbar">
          {levels.map((lvl) => {
            const rec = records[lvl.id];
            const isCurrent = lvl.id === currentLevelId;
            const isCompleted = rec?.completed;

            return (
              <div
                key={lvl.id}
                id={`level-card-${lvl.id}`}
                onClick={() => {
                  onSelectLevel(lvl);
                  onClose();
                }}
                className={`group relative flex flex-col text-left p-4 rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400'
                    : isCompleted
                    ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 hover:border-zinc-500'
                    : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {/* Top Row: Name & Tag & Delete Button */}
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <span className="font-bold text-sm text-zinc-100 truncate flex-1">{lvl.name}</span>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${difficultyColors[lvl.difficulty]}`}>
                      {lvl.difficulty}
                    </span>

                    {onDeleteLevel && levels.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLevelToDelete(lvl);
                        }}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-950/80 border border-transparent hover:border-rose-800/80 transition cursor-pointer"
                        title="Удалить карту"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Par time & Hint */}
                <div className="text-[11px] text-zinc-400 mb-3 line-clamp-1">
                  Par: <span className="text-cyan-300 font-semibold">{lvl.parTime}s</span> · {lvl.hint || 'Уворачивайся от опасностей'}
                </div>

                {/* Stats Row */}
                <div className="mt-auto pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Timer className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="tabular-nums font-semibold">{formatHundredths(rec?.bestTime)}</span>
                  </div>

                  {rec ? (
                    <div className="flex items-center gap-1 text-rose-400">
                      <Skull className="w-3.5 h-3.5 text-rose-500" />
                      <span>{rec.deaths}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-500 uppercase">Новый</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800 bg-zinc-950 text-xs text-zinc-400">
          <span>Совет: Нажми <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">R</kbd> для мгновенного перезапуска</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
