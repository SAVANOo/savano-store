#!/usr/bin/env node
/**
 * Assina ou verifica o catalog/catalog.json com chave RSA-SHA256 externa ao Git.
 *
 * Uso:
 *   Gerar par de chaves fora do Git:
 *     node scripts/sign-catalog.mjs --keygen --out-dir ../savano-store-keys
 *   Assinar catalog.json:
 *     node scripts/sign-catalog.mjs --sign --key ../savano-store-keys/catalog-private.pem
 *   Verificar catalog.json + catalog.sig:
 *     node scripts/sign-catalog.mjs --verify --pub catalog/catalog-public.pem
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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

export function signCatalogContent(rawJson, privateKeyPem) {
  return crypto.sign('sha256', Buffer.from(rawJson, 'utf8'), privateKeyPem).toString('base64');
}

export function verifyCatalogContent(rawJson, signatureBase64, publicKeyPem) {
  return crypto.verify(
    'sha256',
    Buffer.from(rawJson, 'utf8'),
    publicKeyPem,
    Buffer.from(signatureBase64.trim(), 'base64')
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const catalogPath = path.resolve(args.catalog || 'catalog/catalog.json');
  const sigPath = path.resolve(args.sig || 'catalog/catalog.sig');

  if (args.keygen) {
    const outDir = path.resolve(args['out-dir'] || '../savano-store-keys');
    fs.mkdirSync(outDir, { recursive: true });
    const privPath = path.join(outDir, 'catalog-private.pem');
    const pubOutPath = path.resolve('catalog/catalog-public.pem');

    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    fs.writeFileSync(privPath, privateKey, 'utf8');
    fs.writeFileSync(pubOutPath, publicKey, 'utf8');
    console.log(`✅ Chave privada (fora do Git): ${privPath}`);
    console.log(`✅ Chave pública (no repo): ${pubOutPath}`);
    return;
  }

  if (args.sign) {
    if (!args.key) {
      console.error('Informe --key <caminho/catalog-private.pem>');
      process.exit(1);
    }
    const raw = fs.readFileSync(catalogPath, 'utf8');
    const priv = fs.readFileSync(path.resolve(args.key), 'utf8');
    const sig = signCatalogContent(raw, priv);
    fs.writeFileSync(sigPath, `${sig}\n`, 'utf8');
    console.log(`✅ Assinatura gerada em ${sigPath}`);
    return;
  }

  if (args.verify) {
    const pubPath = path.resolve(args.pub || 'catalog/catalog-public.pem');
    const raw = fs.readFileSync(catalogPath, 'utf8');
    const sig = fs.readFileSync(sigPath, 'utf8');
    const pub = fs.readFileSync(pubPath, 'utf8');
    const ok = verifyCatalogContent(raw, sig, pub);
    if (!ok) {
      console.error('❌ Assinatura do catálogo inválida!');
      process.exit(1);
    }
    console.log('✅ Assinatura do catálogo válida!');
    return;
  }

  console.log('Uso: node scripts/sign-catalog.mjs --keygen | --sign --key <pem> | --verify');
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

if (isDirectRun) {
  main();
}
