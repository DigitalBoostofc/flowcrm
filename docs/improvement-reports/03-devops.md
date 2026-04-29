# Relatório de Melhorias — DevOps & Operação

**Persona**: DevOps Lead (squad AIOX) · **Score**: 7/10

## Sumário executivo
Pirâmide de operação **mais madura do que parece**: CI com testes/build/audit em PR, multi-stage Dockerfiles, USER non-root no backend, healthchecks no Dockerfile, Trivy semanal, backup off-site cifrado + drill diário automático, runbooks BCP/DR escritos, Sentry + Pino. Os gaps reais são: **CI não bloqueia merge** (lint inexistente, audit é `continue-on-error`), **deploy via webhook EasyPanel sem staging/rollback nativo**, **secrets em texto plano em ENV do EasyPanel**, **frontend roda como root**, **zero alerting humano** (UptimeRobot mencionado mas não verificado), **sem métricas/tracing** (só logs+errors), e **`continue-on-error` em todo lugar** virou anti-padrão.

## Itens prioritários

### 1. CI não bloqueia merges com problemas
- **Diagnóstico**: `npm audit` e Trivy estão com `continue-on-error: true`. Não existe script `lint` no `backend/package.json`. Não há husky/lint-staged. PRs verdes podem ter HIGH CVEs ou typo bugs.
- **Recomendação**: Adicionar ESLint (já é Nest, vem de fábrica no scaffold — ressuscitar) + Prettier check + `lint-staged` via `simple-git-hooks` (sem `prepare` script intrusivo). Remover `continue-on-error` do audit em PRs (mantém só no scheduled scan). Configurar branch protection no `master` exigindo CI verde.
- **Esforço**: S — **Impacto**: alto — **Risco**: vulneráveis em prod sem ninguém ver.

### 2. Frontend roda como root no nginx
- **Diagnóstico**: `frontend/Dockerfile` não tem `USER`. `nginx:alpine` roda como root por padrão. Backend faz certo (`USER node`).
- **Recomendação**: Migrar pra `nginxinc/nginx-unprivileged:alpine` (porta 8080) ou adicionar `USER nginx` + ajustar paths. Adicionar `STOPSIGNAL SIGQUIT` (graceful do nginx).
- **Esforço**: S — **Impacto**: médio — **Risco**: container escape eleva privilégios.

### 3. Deploy via webhook GitHub→EasyPanel sem staging nem rollback rápido
- **Diagnóstico**: `master` push = prod. `CLAUDE.md` confirma "push no master = deploy imediato". Não há ambiente de staging. Rollback exige novo commit (revert) + outro deploy (~3-5min de janela).
- **Recomendação**: Criar app `flowcrm-staging` no EasyPanel apontando pra branch `develop` (já mencionada no CI) com banco separado. Para rollback rápido, **passar a buildar imagens taggeadas com SHA no GHCR** e configurar EasyPanel pra pullar de registry — rollback vira "trocar tag" em 30s.
- **Esforço**: M — **Impacto**: alto — **Risco**: deploy ruim = downtime até você commitar revert.

### 4. Secrets em ENV do EasyPanel (texto plano, sem rotação)
- **Diagnóstico**: `JWT_SECRET`, `META_APP_SECRET`, `GPG_PASSPHRASE` no painel EasyPanel + `/etc/flowcrm-backup.env`. Sem auditoria de quem leu. Sem rotação automática.
- **Recomendação**: Curto prazo — Doppler (free tier serve, sync com EasyPanel via CLI no entrypoint). Médio — Infisical self-hosted no mesmo EasyPanel. Documentar política de rotação semestral pro JWT_SECRET (já tem pra GPG).
- **Esforço**: M — **Impacto**: médio — **Risco**: leak via screenshot do painel.

