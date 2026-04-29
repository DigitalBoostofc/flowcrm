# Matriz de retenção de dados

Quanto tempo cada classe de dado fica no banco antes de ser apagada definitivamente. Toda janela é configurável via env.

## Matriz

| Dado | Retenção | Cron de purge | Env de retenção | Env de habilitar |
|---|---|---|---|---|
| `audit_logs` | **90 dias** | `EVERY_DAY_AT_3AM` | `AUDIT_RETENTION_DAYS` | `AUDIT_PRUNE_ENABLED` |
| Lixeira (leads/contacts/companies/products) | **30 dias** | `EVERY_DAY_AT_4AM` | `TRASH_RETENTION_DAYS` | `TRASH_PRUNE_ENABLED` |
| Conta marcada para exclusão (LGPD) | **30 dias** | `30 4 * * *` (04:30) | `ACCOUNT_RETENTION_DAYS` | `ACCOUNT_PRUNE_ENABLED` |

Todos os crons estão **ativos por padrão**. Para pausar (ex: durante incidente), exporte `<X>_PRUNE_ENABLED=false` e reinicie.

## Janela de horário

Os crons rodam escalonados de madrugada (3h–5h UTC) para não competirem com o backup nem com pico de uso. Ordem fixa:

```
03:00  audit_logs prune (90d)
04:00  lixeira purge (30d)
04:30  account hard-delete (30d)
```

Se um falhar, **não bloqueia** o seguinte — cada um é isolado em try/catch e loga o erro via Pino.

## O que cada janela protege

**90 dias para audit_logs** — equilíbrio entre rastro forense útil (cobre quase um trimestre fiscal) e custo de storage. Para auditoria fiscal mais longa, exportar antes do prune.

**30 dias para lixeira** — janela típica do mercado para "exclui sem querer, recupera". Ajustável por workspace? Não hoje (env global) — backlog se um cliente pedir.

**30 dias para conta marcada para exclusão** — janela de retratação LGPD. Período em que o usuário pode "Cancelar exclusão" pela UI. Após esse prazo o `users.delete()` é definitivo e não há recuperação.

## Cascata na exclusão de conta

Quando o cron `AccountPruneScheduler` apaga um `users` row:

1. ON DELETE CASCADE / SET NULL nas FKs (configuradas nas migrations)
2. Audit logs do usuário **permanecem** (`userId` vira FK órfã, sem cascade) — são rastro forense, não dado pessoal exportável
3. Workspace só é apagado se o usuário era OWNER e único do workspace (regra do `MeService.scheduleAccountDeletion` que bloqueia o caso multi-user)

## Mudando uma janela em produção

Edite o env no EasyPanel e reinicie o serviço backend:

```env
AUDIT_RETENTION_DAYS=180          # passa pra 6 meses
TRASH_RETENTION_DAYS=14           # passa pra 2 semanas
ACCOUNT_RETENTION_DAYS=60         # passa pra 60 dias
```

Mudanças tomam efeito no próximo tick do cron (no máximo 24h depois).

## Verificando se um cron rodou

Logs do backend (Pino, JSON em produção):

```
[AuditService] Pruned 412 audit_logs older than 90d
[TrashPruneScheduler] Purged 17 trash rows older than 30d: {"leads":12,"contacts":5,"companies":0,"products":0}
[AccountPruneScheduler] Hard-deleted user a@b.com (uuid) after grace window
```

Se você não vê **nenhum log de prune** num dia, é sintoma de cron parado — provavelmente o app não rodou às 03–05h UTC ou o env `_PRUNE_ENABLED=false`.

## Backlog

- [ ] Por-workspace override: workspace enterprise pede 7 anos de audit, outro pede 30 dias
- [ ] Métrica Prometheus: `flowcrm_prune_rows_total{type="audit|trash|account"}` para dashboard de saúde
- [ ] Alerta Sentry quando uma execução de cron lançar exceção (hoje só vai pra log)
