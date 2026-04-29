# Relatório de Melhorias — QA & Testes

**Persona**: QA Lead (squad AIOX) · **Score**: 3/10

## Sumário executivo
FlowCRM tem **8 specs unitárias** cobrindo apenas 8 de 47 services do backend (~17% dos módulos), mais **2 e2e specs** (auth+leads, messaging). Frontend tem **zero testes** (Vite sem `vitest`/`@testing-library`). Threshold de coverage no `backend/package.json` está catastroficamente baixo: **4% statements, 2% branches**, ou seja, o gate de CI é decorativo. Risco mais grave: módulos de dinheiro (`billing`, `subscriptions`, Stripe webhooks) e onboarding (`signup`, `otp`) **nunca foram testados** — qualquer regressão chega direto em produção via `master → EasyPanel`.

## Mapa de cobertura atual

| Módulo backend | Tem spec? | Qualidade |
|---|---|---|
| auth | sim | mock-heavy, só happy-path login |
| audit (service+interceptor) | sim | bom — interceptor cobre skip/erro/IP/path |
| contacts, leads, users, me, trash | sim | mock 100% repo, sem integração Postgres |
| billing, subscriptions, signup, otp | **não** | crítico (dinheiro + onboarding) |
| conversations, messages, channels, capture | **não** | só coberto indiretamente em `messaging.e2e` |
| automations, scheduler, scheduler-reconciliation | **não** | BullMQ workers sem testes |
| platform-admin, analytics, search | **não** | endpoints sensíveis sem teste |
| companies, products, tasks, templates, pipelines, stages, labels | **não** | CRUD básico mas sem isolamento de tenant testado |
| google-calendar, mail, storage (S3) | **não** | integrações externas sem mock contract |

## Itens prioritários

### 1. Subir threshold de coverage e tornar gate real
- **Diagnóstico**: `coverageThreshold` em `backend/package.json:96-103` aceita 4%. CI sempre passa.
- **Recomendação**: rampa progressiva — 30% imediato, 50% em 30 dias, 70% em 90.
- **Esforço**: S | **Impacto**: alto | **Risco se não fizer**: PRs com zero teste continuam mergeando.

### 2. Cobrir billing/Stripe + signup/OTP com unit + e2e
- **Diagnóstico**: `backend/src/billing/billing.service.ts`, `subscriptions/subscriptions.service.ts`, `signup/signup.service.ts`, `otp/otp.service.ts` sem nenhum spec.
- **Recomendação**: unit para cada com mock do Stripe SDK + e2e `billing.e2e-spec.ts` cobrindo webhook (assinatura HMAC, idempotência, upgrade/downgrade) e `signup.e2e-spec.ts` (signup → OTP → primeiro login).
- **Esforço**: M | **Impacto**: alto | **Risco**: cobrança errada = chargeback + churn.

### 3. Tenant isolation tests (multi-workspace)
- **Diagnóstico**: nenhum spec valida que workspace A não enxerga dados de B. `leads.service.spec.ts:13-23` mocka tudo num único `ws-1`.
- **Recomendação**: e2e `tenant-isolation.e2e-spec.ts` criando 2 workspaces, 2 owners, e batendo cross-workspace nos endpoints sensíveis (leads, contacts, conversations, billing).
- **Esforço**: M | **Impacto**: alto | **Risco**: vazamento de dados = LGPD + processo.

### 4. Permissions matrix (RBAC) e privacidade de lead
- **Diagnóstico**: `LeadsService.move` recebe `UserRole.OWNER` no spec, mas seller/manager nunca testados. Privacy `private`/`team`/`all` sem cobertura.
- **Recomendação**: tabela parametrizada `it.each([OWNER, MANAGER, SELLER, AGENT])` para cada operação sensível, além de leads privados.
- **Esforço**: M | **Impacto**: alto | **Risco**: seller vê lead que não deveria.

### 5. Frontend zero tests — adicionar Vitest + Testing Library
- **Diagnóstico**: `frontend/package.json` sem `vitest`, sem `@testing-library/react`, sem MSW. Nenhum teste de hooks (axios interceptor, react-query, zustand store), forms (`react-hook-form`+`zod`), DnD (kanban).
- **Recomendação**: setup mínimo Vitest + RTL + MSW; cobrir login, kanban DnD, axios 401-refresh, ProtectedRoute.
- **Esforço**: M | **Impacto**: alto | **Risco**: refactor de UI quebra silenciosamente.

### 6. Ampliar e2e além de auth+leads e messaging
- **Diagnóstico**: só 2 e2e (`backend/test/auth.e2e-spec.ts`, `messaging.e2e-spec.ts`). Faltam fluxos: soft-delete + restore (trash), automations trigger, OAuth Google, audit redação de PII end-to-end.
- **Recomendação**: 1 e2e por módulo crítico, rodando contra Postgres efêmero (já tem em CI `ci.yml:18-30`).
- **Esforço**: L | **Impacto**: alto | **Risco**: regressões cross-module.

### 7. Test data builders + factories
- **Diagnóstico**: cada spec hardcoda `mockLead`, `mockUser` inline. Sem `faker`, sem builder pattern.
- **Recomendação**: criar `backend/test/factories/` com `userFactory`, `leadFactory`, `workspaceFactory` (Fishery ou builder caseiro + faker).
- **Esforço**: S | **Impacto**: médio | **Risco**: divergência entre fixtures, testes frágeis.

### 8. Concorrência, edge cases, mutation testing
- **Diagnóstico**: nenhum teste de race condition (mesmo lead movido por 2 users), idempotência (webhook Stripe replay), ou Stryker para validar a qualidade dos asserts atuais.
- **Recomendação**: adicionar Stryker piloto em `audit/` e `leads/`; teste de concorrência em `LeadsService.move` com `Promise.all`.
- **Esforço**: M | **Impacto**: médio | **Risco**: dirty data sob carga.

## Quick wins
- Subir threshold para 30% **agora** (5 min de edit em `backend/package.json:96-103`).
- Adicionar Vitest + 1 smoke test em frontend (1 dia).
- Criar `backend/test/factories/index.ts` (meio dia).
- Adicionar spec de `tenant-context.service.ts` (existe e é central, sem teste).
- Habilitar `--coverage` no PR comment do GitHub Actions (já gera artifact em `ci.yml:68-74`).

## Big bets
- **k6/Artillery** load tests no fluxo crítico (login → criar lead → mover) rodando nightly contra staging.
- **Stryker** mutation testing em audit + billing — garante que asserts não são teatrais.
- **Playwright** e2e visual no frontend cobrindo signup, kanban DnD, conversations realtime via WebSocket.
- **Pact/contract testing** entre backend e uazapGO/Stripe — hoje só mock unilateral em `messaging.e2e-spec.ts:29-31`.

## Arquivos relevantes

- `backend/package.json` (threshold em :96-103)
- `backend/test/jest-e2e.json`
- `backend/test/auth.e2e-spec.ts`
- `backend/test/messaging.e2e-spec.ts`
- `backend/src/leads/leads.service.spec.ts`
- `backend/src/audit/audit.interceptor.spec.ts`
- `.github/workflows/ci.yml`
- `frontend/package.json`
