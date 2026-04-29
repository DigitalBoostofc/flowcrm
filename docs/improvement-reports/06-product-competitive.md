# Relatório de Melhorias — Produto & Competitivo

**Persona**: Product Manager (squad AIOX) · **Score**: 6/10

## Sumário executivo

FlowCRM já cobre o "core" de um CRM moderno (multi-pipeline, kanban, contatos/empresas, tasks, atividades, automações, billing, audit/LGPD) e tem dois diferenciais reais para o mercado BR/PME: **WhatsApp first com 3 adapters já implementados** (`uazapi`, `evolution`, `meta` em `backend/src/channels/`) e **LGPD operacional** (lixeira 30d + DPO + audit redacted). A maior oportunidade é virar **"o CRM com IA + WhatsApp para PME brasileira"** — hoje não há integração LLM (`grep openai|anthropic` retorna zero), o `summary/` module é só email digest semanal por cron, e não há lead scoring. Kommo e RD já avançam em IA; janela de 6–9 meses para reposicionamento.

## Mapa competitivo

| Capability | FlowCRM | HubSpot | Pipedrive | RD CRM | Kommo |
|---|---|---|---|---|---|
| Multi-pipeline | sim | sim | sim | sim | sim |
| WhatsApp nativo | sim (3 providers) | não | não | parcial | sim |
| Inbox multicanal (Email+IG+FB) | infra pronta, UI não | sim | parcial | parcial | sim |
| Lead scoring automatizado | não | sim | parcial | sim | parcial |
| Email sequences/drip | não | sim | parcial(addon) | sim | sim |
| Form builder/landing | não (só widget JS) | sim | parcial | sim | parcial |
| Quotation/proposta PDF | não | parcial | parcial | não | não |
| API pública + Swagger | não (sem swagger) | sim | sim | sim | sim |
| Webhooks outbound | não | sim | sim | sim | sim |
| AI/LLM (sumário/sugestão) | não | sim | sim(beta) | parcial | parcial |
| Marketplace integrações | só GCal | enorme | grande | médio | médio |
| Mobile app nativo | não (sem PWA) | sim | sim | sim | sim |
| Calendar 2-way (GCal+Outlook) | só GCal | sim | sim | sim | parcial |
| LGPD operacional | sim (4D2) | parcial | parcial | sim | parcial |
| Audit log com PII redaction | sim | sim | parcial | parcial | não |
| Free tier / trial | não detectado | sim | trial | sim | trial |

## Itens prioritários

### 1. Camada de IA (sumarização + next-best-action + classificação)
- **Diagnóstico**: zero integração LLM no código. `summary/` apenas envia digest semanal via cron. Concorrentes já vendem "AI" como pacote.
- **Recomendação**: módulo `ai/` com (a) resumo de conversa WA on-demand no `LeadChat`, (b) sugestão de próxima mensagem com tone-matching, (c) classificação automática de intent (interesse/dúvida/objeção/desistência) gravada em lead activity, (d) extração automática de entidades (valor, prazo, produto) pra preencher campos do lead.
- **Esforço**: M (Anthropic SDK + prompt cache + fila BullMQ já existe).
- **Impacto**: alto — diferenciação + retenção + tempo de resposta.
- **Risco**: Kommo/RD já anunciaram features parecidas; sem IA o produto vira commodity em 12 meses.

### 2. Lead Scoring + Hot/Warm/Cold
- **Diagnóstico**: lead tem `status` (active/won/lost) mas não tem `score`. `lead-activities/` registra eventos mas não agrega.
- **Recomendação**: campo `score` 0-100 calculado por regras configuráveis (resposta WA <X min = +10, abertura email = +5, dias sem interação = -5) + badge visual no kanban. Trigger novo em `automations/` pra "score crossed threshold".
- **Esforço**: M.
- **Impacto**: alto em conversão.
- **Risco**: vendedor PME vira pra HubSpot/RD pra ter priorização.

