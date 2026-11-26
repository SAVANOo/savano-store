import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { mergeManifestIntoCatalog } from '../scripts/publish-release.mjs';

test('catalog/catalog.json possui entradas válidas para Vocabulando e Savano Cine', () => {
  const catalogPath = path.resolve('catalog/catalog.json');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  assert.equal(catalog.schemaVersion, 1);
  assert.ok(Array.isArray(catalog.apps));
  assert.equal(catalog.apps.length, 2);

  const ids = catalog.apps.map((a) => a.packageId);
  assert.deepEqual(ids, ['app.vocabulando', 'com.savanocine.app']);

  for (const app of catalog.apps) {
    assert.match(app.apkUrl, /^https:\/\//);
    assert.match(app.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(app.versionCode) && app.versionCode > 0);
    assert.ok(Number.isInteger(app.sizeBytes) && app.sizeBytes > 0);
  }
});

test('mergeManifestIntoCatalog aceita release-manifest no formato Vocabulando/Savano Cine', () => {
  const catalog = JSON.parse(fs.readFileSync(path.resolve('catalog/catalog.json'), 'utf8'));
  const nextManifest = {
    packageId: 'app.vocabulando',
    name: 'Vocabulando',
    versionName: '1.1.0',
    versionCode: 2,
    minSdk: 24,
    abi: 'arm64-v8a',
    apkFileName: 'vocabulando-v1.1.0-arm64-v8a.apk',
    sizeBytes: 28000000,
    sha256: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    releasedAt: '2026-11-26T12:00:00Z',
    changelog: ['Nova versão 1.1.0'],
  };

  const updated = mergeManifestIntoCatalog(catalog, nextManifest, {
    releaseBaseUrl: 'https://github.com/SAVANOo/vocabulando/releases/download/v1.1.0',
  });

  const entry = updated.apps.find((a) => a.packageId === 'app.vocabulando');
  assert.equal(entry.versionCode, 2);
  assert.equal(
    entry.apkUrl,
    'https://github.com/SAVANOo/vocabulando/releases/download/v1.1.0/vocabulando-v1.1.0-arm64-v8a.apk'
  );
  assert.equal(entry.sha256, 'a'.repeat(64));
  assert.equal(entry.tagline, catalog.apps[0].tagline);
});

test('mergeManifestIntoCatalog bloqueia versionCode regressivo e sha256 inválido', () => {
  const catalog = JSON.parse(fs.readFileSync(path.resolve('catalog/catalog.json'), 'utf8'));

  assert.throws(
    () =>
      mergeManifestIntoCatalog(
        catalog,
        {
          ...catalog.apps[1],
          versionCode: 9999,
        },
        {}
      ),
    /versionCode regressivo/
  );

  assert.throws(
    () =>
      mergeManifestIntoCatalog(
        catalog,
        {
          ...catalog.apps[0],
          versionCode: 2,
          sha256: 'hash-invalido',
        },
        {}
      ),
    /sha256 inválido/
  );
});
