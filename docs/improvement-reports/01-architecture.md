# Relatório de Melhorias — Arquitetura

**Persona**: Architect (squad AIOX) · **Score**: 6/10

## Sumário executivo
FlowCRM é um monolito NestJS bem-estruturado (45 módulos, ClsModule + TenantContext sólido, BullMQ + EventEmitter já presentes, adapters para canais), mas mostra sinais clássicos de **scale por adição**: services médios virando god-services, eventos subutilizados, abstrações vazadas (storage/notifications acopladas a controllers) e ausência de uma camada de domínio. Saúde geral: **boa, mas começando a degradar** — ainda dá pra refatorar sem reescrever.

## Itens prioritários

### 1. `AutomationProcessor` quebra o boundary e DI cruza camadas
- **Diagnóstico**: `backend/src/automations/automation.processor.ts:38-44` injeta `LeadsService`, `TemplatesService`, `ChannelsService`, `ConversationsService`, `MessagesService` direto no worker. O processor virou um mini-orquestrador de 5 domínios. Pior: chama `leads.findOne(leadId)` (linha 72) que aplica regras de privacy não pertinentes a um job de sistema. Há ainda fan-out de tipos `as any` (lead) por não existir um `LeadAggregate` claro.
- **Recomendação**: Extrair um `AutomationStepExecutor` que recebe um **`LeadSnapshot`** (DTO read-only) e use cases finos (`SendOutboundMessageUseCase`, `LoadLeadForAutomationUseCase`). O processor só faz fila/transição de estado.
- **Esforço**: M
- **Impacto**: alto
- **Risco**: cada novo step type vai inflar o processor; testes ficam impossíveis sem subir 5 módulos.

### 2. `SignupService` é god-service com 7 dependências cross-domain
- **Diagnóstico**: `backend/src/signup/signup.service.ts:35-47` injeta `AppSettings`, `Channels`, `PlatformChannel`, `Contacts`, `Leads`, `Pipelines`, `Jwt`, `DataSource`, `OtpRepo`, `UserRepo`. Faz OTP + criação de workspace + bootstrap de pipeline padrão + tracking em workspaces admin (linhas 208, 227-268) — quatro responsabilidades. A função `trackInAdminWorkspaces` é literalmente um caso de uso event-driven feito sincronamente com `.catch()`.
- **Recomendação**: Quebrar em `OtpService` (já existe módulo `otp/`! merge), `WorkspaceProvisioningService` (cria ws + user + pipeline), e emitir `signup.completed` → listener trata `trackInAdminWorkspaces` async. Reduz 287 linhas para ~80 cada.
- **Esforço**: M
- **Impacto**: alto
- **Risco**: bug em tracking quebra signup do usuário real.

### 3. `EventEmitter2` está subutilizado — só 3 listeners para 45 módulos
- **Diagnóstico**: `Grep @OnEvent` retorna 3 arquivos (notifications, automations, channels). `Grep eventEmitter.emit` retorna 7. Praticamente todos eventos são `lead.moved` / `lead.created` / `message.received`. Operações como "lead vendido", "tarefa concluída", "trial expirando", "OTP verificado", "subscription mudou" estão **acopladas via chamadas diretas** entre services (ex: signup chamando `contacts.create` + `leads.create` em outros workspaces).
- **Recomendação**: Definir um catálogo de domain events (`backend/src/common/events/`) com tipagem forte, e mover side-effects cross-module para listeners. Regra: **se um service A precisa importar service B só pra disparar uma ação reativa, vira evento.**
- **Esforço**: M (incremental)
- **Impacto**: alto
- **Risco**: módulos cada vez mais entrelaçados; refactor por módulo fica impossível.

### 4. Padrão de query inconsistente — query builder vs find vs raw SQL
- **Diagnóstico**: `LeadsService.findByPipeline` usa `createQueryBuilder` (`leads.service.ts:42`); `ConversationsService.findInbox` usa `repo.query` raw (`conversations.service.ts:60-87`); `PlatformAdminService.listChannels` também (`platform-admin.service.ts:159`). A lógica de **privacy de leads** (linhas 64-71 e 92-99) está duplicada entre `findByPipeline` e `findAll`, e replicada como check em-memória em `assertAccessible` (linhas 121-136).
- **Recomendação**: Extrair `LeadAccessSpecification` (ou um `applyLeadVisibility(qb, user)`) e centralizar. Estabelecer convenção: lista paginada → QB; lookup por id → repo.find; agregação cross-tabela com performance crítica → SQL raw em repository class dedicada.
- **Esforço**: S
- **Impacto**: médio
- **Risco**: bug de privacy só em um dos pontos = leak de dados entre usuários.

