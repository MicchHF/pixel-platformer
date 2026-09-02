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
const O = TILES.ONE_WAY;

// Helper to create a 32x48 vertical room layout
export function makeLevel32x48(
  builder: (
    set: (c: number, r: number, t: number) => void,
    rect: (c: number, r: number, w: number, h: number, t: number) => void,
    hline: (c: number, r: number, len: number, t: number) => void,
    vline: (c: number, r: number, len: number, t: number) => void
  ) => void
): number[][] {
  const cols = 32;
  const rows = 48;
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

// 15 Vertical (32x48) Hardcore Campaign Levels
export const LEVELS: LevelData[] = [
  // 01: FIRST BLOOD (The Vertical Ascent)
  {
    id: 1,
    name: '01: FIRST BLOOD',
    difficulty: 'Hard',
    parTime: 4.5,
    cols: 32,
    rows: 48,
    hint: 'Жми ПРЫЖОК и РЫВОК для преодоления подъёма к порталу!',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom spawn platform and floor hazard
      hline(1, 46, 30, U);
      rect(1, 44, 6, 2, W);
      set(3, 43, S);

      // Stepping platforms going up
      rect(10, 41, 5, 1, W);
      rect(19, 37, 5, 1, W);
      rect(10, 33, 6, 1, W);
      rect(2, 29, 6, 1, W);
      rect(12, 25, 5, 1, W);
      rect(22, 21, 5, 1, W);
      rect(12, 17, 6, 1, W);
      rect(3, 13, 5, 1, W);
      rect(14, 9, 6, 1, W);

      // Dash crystals aiding mid-air traversal
      set(16, 39, Y);
      set(8, 27, Y);
      set(19, 15, Y);

      // Top goal platform
      rect(23, 6, 7, 2, W);
      set(26, 5, G);
    }),
  },

  // 02: WALL CLIMBER (The Twin Shafts)
  {
    id: 2,
    name: '02: WALL CLIMBER',
    difficulty: 'Hard',
    parTime: 5.2,
    cols: 32,
    rows: 48,
    hint: 'Скользи по внутренним стенам шахты и жми Прыжок для отскока.',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 44, 7, 2, W);
      set(3, 43, S);

      // Central climbing shaft
      vline(11, 10, 34, W);
      vline(19, 10, 34, W);

      // Inner and outer spikes
      hline(12, 44, 7, U);
      set(10, 38, L);
      set(20, 32, R);
      set(10, 24, L);
      set(20, 16, R);

      // Rest platforms inside shaft
      rect(12, 34, 3, 1, W);
      rect(16, 24, 3, 1, W);
      rect(12, 14, 3, 1, W);

      // Top exit platform
      rect(22, 8, 8, 2, W);
      set(26, 7, G);
    }),
  },

  // 03: AIR DASH AWAKENING (Crystal Leap)
  {
    id: 3,
    name: '03: AIR DASH AWAKENING',
    difficulty: 'Hard',
    parTime: 5.0,
    cols: 32,
    rows: 48,
    hint: 'Рывок в воздухе сквозь голубые алмазы моментально восстанавливает силы!',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 6, 3, W);
      set(3, 42, S);

      // Stepping stones with large gaps requiring dash
      rect(12, 39, 4, 1, W);
      set(8, 41, Y);

      rect(23, 34, 4, 1, W);
      set(18, 36, Y);

      rect(10, 28, 4, 1, W);
      set(17, 30, Y);

      rect(2, 22, 5, 1, W);
      set(6, 24, Y);

      rect(14, 16, 4, 1, W);
      set(8, 18, Y);

      rect(24, 11, 4, 1, W);
      set(19, 13, Y);

      // Top goal platform
      rect(8, 6, 8, 2, W);
      set(12, 5, G);
    }),
  },

  // 04: SPRINGBOARD TOWER
  {
    id: 4,
    name: '04: SPRINGBOARD TOWER',
    difficulty: 'Hard',
    parTime: 4.8,
    cols: 32,
    rows: 48,
    hint: 'Зелёные пружины подбрасывают высоко вверх. Управляй полётом!',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 7, 3, W);
      set(3, 42, S);

      // Springs & launching pillars
      rect(12, 43, 4, 3, W);
      set(13, 42, P);

      rect(22, 32, 4, 2, W);
      set(23, 31, P);

      rect(6, 23, 4, 2, W);
      set(7, 22, P);

      rect(20, 14, 4, 2, W);
      set(21, 13, P);

      // Spikes on walls to avoid while flying
      vline(1, 26, 6, R);
      vline(30, 18, 6, L);
      vline(1, 10, 6, R);

      // Top goal platform
      rect(8, 6, 7, 2, W);
      set(11, 5, G);
    }),
  },

  // 05: CRUMBLING SUMMIT
  {
    id: 5,
    name: '05: CRUMBLING SUMMIT',
    difficulty: 'Hard',
    parTime: 5.5,
    cols: 32,
    rows: 48,
    hint: 'Оранжевые блоки рушатся через долю секунды. Не останавливайся!',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 6, 3, W);
      set(3, 42, S);

      // Crumbling pathways
      hline(9, 41, 4, X);
      hline(17, 37, 4, X);
      hline(24, 33, 4, X);
      hline(16, 29, 4, X);
      hline(8, 25, 4, X);
      hline(2, 21, 4, X);
      hline(10, 17, 4, X);
      hline(18, 13, 4, X);
      hline(25, 9, 4, X);

      // Mid-point rest block
      rect(14, 21, 3, 1, W);

      // Top goal platform
      rect(10, 5, 8, 2, W);
      set(14, 4, G);
    }),
  },

  // 06: SAWBLADE GAUNTLET
  {
    id: 6,
    name: '06: SAWBLADE GAUNTLET',
    difficulty: 'Extreme',
    parTime: 5.8,
    cols: 32,
    rows: 48,
    hint: 'Круглые пилы патрулируют коридоры. Лови момент для рывка!',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 6, 3, W);
      set(3, 42, S);

      // Sheltered ledges
      rect(23, 38, 7, 2, W);
      rect(2, 31, 7, 2, W);
      rect(23, 24, 7, 2, W);
      rect(2, 17, 7, 2, W);
      rect(23, 10, 7, 2, W);

      // Spikes in corners
      hline(10, 39, 6, U);
      hline(10, 25, 6, U);

      // Top goal platform
      rect(8, 5, 8, 2, W);
      set(12, 4, G);
    }),
    saws: [
      { startX: 100, startY: 570, targetX: 380, targetY: 570, speed: 110 },
      { startX: 380, startY: 460, targetX: 100, targetY: 460, speed: 120 },
      { startX: 100, startY: 340, targetX: 380, targetY: 340, speed: 130 },
      { startX: 380, startY: 220, targetX: 100, targetY: 220, speed: 140 },
    ],
  },

  // 07: KEYMASTER'S DUNGEON
  {
    id: 7,
    name: '07: KEYMASTER\'S DUNGEON',
    difficulty: 'Extreme',
    parTime: 6.8,
    cols: 32,
    rows: 48,
    hint: 'Поднимись по левой шахте за Ключом, затем открой Ворота справа.',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 8, 3, W);
      set(3, 42, S);

      // Center divider wall
      vline(15, 12, 32, W);

      // Left branch: platforms leading to Key
      rect(2, 37, 5, 1, W);
      rect(9, 31, 4, 1, W);
      rect(2, 25, 5, 1, W);
      rect(9, 19, 4, 1, W);
      rect(3, 14, 5, 1, W);
      set(5, 12, K); // Key at top-left!

      // Locked door gate on right passage
      rect(16, 28, 6, 1, W);
      set(22, 28, B); // Door
      set(23, 28, B);

      // Right branch: platforms past door to Goal
      rect(24, 38, 6, 1, W);
      rect(17, 34, 5, 1, W);
      rect(24, 21, 6, 1, W);
      rect(18, 15, 5, 1, W);

      // Top goal platform
      rect(22, 7, 8, 2, W);
      set(26, 6, G);
    }),
  },

  // 08: LASER LABYRINTH
  {
    id: 8,
    name: '08: LASER LABYRINTH',
    difficulty: 'Extreme',
    parTime: 6.2,
    cols: 32,
    rows: 48,
    hint: 'Лазеры включаются циклом. Следи за таймингом и делай рывок!',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 6, 3, W);
      set(3, 42, S);

      // Safe ledge landings
      rect(24, 38, 6, 2, W);
      rect(2, 30, 6, 2, W);
      rect(24, 22, 6, 2, W);
      rect(2, 14, 6, 2, W);

      // Mid springs
      rect(13, 31, 4, 1, W);
      set(14, 30, P);
      rect(13, 15, 4, 1, W);
      set(14, 14, P);

      // Top goal platform
      rect(12, 6, 8, 2, W);
      set(16, 5, G);
    }),
    lasers: [
      { gridX: 7, gridY: 37, type: 'laser_h', length: 16, period: 2.0, activeTime: 1.0, phaseOffset: 0 },
      { gridX: 8, gridY: 29, type: 'laser_h', length: 15, period: 2.0, activeTime: 1.0, phaseOffset: 1.0 },
      { gridX: 7, gridY: 21, type: 'laser_h', length: 16, period: 2.0, activeTime: 1.0, phaseOffset: 0 },
      { gridX: 8, gridY: 13, type: 'laser_h', length: 15, period: 2.0, activeTime: 1.0, phaseOffset: 1.0 },
    ],
  },

  // 09: CELESTE PEAK
  {
    id: 9,
    name: '09: CELESTE PEAK',
    difficulty: 'Extreme',
    parTime: 7.0,
    cols: 32,
    rows: 48,
    hint: 'Сложные цепочки: отскок от стены -> кристалл рывка -> пружина -> рывок!',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 6, 3, W);
      set(3, 42, S);

      // Wall climbing pillar
      vline(10, 30, 12, W);
      vline(21, 20, 16, W);

      // Dash crystals and springs
      set(16, 38, Y);
      set(16, 28, Y);

      rect(2, 26, 4, 1, W);
      set(3, 25, P);

      rect(25, 17, 5, 1, W);
      set(27, 16, P);

      set(16, 12, Y);

      // Top goal platform
      rect(10, 6, 8, 2, W);
      set(14, 5, G);
    }),
  },

  // 10: PINPOINT PRECISION
  {
    id: 10,
    name: '10: PINPOINT PRECISION',
    difficulty: 'Extreme',
    parTime: 7.2,
    cols: 32,
    rows: 48,
    hint: 'Узкие проходы с шипами. Контролируй высоту прыжка силой нажатия!',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 6, 3, W);
      set(3, 42, S);

      // Alternating spiked ceiling corridors
      rect(10, 39, 14, 1, W);
      hline(10, 40, 14, D); // Spikes hanging underneath

      rect(7, 33, 14, 1, W);
      hline(7, 34, 14, D);

      rect(10, 27, 14, 1, W);
      hline(10, 28, 14, D);

      rect(7, 21, 14, 1, W);
      hline(7, 22, 14, D);

      rect(10, 15, 14, 1, W);
      hline(10, 16, 14, D);

      // Crystals on turning points
      set(27, 36, Y);
      set(4, 30, Y);
      set(27, 24, Y);
      set(4, 18, Y);

      // Top goal platform
      rect(12, 6, 8, 2, W);
      set(16, 5, G);
    }),
  },

  // 11: SPEEDRUN HIGHWAY
  {
    id: 11,
    name: '11: SPEEDRUN HIGHWAY',
    difficulty: 'Extreme',
    parTime: 4.2,
    cols: 32,
    rows: 48,
    hint: 'Серия пружин и кристаллов позволяет пролететь весь уровень без остановки!',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 6, 3, W);
      set(3, 42, S);

      // Bouncy launch chain
      rect(10, 43, 3, 2, W);
      set(11, 42, P);

      set(16, 33, Y);

      rect(22, 28, 3, 2, W);
      set(23, 27, P);

      set(16, 19, Y);

      rect(7, 14, 3, 2, W);
      set(8, 13, P);

      set(16, 7, Y);

      // Top goal platform
      rect(22, 5, 8, 2, W);
      set(26, 4, G);
    }),
  },

  // 12: DOUBLE LOCK HEIST
  {
    id: 12,
    name: '12: DOUBLE LOCK HEIST',
    difficulty: 'Impossible',
    parTime: 8.5,
    cols: 32,
    rows: 48,
    hint: 'Собери оба ключа в боковых камерах, избегая пил и шипов.',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 6, 3, W);
      set(3, 42, S);

      // Divider chambers
      vline(10, 16, 26, W);
      vline(21, 16, 26, W);

      // Key 1 (Left Chamber)
      rect(2, 28, 5, 1, W);
      set(4, 25, K);

      // Key 2 (Right Chamber)
      rect(24, 28, 5, 1, W);
      set(26, 25, K);

      // Middle gated gateway
      rect(11, 24, 10, 1, W);
      set(14, 24, B);
      set(17, 24, B);

      // Center climbing ledges
      rect(13, 36, 6, 1, W);
      rect(13, 16, 6, 1, W);
      rect(13, 10, 6, 1, W);

      // Top goal platform
      rect(12, 5, 8, 2, W);
      set(16, 4, G);
    }),
    saws: [
      { startX: 190, startY: 480, targetX: 320, targetY: 480, speed: 120 },
      { startX: 320, startY: 240, targetX: 190, targetY: 240, speed: 130 },
    ],
  },

  // 13: SAW CHAOS
  {
    id: 13,
    name: '13: SAW CHAOS',
    difficulty: 'Impossible',
    parTime: 7.8,
    cols: 32,
    rows: 48,
    hint: 'Хаос из 4 движущихся пил! Держи ритм рывка и не паникуй.',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 6, 3, W);
      set(3, 42, S);

      // Platforms with safe pockets
      rect(24, 37, 6, 2, W);
      rect(2, 29, 6, 2, W);
      rect(24, 21, 6, 2, W);
      rect(2, 13, 6, 2, W);

      // Central dash refills
      set(16, 33, Y);
      set(16, 25, Y);
      set(16, 17, Y);

      // Top goal platform
      rect(12, 5, 8, 2, W);
      set(16, 4, G);
    }),
    saws: [
      { startX: 80, startY: 560, targetX: 430, targetY: 560, speed: 140 },
      { startX: 430, startY: 430, targetX: 80, targetY: 430, speed: 150 },
      { startX: 80, startY: 300, targetX: 430, targetY: 300, speed: 150 },
      { startX: 430, startY: 170, targetX: 80, targetY: 170, speed: 160 },
    ],
  },

  // 14: THE ELEVATION PROTOCOL
  {
    id: 14,
    name: '14: THE ELEVATION PROTOCOL',
    difficulty: 'Impossible',
    parTime: 8.8,
    cols: 32,
    rows: 48,
    hint: 'Лазеры, осыпающиеся блоки и смертоносные пилы в едином комплексе.',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 6, 3, W);
      set(3, 42, S);

      // Crumble staircases
      hline(9, 40, 4, X);
      hline(17, 36, 4, X);
      hline(25, 32, 4, X);

      rect(18, 26, 5, 1, W);
      set(20, 25, P); // Spring launch!

      hline(2, 20, 4, X);
      hline(10, 16, 4, X);
      hline(18, 12, 4, X);

      // Dash crystal in mid air
      set(12, 24, Y);

      // Top goal platform
      rect(23, 6, 7, 2, W);
      set(26, 5, G);
    }),
    lasers: [
      { gridX: 6, gridY: 35, type: 'laser_h', length: 18, period: 2.4, activeTime: 1.2, phaseOffset: 0 },
      { gridX: 6, gridY: 18, type: 'laser_h', length: 18, period: 2.4, activeTime: 1.2, phaseOffset: 1.2 },
    ],
    saws: [
      { startX: 90, startY: 430, targetX: 420, targetY: 430, speed: 140 },
    ],
  },

  // 15: APEX HELL (FINAL MASTER LEVEL)
  {
    id: 15,
    name: '15: APEX HELL',
    difficulty: 'Impossible',
    parTime: 9.9,
    cols: 32,
    rows: 48,
    hint: 'Финальное восхождение. Докажи своё превосходство и покори вершину!',
    grid: makeLevel32x48((set, rect, hline, vline) => {
      // Bottom floor
      hline(1, 46, 30, U);
      rect(1, 43, 6, 3, W);
      set(3, 42, S);

      // Section 1: Crumble & Lasers
      hline(9, 40, 3, X);
      hline(16, 37, 3, X);
      hline(23, 34, 3, X);

      // Section 2: Spring & Dash Crystal through spikes
      rect(26, 29, 4, 1, W);
      set(28, 28, P);

      set(16, 25, Y);
      rect(2, 22, 5, 1, W);

      // Section 3: Key and Door
      set(4, 19, K); // Key on high ledge
      vline(15, 8, 14, W);
      rect(16, 14, 6, 1, W);
      set(19, 14, B); // Gate

      rect(23, 10, 6, 1, W);

      // Top goal apex
      rect(6, 5, 8, 2, W);
      set(10, 4, G);
    }),
    lasers: [
      { gridX: 6, gridY: 36, type: 'laser_h', length: 20, period: 2.2, activeTime: 1.1, phaseOffset: 0 },
      { gridX: 16, gridY: 12, type: 'laser_h', length: 14, period: 2.0, activeTime: 1.0, phaseOffset: 1.0 },
    ],
    saws: [
      { startX: 100, startY: 480, targetX: 410, targetY: 480, speed: 160 },
      { startX: 410, startY: 260, targetX: 100, targetY: 260, speed: 170 },
    ],
  },
];
