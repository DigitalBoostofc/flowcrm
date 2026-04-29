# Relatório Executivo de Melhorias — FlowCRM

**Data**: 2026-04-29
**Branch**: master (Fase 4D2 recém-mergeada via PRs #29, #30, #31)
**Squad**: 7 agentes paralelos AIOX
**Cobertura**: arquitetura, qualidade, devops, banco, UX, produto, performance

---

## Como ler esta pasta

Este diretório contém o relatório completo de melhorias do FlowCRM produzido pela squad AIOX (Orion orquestrando 7 agentes especialistas em paralelo). Cada agente analisou o repositório atual no seu domínio e produziu um relatório com 5-8 itens priorizados.

**Estrutura:**

- [00-executive-summary.md](./00-executive-summary.md) — este arquivo, síntese cruzada e roadmap
- [01-architecture.md](./01-architecture.md) — Arquitetura, módulos, padrões, dívida estrutural
- [02-qa-testing.md](./02-qa-testing.md) — Cobertura de testes, E2E, mutation, frontend
- [03-devops.md](./03-devops.md) — CI/CD, infra, secrets, observabilidade, deploy
- [04-database.md](./04-database.md) — Schema, índices, queries, retention, particionamento
- [05-ux-frontend.md](./05-ux-frontend.md) — Design system, a11y, performance UI, bundle
- [06-product-competitive.md](./06-product-competitive.md) — Gaps vs HubSpot/Pipedrive/RD/Kommo
- [07-performance-backend.md](./07-performance-backend.md) — Hot paths, cache, BullMQ, N+1

Cada relatório segue o formato: sumário executivo → mapa/tabela → itens prioritários (diagnóstico/recomendação/esforço S/M/L/impacto/risco) → quick wins → big bets.

---

## Sumário executivo

O FlowCRM é um **monolito NestJS bem estruturado** com fundações sólidas (multi-tenant via CLS, BullMQ + EventEmitter integrados, audit log com PII redaction, LGPD operacional 4D2 completa, CI com testes/build/audit/Trivy, multi-stage Dockerfiles, backups GPG off-site, runbooks BCP/DR escritos). É **mais maduro do que parece** num primeiro olhar, fruto das fases 1-3 + 4D entregues.

Mas mostra sinais clássicos de **scale-by-addition**: 45 módulos importados flat no `app.module`, services médios virando god-services (`SignupService` com 7 deps cross-domain, `AutomationProcessor` orquestrando 5 domínios), `EventEmitter2` subutilizado (3 listeners para 45 módulos), **Redis instalado e zero cache** em catálogos quentes, listagens core (`leads.findAll`, `conversations.inbox`) **sem paginação** carregando relations completas, search com `ILIKE %x%` sem trigram, frontend com **bundle 1.5MB monolítico** sem code-splitting e gradiente inline em 96 lugares, e fila `QUEUE_OUTBOUND` declarada **mas sem consumer** — sends WhatsApp vão síncronos no request path do OTP/signup.

Riscos críticos imediatos: **(1)** quando o primeiro tenant atingir 10k leads, `GET /api/leads` derruba o backend; **(2)** `npm audit` é `continue-on-error` no CI = vulneráveis em prod sem ninguém ver; **(3)** secrets em texto plano no painel EasyPanel sem rotação; **(4)** zero teste em billing/Stripe + signup/OTP — qualquer regressão chega direto em prod.

Janela competitiva: **6-9 meses** antes de Kommo/RD consolidarem IA + WhatsApp. FlowCRM tem o tijolo (3 adapters de canal, audit, LGPD) — falta a camada de IA e inbox multicanal exposta na UI.

---

## Issues cruzadas (mesma dor vista por múltiplos agentes — sinal mais forte)

| Issue | Quem viu | Severidade |
|---|---|---|
| **`findAll` de leads/contacts/conversations sem paginação** | architect, data-engineer, performance | 🔴 crítica |
| **Cache Redis ausente** (catálogos + analytics + JWT) | data-engineer, performance | 🔴 crítica |
| **Fila `QUEUE_OUTBOUND` sem consumer** (WA síncrono) | architect, performance | 🔴 crítica |
| **`continue-on-error` no audit/Trivy + sem lint script** | qa, devops | 🔴 crítica |
| **Bundle 1.5MB monolítico** sem code-splitting | ux, performance | 🟠 alta |
| **EventEmitter subutilizado** (acoplamento direto entre services) | architect, performance | 🟠 alta |
| **jsonb arrays pra FKs** (`additionalAccessUserIds`, `produtos`, `pessoaIds`) | architect, data-engineer | 🟠 alta |
| **Zero frontend tests** + 8 specs backend cobrindo 17% dos módulos | qa | 🟠 alta |
| **Tenant isolation não testado** (workspace A vendo B?) | architect, qa | 🔴 crítica (LGPD) |
| **`tenant.run(ws, undefined, …)` em jobs** = `userId=null` no audit | architect, data-engineer | 🟠 alta (compliance) |
| **Soft-delete cascata inconsistente** (lead aponta pra contato deletado) | architect, data-engineer | 🟠 alta (LGPD) |

---

## Score por área

| Área | Score | Veredito |
|---|---|---|
| 🏛 Arquitetura | 6/10 | Boa mas começando a degradar |
| 🧪 QA / Testes | 3/10 | Cobertura catastrófica |
| 🚀 DevOps / Operação | 7/10 | Mais madura do que parece |
| 🗄 Banco de Dados | 5/10 | Funcional, mas sem paginação/índices/partition |
| 🎨 UX & Frontend | 5/10 | WIP — tokens fortes, primitives ausentes |
| 📈 Produto / Competitivo | 6/10 | Core sólido, falta IA |
| ⚡ Performance Backend | 4/10 | Hotspots críticos não tratados |

---

## Roadmap sugerido — priorização por sprint

### Sprint 1 (1 semana) — Quick wins de baixo risco e alto impacto
**Tema: estancar sangramentos**

- [ ] **Subir threshold de coverage** pra 30% e remover `continue-on-error` do audit em PRs (qa+devops, S)
- [ ] **5 índices compostos** numa migration única + `pg_trgm` extension (data-engineer, S)
- [ ] **Branch protection** no `master` + `USER nginx` no frontend Dockerfile (devops, S)
- [ ] **Cache Redis** em catálogos quentes (`pipelines.findAll`, `stages.findByPipeline`, `labels.findAll`) TTL 120s (perf, S)
- [ ] **Paginação default `take=50`** em `leads.findAll` e `contacts.findAll` (perf+data, S)
- [ ] **Skip link + focus-trap real no Modal** (ux, S)
- [ ] **`manualChunks` no vite.config** + `lazy()` em rotas raras (Admin, Analytics, Widget) (ux+perf, S)

**Resultado esperado**: ~50% redução de payload em listagens, CI virando gate real, latência de Kanban -40%.

---

### Sprint 2-3 (2-3 semanas) — Hardening e cobertura
**Tema: garantir que não quebra**

- [ ] **`OutboundMessageProcessor`** consumer da `QUEUE_OUTBOUND` — refatora otp/signup/automation/scheduler pra enfileirar send WA (perf+arch, M)
- [ ] **Specs unit + e2e billing/Stripe + signup/OTP** + tenant-isolation.e2e-spec (qa, M)
- [ ] **Vitest + Testing Library** setup no frontend + 1 smoke test (qa+ux, M)
- [ ] **Centralizar `LeadVisibilityPolicy`** + migrar `tenant.run` pra `runAs` com userId obrigatório (arch, M)
- [ ] **Componentizar `<Button>` + `<Input>`** + codemod removendo 96 gradients inline (ux, M)
- [ ] **Socket.io Redis adapter** (perf, S)
- [ ] **Materialized view ou cache de analytics** (TTL 60s) (data+perf, S→L)

**Resultado esperado**: cobertura ~50%, request OTP cai de 800ms→<50ms, fundação a11y pra crescer.

---

### Sprint 4-6 (3-6 semanas) — Estrutura e diferenciação
**Tema: competir em IA**

- [ ] **Camada de IA**: módulo `ai/` com sumarização de conversa + sugestão de mensagem + classificação de intent (LLM via Anthropic SDK + prompt cache + BullMQ) (produto+arch, M)
- [ ] **Lead scoring** com regras configuráveis + trigger em automations (produto, M)
- [ ] **Inbox multicanal** — ativar tabs IG/FB/Email no `Inbox.tsx` (produto, M)
- [ ] **API pública + Swagger + Webhooks outbound** (produto+arch, M)
- [ ] **Bounded contexts** no `app.module` (CrmContext, MessagingContext, IdentityContext, BillingContext) (arch, M)
- [ ] **Particionamento mensal** de `messages` e `audit_logs` (data, M)
- [ ] **PWA** com `vite-plugin-pwa` + push notifications (ux+produto, S)

**Resultado esperado**: posicionamento "CRM com IA + WhatsApp pra PME BR" defensável vs Kommo/RD por 12-18 meses.

---

### Big bets de longo prazo (3-6 meses)

- **Migrar EasyPanel → Coolify/Dokploy** (rollback nativo, preview por PR)
- **Application Services / Use Cases layer** (decoupla TypeORM dos services)
- **Outbox pattern** pra eventos críticos
- **Substituir jsonb arrays por tabelas de associação** (`lead_access`, `contact_products`)
- **AI Sales Coach + cobrança PIX embutida + roleplay com IA** — diferenciação não-óbvia

---

## Riscos críticos imediatos (resolver antes de tudo)

1. 🔴 **Tenant isolation não testado** — risco LGPD + processo. Sprint 1.
2. 🔴 **`tenant.run(ws, undefined)` em jobs** = `userId=null` no audit. Compliance LGPD furada. Sprint 1.
3. 🔴 **`continue-on-error` no audit do CI** — vulneráveis HIGH passam silenciosos. Sprint 1.
4. 🔴 **Soft-delete cascata** — lead via `leftJoinAndSelect` traz contato soft-deleted. LGPD. Sprint 1.
5. 🔴 **`findAll` sem paginação** — primeiro tenant grande derruba o backend. Sprint 1.

---

## Como esses relatórios foram produzidos

Comando AIOX `*aiox-master` invocado pelo usuário com argumento "delegar agentes da squad para fazer relatório de melhorias". Orion (orchestrator) dispachou 7 agentes em paralelo via Agent tool, cada um impersonando uma persona AIOX:

| Agente | Persona | Entrega |
|---|---|---|
| 1 | architect | [01-architecture.md](./01-architecture.md) |
| 2 | qa | [02-qa-testing.md](./02-qa-testing.md) |
| 3 | devops | [03-devops.md](./03-devops.md) |
| 4 | data-engineer | [04-database.md](./04-database.md) |
| 5 | ux-design-expert | [05-ux-frontend.md](./05-ux-frontend.md) |
| 6 | pm | [06-product-competitive.md](./06-product-competitive.md) |
| 7 | dev (perf focus) | [07-performance-backend.md](./07-performance-backend.md) |

Cada agente leu arquivos reais do repositório (não generalidades) e produziu ~600 palavras com file:line, SQL sugerido, tradeoffs explícitos. Síntese cruzada deste documento captura issues vistas por múltiplos agentes (sinal mais forte) e prioriza por sprint.
