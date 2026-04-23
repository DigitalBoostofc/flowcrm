# FlowCRM — Instruções para Claude Code

## Fluxo obrigatório para qualquer alteração de código

**NUNCA fazer push direto no `master`.** Push no master = deploy imediato em produção.

### Passos que devem ser seguidos SEMPRE:

1. **Implementar** as alterações localmente
2. **Testar localmente** — verificar se o backend/frontend compilam e rodam sem erro
3. **Aguardar confirmação do usuário** — perguntar "está funcionando como esperado?"
4. Somente após confirmação: **criar branch** com nome descritivo (ex: `feat/nome`, `fix/nome`)
5. **Commit + push na branch** (nunca no master diretamente)

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
