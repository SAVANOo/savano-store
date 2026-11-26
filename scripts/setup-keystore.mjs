#!/usr/bin/env node
/**
 * Gera uma keystore de release da Savano Store FORA do repositório Git
 * e cria keystore.properties em UTF-8 sem BOM.
 *
 * Uso:
 *   node scripts/setup-keystore.mjs --password "sua-senha-forte" [--out ../savano-store-keys/savano-store-release.jks]
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

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

function main() {
  const args = parseArgs(process.argv.slice(2));
  const password = args.password;
  if (!password || String(password).length < 6) {
    console.error('Erro: informe --password com pelo menos 6 caracteres.');
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const keystorePath = path.resolve(
    args.out || path.join(repoRoot, '..', 'savano-store-keys', 'savano-store-release.jks')
  );
  const alias = args.alias || 'savano-store';
  const propsPath = path.join(repoRoot, 'keystore.properties');

  if (fs.existsSync(keystorePath)) {
    console.error(`Keystore já existe em: ${keystorePath}`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(keystorePath), { recursive: true });

  execFileSync(
    'keytool',
    [
      '-genkeypair',
      '-v',
      '-keystore',
      keystorePath,
      '-alias',
      alias,
      '-keyalg',
      'RSA',
      '-keysize',
      '4096',
      '-validity',
      '10000',
      '-storepass',
      password,
      '-keypass',
      password,
      '-dname',
      'CN=Savano Store, OU=Mobile, O=Savano, L=Sao Paulo, ST=SP, C=BR',
    ],
    { stdio: 'inherit' }
  );

  // Caminho relativo a partir de android/app/ (onde Gradle resolve file(...))
  const relativeFromAndroidApp = path
    .relative(path.join(repoRoot, 'android', 'app'), keystorePath)
    .replace(/\\/g, '/');

  const propsContent = [
    `storeFile=${relativeFromAndroidApp}`,
    `storePassword=${password}`,
    `keyAlias=${alias}`,
    `keyPassword=${password}`,
    '',
  ].join('\n');

  // Escreve explicitamente em UTF-8 SEM BOM
  fs.writeFileSync(propsPath, Buffer.from(propsContent, 'utf8'));
  console.log(`✅ Keystore gerada fora do Git: ${keystorePath}`);
  console.log(`✅ keystore.properties criado sem BOM: ${propsPath}`);
}

main();
