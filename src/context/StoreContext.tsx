import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, AppState, Platform } from 'react-native';
import {
  addDownloadProgressListener,
  canRequestPackageInstalls,
  clearApkCache,
  deleteCachedApk,
  downloadAndVerifyApk,
  getApkCacheStats,
  getDeviceCapabilities,
  getInstalledApps,
  installApk,
  isNativeInstallerAvailable,
  openApp,
  openInstallPermissionSettings,
  type ApkCacheStats,
  type DeviceCapabilities,
  type InstalledAppInfo,
} from '../../modules/savano-installer';
import {
  fetchRemoteCatalog,
  getSavedCatalogUrl,
  loadCachedCatalog,
  resetCatalogUrl,
  saveCatalogUrl,
} from '../services/catalogService';
import {
  appendInstallHistory,
  loadInstallHistory,
  type InstallHistoryEntry,
} from '../services/installHistoryService';
import type {
  AppDownloadState,
  CatalogAppEntry,
  StoreCatalog,
} from '../types/catalog';
import { computeAppStatus } from '../utils/format';

interface PendingInstall {
  packageId: string;
  name: string;
  versionName: string;
  targetVersionCode: number;
}

interface StoreContextValue {
  catalog: StoreCatalog | null;
  catalogUrl: string;
  lastSyncedAt: string | null;
  isOfflineFallback: boolean;
  isRefreshing: boolean;
  syncError: string | null;
  installedMap: Record<string, InstalledAppInfo>;
  downloads: Record<string, AppDownloadState>;
  canInstallPackages: boolean;
  cacheStats: ApkCacheStats;
  deviceCapabilities: DeviceCapabilities;
  installHistory: InstallHistoryEntry[];
  lastInstallBanner: string | null;
  nativeAvailable: boolean;
  dismissInstallBanner: () => void;
  refreshAll: () => Promise<void>;
  refreshInstalledOnly: () => Promise<void>;
  triggerAppAction: (app: CatalogAppEntry) => Promise<void>;
  updateCatalogUrl: (newUrl: string) => Promise<void>;
  resetUrlToDefault: () => Promise<void>;
  handleClearApkCache: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const IDLE_DOWNLOAD: AppDownloadState = {
  status: 'idle',
  progress: 0,
  bytesDownloaded: 0,
  totalBytes: 0,
};

function getCompatibilityError(
  app: CatalogAppEntry,
  caps: DeviceCapabilities
): string | null {
  if (caps.sdkInt > 0 && app.minSdkVersion && caps.sdkInt < app.minSdkVersion) {
    return `Este aplicativo exige Android API ${app.minSdkVersion}+ (aparelho atual: API ${caps.sdkInt}).`;
  }
  if (
    caps.supportedAbis.length > 0 &&
    app.abi !== 'universal' &&
    !caps.supportedAbis.includes(app.abi)
  ) {
    return `Arquitetura ${app.abi} não suportada por este aparelho (${caps.supportedAbis.join(', ')}).`;
  }
  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState<StoreCatalog | null>(null);
  const [catalogUrl, setCatalogUrl] = useState<string>('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [installedMap, setInstalledMap] = useState<Record<string, InstalledAppInfo>>({});
  const [downloads, setDownloads] = useState<Record<string, AppDownloadState>>({});
  const [canInstallPackages, setCanInstallPackages] = useState<boolean>(
    Platform.OS === 'android' ? canRequestPackageInstalls() : false
  );
  const [cacheStats, setCacheStats] = useState<ApkCacheStats>({ fileCount: 0, totalBytes: 0 });
  const [deviceCapabilities] = useState<DeviceCapabilities>(() => getDeviceCapabilities());
  const [installHistory, setInstallHistory] = useState<InstallHistoryEntry[]>([]);
  const [lastInstallBanner, setLastInstallBanner] = useState<string | null>(null);

  const catalogRef = useRef<StoreCatalog | null>(null);
  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

  const pendingInstallRef = useRef<PendingInstall | null>(null);

  const refreshSystemState = useCallback(async (apps?: CatalogAppEntry[]) => {
    const targetApps = apps ?? catalogRef.current?.apps ?? [];
    const packageIds = targetApps.map((a) => a.packageId);

    const [installed, stats] = await Promise.all([
      packageIds.length > 0
        ? getInstalledApps(packageIds)
        : Promise.resolve({} as Record<string, InstalledAppInfo>),
      getApkCacheStats(),
    ]);

    const pending = pendingInstallRef.current;
    if (pending) {
      const info = installed[pending.packageId];
      if (
        info?.installed &&
        info.versionCode !== null &&
        info.versionCode >= pending.targetVersionCode
      ) {
        pendingInstallRef.current = null;
        await deleteCachedApk(pending.packageId);
        const nextHistory = await appendInstallHistory({
          packageId: pending.packageId,
          name: pending.name,
          versionName: pending.versionName,
          versionCode: pending.targetVersionCode,
          installedAt: new Date().toISOString(),
        });
        setInstallHistory(nextHistory);
        setLastInstallBanner(`${pending.name} v${pending.versionName} instalado com sucesso.`);
        const refreshedStats = await getApkCacheStats();
        setCacheStats(refreshedStats);
      } else {
        setCacheStats(stats);
      }
    } else {
      setCacheStats(stats);
    }

    setInstalledMap(installed);
    setCanInstallPackages(canRequestPackageInstalls());
  }, []);

  const syncWithUrl = useCallback(
    async (url: string, currentApps?: CatalogAppEntry[]) => {
      setIsRefreshing(true);
      setSyncError(null);
      try {
        const { catalog: remote, syncedAt } = await fetchRemoteCatalog(url);
        setCatalog(remote);
        setLastSyncedAt(syncedAt);
        setIsOfflineFallback(false);
        await refreshSystemState(remote.apps);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Não foi possível atualizar o catálogo remoto.';
        setSyncError(message);
        setIsOfflineFallback(true);
        if (currentApps) {
          await refreshSystemState(currentApps);
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [refreshSystemState]
  );

  // Boot inicial: abre rápido com cache local e sincroniza em seguida
  useEffect(() => {
    let mounted = true;

    (async () => {
      const [savedUrl, cached, history] = await Promise.all([
        getSavedCatalogUrl(),
        loadCachedCatalog(),
        loadInstallHistory(),
      ]);
      if (!mounted) return;

      setCatalogUrl(savedUrl);
      setCatalog(cached.catalog);
      setLastSyncedAt(cached.lastSyncedAt);
      setIsOfflineFallback(cached.source === 'bundled');
      setInstallHistory(history);

      await refreshSystemState(cached.catalog.apps);
      await syncWithUrl(savedUrl, cached.catalog.apps);
    })();

    return () => {
      mounted = false;
    };
  }, [refreshSystemState, syncWithUrl]);

  // Escuta progresso nativo de download e verificação SHA-256
  useEffect(() => {
    const sub = addDownloadProgressListener((event) => {
      setDownloads((prev) => ({
        ...prev,
        [event.packageId]: {
          status: event.phase === 'verifying' ? 'verifying' : 'downloading',
          progress: event.progress >= 0 ? event.progress : 0,
          bytesDownloaded: event.bytesDownloaded,
          totalBytes: event.totalBytes,
        },
      }));
    });
    return () => sub.remove();
  }, []);

  // Revalida pacotes instalados e permissão ao voltar para o app
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshSystemState();
      }
    });
    return () => sub.remove();
  }, [refreshSystemState]);

