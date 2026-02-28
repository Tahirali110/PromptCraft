/**
 * lib/history.ts
 * Persists and retrieves generation sessions from AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OrchestrationResult } from './orchestrator';

const KEY = 'promptcraft_history';

export async function saveToHistory(result: OrchestrationResult): Promise<void> {
  try {
    const existing = await loadHistory();
    // Check if item already exists by timestamp
    const index = existing.findIndex((h) => h.timestamp === result.timestamp);
    let updated: OrchestrationResult[];
    if (index !== -1) {
      updated = [...existing];
      updated[index] = result;
    } else {
      // Keep newest first, cap at 50 entries
      updated = [result, ...existing].slice(0, 50);
    }
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save history', e);
  }
}

export async function loadHistory(): Promise<OrchestrationResult[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OrchestrationResult[]) : [];
  } catch {
    return [];
  }
}

export async function deleteHistoryItem(timestamp: number): Promise<void> {
  try {
    const existing = await loadHistory();
    const updated = existing.filter((h) => h.timestamp !== timestamp);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete history item', e);
  }
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