### 5. `TenantContext.run(workspaceId, undefined, …)` — userId perdido em jobs
- **Diagnóstico**: `automation.processor.ts:57`, `inbound.listener.ts:56`, `signup.service.ts:245` chamam `tenant.run(wsId, undefined, …)`. Isso significa que o **audit log da fase 4D1 vai gravar `userId = null` para qualquer ação executada por automation/inbound/signup-tracking**. Confere com o commit `2d92362` recente (audit userId fix) que provavelmente só cobriu HTTP.
- **Recomendação**: Definir `SYSTEM_USER_ID` sentinel ou `actor: { type: 'system' | 'user', id }` no CLS. Listeners/processors devem propagar o userId do evento original quando disponível (lead.moved já tem trigger user no contexto).
- **Esforço**: S
- **Impacto**: alto (compliance LGPD/auditoria)
- **Risco**: rastro de auditoria furado — não dá pra investigar incidente de dados.

### 6. `app.module.ts` com 45 imports diretos — sem agrupamento de domínio
- **Diagnóstico**: `backend/src/app.module.ts:104-146` lista cada feature module flat. Não existe `CrmModule`, `MessagingModule`, `BillingModule` agregadores. Todos eles globais por convenção — qualquer módulo pode injetar qualquer service sem boundary explícito.
- **Recomendação**: Agrupar em **bounded contexts**: `CrmContextModule` (leads, contacts, companies, pipelines, stages, tasks, lead-activities, contact-activities), `MessagingContextModule` (channels, conversations, messages, templates, scheduler, automations), `IdentityContextModule` (auth, users, signup, otp, workspaces, me), `BillingContextModule` (billing, subscriptions, plans), `PlatformModule` (platform-admin, app-settings, audit, trash, feature-flags). Reduz superfície e prepara split futuro.
- **Esforço**: M
- **Impacto**: médio
- **Risco**: monolito bola de barbante; impossível extrair microserviço quando precisar.

### 7. Storage e Mail expõem provider direto, sem façade de domínio
- **Diagnóstico**: `backend/src/storage/` tem `local-storage.provider`, `s3-storage.provider`, `storage.interface`, `storage.service`, mas qualquer módulo que precisa upload acaba mexendo direto no controller (`uploads.controller.ts` mora dentro do storage). `MailModule` é só um service. Não há `ProfileAvatarStorage`, `LeadAttachmentStorage` — domínios falam com bytes raw.
- **Recomendação**: Façades por caso de uso (`AvatarsService`, `AttachmentsService`) que internamente usam `StorageService`. Mesmo princípio para mail (`TransactionalMailService` com métodos `sendOtp`, `sendWelcome`, `sendInvoice`).
- **Esforço**: S
- **Impacto**: médio
- **Risco**: trocar S3 por outro provider ou versionar templates de email vai virar caça aos pontos de uso.

## Quick wins (S de esforço)
- **Centralizar lead privacy filter** num helper único (item 4) — 2-3h.
- **Adicionar `actorUserId` no `tenant.run`** dos 4 call-sites (item 5) — meio dia.
- **Renomear `TenantContext.run` para `runAs`** e tornar `userId` obrigatório (com `'system'` literal) — força disciplina.
- **Mover `uploads.controller.ts` pra fora de `storage/`** — controllers HTTP não pertencem a infra-modules.
- **Padronizar paginação**: hoje `findAll` em leads/contacts retorna array sem limit; `platform-admin.listAudit` já tem. Criar `PaginationDto` em `common/`.
- **Extrair `LeadVisibilityPolicy`**: pequena classe injetável que encapsula `assertAccessible` + `applyToQueryBuilder`.

## Big bets (L mas transformadores)
- **Camada de Application Services**: introduzir `use-cases/` por domínio (ex: `MoveLeadUseCase`, `ClassifyLeadUseCase`, `SendAutomationStepUseCase`). Services TypeORM viram repositórios puros; controllers chamam use cases; eventos saem dos use cases. Habilita testes unitários sem DB.
- **Outbox pattern para eventos críticos**: `lead.moved` hoje é fire-and-forget via EventEmitter2 in-process — se o processo morrer entre `repo.update` e `emit`, automação não dispara. Tabela `outbox_events` + worker BullMQ resolve. Casamento natural com BullMQ que já está em produção.
- **Domain layer com aggregates explícitos**: `Lead` aggregate encapsulando regras (move, classify, freeze, lose) com invariantes em vez de `Object.assign(lead, dto)` (`leads.service.ts:157`). Necessário antes de escalar para 50+ módulos.
- **Splitting do platform-admin**: 391 linhas em um service para workspaces + channels + signups + metrics + broadcasts + flags + audit. Quebrar em 6 services dedicados sob um façade.
