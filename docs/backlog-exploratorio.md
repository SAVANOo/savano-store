# Estudo Exploratório — Savano Store & Savano Engineering Playbook

Este documento registra a análise técnica, riscos, decisões de arquitetura e roadmap exploratório antes da implementação de novos ciclos.

---

## 1. Segurança Forte da Loja (Prioridade P0)

Como a **Savano Store** baixa e dispara a instalação de binários `.apk` no aparelho, ela é o componente mais sensível do ecossistema Savano. Hoje já temos `https://` obrigatório em produção e verificação obrigatória de `sha256` em `SavanoInstallerModule.kt`, mas ainda existem vetores que precisamos fechar:

### 1.1. Riscos mapeados e contramedidas

| Risco | Estado atual | Contramedida planejada |
| :--- | :--- | :--- |
| **Substituição de pacote / downgrade via catálogo alterado** | Só compara `sha256` do arquivo contra o próprio `catalog.json` | Usar `PackageManager.getPackageArchiveInfo` no `.apk` baixado (antes de abrir o instalador) para validar que `archiveInfo.packageName == app.packageId` e `longVersionCode == app.versionCode`. |
| **APK assinado por chave desconhecida (Signer spoofing)** | Não verifica o certificado do APK | Adicionar `signerSha256` (fingerprint SHA-256 do certificado de assinatura) no `catalog.json` e validar no Kotlin (`SigningInfo` / `GET_SIGNING_CERTIFICATES`) antes de aceitar atualização ou instalação. |
| **Downgrade HTTP ou redirect malicioso (SSRF/MITM)** | `catalogService.ts` exige `https://`, mas `SavanoInstallerModule.kt` ainda aceita `http://` e segue redirects livremente | Bloquear `http://` em builds release no Kotlin, validar cada hop de redirect (`https://` + anti-IP privado/loopback) e suportar allowlist de hosts confiáveis (`github.com`, `objects.githubusercontent.com`, `savanoo.github.io`). |
| **Divergência de tamanho no streaming** | Grava até EOF e só depois checa SHA-256 | Abortar imediatamente se `bytesDownloaded` ultrapassar `expectedSizeBytes` (proteção contra payload inflado) e validar `bytesDownloaded == expectedSizeBytes`. |
| **Adulteração do próprio `catalog.json` no host** | Confia no TLS do GitHub Pages | *(Ciclo futuro)* Assinar `catalog.json` com chave privada Ed25519 offline (`catalog.sig`) e validar a assinatura pública dentro do app. |
| **Acúmulo de APKs em cache** | Limpeza manual na aba Atualizações | Limpar automaticamente o `.apk` em cache após confirmação de instalação bem-sucedida (`ACTION_PACKAGE_ADDED` / retorno ao app). |

---

## 2. Identidade Visual & UX Editorial

### 2.1. Identidade Visual Própria
- Substituir os ícones padrão do template Expo (`assets/icon.png`, `assets/android-icon-*.png`, `assets/favicon.png`) pela identidade **Obsidian + Esmeralda/Dourado** da Savano Store (monograma editorial `S` / selo geométrico).
- Configurar `expo-splash-screen` com fundo `#090B0E` para transição sem flash branco no boot.

### 2.2. Melhorias de Usabilidade
- **Busca e filtro por categoria/status** na aba *Explorar* (ex.: Todos, Atualizações, Instalados).
- **Feedback pós-instalador:** detectar na volta ao app (`AppState === 'active'`) se a versão esperada realmente foi instalada e exibir toast/confirmação discreta.
- **Acessibilidade (WCAG AA):** adicionar `accessibilityRole`, `accessibilityLabel` e `accessibilityState` nos cards e botões de ação; validar contraste de todos os textos secundários (`#A1AAB8` e `#6B7484` sobre `#11151B`).
- **Estado de rede detalhado:** diferenciar claramente "Offline (usando cache)" de "Erro no catálogo remoto" com botão rápido de tentar novamente.

---

## 3. Novas Features

1. **Auto-atualização da própria Savano Store (`com.savanocine.app` / `app.vocabulando` / `com.savanostore.app`):**
   - Incluir `com.savanostore.app` no `catalog.json` para que a loja detecte e instale novas versões de si mesma.
2. **Verificação em Background + Notificação Local:**
   - Tarefa periódica (ex.: a cada 12h/24h via `WorkManager`) checando o `catalog.json` e notificando o usuário quando houver atualização pendente.
3. **Configurações de App & Desinstalação:**
   - Na tela de Detalhes, botão rápido para abrir as **Informações do App** no Android (`ACTION_APPLICATION_DETAILS_SETTINGS`) quando já estiver instalado.

---

## 4. Arquitetura do "Savano Engineering Playbook" (Replicação por PR)

Inspirado no modelo de **Engineering Playbook** corporativo, o repositório privado `SAVANOo/savano-playbook` pode evoluir para ser a **fonte única da verdade** de regras, skills, templates e agentes, propagando atualizações automaticamente por **Pull Request** para os repositórios conectados (`savano-store`, `vocabulando`, `savano-cine`).

### 4.1. Estrutura proposta no `SAVANOo/savano-playbook`
```text
savano-playbook/
├── .github/
│   └── workflows/
│       └── sync-playbook.yml       # Dispara PRs nos repos conectados a cada push na main
├── sync-targets.json              # Lista de repos destino + arquivos sincronizados
├── rules/                         # Regras de engenharia e segurança (fonte única)
│   ├── AGENTS.base.md
│   ├── security-and-quality.md
│   └── workflow-kanban.md
├── skills/                        # Skills reutilizáveis (.claude/skills / antigravity)
│   ├── android-release/
│   ├── security-audit/
│   └── kanban-grooming/
└── templates/                     # Snippets e workflows padrão
    ├── release-android.yml
    └── SafeErrorBoundary.tsx
```

### 4.2. Como funciona a propagação automática por PR
1. Você edita uma regra em `rules/security-and-quality.md` ou uma skill em `skills/` no `SAVANOo/savano-playbook` e faz `git push` na `main`.
2. A GitHub Action `sync-playbook.yml` lê `sync-targets.json`:
   ```json
   {
     "targets": [
       { "repo": "SAVANOo/savano-store", "branch": "main" },
       { "repo": "SAVANOo/vocabulando", "branch": "main" },
       { "repo": "SAVANOo/savano-cine", "branch": "main" }
     ]
   }
   ```
3. Para cada repositório da lista (usando um Fine-Grained PAT armazenado em `Secrets -> PLAYBOOK_SYNC_TOKEN` com permissão de `Contents: Read & Write` e `Pull requests: Read & Write`), o workflow:
   - Faz checkout do repositório destino.
   - Atualiza **apenas** a pasta gerenciada pelo playbook (ex.: `docs/standards/` e `.claude/skills/savano-*`), **sem sobrescrever** arquivos específicos do projeto como `AGENTS.md` local ou `docs/kanban.md`.
   - Abre (ou atualiza) um Pull Request no branch `chore/sync-savano-playbook` com o diff exato e referência ao commit de origem do `savano-playbook`.
4. Você (ou o agente na sessão daquele repo) revisa o PR e faz merge em 1 clique — garantindo padronização sem risco de quebrar customizações locais.
