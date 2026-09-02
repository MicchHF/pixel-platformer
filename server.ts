import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory + File Persisted Leaderboard Storage
interface ServerLeaderboardEntry {
  id: string;
  levelId: number;
  playerName: string;
  username?: string;
  tgId?: string | number;
  time: number; // in seconds, e.g. 12.34
  deaths: number;
  platform?: 'telegram' | 'web';
  timestamp: number;
  grade?: string;
}

const DATA_FILE = path.join(process.cwd(), 'leaderboard_data.json');

// Initial seed entries with realistic hundredths times
const INITIAL_SEEDS: ServerLeaderboardEntry[] = [
  // Level 1
  { id: 'seed-1-1', levelId: 1, playerName: 'CyberNinja', username: 'cyber_ninja', time: 5.42, deaths: 0, platform: 'telegram', timestamp: Date.now() - 3600000 * 24, grade: 'S+' },
  { id: 'seed-1-2', levelId: 1, playerName: 'PixelDash', username: 'pixeldash_tg', time: 6.18, deaths: 0, platform: 'telegram', timestamp: Date.now() - 3600000 * 18, grade: 'S' },
  { id: 'seed-1-3', levelId: 1, playerName: 'SpeedDemon', username: 'speedy_boy', time: 7.05, deaths: 1, platform: 'web', timestamp: Date.now() - 3600000 * 12, grade: 'A' },
  { id: 'seed-1-4', levelId: 1, playerName: 'NeonRider', username: 'neon_rider', time: 8.32, deaths: 2, platform: 'telegram', timestamp: Date.now() - 3600000 * 6, grade: 'A' },
  
  // Level 2
  { id: 'seed-2-1', levelId: 2, playerName: 'CyberNinja', username: 'cyber_ninja', time: 7.84, deaths: 0, platform: 'telegram', timestamp: Date.now() - 3600000 * 22, grade: 'S+' },
  { id: 'seed-2-2', levelId: 2, playerName: 'ShadowLeap', username: 'shadow_leap', time: 8.92, deaths: 1, platform: 'telegram', timestamp: Date.now() - 3600000 * 15, grade: 'S' },
  { id: 'seed-2-3', levelId: 2, playerName: 'PixelDash', username: 'pixeldash_tg', time: 9.45, deaths: 2, platform: 'web', timestamp: Date.now() - 3600000 * 10, grade: 'A' },

  // Level 3
  { id: 'seed-3-1', levelId: 3, playerName: 'SpeedDemon', username: 'speedy_boy', time: 9.15, deaths: 0, platform: 'web', timestamp: Date.now() - 3600000 * 20, grade: 'S+' },
  { id: 'seed-3-2', levelId: 3, playerName: 'NeonRider', username: 'neon_rider', time: 10.68, deaths: 1, platform: 'telegram', timestamp: Date.now() - 3600000 * 14, grade: 'S' },
  { id: 'seed-3-3', levelId: 3, playerName: 'CyberNinja', username: 'cyber_ninja', time: 11.24, deaths: 2, platform: 'telegram', timestamp: Date.now() - 3600000 * 8, grade: 'A' },

  // Level 4
  { id: 'seed-4-1', levelId: 4, playerName: 'PixelDash', username: 'pixeldash_tg', time: 11.02, deaths: 0, platform: 'telegram', timestamp: Date.now() - 3600000 * 16, grade: 'S+' },
  { id: 'seed-4-2', levelId: 4, playerName: 'ShadowLeap', username: 'shadow_leap', time: 12.45, deaths: 1, platform: 'telegram', timestamp: Date.now() - 3600000 * 9, grade: 'S' },

  // Level 5
  { id: 'seed-5-1', levelId: 5, playerName: 'SpeedDemon', username: 'speedy_boy', time: 13.80, deaths: 0, platform: 'web', timestamp: Date.now() - 3600000 * 11, grade: 'S+' },
  { id: 'seed-5-2', levelId: 5, playerName: 'CyberNinja', username: 'cyber_ninja', time: 14.92, deaths: 2, platform: 'telegram', timestamp: Date.now() - 3600000 * 5, grade: 'A' },
];

