# Publicação de Apps na Savano Store

## Contrato do `catalog.json`

A Savano Store consome um JSON único (`catalog.json`) hospedado em qualquer servidor estático (GitHub Pages, GitHub Raw, Cloudflare R2, S3 ou servidor próprio).

Cada item de `apps[]` segue diretamente o formato `release-manifest.json` gerado pelos seus projetos:

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `packageId` | `string` | Sim | Application ID Android (ex.: `app.vocabulando`) |
| `name` | `string` | Sim | Nome de exibição do app |
| `tagline` | `string` | Sim | Subtítulo curto editorial |
| `iconUrl` | `string` | Sim | URL pública do ícone PNG/WebP |
| `versionName` | `string` | Sim | Versão semântica exibida (ex.: `1.4.0`) |
| `versionCode` | `number` | Sim | Inteiro monotônico usado para detectar atualizações |
| `abi` | `string` | Sim | `universal`, `arm64-v8a`, `armeabi-v7a` ou `x86_64` |
| `apkUrl` | `string` | Sim | URL direta de download do `.apk` assinado |
| `sizeBytes` | `number` | Sim | Tamanho exato do `.apk` em bytes |
| `sha256` | `string` | Sim | Hash SHA-256 em hex minúsculo (64 caracteres) |
| `releasedAt` | `string` | Sim | Data ISO-8601 da release |
| `changelog` | `string[]` | Sim | Lista de novidades da versão |
| `description` | `string` | Não | Descrição longa exibida na tela de detalhes |
| `category` | `string` | Não | Categoria editorial (ex.: `Educação`, `Entretenimento`) |
| `minSdkVersion` | `number` | Não | API Level mínimo do Android |

## Publicando uma nova versão

1. Gere o APK de release assinado no repositório do app (ex.: Vocabulando ou Savano Cine) junto com o `release-manifest.json`.
2. Faça upload do APK no GitHub Releases (ou seu servidor) e garanta que `apkUrl` aponta para o asset.
3. Rode o script de publicação para atualizar o `catalog.json` validando SHA-256 e `versionCode`:

```bash
node scripts/publish-release.mjs \
  --manifest ../vocabulando/dist/release-manifest.json \
  --apk ../vocabulando/dist/vocabulando-release.apk \
  --catalog catalog/catalog.json
```

4. Faça commit e push do `catalog/catalog.json` para o repositório/GitHub Pages configurado na aba **Atualizações / Config** da Savano Store.