### 5. Observabilidade tem Sentry + Pino mas zero métricas/tracing
- **Diagnóstico**: Errors no Sentry, logs no stdout (Pino). Sem Prometheus/`/metrics`, sem OpenTelemetry, sem dashboard de p50/p95 de latência das rotas, sem visibilidade nas filas BullMQ além do Bull-Board protegido por basic auth.
- **Recomendação**: Adicionar `@willsoto/nestjs-prometheus` expondo `/metrics` (scrape pelo Grafana Cloud free tier, 10k séries/14 dias grátis). OTel SDK com auto-instrumentation pra HTTP+TypeORM+BullMQ → traces no Sentry (já paga, suporta tracing nativo).
- **Esforço**: M — **Impacto**: alto — **Risco**: degradação invisível até cliente reclamar.

### 6. Alerting humano frágil ou inexistente
- **Diagnóstico**: Healthchecks.io mencionado pra cron do backup (bom). UptimeRobot mencionado no DR mas não confirmado configurado. Não há alerta pra: drill de restore falhou, CPU/RAM da VPS, fila BullMQ travada, error rate Sentry > X.
- **Recomendação**: UptimeRobot (free) em `/api/health/live` + `/api/health/ready` com SMS pro celular. Sentry → alerta por email se error rate > 10/min. Healthchecks → email se cron não pingar em 26h.
- **Esforço**: S — **Impacto**: alto — **Risco**: app cai sexta noite, descobre segunda.

### 7. Backup excelente mas DR drill nunca executado
- **Diagnóstico**: Runbook DR completo, RTO de 2h documentado, **mas tabela de drill diz "nunca executado"**. RTO de papel ≠ RTO real.
- **Recomendação**: Agendar drill em VPS Hostinger temporária (R$5/mês descartável) antes do fim de 2026 conforme runbook já promete. Cronometrar e atualizar runbook com gaps descobertos.
- **Esforço**: M (1 dia) — **Impacto**: médio — **Risco**: descobrir no incidente que falta um passo.

### 8. ThrottlerModule global pode ser bypassed em endpoints públicos sensíveis
- **Diagnóstico**: 20 req/s curto, 120/min, 2000/h **global**. Endpoints como `/auth/login`, webhook `/api/whatsapp/webhook` e `/api/widget/*` (chat público) compartilham o mesmo bucket. Ataque de credential-stuffing usaria os 2000/h inteiros antes de cair.
- **Recomendação**: Decorator `@Throttle()` específico em `/auth/login` (5/min por IP), `/auth/forgot-password` (3/h), webhook Meta com whitelist de IPs em vez de throttle. Considerar `nestjs-throttler-storage-redis` pro storage compartilhado entre instâncias (caso escale horizontal).
- **Esforço**: S — **Impacto**: médio — **Risco**: brute-force de senha viável.

## Quick wins
- Remover `continue-on-error` do audit em PRs; manter só no scheduled.
- `USER nginx` no frontend Dockerfile.
- Adicionar `--frozen-lockfile` equivalente já existe (`npm ci`); adicionar `npm dedupe --check` no CI.
- `actions/cache` pro `~/.npm` já está via `setup-node`; adicionar pro Trivy DB.
- Buildar imagens com tag `${{ github.sha }}` **e fazer push pro GHCR** (atualmente só builda e descarta — desperdício).
- Branch protection rule no `master`: require CI green + 1 review.
- Adicionar `release-please` ou similar pra changelog automático (já tem padrão `feat/fix/chore`).

## Big bets
- **Migrar EasyPanel→Coolify ou Dokploy**: ambos têm rollback nativo, preview environments por PR, e suporte a registry-based deploys. Mantém VPS Hostinger.
- **Grafana Cloud free**: dashboards de Postgres + Redis + BullMQ + Node em 1 dia de setup. Multiplica visibilidade.
- **Backblaze B2 com Object Lock**: o próprio runbook DR já marca como follow-up para 6+ meses; resolve o cenário catastrófico Drive deletado e custa ~$0.005/GB/mês.
