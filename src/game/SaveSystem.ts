import type { SaveData } from '../types';
import { migrateSaveData, CURRENT_SAVE_VERSION } from './SaveMigrations';

const SAVE_KEY = 'defense-power-save';

export function saveGame(data: SaveData): void {
  try {
    data.version = CURRENT_SAVE_VERSION;
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    console.error('Failed to save game');
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const migrated = migrateSaveData(parsed);
    if (!migrated) return null;
    return migrated as unknown as SaveData;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
