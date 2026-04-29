# Relatório de Melhorias — Banco de Dados

**Persona**: Data Engineer (squad AIOX) · **Score**: 5/10

## Sumário executivo
Schema funcional e razoavelmente normalizado, mas com vários sinais de "schema crescido organicamente": jsonb usado como tabela de associação, listagens sem paginação em todas as APIs core (`leads`, `contacts`, `companies`), poucos índices compostos para os filtros mais frequentes (`workspaceId+status`, `workspaceId+pipelineId+status`, `workspaceId+stageId`), inexistência de `CHECK` para invariantes óbvios (`value >= 0`, `quantity >= 0`, datas coerentes) e nenhuma estratégia de archive/partition para tabelas append-only (`audit_logs`, `messages`, `scheduled_messages`). Risco maior: latência e custo de I/O escalando linearmente com volume por workspace, e `findAll` puxando o universo inteiro de leads/contacts via `leftJoinAndSelect` sem `take` → próximo workspace de 50k leads vai derrubar o backend ou estourar o `statement_timeout`.

## Mapa de tabelas críticas

| Tabela | Crescimento | Índice principal | Risco |
|---|---|---|---|
| leads | médio (~1k/mês/ws) | workspaceId | findAll sem paginação, joins eager pesados |
| contacts | médio | workspaceId | ILIKE %term% sem trigram + sem take |
| companies | médio | workspaceId, name, cnpj | OK, mas sem (workspaceId, name) composto |
| messages | alto (logs WhatsApp) | (conversationId, sentAt DESC) | sem TTL/archive, FK sem workspaceId composto |
| audit_logs | muito alto | (workspaceId, createdAt DESC) | retention 90d existe, mas sem partitioning |
| scheduled_messages | médio | (status, scheduledAt) WHERE pending | OK |
| automation_executions | alto | (leadId), UNIQUE(automationId, leadId) | sem workspaceId, sem TTL |
| lead_activities / contact_activities | alto | leadId | falta (workspaceId, createdAt DESC) |

## Itens prioritários

### 1. Paginação ausente em listagens core
- **Diagnóstico**: `LeadsService.findAll/findByPipeline` e `ContactsService.findAll` retornam todos os registros sem `take/skip`, com `leftJoinAndSelect` em 7 relações. ContactsService ainda traz `relations: ['leads']` → cartesiano explosivo. Em workspace médio (~10k leads, 5k contacts) ≈ 5MB JSON por request.
- **Recomendação**: cursor-based (`createdAt + id`) ou offset com hard cap default `take=50, max=200`. Refatorar contracts dos endpoints. `relations: ['leads']` no list de contatos remover (carregar só em `findOne`).
- **Esforço**: M | **Impacto**: alto | **Risco se não**: OOM/timeout no primeiro tenant grande.

### 2. Índices compostos faltando (filtros quentes)
- **Diagnóstico**: pipeline board e analytics filtram por `(workspaceId, pipelineId, status, archivedAt IS NULL, deletedAt IS NULL)`. Hoje só existe `(workspaceId)` simples.
- **Recomendação**:
  ```sql
  CREATE INDEX idx_leads_ws_pipe_status ON leads ("workspaceId","pipelineId",status) WHERE "archivedAt" IS NULL AND "deletedAt" IS NULL;
  CREATE INDEX idx_leads_ws_stage      ON leads ("workspaceId","stageId")          WHERE "deletedAt" IS NULL;
  CREATE INDEX idx_leads_ws_assigned   ON leads ("workspaceId","assignedToId");
  CREATE INDEX idx_messages_ws_conv    ON messages ("workspaceId","conversationId","sentAt" DESC);
  CREATE INDEX idx_lead_activities_ws_created ON lead_activities ("workspaceId","createdAt" DESC);
  ```
- **Esforço**: S | **Impacto**: alto.

### 3. jsonb abusivo para listas de FKs
- **Diagnóstico**: `additionalAccessUserIds` (leads/contacts/companies), `pessoaIds` (companies), `produtos` (contacts/companies) são arrays de UUIDs em jsonb. Sem FK validation, sem cascade ao deletar usuário/produto, e a query `additionalAccessUserIds @> [uid]::jsonb` aparece em todo find → não usa índice.
- **Recomendação**: tabela de associação `lead_access (leadId, userId)`, `contact_access`, `company_access`, `company_pessoas`, `contact_products` com PK composta e FK ON DELETE CASCADE. Mantém jsonb apenas onde realmente é schema-less (ex: `widgetConfig`, `automation_steps.config`).
- **Esforço**: L | **Impacto**: médio | **Risco se não**: ghost UUIDs após delete de usuário, queries N+1 manuais e impossibilidade de indexar GIN com cardinalidade decente.

