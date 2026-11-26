# Kanban da Savano Store

Roteiro operacional do projeto. Cada entrega é quebrada em cartões pequenos, observáveis e testáveis, vinculados ao [backlog exploratório](backlog-exploratorio.md).

---

## Em andamento / Próximo Ciclo

### Ciclo 2 — Segurança Forte & Hardening Nativo (Prioridade Máxima)

| ID | Prioridade | Cartão | Resultado esperado / Critério de verificação |
| :--- | :--- | :--- | :--- |
| `S2-01` | P0 | **Validação de `packageArchiveInfo` no APK baixado** | Kotlin lê `AndroidManifest` do `.apk` via `getPackageArchiveInfo` antes de instalar e bloqueia se `packageName != packageId` ou `longVersionCode != versionCode` |
| `S2-02` | P0 | **Pinning de Certificado (`signerSha256`)** | `catalog.json` / `catalog.schema.json` aceitam `signerSha256` opcional (e obrigatório quando presente); Kotlin valida assinatura do APK via `SigningInfo` antes de instalar |
| `S2-03` | P0 | **Hardening HTTP/Redirect e Limite Estrito de Tamanho no Kotlin** | `SavanoInstallerModule.kt` exige `https://` em release, valida redirects contra hosts confiáveis e aborta download se exceder `sizeBytes` |
| `S2-04` | P1 | **Limpeza Automática Pós-Instalação** | Ao confirmar atualização/instalação bem-sucedida na volta ao app, remove o `.apk` correspondente do cache `savano-apks/` |

---

### Ciclo 3 — Identidade Visual & UX Editorial

| ID | Prioridade | Cartão | Resultado esperado / Critério de verificação |
| :--- | :--- | :--- | :--- |
| `S3-01` | P0 | **Ícone Oficial, Adaptive Icon e Splash Screen** | Substituir assets padrão do Expo por arte própria Obsidian + Esmeralda/Dourado e configurar `expo-splash-screen` em `#090B0E` |
| `S3-02` | P1 | **Busca, Filtros & Feedback Pós-Instalação** | Barra de busca/filtros (Todos, Atualizações, Instalados) na aba Explorar e feedback claro após retorno do instalador Android |
| `S3-03` | P1 | **Auditoria de Acessibilidade (WCAG AA)** | `accessibilityLabel`/`accessibilityRole` em cards e botões, verificação de contraste mínimo 4.5:1 e suporte a Dynamic Type |

---

### Ciclo 4 — Auto-Update, Background & Savano Engineering Playbook

| ID | Prioridade | Cartão | Resultado esperado / Critério de verificação |
| :--- | :--- | :--- | :--- |
| `S4-01` | P1 | **Auto-Atualização da Savano Store (`com.savanostore.app`)** | Publicar a própria loja no `catalog.json` e validar fluxo de autoatualização no aparelho |
| `S4-02` | P2 | **Check Periódico em Background + Notificação Local** | Notificar quando Vocabulando, Savano Cine ou Savano Store tiverem atualização pendente |
| `S4-03` | P1 | **Sincronização Automática via PR do `savano-playbook` (Engineering Playbook)** | Configurar `sync-targets.json` + GitHub Action no `SAVANOo/savano-playbook` abrindo PR automático em `savano-store`, `vocabulando` e `savano-cine` |

---

## Concluído

### Ciclo 1 — Fundação, Módulo Nativo Kotlin, Segurança Base & Catálogo Real

| ID | Prioridade | Cartão | Resultado esperado / Critério de verificação |
| :--- | :--- | :--- | :--- |
| `S1-01` | P0 | **Contrato `catalog.json` compatível com Vocabulando & Savano Cine** | `catalog/catalog.json`, `catalog.schema.json` e `scripts/publish-release.mjs` validados com os manifests reais e testes unitários |
| `S1-02` | P0 | **Módulo Nativo Kotlin (`SavanoInstallerModule`)** | `PackageManager`, streaming com `onDownloadProgress`, verificação SHA-256, `FileProvider` e `REQUEST_INSTALL_PACKAGES` |
| `S1-03` | P0 | **Identidade Visual Base & Cache Offline** | Tema Obsidian + Esmeralda/Dourado, abas Explorar e Atualizações/Config, tela de Detalhes e cache em `AsyncStorage` |
| `S1-04` | P0 | **Hardening Inicial, Assinatura & Testes** | `SafeErrorBoundary`, `withSavanoReleaseConfig` (keystore externa + R8), `eslint` + `tsc` + `expo-doctor` + `npm test` verdes |
| `S1-05` | P1 | **Publicação dos APKs v1.0.0 nas Releases do GitHub** | APKs do Vocabulando (`27350406` B) e Savano Cine (`1651471` B) publicados via `gh` e validados com HTTP 200 |
| `S1-06` | P1 | **GitHub Pages Ativo em `SAVANOo/savano-store`** | `https://savanoo.github.io/savano-store/catalog/catalog.json` no ar e respondendo com JSON válido |