### 3. Inbox unificado multicanal (UI sobre infra existente)
- **Diagnóstico**: backend já tem `channels.service` com 3 adapters; `Inbox.tsx` existe mas filtra só WA. Email/Instagram/FB Messenger não expostos.
- **Recomendação**: ativar tabs por canal no `Inbox.tsx`, adicionar adapter Email (IMAP/Gmail) e Instagram via Meta adapter. Vira "ChatCRM unificado".
- **Esforço**: M (infra pronta).
- **Impacto**: alto — neutraliza Kommo.
- **Risco**: cliente compra Kommo só pelo IG Direct.

### 4. API pública + Webhooks outbound + Swagger
- **Diagnóstico**: zero Swagger/OpenAPI no código. Só webhooks inbound (uazapi/meta/stripe). Bloqueia integrações externas (Zapier/Make/n8n).
- **Recomendação**: `@nestjs/swagger` com autodoc, criar tabela `webhook_subscriptions`, eventos `lead.created/won/lost`, `message.received`. API key por workspace.
- **Esforço**: S-M.
- **Impacto**: alto em retenção enterprise + ecossistema.
- **Risco**: cliente que precisa integrar com ERP brasileiro não consegue.

### 5. Form/Landing builder público
- **Diagnóstico**: hoje só `WidgetPage.tsx` (chat widget JS). Sem form embed para landing externa.
- **Recomendação**: `forms/` module com form builder drag-drop mínimo, endpoint `POST /public/forms/:slug`, anti-spam (honeypot + rate limit já existe), reaproveita `capture.service`.
- **Esforço**: M.
- **Impacto**: médio-alto em aquisição.
- **Risco**: cliente usa RD/HubSpot só pelo form.

### 6. Quotation/Proposta em PDF
- **Diagnóstico**: já tem `products/` e `value` em lead, mas nenhum gerador PDF (zero deps de pdf no `package.json`).
- **Recomendação**: template proposta com produtos do lead, export PDF (Puppeteer ou pdfkit), assinatura digital simples (clique + IP + timestamp).
- **Esforço**: M.
- **Impacto**: médio — fecha ciclo "lead → proposta → contrato".
- **Risco**: PME usa Word/Canva fora do CRM, perde rastreio.

### 7. PWA / mobile
- **Diagnóstico**: sem `manifest.json`, sem service worker. Só web responsivo.
- **Recomendação**: PWA com `vite-plugin-pwa`, push notification para mensagens WA recebidas (vendedor responder rápido = vantagem WhatsApp-first).
- **Esforço**: S.
- **Impacto**: alto em ativação.
- **Risco**: PME no celular não adota.

### 8. Free trial estruturado + onboarding guiado
- **Diagnóstico**: `subscriptions/` existe mas nenhuma flag `trialDays` aparente; sem tutorial in-app.
- **Recomendação**: 14d trial de plano top, checklist de onboarding (1º lead, 1º WA conectado, 1º pipeline customizado), email de drip + WA.
- **Esforço**: S.
- **Impacto**: alto em conversão trial→paid.

## Quick wins

- Outlook calendar 2-way (replicar `google-calendar.service.ts`).
- NPS in-app a cada 60d (1 modal, grava em audit).
- Templates de pipeline pré-prontos por vertical (imobiliária, infoproduto, agência) no signup.
- Botão "exportar conversa WA em PDF" no `LeadChat` (compliance + handoff).
- Swagger público em `/api/docs` — já roda Nest, custo ~1 dia.
- Push notification web no PWA (mensagens WA recebidas).

## Big bets — diferenciação

1. **AI Sales Coach pra WhatsApp** — analisa conversas perdidas, identifica padrão de objeção não tratado, sugere script. Ninguém faz bem em PT-BR. Reaproveita `summary/` + LLM.
2. **Cobrança embutida (PIX/boleto) na proposta** — Stripe já existe; adicionar PIX via Asaas/Pagar.me dentro da proposta PDF transforma CRM em "fechou + recebeu". Concorrentes brasileiros não têm (RD/Agendor mandam pra fora).
3. **Roleplay de vendas com IA** — vendedor treina pitch contra LLM persona (lead frio/objetivo/cético) gerada do próprio ICP do workspace. Onboarding viral para times novos. Diferencial não-óbvio.