let leaderboardStore: ServerLeaderboardEntry[] = [];

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      leaderboardStore = JSON.parse(raw);
    } else {
      leaderboardStore = [...INITIAL_SEEDS];
      saveData();
    }
  } catch (err) {
    console.error('Error loading leaderboard data:', err);
    leaderboardStore = [...INITIAL_SEEDS];
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(leaderboardStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving leaderboard data:', err);
  }
}

loadData();

// ================= API ROUTES =================

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET /api/leaderboard?levelId=1&limit=50
app.get('/api/leaderboard', (req: Request, res: Response) => {
  try {
    const levelIdParam = req.query.levelId;
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 30));

    if (levelIdParam === 'all' || !levelIdParam) {
      // Global Leaderboard - best speedrunners aggregated across completed levels
      const playerMap = new Map<string, {
        id: string;
        playerName: string;
        username?: string;
        tgId?: string | number;
        totalTime: number;
        totalDeaths: number;
        levelsCompleted: number;
        platform?: 'telegram' | 'web';
        timestamp: number;
        bestScores: Record<number, number>;
      }>();

      for (const entry of leaderboardStore) {
        const key = String(entry.tgId || entry.username || entry.playerName).toLowerCase();
        let p = playerMap.get(key);
        if (!p) {
          p = {
            id: entry.id,
            playerName: entry.playerName,
            username: entry.username,
            tgId: entry.tgId,
            totalTime: 0,
            totalDeaths: 0,
            levelsCompleted: 0,
            platform: entry.platform,
            timestamp: entry.timestamp,
            bestScores: {},
          };
          playerMap.set(key, p);
        }

        // Keep best score per level for player
        if (!p.bestScores[entry.levelId] || entry.time < p.bestScores[entry.levelId]) {
          p.bestScores[entry.levelId] = entry.time;
          p.totalDeaths += entry.deaths;
        }
      }

      // Calculate total speedrun time for each player
      const globalList = Array.from(playerMap.values()).map((p) => {
        const times = Object.values(p.bestScores);
        const total = times.reduce((a, b) => a + b, 0);
        return {
          id: p.id,
          playerName: p.playerName,
          username: p.username,
          tgId: p.tgId,
          totalTime: Math.round(total * 100) / 100,
          totalDeaths: p.totalDeaths,
          levelsCompleted: times.length,
          platform: p.platform,
          timestamp: p.timestamp,
        };
      });

      // Sort by levels completed DESC, then total time ASC
      globalList.sort((a, b) => {
        if (b.levelsCompleted !== a.levelsCompleted) {
          return b.levelsCompleted - a.levelsCompleted;
        }
        return a.totalTime - b.totalTime;
      });

      res.json({
        type: 'global',
        count: globalList.length,
        entries: globalList.slice(0, limit),
      });
      return;
    }

    const levelId = parseInt(levelIdParam as string, 10);
    const levelEntries = leaderboardStore.filter((e) => e.levelId === levelId);

    // Group by player key to keep only their single best time on this level
    const bestByPlayer = new Map<string, ServerLeaderboardEntry>();
    for (const e of levelEntries) {
      const key = String(e.tgId || e.username || e.playerName).toLowerCase();
      const existing = bestByPlayer.get(key);
      if (!existing || e.time < existing.time || (e.time === existing.time && e.deaths < existing.deaths)) {
        bestByPlayer.set(key, e);
      }
    }

    const sorted = Array.from(bestByPlayer.values()).sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time;
      if (a.deaths !== b.deaths) return a.deaths - b.deaths;
      return a.timestamp - b.timestamp;
    });

    res.json({
      levelId,
      count: sorted.length,
      entries: sorted.slice(0, limit),
    });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/leaderboard/submit
