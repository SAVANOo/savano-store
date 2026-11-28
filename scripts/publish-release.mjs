#!/usr/bin/env node
/**
 * Publica ou atualiza uma entrada no catalog.json da Savano Store
 * a partir de um release-manifest.json gerado pelo Vocabulando ou Savano Cine.
 *
 * Uso:
 *   node scripts/publish-release.mjs \
 *     --manifest path/to/release-manifest.json \
 *     --release-base-url https://github.com/SAVANOo/vocabulando/releases/download/v1.0.0 \
 *     [--catalog catalog/catalog.json] [--apk path/to/app.apk]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REQUIRED_FIELDS = [
  'packageId',
  'name',
  'tagline',
  'iconUrl',
  'versionName',
  'versionCode',
  'abi',
  'apkUrl',
  'sizeBytes',
  'sha256',
  'releasedAt',
  'changelog',
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return {
    sha256: hash.digest('hex').toLowerCase(),
    sizeBytes: data.length,
  };
}

function validateEntry(entry) {
  for (const field of REQUIRED_FIELDS) {
    if (entry[field] === undefined || entry[field] === null || entry[field] === '') {
      throw new Error(`Campo obrigatório ausente ou vazio no manifest/catálogo: "${field}"`);
    }
  }
  if (!/^https:\/\//i.test(entry.apkUrl)) {
    throw new Error(`apkUrl deve usar HTTPS: ${entry.apkUrl}`);
  }
  if (!Number.isInteger(entry.versionCode) || entry.versionCode < 1) {
    throw new Error(`versionCode inválido: ${entry.versionCode}`);
  }
  if (!Number.isInteger(entry.sizeBytes) || entry.sizeBytes < 1) {
    throw new Error(`sizeBytes inválido: ${entry.sizeBytes}`);
  }
  if (!/^[a-fA-F0-9]{64}$/.test(entry.sha256)) {
    throw new Error(`sha256 inválido (esperado 64 caracteres hex): ${entry.sha256}`);
  }
  if (entry.signerSha256 && !/^[a-fA-F0-9]{64}$/.test(entry.signerSha256)) {
    throw new Error(`signerSha256 inválido (esperado 64 caracteres hex): ${entry.signerSha256}`);
  }
  if (!Array.isArray(entry.changelog)) {
    throw new Error('changelog deve ser um array de strings');
  }
}

export function mergeManifestIntoCatalog(catalog, manifest, options = {}) {
  const existingIdx = catalog.apps.findIndex((a) => a.packageId === manifest.packageId);
  const existing = existingIdx >= 0 ? catalog.apps[existingIdx] : {};

  let apkUrl = options.apkUrl || manifest.apkUrl;
  if (!apkUrl && options.releaseBaseUrl && manifest.apkFileName) {
    const base = options.releaseBaseUrl.replace(/\/+$/, '');
    apkUrl = `${base}/${manifest.apkFileName}`;
  }

  const entry = {
    packageId: manifest.packageId,
    name: manifest.name,
    tagline: options.tagline || manifest.tagline || existing.tagline || '',
    ...(options.description || manifest.description || existing.description
      ? { description: options.description || manifest.description || existing.description }
      : {}),
    ...(options.category || manifest.category || existing.category
      ? { category: options.category || manifest.category || existing.category }
      : {}),
    iconUrl: options.iconUrl || manifest.iconUrl || existing.iconUrl || '',
    versionName: manifest.versionName,
    versionCode: manifest.versionCode,
    abi: manifest.abi,
    apkUrl: apkUrl || existing.apkUrl || '',
    sizeBytes: manifest.sizeBytes,
    sha256: String(manifest.sha256).toLowerCase(),
    ...(options.signerSha256 || manifest.signerSha256 || existing.signerSha256
      ? {
          signerSha256: String(
            options.signerSha256 || manifest.signerSha256 || existing.signerSha256
          ).toLowerCase(),
        }
      : {}),
    releasedAt: manifest.releasedAt,
    ...(manifest.minSdkVersion || manifest.minSdk || existing.minSdkVersion
      ? { minSdkVersion: manifest.minSdkVersion || manifest.minSdk || existing.minSdkVersion }
      : {}),
    changelog: manifest.changelog,
  };

  validateEntry(entry);

  if (existingIdx >= 0 && entry.versionCode < existing.versionCode) {
    throw new Error(
      `versionCode regressivo para ${entry.packageId}: atual=${existing.versionCode}, novo=${entry.versionCode}`
    );
  }

  const nextApps = [...catalog.apps];
  if (existingIdx >= 0) {
    nextApps[existingIdx] = entry;
  } else {
    nextApps.push(entry);
  }

  return {
    ...catalog,
    updatedAt: new Date().toISOString(),
    apps: nextApps,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.manifest || args.help) {
    console.log(
      'Uso: node scripts/publish-release.mjs --manifest <release-manifest.json> [--release-base-url <url>] [--apk-url <url>] [--catalog catalog/catalog.json] [--apk <arquivo.apk>]'
    );
    process.exit(args.help ? 0 : 1);
  }

  const manifestPath = path.resolve(args.manifest);
  const catalogPath = path.resolve(args.catalog || 'catalog/catalog.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (args.apk) {
    const apkPath = path.resolve(args.apk);
    const computed = sha256File(apkPath);
    if (manifest.sha256 && manifest.sha256.toLowerCase() !== computed.sha256) {
      throw new Error(
        `Divergência de SHA-256! Manifest=${manifest.sha256} vs APK=${computed.sha256}`
      );
    }
    manifest.sha256 = computed.sha256;
    manifest.sizeBytes = computed.sizeBytes;
  }

  let catalog = {
    schemaVersion: 1,
    storeName: 'Savano Store',
    updatedAt: new Date().toISOString(),
    apps: [],
  };

  if (fs.existsSync(catalogPath)) {
    catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    if (!Array.isArray(catalog.apps)) {
      catalog.apps = [];
    }
  }

  const updated = mergeManifestIntoCatalog(catalog, manifest, {
    apkUrl: args['apk-url'],
    releaseBaseUrl: args['release-base-url'],
    tagline: args.tagline,
    description: args.description,
    category: args.category,
    iconUrl: args['icon-url'],
    signerSha256: args['signer-sha256'],
  });

  fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
  fs.writeFileSync(catalogPath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');

  console.log(
    `✅ Publicado ${manifest.name} (${manifest.packageId}) v${manifest.versionName} (${manifest.versionCode}) em ${catalogPath}`
  );
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  main();
}