### 4. CHECK constraints ausentes
- **Diagnóstico**: nenhum CHECK em `leads.value`, `products.price`, `lead.items[].quantity`, `lead.items[].unitPrice`. App já confia em DTOs Zod/Class-validator, mas DB aceita -1.
- **Recomendação**:
  ```sql
  ALTER TABLE leads      ADD CONSTRAINT ck_leads_value_nonneg CHECK (value IS NULL OR value >= 0);
  ALTER TABLE products   ADD CONSTRAINT ck_products_price_nonneg CHECK (price IS NULL OR price >= 0);
  ALTER TABLE leads      ADD CONSTRAINT ck_leads_dates CHECK ("conclusionDate" IS NULL OR "startDate" IS NULL OR "conclusionDate" >= "startDate");
  ```
- **Esforço**: S | **Impacto**: médio (defesa em profundidade).

### 5. messages e audit_logs sem estratégia de retenção/partition
- **Diagnóstico**: `messages` cresce indefinidamente (canal WhatsApp = append-only por lead). `audit_logs` tem prune 90d, mas tabela continua linear. Em 12 meses, 1 tenant ativo = milhões de linhas.
- **Recomendação**: particionar por mês (`PARTITION BY RANGE (sentAt|createdAt)`) e mover partições >180d para tablespace cold ou exportar para S3 + DROP PARTITION. Cron mensal cria próxima partição.
- **Esforço**: M | **Impacto**: alto (long-term) | **Risco se não**: VACUUM/autovacuum deteriora, queries de paginação ficam lentas.

### 6. Soft-delete inconsistente
- **Diagnóstico**: contacts tem soft-delete mas `lead.contactId` não tem regra de cascata lógica — lead aponta pra contact "soft-deleted" e queries com `leftJoinAndSelect('lead.contact')` ainda trazem o contato deletado (TypeORM não filtra `deletedAt` no relation join automaticamente quando usado em createQueryBuilder). LGPD: contato apagado ainda visível via lead.
- **Recomendação**: adicionar `.andWhere('contact.deletedAt IS NULL')` nos joins ou usar `withDeleted: false` consistente; cron que `SET contactId=NULL` ou anonimiza ao soft-delete.
- **Esforço**: S | **Impacto**: alto (compliance LGPD).

### 7. Connection pool e statement_timeout
- **Diagnóstico**: `DB_POOL_MAX=30` por instância. Com EasyPanel rodando 1-2 réplicas, ok. Mas `statement_timeout: 30s` é ousado para `analytics.getSummary` que faz 8 aggregations em paralelo — cada uma com `Promise.all` no MESMO QB clone → Postgres recebe 8 queries simultâneas no mesmo tenant. Em workspace de 100k leads é plausível estourar.
- **Recomendação**: para analytics, usar `statement_timeout: 60s` via `SET LOCAL` no início da transação, materialized view atualizada via cron (`mv_workspace_summary` refresh a cada 5min) ou cache Redis com TTL 60s.
- **Esforço**: M | **Impacto**: alto.

### 8. Migrations — down() incompletos / não reversíveis
- **Diagnóstico**: `MessagingSchema.down()` não remove índices, várias migrations posteriores (`AddCustomerOriginToLeads`, `AddFrozenStatusToLeadsEnum`, `AddDefaultLeadPrivacyToWorkspace`) não tem down robusto — alteram enums sem reversão (Postgres não remove valor de enum facilmente). `1718500000000-SoftDeleteAndDpo.down()` dropa coluna `deletedAt` — destruir dados em rollback.
- **Recomendação**: regra "no irreversible down"; adicionar testes que rodam up/down/up em CI; para alterações de enum, criar novo type + ALTER COLUMN TYPE USING.
- **Esforço**: M | **Impacto**: médio.

## Quick wins
- Índices compostos do item 2 (1 migration, ganho imediato em board e analytics)
- Adicionar `take` default 50 em `findAll` lead/contact (3 linhas)
- `pg_trgm` extension + `CREATE INDEX ... USING gin (name gin_trgm_ops)` em contacts/companies para o ILIKE %term%
- CHECK constraints item 4
- `application_name` já setado — bom; falta `log_min_duration_statement=500ms` em prod pra slow query log

## Big bets
- **Particionamento de messages e audit_logs** com retention automatizada
- **Substituir `additionalAccessUserIds` jsonb por tabelas de associação** + view materializada para checagem de acesso
- **Read replica + roteamento** dos endpoints de analytics/dashboard via DataSource separado (TypeORM não suporta nativo, precisa orquestrar manualmente ou usar pgbouncer + libpq target_session_attrs)
- **Backup verificável**: rodar mensalmente um restore para snapshot temporário com smoke-test (pg_dumpall + pg_restore num container scratch). Hoje runbook existe mas `pg_dump` não basta sem teste de restore.

## Arquivos relevantes

- `backend/src/leads/entities/lead.entity.ts`
- `backend/src/contacts/entities/contact.entity.ts`
- `backend/src/analytics/analytics.service.ts`
- `backend/src/app.module.ts`
- `backend/src/database/migrations/1714100000000-MessagingSchema.ts`
- `backend/src/database/migrations/1718400000000-AuditLogs.ts`
- `backend/src/database/migrations/1718500000000-SoftDeleteAndDpo.ts`
