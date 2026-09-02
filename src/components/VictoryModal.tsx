import React from 'react';
import { Trophy, Skull, Timer, RotateCcw, ArrowRight, Award, Send } from 'lucide-react';
import { LevelData } from '../types/game';
import { formatHundredths } from '../utils/time';

interface VictoryModalProps {
  level: LevelData;
  levelTime: number;
  deaths: number;
  isAllCompleted: boolean;
  totalSpeedrunTime?: number;
  totalDeaths?: number;
  rankSubmitted?: number;
  onNextLevel: () => void;
  onReplay: () => void;
  onOpenLevelSelect: () => void;
  onOpenLeaderboard?: () => void;
  onShareTelegram?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  levelTime,
  deaths,
  isAllCompleted,
  totalSpeedrunTime,
  totalDeaths,
  rankSubmitted,
  onNextLevel,
  onReplay,
  onOpenLevelSelect,
  onOpenLeaderboard,
  onShareTelegram,
}) => {
  // Grade calculation
  let grade = 'A';
  let gradeColor = 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
  if (deaths === 0 && levelTime <= level.parTime * 0.9) {
    grade = 'S+';
    gradeColor = 'text-amber-300 border-amber-400 bg-amber-400/20 animate-pulse';
  } else if (deaths === 0) {
    grade = 'S';
    gradeColor = 'text-emerald-300 border-emerald-400 bg-emerald-400/20';
  } else if (deaths <= 3) {
    grade = 'A';
    gradeColor = 'text-cyan-300 border-cyan-400 bg-cyan-400/10';
  } else if (deaths <= 10) {
    grade = 'B';
    gradeColor = 'text-blue-400 border-blue-400 bg-blue-400/10';
  } else {
    grade = 'C';
    gradeColor = 'text-zinc-400 border-zinc-500 bg-zinc-800';
  }

  return (
    <div 
      id="victory-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono select-none animate-in fade-in duration-150"
    >
      <div 
        id="victory-modal"
        className="w-full max-w-md p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl space-y-4 sm:space-y-5 text-center"
      >
        {/* Triumph Icon */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/20 animate-bounce">
            <Trophy className="w-8 h-8" />
          </div>

          <h2 className="text-lg sm:text-xl font-black text-zinc-100 tracking-wider">
            {isAllCompleted ? '🔥 ИГРА ПОЛНОСТЬЮ ПРОЙДЕНА! 🔥' : 'УРОВЕНЬ ПРОЙДЕН!'}
          </h2>
          <p className="text-xs text-zinc-400">
            {level.name} · Par: {level.parTime}с
          </p>
        </div>

        {/* Stats Grid with Hundredths of a Second */}
        <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 rounded-xl bg-zinc-950/90 border border-zinc-800">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-500 font-bold mb-0.5">
              <Timer className="w-3.5 h-3.5 text-cyan-400" /> ВРЕМЯ
            </div>
            <span className="text-sm sm:text-base font-black text-cyan-300 tabular-nums">
              {formatHundredths(levelTime)}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-500 font-bold mb-0.5">
              <Skull className="w-3.5 h-3.5 text-rose-500" /> СМЕРТЕЙ
            </div>
            <span className="text-sm sm:text-base font-black text-rose-400 tabular-nums">
              {deaths}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-zinc-500 font-bold mb-0.5">
              <Award className="w-3.5 h-3.5 text-amber-400" /> РАНГ
            </div>
            <span className={`text-sm sm:text-base font-black px-2 py-0.5 rounded border ${gradeColor}`}>
              {grade}
            </span>
          </div>
        </div>

        {/* Leaderboard rank indicator */}
        {rankSubmitted !== undefined && rankSubmitted > 0 && (
          <div className="px-3 py-2 rounded-xl bg-amber-950/40 border border-amber-600/40 text-xs text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Ваше место в онлайн-топе: <span className="text-white underline">#{rankSubmitted}</span></span>
            </div>
            {onOpenLeaderboard && (
              <button
                onClick={onOpenLeaderboard}
                className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                Посмотреть
              </button>
            )}
          </div>
        )}

        {/* If Speedrun Completed */}
        {isAllCompleted && totalSpeedrunTime !== undefined && (
          <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-xs text-cyan-200">
            <div className="font-bold text-sm text-cyan-300 mb-1">🏆 Общий результат Спидрана:</div>
            <div>Все уровни пройдены за: <span className="font-bold text-white">{formatHundredths(totalSpeedrunTime)}</span></div>
            <div>Всего смертей: <span className="font-bold text-rose-300">{totalDeaths}</span></div>
          </div>
        )}

        {/* Social Share to Telegram Challenge */}
        {onShareTelegram && (
          <button
            onClick={onShareTelegram}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition shadow-md shadow-sky-600/30 cursor-pointer active:scale-98"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Вызов друзьям в Telegram («Побей мое время!»)</span>
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            id="victory-replay-btn"
            onClick={onReplay}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span>Заново (R)</span>
          </button>

          {!isAllCompleted ? (
            <button
              id="victory-next-btn"
              onClick={onNextLevel}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <span>Следующий</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onOpenLevelSelect}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition cursor-pointer"
            >
              <span>Все Уровни</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

