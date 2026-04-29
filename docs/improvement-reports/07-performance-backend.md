# Relatório de Melhorias — Performance Backend

**Persona**: Senior Backend Engineer (squad AIOX) · **Score**: 4/10

## Sumário executivo
Stack está bem estruturada (BullMQ ativo, EventEmitter integrando leads, processor de automation com rate limit, índice composto em messages). Mas tem **4 hotspots críticos**: (1) Redis instalado e **zero cache** de catálogos/JWT, (2) `findAll` de leads sem paginação carregando 7 relations, (3) inbox sem paginação e usando subquery LATERAL por conversa, (4) search via `ILIKE` cross-entity sem `pg_trgm`. `QUEUE_OUTBOUND` declarada mas **nunca usada** — sends de WA vão síncronos no request path do OTP/signup.

## Hot paths identificados

| Endpoint | Risco | Causa |
|---|---|---|
| `GET /api/leads` (findAll) | alto | sem `take`/skip, 7 leftJoinAndSelect (`leads.service.ts:76-101`) |
| `GET /api/conversations/inbox` | alto | sem paginação + LATERAL subquery por conversa (`conversations.service.ts:60-87`) |
| `GET /api/analytics/summary` | alto | 8 aggregations síncronas no request (`analytics.service.ts:36-120`) |
| `GET /api/search?q=` | alto | 3× `ILIKE %term%` sem trigram index (`search.service.ts:21-44`) |
| `POST /api/otp` / signup | alto | `channels.send` WA síncrono (`otp.service.ts:61`, `signup.service.ts:277`) |
| Qualquer rota autenticada | médio | JWT verify por request, sem cache de user (`jwt.strategy.ts:21`) |
| Socket.io broadcasts | médio | sem Redis adapter — não escala multi-node (`notifications.gateway.ts:16`) |

## Itens prioritários

### 1. `GET /leads` sem paginação carregando 7 relations
- **Diagnóstico**: `leads.service.ts:76-101` — `findAll` retorna **todos** os leads do workspace com contact/company/stage/assignedTo/createdBy/pipeline/labels. Workspace com 5k leads = ~35k joins materializados + serialização class-transformer.
- **Recomendação**: paginação obrigatória (`take` default 50, `skip`), retornar lista enxuta (apenas FKs + `select`); reservar relations só para `findOne`. Mesmo problema em `findByPipeline` (linha 40).
- **Esforço**: M | **Impacto**: alto (>70% de redução de payload e tempo) | **Risco**: timeout 30s e OOM no Node sob 10k+ leads.

### 2. Cache Redis ausente — JWT validate e catálogos quentes
- **Diagnóstico**: `Grep cacheManager` retornou **zero matches**. `jwt.strategy.ts:21` valida HMAC a cada request mas não consulta DB (ok); porém pipelines/stages/labels/products/plans (catálogos quase imutáveis) são lidos a cada page load do Kanban.
- **Recomendação**: `CacheModule.registerAsync` com `cache-manager-ioredis-yet`. Cache 60-300s para `pipelines.findAll`, `stages.findByPipeline`, `labels.findAll`, `plans.findAll`. Invalidar em mutations via event.
- **Esforço**: M | **Impacto**: alto (-50% de queries no Postgres em horário de pico) | **Risco**: pool de 30 conexões satura sob spike de Kanban.

### 3. `channels.send` síncrono em OTP/signup — deveria usar `QUEUE_OUTBOUND`
- **Diagnóstico**: `otp.service.ts:61` e `signup.service.ts:277` chamam `this.channels.send` (HTTP externo uazapGO) **dentro do request**. A fila `QUEUE_OUTBOUND` está registrada (`queues.module.ts:27`) mas **nenhum `@Processor` consumer existe** — só um failed-jobs listener.
- **Recomendação**: criar `OutboundMessageProcessor`, enfileirar send com `attempts:3` + `backoff`. Retorna 202 imediato. Mesmo `automation.processor.ts:183` e `scheduled-message.processor.ts:36` deveriam ir pra essa fila (hoje fazem HTTP dentro de outro worker).
- **Esforço**: M | **Impacto**: alto (request OTP cai de ~800ms p/ <50ms) | **Risco**: timeout uazapGO derruba signup; sem retry uniforme.