  const dismissInstallBanner = useCallback(() => {
    setLastInstallBanner(null);
  }, []);

  const refreshAll = useCallback(async () => {
    const url = catalogUrl || (await getSavedCatalogUrl());
    await syncWithUrl(url, catalogRef.current?.apps);
  }, [catalogUrl, syncWithUrl]);

  const refreshInstalledOnly = useCallback(async () => {
    await refreshSystemState();
  }, [refreshSystemState]);

  const triggerAppAction = useCallback(
    async (app: CatalogAppEntry) => {
      const status = computeAppStatus(app, installedMap[app.packageId]);

      if (status === 'up_to_date') {
        const opened = openApp(app.packageId);
        if (!opened) {
          Alert.alert(
            'Não foi possível abrir',
            `O aplicativo ${app.name} não possui atividade principal iniciável.`
          );
        }
        return;
      }

      if (!isNativeInstallerAvailable) {
        Alert.alert(
          'Build nativo necessário',
          'O instalador de APKs requer o build Android nativo (Development Build ou Release APK).'
        );
        return;
      }

      const compatError = getCompatibilityError(app, deviceCapabilities);
      if (compatError) {
        Alert.alert('Dispositivo incompatível', compatError);
        return;
      }

      if (!canRequestPackageInstalls()) {
        Alert.alert(
          'Permissão necessária',
          'Para instalar ou atualizar aplicativos pela Savano Store, habilite "Instalar apps desconhecidos" nas configurações do Android.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir Configurações',
              onPress: () => {
                openInstallPermissionSettings();
              },
            },
          ]
        );
        return;
      }

