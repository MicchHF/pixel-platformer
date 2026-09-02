import { LevelData } from '../types/game';
import { TILES } from './constants';

const C = TILES.EMPTY;
const W = TILES.SOLID;
const M = TILES.SMOOTH;
const U = TILES.SPIKE_UP;
const D = TILES.SPIKE_DOWN;
const L = TILES.SPIKE_LEFT;
const R = TILES.SPIKE_RIGHT;
const S = TILES.SPAWN;
const G = TILES.GOAL;
const P = TILES.SPRING;
const K = TILES.KEY;
const B = TILES.DOOR;
const X = TILES.CRUMBLE;
const Y = TILES.DASH_CRYSTAL;

// Helper to create a 20x30 vertical room layout
export function makeLevel20x30(
  builder: (
    set: (c: number, r: number, t: number) => void,
    rect: (c: number, r: number, w: number, h: number, t: number) => void,
    hline: (c: number, r: number, len: number, t: number) => void,
    vline: (c: number, r: number, len: number, t: number) => void
  ) => void
): number[][] {
  const cols = 20;
  const rows = 30;
  const grid: number[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        return M; // Perimeter smooth anti-cling wall
      }
      return C;
    })
  );

  const set = (c: number, r: number, t: number) => {
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      grid[r][c] = t;
    }
  };

  const rect = (c: number, r: number, w: number, h: number, t: number) => {
    for (let y = r; y < r + h; y++) {
      for (let x = c; x < c + w; x++) {
        set(x, y, t);
      }
    }
  };

  const hline = (c: number, r: number, len: number, t: number) => {
    for (let x = c; x < c + len; x++) {
      set(x, r, t);
    }
  };

  const vline = (c: number, r: number, len: number, t: number) => {
    for (let y = r; y < r + len; y++) {
      set(c, y, t);
    }
  };

  builder(set, rect, hline, vline);
  return grid;
}

