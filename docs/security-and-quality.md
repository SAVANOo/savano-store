# Segurança e Qualidade — Savano Store

Padrões obrigatórios que não podem ser relaxados em nenhuma entrega.

## 1. Segurança by Design

1. **Zero Segredos no Repositório:**
   - `keystore.properties`, `*.jks`, `*.keystore`, `*.p12`, `*.key` estão bloqueados no `.gitignore`.
   - A keystore de release fica fora do repositório Git e `keystore.properties` é gravado em UTF-8 sem BOM.
2. **Integridade Criptográfica Obrigatória (SHA-256):**
   - Nenhum `.apk` baixado pode ser enviado ao instalador do Android sem antes passar pela verificação SHA-256 em `SavanoInstallerModule.kt`.
   - Em caso de divergência (`ERR_SHA256_MISMATCH`), o arquivo temporário é apagado imediatamente.
3. **Transporte Seguro:**
   - Em builds de produção, URLs de catálogo e APK exigem `https://`.
4. **Zero Vazamento de Erros na UI:**
   - `SafeErrorBoundary` envolve a árvore raiz (`src/app/_layout.tsx`) para impedir exibição de stack traces ou caminhos internos.

## 2. Definition of Done

- `npx expo lint` sem erros e sem warnings.
- `npx tsc --noEmit` sem erros (`strict: true`).
- `npx expo-doctor` com `20/20 checks passed`.
- `npm test` (`node --test`) passando integralmente.
- Compilação nativa Kotlin (`:savano-installer:assembleRelease`) sem erros.
