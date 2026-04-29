# LGPD — Lei Geral de Proteção de Dados

Documento operacional dos direitos LGPD implementados no FlowCRM. Cobre o que o sistema oferece, como o usuário/cliente exerce cada direito, e os caminhos técnicos por trás.

## Quem é o controlador / DPO

- **Controlador dos dados**: DigitalBoost
- **Encarregado (DPO)**: consultoriadigitalboost@gmail.com
- **Base legal padrão**: execução de contrato + legítimo interesse para CRM operacional; consentimento explícito coletado no signup

## Direitos implementados

A LGPD (art. 18) garante 9 direitos ao titular dos dados. O FlowCRM atende os seguintes via self-service:

| Direito | Art. | Como exercer |
|---|---|---|
| Confirmação da existência do tratamento | 18, I | Login na plataforma |
| Acesso aos dados | 18, II | Configurações → Meus dados → **Baixar JSON** |
| Correção | 18, III | Editar perfil em qualquer tela |
| Anonimização / bloqueio / eliminação | 18, IV/VI | Configurações → Meus dados → **Excluir minha conta** |
| Portabilidade | 18, V | Mesmo botão "Baixar JSON" — formato aberto |
| Eliminação dos dados tratados com consentimento | 18, VI | Mesmo "Excluir minha conta" |
| Revogação do consentimento | 18, IX | "Excluir minha conta" + cancelar = retratação |

Direitos via suporte (não self-service): informação sobre uso compartilhado (II), revisão de decisão automatizada (não há decisões automatizadas hoje).

## Fluxo: exportar meus dados

`GET /api/me/data-export` (autenticado) retorna JSON com:

- Dados da conta (sem `passwordHash`)
- Workspace (config, plano, datas)
- `leads` / `contacts` / `companies` / `products` — incluindo soft-deleted (com flag `deletedAt`) durante o grace de 30 dias

UI: **Configurações → Meus dados (LGPD) → "Baixar meus dados"**. Download client-side via Blob, filename `meus-dados-YYYY-MM-DD.json`.

## Fluxo: excluir minha conta

UX padrão de janela de retratação (Discord/GitHub):

```
Usuário clica "Excluir minha conta"
  └─ Modal de confirmação textual ("EXCLUIR")
       └─ DELETE /api/me/account
            ├─ Marca user.scheduledDeletionAt = now() + 30d
            ├─ NÃO bloqueia login (UX de retratação)
            └─ Banner persistente em "Meus dados" com botão "Cancelar exclusão"

Em até 30d: usuário pode cancelar
  └─ POST /api/me/account/restore
       └─ Limpa scheduledDeletionAt

Após 30d: cron faz hard-delete
  └─ AccountPruneScheduler @Cron('30 4 * * *')
       └─ users.delete() onde scheduledDeletionAt <= now()
```

### Quem pode excluir a própria conta

- **Não-owner**: livre, sempre.
- **Owner sole user do workspace**: livre — a deleção do usuário acaba com o workspace.
- **Owner com outros usuários no workspace**: bloqueado com erro `409 Conflict`. Precisa transferir ownership ou cancelar a assinatura primeiro.

## Lixeira (soft-delete)

Quando o usuário deleta um lead/contato/empresa/produto pela UI normal, o registro vai pra **lixeira** por 30 dias antes do hard delete.

UI: **Configurações → Segurança → Lixeira** (apenas OWNER/MANAGER).

| Tipo | Endpoint origem do delete | Vai pra lixeira? |
|---|---|---|
| Lead | `DELETE /api/leads/:id` | ✅ |
| Contact | `DELETE /api/contacts/:id` | ✅ |
| Company | `DELETE /api/companies/:id` | ✅ |
| Product | `DELETE /api/products/:id` | ✅ |

Implementação: `@DeleteDateColumn` (TypeORM) na entidade. `find/findOne` filtram automaticamente; QueryBuilders críticos têm `.andWhere('deletedAt IS NULL')` explícito.

### Operações na lixeira

| Ação | Endpoint | Quem pode |
|---|---|---|
| Listar tudo | `GET /api/trash` | OWNER/MANAGER |
| Listar por tipo | `GET /api/trash/:type` | OWNER/MANAGER |
| Restaurar | `POST /api/trash/:type/:id/restore` | OWNER/MANAGER |
| Purge manual | `DELETE /api/trash/:type/:id` | OWNER/MANAGER |

Cron: `TrashPruneScheduler @Cron(EVERY_DAY_AT_4AM)` faz hard-delete em rows com `deletedAt < now() - TRASH_RETENTION_DAYS`.

## Consentimento

Capturado no signup: checkbox obrigatório (validação Zod `z.literal(true)`) com link para `/termos` e `/privacidade`. Se desmarcado, o submit é bloqueado pela validação client-side. **Não há registro persistente do consentimento ainda** — backlog.

Backlog imediato:
- Persistir `consent_given_at`, `consent_version` em `users` (migration follow-up)
- Pop-up de re-consent quando o texto da Política mudar (versão > consent_version)

## Redação de PII no audit log

Audit log nunca grava PII bruta. Detecção tanto por **nome de campo** quanto por **valor**:

**Por chave** (substituído por `[REDACTED]`):
- Genérico: `password`, `secret`, `token`, `apiKey`, `jwt`, `authorization`
- BR: `cpf`, `cnpj`, `rg`, `cnh`, `passaporte`, `telefone`, `celular`, `phone`, `cep`, `postalcode`

**Por valor** (regex em strings livres tipo campo `notes`):
- CPF (`123.456.789-00` ou 11 dígitos) → `[REDACTED_CPF]`
- CNPJ (`12.345.678/0001-90` ou 14 dígitos) → `[REDACTED_CNPJ]`
- Telefone BR formatado (`(11) 91234-5678`) → `[REDACTED_PHONE]`
- CEP (`01310-100`) → `[REDACTED_CEP]`

## O que falta (backlog LGPD)

- [ ] Persistir `consent_given_at` e `consent_version` em `users`
- [ ] Re-consent quando a Política for atualizada
- [ ] Incluir `audit_logs` no JSON do data-export (rastro do próprio usuário)
- [ ] Endpoint admin `POST /api/admin/lgpd/erase-by-email` — direito de eliminação a partir de um titular não cadastrado (pessoa que aparece em `contacts` mas não tem login)
- [ ] Página pública `/lgpd` listando esses direitos para visitantes não logados
- [ ] Relatório mensal automático de exercícios LGPD para o DPO
