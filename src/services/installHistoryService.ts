import AsyncStorage from '@react-native-async-storage/async-storage';

const HISTORY_KEY = '@savano_store/install_history';
const MAX_HISTORY_ITEMS = 30;

export interface InstallHistoryEntry {
  packageId: string;
  name: string;
  versionName: string;
  versionCode: number;
  installedAt: string;
}

export async function loadInstallHistory(): Promise<InstallHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as InstallHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function appendInstallHistory(
  entry: InstallHistoryEntry
): Promise<InstallHistoryEntry[]> {
  const current = await loadInstallHistory();
  const next = [entry, ...current].slice(0, MAX_HISTORY_ITEMS);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}
