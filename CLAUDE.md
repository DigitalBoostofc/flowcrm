# FlowCRM — Instruções para Claude Code

## Fluxo obrigatório para qualquer alteração de código

**NUNCA fazer push direto no `master`.** Push no master = deploy imediato em produção.

### ⚠️ VERIFICAÇÃO OBRIGATÓRIA ANTES DE QUALQUER COMMIT

**ANTES de fazer qualquer commit**, executar SEMPRE:

```bash
git fetch origin
git log --oneline origin/master..HEAD
```

- Se retornar **0 commits** (branch já foi mergeada ou está em master): **NÃO commitar aqui**. Criar nova branch a partir de `origin/master`:
  ```bash
  git checkout -b feat/nome-descritivo origin/master
  ```
- Se retornar commits: a branch ainda tem trabalho pendente, pode commitar normalmente.

**Por que isso existe:** Entre sessões, o histórico da conversa é perdido. Sem essa verificação, continuo commitando em branches já mergeadas, empilhando commits em cima de código que já está em produção. Isso aconteceu 3 vezes. Não pode repetir.

### Passos que devem ser seguidos SEMPRE:

1. **Verificar branch** (regra acima) — obrigatório antes de qualquer commit
2. **Implementar** as alterações localmente
3. **Testar localmente** — verificar se o backend/frontend compilam e rodam sem erro
4. **Aguardar confirmação do usuário** — perguntar "está funcionando como esperado?"
5. Somente após confirmação: **criar branch** com nome descritivo (ex: `feat/nome`, `fix/nome`)
6. **Commit + push na branch** (nunca no master diretamente)

### Regra de nomenclatura de branches

- `feat/` — nova funcionalidade
- `fix/` — correção de bug
- `chore/` — ajustes sem impacto funcional

### Ambiente local

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`
- Postgres: porta `5433`
- Redis: porta `6380`
- WhatsApp: uazapGO (API externa)

## API uazapi — consulta obrigatória ao spec

Qualquer alteração em código que envolva **Inbox** ou **integração uazapi** (`backend/src/channels/uazapi/`, webhook handlers, adapter, mensagens outbound/inbound) DEVE consultar `docs/uazapi-openapi-spec.yaml` antes de implementar — confirmar nomes de campos, estrutura de payload, schemas de resposta.

**Não invente nomes nem confie em memória/intuição.** uazapGO tem campos não-óbvios (ex: resposta de envio retorna `messageid`, não `id` ou `key.id`; em mensagens outbound `senderName`/`pushName` é o nome do nosso perfil Business, não do destinatário).

Como buscar no spec (~17k linhas): `grep -n "<termo>" docs/uazapi-openapi-spec.yaml` para localizar; depois ler o trecho com Read tool.
