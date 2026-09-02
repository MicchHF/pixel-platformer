import React from 'react';
import { Gamepad2, Grid, Trophy, Edit3, Settings } from 'lucide-react';
import { haptics } from '../utils/telegram';

interface NavigationBarProps {
  activeScreen: 'game' | 'levels' | 'leaderboard' | 'editor' | 'settings';
  onNavigate: (screen: 'game' | 'levels' | 'leaderboard' | 'editor' | 'settings') => void;
  isCreatorMode?: boolean;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  activeScreen,
  onNavigate,
  isCreatorMode = false,
}) => {
  const handleNav = (screen: 'game' | 'levels' | 'leaderboard' | 'editor' | 'settings') => {
    haptics.selection();
    onNavigate(screen);
  };

  const navItems = [
    {
      id: 'game' as const,
      label: 'Игра',
      icon: Gamepad2,
      activeColor: 'text-cyan-400 border-cyan-500 bg-cyan-950/40',
    },
    {
      id: 'levels' as const,
      label: 'Уровни',
      icon: Grid,
      activeColor: 'text-emerald-400 border-emerald-500 bg-emerald-950/40',
    },
    {
      id: 'leaderboard' as const,
      label: 'Лидерборд',
      icon: Trophy,
      activeColor: 'text-amber-400 border-amber-500 bg-amber-950/40',
    },
    {
      id: 'editor' as const,
      label: isCreatorMode ? 'Редактор 👑' : 'Конструктор',
      icon: Edit3,
      activeColor: 'text-indigo-400 border-indigo-500 bg-indigo-950/40',
    },
    {
      id: 'settings' as const,
      label: 'Настройки',
      icon: Settings,
      activeColor: 'text-zinc-200 border-zinc-500 bg-zinc-800/80',
    },
  ];

  return (
    <nav 
      id="bottom-app-navigation"
      className="w-full bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/90 px-2 py-1 flex items-center justify-around z-30 shrink-0 font-mono select-none"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeScreen === item.id;

        return (
          <button
            key={item.id}
            id={`nav-btn-${item.id}`}
            onClick={() => handleNav(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2 sm:px-3 rounded-xl transition-all cursor-pointer ${
              isActive
                ? `${item.activeColor} border shadow-md scale-105 font-bold`
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
            }`}
          >
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] sm:text-[11px] mt-0.5 tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