### 4. Search com `ILIKE %term%` cross-entity, sem pg_trgm
- **Diagnóstico**: `search.service.ts:21-44` — 3 queries `ILIKE '%term%'` em contacts.name/phone/email + leads.title + contact.name/phone. **Full table scan** garantido (`%` no início). Nenhum índice GIN+trigram detectado nas migrations.
- **Recomendação**: migration `CREATE EXTENSION pg_trgm` + `CREATE INDEX ... USING gin (name gin_trgm_ops)` em contacts(name, phone, email) e leads(title). Trocar `ILIKE` por `% operator` ou manter ILIKE (planner usa o GIN).
- **Esforço**: S | **Impacto**: alto (ms p/ workspace com 50k contacts) | **Risco**: search trava com workspace grande, statement_timeout 30s estoura.

### 5. Inbox sem paginação + LATERAL subquery por conversa
- **Diagnóstico**: `conversations.service.ts:60-87` — retorna **todas** as conversas do workspace com `LATERAL (SELECT ... ORDER BY sentAt DESC LIMIT 1)`. Postgres precisa de índice `(conversationId, sentAt DESC)` — existe (`message.entity.ts:9`), bom. Mas sem `LIMIT/OFFSET` no SQL externo, workspace com 10k conversas = 10k LATERAL subqueries.
- **Recomendação**: paginar (default 30, cursor por `sentAt`), e considerar denormalizar `lastMessageId/lastMessageAt` na tabela `conversations` (atualizado por trigger ou listener `message.received`).
- **Esforço**: M | **Impacto**: alto | **Risco**: inbox trava em tenants ativos.

### 6. Analytics síncrono no request, sem materialized view nem cache
- **Diagnóstico**: `analytics.service.ts:36-120` — 8 aggregations paralelas com `qb.clone()` no request. Bom uso de `Promise.all`, mas não tem cache: cada refresh do dashboard = 8 full scans de leads filtrados.
- **Recomendação**: cache Redis 60-120s por `(workspaceId, pipelineId)`. Médio prazo: materialized view `analytics_lead_daily` + refresh agendado via BullMQ repeatable job.
- **Esforço**: S (cache) / L (MV) | **Impacto**: médio-alto | **Risco**: dashboard derruba pool em pico de manhã.

### 7. Socket.io single-node — sem Redis adapter
- **Diagnóstico**: `notifications.gateway.ts:16` — `WebSocketGateway` sem `@nestjs/platform-socket.io` adapter Redis configurado. Multi-instância EasyPanel = broadcasts perdidos entre nós.
- **Recomendação**: `@socket.io/redis-adapter` + IoRedis pub/sub (Redis já disponível). Configurar em `main.ts`.
- **Esforço**: S | **Impacto**: médio (escala horizontal hoje quebra real-time) | **Risco**: ao escalar para 2+ pods, chat para alguns usuários para de funcionar.

### 8. Loops sequenciais em `automation-trigger.listener`
- **Diagnóstico**: `automation-trigger.listener.ts:54,62` — `for (const a of list) await this.enqueue(...)`. `queue.add` é I/O Redis; sequencial.
- **Recomendação**: `Promise.all(list.map(a => this.enqueue(...)))` ou `queue.addBulk`.
- **Esforço**: S | **Impacto**: baixo (lista pequena) mas trivial.

## Quick wins

- Pg_trgm + GIN em contacts/leads (1 migration).
- `Promise.all` em automation-trigger.listener:54,62.
- Cache Redis em `pipelines.findAll`, `stages.findByPipeline`, `plans.findAll`, `labels.findAll` (TTL 120s).
- Cache de analytics summary (TTL 60s, key=`workspaceId:pipelineId`).
- `findAll` de leads/conversations com `take` default + DTO sem labels/createdBy quando view de lista.

## Big bets

- Outbound queue real (`OutboundMessageProcessor`) — todo `channels.send` passa por fila, com retry e dedup. Refatora otp/signup/automation/scheduler.
- Materialized view de analytics + refresh BullMQ repeatable.
- Socket.io Redis adapter — pré-requisito p/ qualquer escala horizontal.
- DataLoader (graphql-style) por request para resolver `contact/stage/pipeline/assignedTo` em batch — elimina N+1 quando frontend pede listas com expansão.
- Denormalizar `conversations.lastMessageBody/Direction/SentAt` (atualizado em listener `message.received`) — elimina LATERAL no inbox.
