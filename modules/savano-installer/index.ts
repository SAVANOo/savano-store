import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export interface InstalledAppInfo {
  installed: boolean;
  versionCode: number | null;
  versionName: string | null;
}

export interface DeviceCapabilities {
  sdkInt: number;
  supportedAbis: string[];
}

export interface DownloadProgressEvent {
  packageId: string;
  bytesDownloaded: number;
  totalBytes: number;
  progress: number;
  phase: 'downloading' | 'verifying';
}

export interface DownloadVerifyResult {
  filePath: string;
  sha256: string;
  sizeBytes: number;
}

export interface ApkCacheStats {
  fileCount: number;
  totalBytes: number;
}

export interface ClearCacheResult {
  deletedCount: number;
  freedBytes: number;
}

interface NativeSavanoInstaller {
  getDeviceCapabilities(): DeviceCapabilities;
  verifyCatalogSignature(rawJson: string, signatureBase64: string, publicKeyPem: string): boolean;
  getInstalledApps(packageIds: string[]): Promise<Record<string, InstalledAppInfo>>;
  canRequestPackageInstalls(): boolean;
  openInstallPermissionSettings(): boolean;
  openAppSettings(packageId: string): boolean;
  downloadAndVerifyApk(
    packageId: string,
    apkUrl: string,
    expectedSha256: string,
    expectedSizeBytes: number,
    expectedVersionCode: number,
    expectedSignerSha256: string | null
  ): Promise<DownloadVerifyResult>;
  installApk(filePath: string): Promise<boolean>;
  openApp(packageId: string): boolean;
  deleteCachedApk(packageId: string): Promise<boolean>;
  getApkCacheStats(): Promise<ApkCacheStats>;
  clearApkCache(): Promise<ClearCacheResult>;
  addListener?(eventName: string, listener: (event: DownloadProgressEvent) => void): EventSubscription;
}

const NativeModule = requireOptionalNativeModule<NativeSavanoInstaller>('SavanoInstaller');

export const isNativeInstallerAvailable = NativeModule !== null;

export function getDeviceCapabilities(): DeviceCapabilities {
  if (!NativeModule) {
    return { sdkInt: 0, supportedAbis: [] };
  }
  return NativeModule.getDeviceCapabilities();
}

export function verifyCatalogSignature(
  rawJson: string,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  if (!NativeModule) return false;
  return NativeModule.verifyCatalogSignature(rawJson, signatureBase64, publicKeyPem);
}

export function addDownloadProgressListener(
  listener: (event: DownloadProgressEvent) => void
): EventSubscription {
  if (!NativeModule?.addListener) {
    return { remove: () => {} };
  }
  return NativeModule.addListener('onDownloadProgress', listener);
}

export async function getInstalledApps(
  packageIds: string[]
): Promise<Record<string, InstalledAppInfo>> {
  if (!NativeModule) {
    const empty: Record<string, InstalledAppInfo> = {};
    for (const id of packageIds) {
      empty[id] = { installed: false, versionCode: null, versionName: null };
    }
    return empty;
  }
  return NativeModule.getInstalledApps(packageIds);
}

export function canRequestPackageInstalls(): boolean {
  if (!NativeModule) return false;
  return NativeModule.canRequestPackageInstalls();
}

export function openInstallPermissionSettings(): boolean {
  if (!NativeModule) return false;
  return NativeModule.openInstallPermissionSettings();
}

export function openAppSettings(packageId: string): boolean {
  if (!NativeModule) return false;
  return NativeModule.openAppSettings(packageId);
}

export async function downloadAndVerifyApk(
  packageId: string,
  apkUrl: string,
  expectedSha256: string,
  expectedSizeBytes: number,
  expectedVersionCode: number,
  expectedSignerSha256?: string | null
): Promise<DownloadVerifyResult> {
  if (!NativeModule) {
    throw new Error('Módulo nativo SavanoInstaller disponível apenas no build Android nativo.');
  }
  return NativeModule.downloadAndVerifyApk(
    packageId,
    apkUrl,
    expectedSha256,
    expectedSizeBytes,
    expectedVersionCode,
    expectedSignerSha256 ?? null
  );
}

export async function installApk(filePath: string): Promise<boolean> {
  if (!NativeModule) {
    throw new Error('Módulo nativo SavanoInstaller disponível apenas no build Android nativo.');
  }
  return NativeModule.installApk(filePath);
}

export function openApp(packageId: string): boolean {
  if (!NativeModule) return false;
  return NativeModule.openApp(packageId);
}

export async function deleteCachedApk(packageId: string): Promise<boolean> {
  if (!NativeModule) return false;
  return NativeModule.deleteCachedApk(packageId);
}

export async function getApkCacheStats(): Promise<ApkCacheStats> {
  if (!NativeModule) return { fileCount: 0, totalBytes: 0 };
  return NativeModule.getApkCacheStats();
}

export async function clearApkCache(): Promise<ClearCacheResult> {
  if (!NativeModule) return { deletedCount: 0, freedBytes: 0 };
  return NativeModule.clearApkCache();
}