// 15 Vertical (20x30) Hardcore Campaign Levels
export const LEVELS: LevelData[] = [
  // 01: FIRST ASCENT
  {
    id: 1,
    name: '01: FIRST ASCENT',
    difficulty: 'Hard',
    parTime: 3.5,
    cols: 20,
    rows: 30,
    hint: 'Жми ПРЫЖОК и РЫВОК для преодоления подъёма к порталу!',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      // Bottom floor spikes & spawn
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      // Stepping platforms
      rect(8, 24, 4, 1, W);
      rect(14, 21, 4, 1, W);
      rect(7, 17, 4, 1, W);
      rect(2, 13, 4, 1, W);
      rect(9, 9, 4, 1, W);

      // Dash crystal
      set(14, 15, Y);

      // Goal
      rect(14, 5, 5, 2, W);
      set(16, 4, G);
    }),
  },

  // 02: WALL CLIMBER
  {
    id: 2,
    name: '02: WALL CLIMBER',
    difficulty: 'Hard',
    parTime: 4.2,
    cols: 20,
    rows: 30,
    hint: 'Скользи по стенам шахты и отпрыгивай вверх.',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      // Shaft walls
      vline(7, 8, 20, W);
      vline(12, 8, 20, W);

      // Inside spikes
      set(6, 20, L);
      set(13, 14, R);

      // Shaft rest ledges
      rect(8, 22, 2, 1, W);
      rect(10, 16, 2, 1, W);
      rect(8, 10, 2, 1, W);

      // Goal at top right
      rect(14, 6, 5, 2, W);
      set(16, 5, G);
    }),
  },

  // 03: AIR DASH AWAKENING
  {
    id: 3,
    name: '03: AIR DASH AWAKENING',
    difficulty: 'Hard',
    parTime: 4.0,
    cols: 20,
    rows: 30,
    hint: 'Кристалл в воздухе мгновенно перезаряжает рывок!',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      rect(13, 23, 4, 1, W);
      set(8, 24, Y);

      rect(3, 18, 4, 1, W);
      set(10, 19, Y);

      rect(13, 13, 4, 1, W);
      set(7, 14, Y);

      rect(4, 8, 4, 1, W);
      set(11, 9, Y);

      // Top goal
      rect(13, 4, 5, 2, W);
      set(15, 3, G);
    }),
  },

  // 04: SPRINGBOARD TOWER
  {
    id: 4,
    name: '04: SPRINGBOARD TOWER',
    difficulty: 'Hard',
    parTime: 3.8,
    cols: 20,
    rows: 30,
    hint: 'Зелёные пружины подбрасывают высоко вверх!',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      rect(7, 26, 3, 2, W);
      set(8, 25, P);

      rect(14, 19, 3, 2, W);
      set(15, 18, P);

      rect(3, 12, 3, 2, W);
      set(4, 11, P);

      // Wall hazard
      vline(18, 11, 6, L);
      vline(1, 16, 5, R);

      // Goal
      rect(12, 5, 6, 2, W);
      set(15, 4, G);
    }),
  },

  // 05: CRUMBLING SUMMIT
  {
    id: 5,
    name: '05: CRUMBLING SUMMIT',
    difficulty: 'Hard',
    parTime: 4.5,
    cols: 20,
    rows: 30,
    hint: 'Оранжевые блоки рушатся под ногами. Не медли!',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      hline(7, 24, 3, X);
      hline(13, 21, 3, X);
      hline(8, 18, 3, X);
      hline(2, 15, 3, X);
      hline(8, 12, 3, X);
      hline(14, 9, 3, X);

      rect(4, 5, 5, 2, W);
      set(6, 4, G);
    }),
  },

  // 06: SAWBLADE GAUNTLET
  {
    id: 6,
    name: '06: SAWBLADE GAUNTLET',
    difficulty: 'Extreme',
    parTime: 4.8,
    cols: 20,
    rows: 30,
    hint: 'Круглые пилы патрулируют этажи. Выбирай момент для рывка!',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      rect(14, 22, 5, 2, W);
      rect(1, 17, 5, 2, W);
      rect(14, 12, 5, 2, W);

      rect(4, 6, 6, 2, W);
      set(6, 5, G);
    }),
    saws: [
      { startX: 60, startY: 340, targetX: 240, targetY: 340, speed: 120 },
      { startX: 240, startY: 260, targetX: 60, targetY: 260, speed: 130 },
      { startX: 60, startY: 180, targetX: 240, targetY: 180, speed: 140 },
    ],
  },

  // 07: KEYMASTER'S KEEP
  {
    id: 7,
    name: '07: KEYMASTER\'S KEEP',
    difficulty: 'Extreme',
    parTime: 5.5,
    cols: 20,
    rows: 30,
    hint: 'Поднимись за ключом слева и открой дверь к порталу справа.',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      // Center wall
      vline(9, 8, 20, W);

      // Left climb to key
      rect(2, 21, 3, 1, W);
      rect(5, 16, 3, 1, W);
      rect(2, 11, 4, 1, W);
      set(3, 9, K); // Key!

      // Door on right side
      rect(10, 18, 4, 1, W);
      set(14, 18, B); // Door
      rect(15, 18, 4, 1, W);

      rect(11, 12, 4, 1, W);

      // Goal
      rect(13, 5, 6, 2, W);
      set(16, 4, G);
    }),
  },

  // 08: LASER LABYRINTH
  {
    id: 8,
    name: '08: LASER LABYRINTH',
    difficulty: 'Extreme',
    parTime: 5.0,
    cols: 20,
    rows: 30,
    hint: 'Лазеры включаются циклом. Следи за таймингом!',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      rect(14, 23, 5, 2, W);
      rect(1, 17, 5, 2, W);
      rect(14, 11, 5, 2, W);

      set(8, 20, Y);
      set(8, 14, Y);

      rect(4, 5, 6, 2, W);
      set(6, 4, G);
    }),
    lasers: [
      { gridX: 4, gridY: 22, type: 'laser_h', length: 11, period: 2.0, activeTime: 1.0, phaseOffset: 0 },
      { gridX: 4, gridY: 16, type: 'laser_h', length: 11, period: 2.0, activeTime: 1.0, phaseOffset: 1.0 },
      { gridX: 4, gridY: 10, type: 'laser_h', length: 11, period: 2.0, activeTime: 1.0, phaseOffset: 0 },
    ],
  },

  // 09: CELESTE PEAK
  {
    id: 9,
    name: '09: CELESTE PEAK',
    difficulty: 'Extreme',
    parTime: 5.8,
    cols: 20,
    rows: 30,
    hint: 'Комбинируй пружину, рывки сквозь кристаллы и отскоки от стен!',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      vline(7, 18, 8, W);
      rect(13, 22, 3, 2, W);
      set(14, 21, P);

      set(10, 15, Y);
      rect(2, 13, 4, 1, W);

      vline(13, 8, 8, W);
      set(8, 9, Y);

      rect(13, 4, 6, 2, W);
      set(16, 3, G);
    }),
  },

  // 10: PINPOINT PRECISION
  {
    id: 10,
    name: '10: PINPOINT PRECISION',
    difficulty: 'Extreme',
    parTime: 6.0,
    cols: 20,
    rows: 30,
    hint: 'Узкие коридоры с шипами. Контролируй силу прыжка!',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      rect(7, 24, 10, 1, W);
      hline(7, 25, 10, D);

      rect(3, 19, 10, 1, W);
      hline(3, 20, 10, D);

      rect(7, 14, 10, 1, W);
      hline(7, 15, 10, D);

      rect(3, 9, 10, 1, W);
      hline(3, 10, 10, D);

      set(16, 21, Y);
      set(3, 16, Y);
      set(16, 11, Y);

      rect(12, 4, 6, 2, W);
      set(15, 3, G);
    }),
  },

  // 11: SPEEDRUN HIGHWAY
  {
    id: 11,
    name: '11: SPEEDRUN HIGHWAY',
    difficulty: 'Extreme',
    parTime: 3.2,
    cols: 20,
    rows: 30,
    hint: 'Пружины и кристаллы позволяют пролететь трассу за секунды!',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      rect(7, 26, 3, 2, W);
      set(8, 25, P);

      set(10, 19, Y);

      rect(14, 16, 3, 2, W);
      set(15, 15, P);

      set(8, 9, Y);

      rect(12, 4, 6, 2, W);
      set(15, 3, G);
    }),
  },

  // 12: DOUBLE LOCK
  {
    id: 12,
    name: '12: DOUBLE LOCK',
    difficulty: 'Impossible',
    parTime: 6.8,
    cols: 20,
    rows: 30,
    hint: 'Собери 2 ключа на боковых уступах для открытия прохода.',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      vline(6, 10, 16, W);
      vline(13, 10, 16, W);

      // Key 1 (left)
      rect(2, 17, 3, 1, W);
      set(3, 15, K);

      // Key 2 (right)
      rect(15, 17, 3, 1, W);
      set(16, 15, K);

      // Middle gated bridge
      rect(7, 15, 6, 1, W);
      set(9, 15, B);
      set(10, 15, B);

      // Center climb
      rect(8, 22, 4, 1, W);
      rect(8, 9, 4, 1, W);

      // Goal
      rect(8, 4, 5, 2, W);
      set(10, 3, G);
    }),
    saws: [
      { startX: 110, startY: 310, targetX: 200, targetY: 310, speed: 110 },
    ],
  },

  // 13: SAW CHAOS
  {
    id: 13,
    name: '13: SAW CHAOS',
    difficulty: 'Impossible',
    parTime: 6.2,
    cols: 20,
    rows: 30,
    hint: 'Три скоростные пилы! Держи ритм рывка и не останавливайся.',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      rect(14, 23, 5, 2, W);
      rect(1, 17, 5, 2, W);
      rect(14, 11, 5, 2, W);

      set(10, 20, Y);
      set(10, 14, Y);

      rect(4, 5, 6, 2, W);
      set(6, 4, G);
    }),
    saws: [
      { startX: 40, startY: 370, targetX: 260, targetY: 370, speed: 130 },
      { startX: 260, startY: 270, targetX: 40, targetY: 270, speed: 140 },
      { startX: 40, startY: 180, targetX: 260, targetY: 180, speed: 150 },
    ],
  },

  // 14: THE ELEVATION PROTOCOL
  {
    id: 14,
    name: '14: THE ELEVATION PROTOCOL',
    difficulty: 'Impossible',
    parTime: 7.2,
    cols: 20,
    rows: 30,
    hint: 'Осыпающиеся блоки, лазеры и пилы на пути к вершине!',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      hline(6, 24, 3, X);
      hline(12, 21, 3, X);

      rect(14, 16, 3, 2, W);
      set(15, 15, P);

      hline(2, 12, 3, X);
      hline(8, 9, 3, X);

      set(7, 16, Y);

      rect(13, 4, 6, 2, W);
      set(16, 3, G);
    }),
    lasers: [
      { gridX: 3, gridY: 21, type: 'laser_h', length: 12, period: 2.2, activeTime: 1.1, phaseOffset: 0 },
      { gridX: 3, gridY: 11, type: 'laser_h', length: 12, period: 2.2, activeTime: 1.1, phaseOffset: 1.1 },
    ],
    saws: [
      { startX: 50, startY: 280, targetX: 250, targetY: 280, speed: 130 },
    ],
  },

  // 15: APEX HELL
  {
    id: 15,
    name: '15: APEX HELL',
    difficulty: 'Impossible',
    parTime: 8.0,
    cols: 20,
    rows: 30,
    hint: 'Финальное восхождение. Докажи своё абсолютное мастерство!',
    grid: makeLevel20x30((set, rect, hline, vline) => {
      hline(1, 28, 18, U);
      rect(1, 26, 4, 2, W);
      set(2, 25, S);

      // Section 1: Crumble & Lasers
      hline(6, 24, 3, X);
      hline(12, 21, 3, X);

      // Section 2: Spring & Dash Crystal
      rect(15, 17, 3, 2, W);
      set(16, 16, P);

      set(9, 15, Y);
      rect(2, 13, 3, 1, W);
      set(3, 11, K); // Key

      // Section 3: Gated Door
      vline(9, 5, 8, W);
      rect(10, 10, 4, 1, W);
      set(13, 10, B); // Gate

      rect(14, 7, 4, 1, W);

      // Top Goal
      rect(3, 4, 5, 2, W);
      set(5, 3, G);
    }),
    lasers: [
      { gridX: 3, gridY: 22, type: 'laser_h', length: 14, period: 2.0, activeTime: 1.0, phaseOffset: 0 },
      { gridX: 10, gridY: 8, type: 'laser_h', length: 8, period: 2.0, activeTime: 1.0, phaseOffset: 1.0 },
    ],
    saws: [
      { startX: 50, startY: 310, targetX: 260, targetY: 310, speed: 140 },
      { startX: 260, startY: 170, targetX: 50, targetY: 170, speed: 150 },
    ],
  },
];
