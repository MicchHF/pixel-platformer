import { LeaderboardEntry, GlobalSpeedrunEntry } from '../types/game';
import { roundToHundredths } from '../utils/time';

export interface LeaderboardResult {
  levelId: number;
  count: number;
  entries: LeaderboardEntry[];
}

export interface GlobalLeaderboardResult {
  type: 'global';
  count: number;
  entries: GlobalSpeedrunEntry[];
}

export interface SubmitScorePayload {
  levelId: number;
  time: number; // in seconds
  deaths: number;
  playerName: string;
  username?: string;
  tgId?: string | number;
  platform?: 'telegram' | 'web';
  grade?: string;
}

export async function fetchLevelLeaderboard(levelId: number): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`/api/leaderboard?levelId=${levelId}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data: LeaderboardResult = await res.json();
    return data.entries || [];
  } catch (err) {
    console.warn('Failed to fetch level leaderboard:', err);
    return [];
  }
}

export async function fetchGlobalLeaderboard(): Promise<GlobalSpeedrunEntry[]> {
  try {
    const res = await fetch('/api/leaderboard?levelId=all');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data: GlobalLeaderboardResult = await res.json();
    return data.entries || [];
  } catch (err) {
    console.warn('Failed to fetch global leaderboard:', err);
    return [];
  }
}

export async function submitScoreToLeaderboard(payload: SubmitScorePayload): Promise<{
  success: boolean;
  rank?: number;
  isNewRecord?: boolean;
}> {
  try {
    const cleanPayload = {
      ...payload,
      time: roundToHundredths(payload.time),
    };
    const res = await fetch('/api/leaderboard/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanPayload),
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to submit score to online leaderboard:', err);
    return { success: false };
  }
}

export async function batchSyncRecords(
  playerName: string,
  records: Record<number, { bestTime: number; deaths: number; completed: boolean }>,
  username?: string,
  tgId?: string | number,
  platform?: 'telegram' | 'web'
): Promise<boolean> {
  try {
    const res = await fetch('/api/leaderboard/batch-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName,
        username,
        tgId,
        platform,
        records,
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to sync records batch:', err);
    return false;
  }
}
