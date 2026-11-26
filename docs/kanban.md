# Kanban da Savano Store

Roteiro operacional do projeto. Cada entrega é quebrada em cartões pequenos, verificáveis e testáveis.

---

## Em andamento

| ID | Prioridade | Cartão | Próxima verificação |
| :--- | :--- | :--- | :--- |
| `S1-05` | P1 | **Publicação dos APKs nas Releases do GitHub** | Anexar `.apk` assinado nas Releases de `SAVANOo/vocabulando` e `SAVANOo/savano-cine` e testar download + SHA-256 no aparelho |
| `S1-06` | P1 | **Ativar GitHub Pages em `SAVANOo/savano-store`** | Habilitar Pages na branch `main` e validar acesso público a `/catalog/catalog.json` |

---

## Ciclo 1 — Fundação, Módulo Nativo Kotlin, Segurança & Catálogo Real (Concluído)

| ID | Prioridade | Cartão | Resultado esperado / Critério de verificação |
| :--- | :--- | :--- | :--- |
| `S1-01` | P0 | **Contrato `catalog.json` compatível com Vocabulando & Savano Cine** | `catalog/catalog.json`, `catalog.schema.json` e `scripts/publish-release.mjs` aceitando `release-manifest.json` real (`apkFileName`, `minSdk`) |
| `S1-02` | P0 | **Módulo Nativo Kotlin (`SavanoInstallerModule`)** | Detecção via `PackageManager`, download com progresso, verificação obrigatória de SHA-256 antes do `FileProvider` + `REQUEST_INSTALL_PACKAGES` |
| `S1-03` | P0 | **Identidade Visual Editorial & Cache Offline** | Tema Obsidian + Esmeralda/Dourado, abas Explorar e Atualizações/Config, tela de Detalhes e cache local em `AsyncStorage` |
| `S1-04` | P0 | **Hardening, Assinatura & Testes** | `SafeErrorBoundary`, `withSavanoReleaseConfig` (keystore externa + R8), `eslint` + `tsc` + `expo-doctor` + `node --test` verdes |