      setDownloads((prev) => ({
        ...prev,
        [app.packageId]: {
          status: 'downloading',
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: app.sizeBytes,
        },
      }));

      try {
        const result = await downloadAndVerifyApk(
          app.packageId,
          app.apkUrl,
          app.sha256,
          app.sizeBytes,
          app.versionCode,
          app.signerSha256 ?? null
        );

        setDownloads((prev) => ({
          ...prev,
          [app.packageId]: {
            status: 'installing',
            progress: 1,
            bytesDownloaded: result.sizeBytes,
            totalBytes: result.sizeBytes,
          },
        }));

        pendingInstallRef.current = {
          packageId: app.packageId,
          name: app.name,
          versionName: app.versionName,
          targetVersionCode: app.versionCode,
        };

        await installApk(result.filePath);

        setDownloads((prev) => ({
          ...prev,
          [app.packageId]: IDLE_DOWNLOAD,
        }));
        await refreshSystemState();
      } catch (err) {
        pendingInstallRef.current = null;
        const message = err instanceof Error ? err.message : 'Erro inesperado durante a instalação.';
        const isSecurityAlert =
          message.includes('SHA-256') ||
          message.includes('Integridade') ||
          message.includes('Assinatura') ||
          message.includes('Certificado') ||
          message.includes('bloqueado');

        setDownloads((prev) => ({
          ...prev,
          [app.packageId]: {
            status: 'error',
            progress: 0,
            bytesDownloaded: 0,
            totalBytes: 0,
            errorMessage: message,
          },
        }));

        Alert.alert(
          isSecurityAlert ? 'Bloqueio de Segurança' : 'Falha na instalação',
          message
        );
      }
    },
    [deviceCapabilities, installedMap, refreshSystemState]
  );

  const updateCatalogUrl = useCallback(
    async (newUrl: string) => {
      const saved = await saveCatalogUrl(newUrl);
      setCatalogUrl(saved);
      await syncWithUrl(saved, catalogRef.current?.apps);
    },
    [syncWithUrl]
  );

  const resetUrlToDefault = useCallback(async () => {
    const defaultUrl = await resetCatalogUrl();
    setCatalogUrl(defaultUrl);
    await syncWithUrl(defaultUrl, catalogRef.current?.apps);
  }, [syncWithUrl]);

  const handleClearApkCache = useCallback(async () => {
    const result = await clearApkCache();
    await refreshSystemState();
    Alert.alert(
      'Cache limpo',
      `${result.deletedCount} arquivo(s) APK removido(s).`
    );
  }, [refreshSystemState]);

  const value = useMemo<StoreContextValue>(
    () => ({
      catalog,
      catalogUrl,
      lastSyncedAt,
      isOfflineFallback,
      isRefreshing,
      syncError,
      installedMap,
      downloads,
      canInstallPackages,
      cacheStats,
      deviceCapabilities,
      installHistory,
      lastInstallBanner,
      nativeAvailable: isNativeInstallerAvailable,
      dismissInstallBanner,
      refreshAll,
      refreshInstalledOnly,
      triggerAppAction,
      updateCatalogUrl,
      resetUrlToDefault,
      handleClearApkCache,
    }),
    [
      catalog,
      catalogUrl,
      lastSyncedAt,
      isOfflineFallback,
      isRefreshing,
      syncError,
      installedMap,
      downloads,
      canInstallPackages,
      cacheStats,
      deviceCapabilities,
      installHistory,
      lastInstallBanner,
      dismissInstallBanner,
      refreshAll,
      refreshInstalledOnly,
      triggerAppAction,
      updateCatalogUrl,
      resetUrlToDefault,
      handleClearApkCache,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore deve ser usado dentro de StoreProvider');
  }
  return ctx;
}
