import { LevelData } from '../types/game';

export interface BaseLevelsResponse {
  success: boolean;
  levels: LevelData[] | null;
  count?: number;
}

export async function fetchServerBaseLevels(): Promise<LevelData[] | null> {
  try {
    const res = await fetch('/api/base-levels');
    if (!res.ok) return null;
    const data: BaseLevelsResponse = await res.json();
    if (data.success && Array.isArray(data.levels) && data.levels.length > 0) {
      return data.levels;
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch server base levels:', err);
    return null;
  }
}

export async function saveLevelAsServerBase(level: LevelData): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/save-level-as-base', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { success: Boolean(data.success), message: data.message };
  } catch (err) {
    console.error('Error saving level as base on server:', err);
    return { success: false, message: (err as Error).message };
  }
}

export async function saveAllLevelsAsServerBase(levels: LevelData[]): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/save-base-levels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levels }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { success: Boolean(data.success), message: data.message };
  } catch (err) {
    console.error('Error saving all levels on server:', err);
    return { success: false, message: (err as Error).message };
  }
}

export async function resetServerBaseLevels(): Promise<{ success: boolean }> {
  try {
    const res = await fetch('/api/reset-base-levels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return { success: res.ok };
  } catch (err) {
    console.error('Error resetting server base levels:', err);
    return { success: false };
  }
}