app.post('/api/leaderboard/submit', (req: Request, res: Response) => {
  try {
    const { levelId, time, deaths, playerName, username, tgId, platform, grade } = req.body;

    if (typeof levelId !== 'number' || typeof time !== 'number' || time <= 0.5) {
      res.status(400).json({ error: 'Invalid payload or unrealistic speedrun time.' });
      return;
    }

    const cleanName = (typeof playerName === 'string' && playerName.trim()) ? playerName.trim().slice(0, 30) : 'Бегущий';
    const cleanUsername = (typeof username === 'string' && username.trim()) ? username.trim().slice(0, 35) : undefined;
    const cleanTime = Math.round(time * 100) / 100;
    const cleanDeaths = Math.max(0, parseInt(deaths, 10) || 0);

    const playerKey = String(tgId || cleanUsername || cleanName).toLowerCase();

    // Check existing score
    const existingIndex = leaderboardStore.findIndex((e) => 
      e.levelId === levelId && 
      String(e.tgId || e.username || e.playerName).toLowerCase() === playerKey
    );

    let isNewRecord = false;
    let entryId = `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (existingIndex !== -1) {
      const existing = leaderboardStore[existingIndex];
      if (cleanTime < existing.time || (cleanTime === existing.time && cleanDeaths < existing.deaths)) {
        isNewRecord = true;
        leaderboardStore[existingIndex] = {
          ...existing,
          playerName: cleanName,
          username: cleanUsername || existing.username,
          time: cleanTime,
          deaths: cleanDeaths,
          platform: platform === 'telegram' ? 'telegram' : (existing.platform || 'web'),
          timestamp: Date.now(),
          grade: grade || existing.grade,
        };
        entryId = existing.id;
      }
    } else {
      isNewRecord = true;
      const newEntry: ServerLeaderboardEntry = {
        id: entryId,
        levelId,
        playerName: cleanName,
        username: cleanUsername,
        tgId: tgId || undefined,
        time: cleanTime,
        deaths: cleanDeaths,
        platform: platform === 'telegram' ? 'telegram' : 'web',
        timestamp: Date.now(),
        grade,
      };
      leaderboardStore.push(newEntry);
    }

    if (isNewRecord) {
      saveData();
    }

    // Calculate user's current rank on this level
    const levelEntries = leaderboardStore
      .filter((e) => e.levelId === levelId)
      .sort((a, b) => a.time - b.time || a.deaths - b.deaths);

    const rank = levelEntries.findIndex((e) => String(e.tgId || e.username || e.playerName).toLowerCase() === playerKey) + 1;

    res.json({
      success: true,
      isNewRecord,
      rank: rank > 0 ? rank : 1,
      totalEntries: levelEntries.length,
      time: cleanTime,
    });
  } catch (err) {
    console.error('Error submitting score:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/leaderboard/batch-sync
app.post('/api/leaderboard/batch-sync', (req: Request, res: Response) => {
  try {
    const { playerName, username, tgId, platform, records } = req.body;
    if (!records || typeof records !== 'object') {
      res.status(400).json({ error: 'Invalid records map.' });
      return;
    }

    const cleanName = (typeof playerName === 'string' && playerName.trim()) ? playerName.trim().slice(0, 30) : 'Бегущий';
    const cleanUsername = (typeof username === 'string' && username.trim()) ? username.trim().slice(0, 35) : undefined;
    const playerKey = String(tgId || cleanUsername || cleanName).toLowerCase();

    let updatedCount = 0;

    for (const [lvlIdStr, rec] of Object.entries(records)) {
      const levelId = parseInt(lvlIdStr, 10);
      const record = rec as { bestTime?: number; deaths?: number; completed?: boolean };
      if (!levelId || !record || !record.completed || typeof record.bestTime !== 'number' || record.bestTime <= 0.5) {
        continue;
      }

      const cleanTime = Math.round(record.bestTime * 100) / 100;
      const cleanDeaths = Math.max(0, record.deaths || 0);

      const existingIndex = leaderboardStore.findIndex((e) => 
        e.levelId === levelId && 
        String(e.tgId || e.username || e.playerName).toLowerCase() === playerKey
      );

      if (existingIndex !== -1) {
        const existing = leaderboardStore[existingIndex];
        if (cleanTime < existing.time) {
          leaderboardStore[existingIndex] = {
            ...existing,
            playerName: cleanName,
            username: cleanUsername || existing.username,
            time: cleanTime,
            deaths: cleanDeaths,
            platform: platform === 'telegram' ? 'telegram' : existing.platform,
            timestamp: Date.now(),
          };
          updatedCount++;
        }
      } else {
        leaderboardStore.push({
          id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          levelId,
          playerName: cleanName,
          username: cleanUsername,
          tgId: tgId || undefined,
          time: cleanTime,
          deaths: cleanDeaths,
          platform: platform === 'telegram' ? 'telegram' : 'web',
          timestamp: Date.now(),
        });
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      saveData();
    }

    res.json({ success: true, updatedCount });
  } catch (err) {
    console.error('Error in batch sync:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ================= VITE MIDDLEWARE & STATIC =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎮 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
