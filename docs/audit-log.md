# Audit Log

Trilha de auditoria do FlowCRM — registra **toda mutação relevante** com quem fez, o quê fez, quando, em qual recurso.

## Por que existe

| Driver | Como o audit log resolve |
|---|---|
| **LGPD** (rastreabilidade) | quem alterou dado de quem, quando |
| **Pen test / segurança** | timeline forense de incidente |
| **Cliente B2B exigente** | "quem deletou esse lead?" |
| **Debug operacional** | reproduzir cenário a partir do que aconteceu |

## Schema

Tabela `audit_logs`:

| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | gerado pelo postgres |
| `workspaceId` | uuid | escopo multi-tenant. NULL pra ações de sistema |
| `userId` | uuid | quem fez. NULL pra cron/system |
| `action` | varchar(80) | `<resource>.<verb>` ou `<resource>.<verb>.<sub>` (ex: `lead.create`, `lead.id.move`) |
| `resourceType` | varchar(60) | tipo do recurso (`Lead`, `User`, `Workspace`) |
| `resourceId` | uuid | id do recurso afetado |
| `changes` | jsonb | payload da request (sanitizado) |
| `ipAddress` | inet | IP do cliente, derivado de `x-forwarded-for` quando atrás de proxy |
| `userAgent` | text | até 500 chars |
| `requestId` | varchar(80) | correlation ID (mesmo que aparece no Pino) |
| `createdAt` | timestamptz | now() |

Índices:
- `(workspaceId, createdAt DESC)` — listagem cronológica por workspace
- `(workspaceId, resourceType, resourceId)` — histórico de um recurso
- `(action, createdAt DESC)` — análise por tipo de ação

## Como é capturado

`AuditInterceptor` (global, registrado em `AuditModule` via `APP_INTERCEPTOR`):

1. Roda em **toda request HTTP**
2. Pula automaticamente:
   - Métodos read-only (`GET`, `HEAD`, `OPTIONS`)
   - Paths `/api/health/*`, `/api/webhooks/*`, `/api/_internal/*`
   - Handlers/controllers anotados com `@AuditSkip()`
   - Responses com status `>= 400` (errors vão pro Sentry)
3. Infere `action` e `resourceType` da rota:
   - `POST /api/leads` → `lead.create`, resource `Lead`
   - `PATCH /api/leads/:id` → `lead.update`, resource `Lead`, resourceId do path
   - `PATCH /api/leads/:id/move` → `lead.id.move`
   - `DELETE /api/contacts/:id` → `contact.delete`
4. Usa o body da request como `changes` (com redação automática)

## Redação automática

Campos cujos valores nunca entram no log (substituídos por `[REDACTED]`):

- `password`, `passwordHash`, `passphrase`
- `secret`, `token`, `authorization`, `jwt`
- `apiKey`, `api_key`, `webhookSecret`
- `privateKey`, `private_key`

A redação é recursiva (varre objetos aninhados) e por **nome de campo** (substring case-insensitive). Espelha a lista de redact do Pino em `logger.config.ts`.

## Como pular

Pra endpoints onde audit log polui sem trazer valor (uploads de binário grande, pings internos), use `@AuditSkip()`:

```typescript
import { AuditSkip } from '../audit/audit-skip.decorator';

@Controller('uploads')
export class UploadsController {
  @Post()
  @AuditSkip()
  upload(@UploadedFile() file: Express.Multer.File) { /* ... */ }
}
```

Use **com parcimônia** — toda exclusão é um buraco no rastreamento.

## Captura granular (before/after diff)

O interceptor captura o **input da request**. Pra registrar **before/after** de uma mutação (ex: campo X mudou de "a" pra "b"), o service precisa chamar `AuditService.record()` explicitamente:

```typescript
constructor(private readonly audit: AuditService) {}

async update(id: string, dto: UpdateLeadDto) {
  const before = await this.repo.findOne({ where: { id } });
  await this.repo.update(id, dto);
  await this.audit.record({
    action: 'lead.update.fields',
    resourceType: 'Lead',
    resourceId: id,
    changes: {
      title: { before: before?.title, after: dto.title },
      value: { before: before?.value, after: dto.value },
    },
    workspaceId: this.tenant.requireWorkspaceId(),
    userId: /* ... */,
  });
}
```

Isso é **opt-in** por design — não vale o overhead de carregar entidade antiga em toda update. Aplicar só onde a granularidade é exigida (auditoria fiscal, mudança de role, etc).

## Retenção

90 dias por padrão. `AuditService.pruneOlderThan(days)` apaga rows mais velhas. Hoje **não há cron** que invoque essa função — é follow-up imediato:

```cron
# /etc/crontab — domingo 04:00 UTC, prune semanal
0 4 * * 0 cd /opt/flowcrm && node -e "require('./prune-audit.js')()" >> /var/log/flowcrm-audit-prune.log 2>&1
```

(script utilitário a criar em PR de seguimento)

## Falhas são silenciosas

`AuditService.record()` faz `try/catch` — se o INSERT falhar, **a request original NÃO é afetada**. O erro vai pra Pino logger (e dali pro Sentry). Filosofia: audit é importante, mas não tão crítico quanto não derrubar o request.

## Queries úteis

### Tudo que um user fez nas últimas 24h
```sql
SELECT action, "resourceType", "resourceId", "createdAt"
FROM audit_logs
WHERE "userId" = '<uuid>' AND "createdAt" > now() - interval '24 hours'
ORDER BY "createdAt" DESC;
```

### Histórico completo de um lead
```sql
SELECT "userId", action, changes, "ipAddress", "createdAt"
FROM audit_logs
WHERE "resourceType" = 'Lead' AND "resourceId" = '<uuid>'
ORDER BY "createdAt" ASC;
```

### Top 10 IPs com mais atividade
```sql
SELECT "ipAddress", COUNT(*) AS n
FROM audit_logs
WHERE "createdAt" > now() - interval '7 days'
GROUP BY "ipAddress"
ORDER BY n DESC
LIMIT 10;
```

### Todas as deleções da semana
```sql
SELECT "userId", action, "resourceType", "resourceId", "createdAt"
FROM audit_logs
WHERE action LIKE '%.delete'
  AND "createdAt" > now() - interval '7 days'
ORDER BY "createdAt" DESC;
```

## Próximos passos (follow-up)

- [ ] Endpoint `GET /api/audit-logs?resourceType=&resourceId=` pra UI consumir
- [ ] Cron de prune (90 dias) pra limpar audit_logs antigos
- [ ] Interceptor melhorado: capturar before/after automaticamente em rotas anotadas com `@AuditFullDiff()`
- [ ] Export LGPD: incluir audit_logs do user no JSON exportado (Fase 4D2)
