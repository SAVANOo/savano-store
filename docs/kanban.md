# Kanban da Savano Store

Roteiro operacional do projeto. Cada entrega é quebrada em cartões pequenos, observáveis e testáveis, vinculados ao [backlog exploratório](backlog-exploratorio.md).

---

## Em andamento / Próximo Ciclo

| ID | Prioridade | Cartão | Resultado esperado / Critério de verificação |
| :--- | :--- | :--- | :--- |
| `S4-01` | P1 | **Auto-Atualização da Savano Store (`scripts/build-store-release.ps1`)** | Script de build + manifest + `gh release` pronto; pendente apenas publicar o primeiro APK release da própria loja |
| `S4-02` | P2 | **Check Periódico em Background + Notificação Local** | Notificar quando Vocabulando, Savano Cine ou Savano Store tiverem atualização pendente |

---

## Concluído

### Ciclo 2 & 3 & 5 — Segurança Zero Trust, Identidade Visual, UX & Engineering Playbook

| ID | Prioridade | Cartão | Resultado esperado / Critério de verificação |
| :--- | :--- | :--- | :--- |
| `S2-01` | P0 | **Validação de `packageArchiveInfo` no APK baixado** | Kotlin lê `AndroidManifest` via `getPackageArchiveInfo` e bloqueia divergência de `packageId` ou `versionCode` |
| `S2-02` | P0 | **Pinning de Certificado (`signerSha256`)** | Fingerprints reais extraídos do Vocabulando e Savano Cine; Kotlin valida `SigningInfo` contra catálogo e app instalado |
| `S2-03` | P0 | **Hardening HTTP/Redirect e Limite Estrito de Tamanho** | Allowlist GitHub + bloqueio de IPs privados/loopback + `https://` em release + abort imediato se exceder `sizeBytes` |
| `S2-04` | P1 | **Limpeza Automática Pós-Instalação & Histórico** | Remove `.apk` do cache ao confirmar instalação na volta ao app e registra em `installHistoryService` |
| `S2-06` | P1 | **Detecção de Compatibilidade (`minSdkVersion` e `ABI`)** | `getDeviceCapabilities()` bloqueia downloads incompatíveis antes de iniciar streaming |
| `S3-01` | P0 | **Ícone Oficial, Adaptive Icon e Splash Screen** | Assets gerados em Obsidian `#090B0E` + Esmeralda `#10B981` + Dourado `#EAB308` |
| `S3-02` | P1 | **Busca, Filtros, Feedback & Configs do App** | Busca, filtros (`Todos`, `Atualizações`, `Instalados`), banner pós-instalação e botão `openAppSettings` |
| `S3-03` | P1 | **Acessibilidade, Galeria & Diagnóstico** | `accessibilityRole`/`accessibilityLabel`, suporte a `screenshots[]` e painel de saúde + histórico na aba Atualizações |
| `S4-03` | P1 | **Savano Engineering Playbook (`SAVANOo/playbook`) com Sync por PR** | `sync-targets.json`, `skills/` e `.github/workflows/sync-playbook.yml` configurados no repo privado |
| `S4-04` | P2 | **Assinatura RSA-SHA256 do `catalog.json` (`catalog.sig`)** | `scripts/sign-catalog.mjs` + `verifyCatalogSignature` no módulo Kotlin (`SHA256withRSA`) validados em testes |

### Ciclo 1 — Fundação, Módulo Nativo Kotlin, Segurança Base & Catálogo Real

| ID | Prioridade | Cartão | Resultado esperado / Critério de verificação |
| :--- | :--- | :--- | :--- |
| `S1-01` | P0 | **Contrato `catalog.json` compatível com Vocabulando & Savano Cine** | `catalog/catalog.json`, `catalog.schema.json` e `scripts/publish-release.mjs` validados |
| `S1-02` | P0 | **Módulo Nativo Kotlin (`SavanoInstallerModule`)** | `PackageManager`, streaming com `onDownloadProgress`, verificação SHA-256, `FileProvider` e `REQUEST_INSTALL_PACKAGES` |
| `S1-03` | P0 | **Identidade Visual Base & Cache Offline** | Tema Obsidian + Esmeralda/Dourado e cache em `AsyncStorage` |
| `S1-04` | P0 | **Hardening Inicial, Assinatura & Testes** | `SafeErrorBoundary`, `withSavanoReleaseConfig` (keystore externa + R8), `eslint` + `tsc` + `expo-doctor` + `npm test` |
| `S1-05` | P1 | **Publicação dos APKs v1.0.0 nas Releases do GitHub** | APKs do Vocabulando (`27350406` B) e Savano Cine (`1651471` B) publicados via `gh` e validados com HTTP 200 |
| `S1-06` | P1 | **GitHub Pages Ativo em `SAVANOo/savano-store`** | `https://savanoo.github.io/savano-store/catalog/catalog.json` no ar |
