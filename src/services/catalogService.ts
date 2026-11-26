import AsyncStorage from '@react-native-async-storage/async-storage';
import bundledCatalog from '../../catalog/catalog.json';
import type { StoreCatalog } from '../types/catalog';

const STORAGE_KEYS = {
  CATALOG_URL: '@savano_store/catalog_url',
  CATALOG_CACHE: '@savano_store/catalog_cache',
  LAST_SYNCED_AT: '@savano_store/last_synced_at',
} as const;

export const DEFAULT_CATALOG_URL =
  'https://savanoo.github.io/savano-store/catalog/catalog.json';

function assertSafeCatalogUrl(url: string): string {
  const normalized = url.trim();
  const isHttps = /^https:\/\//i.test(normalized);
  const isDevHttp = typeof __DEV__ !== 'undefined' && __DEV__ && /^http:\/\//i.test(normalized);
  if (!isHttps && !isDevHttp) {
    throw new Error('A URL do catálogo deve usar HTTPS.');
  }
  return normalized;
}

function isValidCatalog(data: unknown): data is StoreCatalog {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Partial<StoreCatalog>;
  return Array.isArray(candidate.apps);
}

export async function getSavedCatalogUrl(): Promise<string> {
  const saved = await AsyncStorage.getItem(STORAGE_KEYS.CATALOG_URL);
  return saved?.trim() || DEFAULT_CATALOG_URL;
}

export async function saveCatalogUrl(url: string): Promise<string> {
  const normalized = assertSafeCatalogUrl(url);
  await AsyncStorage.setItem(STORAGE_KEYS.CATALOG_URL, normalized);
  return normalized;
}

export async function resetCatalogUrl(): Promise<string> {
  await AsyncStorage.removeItem(STORAGE_KEYS.CATALOG_URL);
  return DEFAULT_CATALOG_URL;
}

export async function loadCachedCatalog(): Promise<{
  catalog: StoreCatalog;
  lastSyncedAt: string | null;
  source: 'cache' | 'bundled';
}> {
  const [rawCache, lastSyncedAt] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.CATALOG_CACHE),
    AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNCED_AT),
  ]);

  if (rawCache) {
    try {
      const parsed = JSON.parse(rawCache);
      if (isValidCatalog(parsed)) {
        return { catalog: parsed, lastSyncedAt, source: 'cache' };
      }
    } catch {
      // Cache corrompido será substituído pelo catálogo embutido
    }
  }

  return {
    catalog: bundledCatalog as StoreCatalog,
    lastSyncedAt: null,
    source: 'bundled',
  };
}

export async function fetchRemoteCatalog(url: string): Promise<{
  catalog: StoreCatalog;
  syncedAt: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Servidor retornou HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!isValidCatalog(data)) {
      throw new Error('Formato de catalog.json inválido (campo apps[] ausente).');
    }

    const syncedAt = new Date().toISOString();
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.CATALOG_CACHE, JSON.stringify(data)),
      AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNCED_AT, syncedAt),
    ]);

    return { catalog: data, syncedAt };
  } finally {
    clearTimeout(timeout);
  }
}
