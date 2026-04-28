# Política de Segurança — FlowCRM

## Reportando uma vulnerabilidade

Se você encontrou uma falha de segurança no FlowCRM, **não abra issue pública no GitHub**. Reporte em privado pelo canal abaixo:

**Email**: [consultoriadigitalboost@gmail.com](mailto:consultoriadigitalboost@gmail.com)

Inclua, se possível:

- Descrição do impacto e severidade percebida
- Passos pra reproduzir (PoC mínimo)
- Versão / branch afetada
- Seu nome / handle se quiser crédito público após a correção

## O que esperar

| Etapa | SLA-alvo |
|---|---|
| Confirmação de recebimento | até 48h |
| Triagem inicial e classificação | até 5 dias úteis |
| Plano de correção comunicado | até 10 dias úteis após triagem |
| Patch em produção (criticidade alta) | até 14 dias após confirmação |
| Disclosure público / CVE | após patch + janela de migração de 30 dias |

São compromissos de melhor esforço, não SLA contratual. Casos sensíveis (zero-day em uso ativo, vazamento de dados) recebem prioridade fora dessa fila.

## Escopo

Aceitamos relatórios sobre:

- Backend NestJS (`backend/`) e seus endpoints HTTP/WebSocket
- Frontend React/Vite (`frontend/`) — XSS, CSRF, leaks de credencial em bundle
- Pipelines CI/CD (`.github/workflows/`) — secrets expostos, jobs com escalonamento de privilégio
- Imagens Docker publicadas
- Configurações de infra documentadas em `docs/runbook-*.md`

**Fora do escopo**:

- Dependências de terceiros (Stripe, EasyPanel, Cloudflare, etc.) — reporte direto ao vendor
- Engenharia social contra usuários ou colaboradores
- Volumetria / DDoS sem PoC de amplificação
- Output de scanners automáticos sem análise manual de impacto
- Bugs cosméticos sem implicação de segurança

## Safe harbor

Pesquisa de segurança feita de boa-fé, dentro do escopo acima, sem exfiltração de dados de produção, sem degradação de serviço, e sem acesso a contas que não sejam suas — **não será objeto de ação legal**. Se na dúvida sobre os limites, pergunte antes de testar.

## Hall da fama

Pesquisadores que reportarem falhas confirmadas e válidas serão listados aqui (com permissão).

_Lista vazia. Seja a primeira pessoa._
