# Relatório de Melhorias — UX & Frontend

**Persona**: UX Design Expert (squad AIOX) · **Score**: 5/10

## Sumário executivo
FlowCRM tem **tokens de design fortes** (Stripe-light + Apple-dark em `index.css`) e tipografia coerente, mas sofre de **design system parcial**: as primitives existem como classes CSS (`.btn-primary`, `.card`, `.input-base`) mas **não há Button/Input/Tabs componentizados**, então cada página reinventa estilos com `style={{ background: 'linear-gradient(135deg,…)' }}` (96 ocorrências). Bundle monolítico (1.5MB), zero code-splitting, zero virtualização e páginas gigantes (`Negocios.tsx` 1772 linhas, `Companies` 1349, `Funil` 1264). Acessibilidade rudimentar — só 14 arquivos com `aria-label`, sem focus-trap, sem skip links.

## Inventário rápido
- **Páginas**: 19 (em `frontend/src/pages/`) + 3 legais
- **Componentes UI base**: 9 em `components/ui/` — só `Modal`, `Skeleton`, `Toaster`, `Avatar`, `ThemeToggle` são genéricos. Faltam **Button, Input, Select, Tabs, Tooltip, Dropdown, Tag, EmptyState, ErrorBoundary**.
- **Design system**: WIP — tokens maduros, primitives ausentes.

## Itens prioritários

### 1. Code-splitting por rota (resolve bundle 1.5MB)
- **Diagnóstico**: `App.tsx` importa estaticamente as 19 páginas + `Negocios` é re-exportado de dentro de `Funil.tsx` (`import { AddNegocioModal } from '@/pages/Negocios'` — provavelmente a causa do warning dynamic+static). Tudo entra num único chunk.
- **Recomendação**: `const Funil = lazy(() => import('@/pages/Funil'))` para todas exceto Login/Signup; envolver `<Routes>` em `<Suspense fallback={<PageSkeleton/>}>`. Configurar `build.rollupOptions.output.manualChunks` em `vite.config.ts` (vendor, recharts, dnd-kit separados). Quebrar `AddNegocioModal` para fora de `Negocios.tsx`.
- **Esforço**: M · **Impacto**: alto · **Risco**: TTI ruim em 3G, abandono em mobile.

### 2. Componentizar Button, Input, Tabs (eliminar gradientes inline)
- **Diagnóstico**: `linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)` aparece **96 vezes**. `.btn-primary` no CSS é flat (sem gradient), mas `Login.tsx`, `Signup.tsx`, `Assinar.tsx` desenham botões com gradient inline — duas linguagens visuais coexistem.
- **Recomendação**: criar `<Button variant="primary|secondary|ghost|danger" size>` em `components/ui/Button.tsx` que encapsule as classes existentes. Decidir uma linguagem: gradient OU flat. Substituir 96 instâncias via codemod.
- **Esforço**: M · **Impacto**: alto · **Risco**: drift visual permanente.

### 3. Acessibilidade — focus trap em modais, skip link, labels
- **Diagnóstico**: `components/ui/Modal.tsx` tem `aria-modal` e ESC, mas **não trapa foco** (Tab vaza pra trás), não restaura foco no fechamento e aria-label usa o `title` (correto, mas sem `aria-describedby` pra `description`). Apenas `LeadPanel.tsx` importa `focus-trap-react`. Sem `<a href="#main">` skip link no `AppShell`.
- **Recomendação**: aplicar `focus-trap-react` no Modal genérico; adicionar `aria-describedby`; instalar `@radix-ui/react-dialog` ou similar pra herdar a11y completa de graça (também resolve item 2 em parte). Skip link no `AppShell.tsx`.
- **Esforço**: S · **Impacto**: médio · **Risco**: barreira pra usuários de teclado/leitor de tela; risco regulatório (LGPD não exige WCAG, mas planos B2B vão exigir).

### 4. Virtualização em Pessoas, Companies, Negocios (1300+ linhas cada)
- **Diagnóstico**: `ResizableDataList.tsx` provavelmente renderiza N linhas direto. Sem `react-window`/`@tanstack/react-virtual` no `package.json`. Workspace com 5k leads vai travar.
- **Recomendação**: adotar `@tanstack/react-virtual` (já casa com TanStack Query). Aplicar em `ResizableDataList`, `KanbanColumn` (cards podem ser muitos por etapa) e `LeadActivities`.
- **Esforço**: M · **Impacto**: alto (perceived perf) · **Risco**: scroll travado em contas grandes.

### 5. Empty / Error / Loading states padronizados
- **Diagnóstico**: `Skeleton` existe mas cada tela inventa o seu vazio. Sem `<EmptyState>` componente, sem `ErrorBoundary` global. Login mostra erro num `<div>` ad-hoc; Modal sem variante de erro.
- **Recomendação**: criar `<EmptyState icon title description action>` e `<ErrorBoundary>` no root de `<AuthedLayout>`. Padronizar mensagens ("Nenhum negócio aqui ainda — Criar primeiro").
- **Esforço**: S · **Impacto**: médio · **Risco**: percepção de produto incompleto.

### 6. Onboarding pra workspace novo
- **Diagnóstico**: pós-signup vai direto pra `/funil` (`Login` linha 40). Sem tour, sem estado vazio guiado, sem checklist de setup (canal WhatsApp, primeiro funil, importar contatos).
- **Recomendação**: checklist persistente no `Inicio.tsx` (5 passos), tooltip/spotlight em primeira visita usando `react-joyride` ou caseiro. Empty state do Funil = CTA grande "Importar contatos" + "Criar primeiro lead".
- **Esforço**: M · **Impacto**: alto na ativação · **Risco**: churn no D1.

### 7. Mobile / responsive não validado
- **Diagnóstico**: Tailwind permite, mas Funil tem Sidebar fixa, Kanban com colunas largas, modais de 1700+ linhas (`Negocios.tsx`). Touch targets de 32-34px (`.btn-ghost height: 32px`) — abaixo do mínimo iOS de 44px.
- **Recomendação**: aumentar altura de botões pra 40px em viewports `sm:`; testar Funil/Inbox em 375px width; considerar bottom-sheet em vez de Modal centrado em mobile.
- **Esforço**: M · **Impacto**: médio (depende de % mobile) · **Risco**: produto inutilizável no celular do vendedor em campo.

### 8. Storybook + visual regression
- **Diagnóstico**: zero `.storybook`, zero Chromatic, zero Playwright visual. Mudanças de tema viram bugs invisíveis até alguém abrir a tela.
- **Recomendação**: Storybook 8 + Chromatic free tier OU Playwright `toHaveScreenshot` cobrindo Login, Modal, Kanban, Tabs. Catalisa item 2 (Button/Input precisam de stories).
- **Esforço**: M · **Impacto**: médio · **Risco**: regressões visuais silenciosas.

## Quick wins
- Adicionar `<a href="#main" className="sr-only focus:not-sr-only">` em `AppShell.tsx`.
- Aplicar `focus-trap-react` no `Modal.tsx` genérico (já é dependência transitiva).
- Configurar `manualChunks` em `vite.config.ts` separando `recharts`, `dnd-kit`, `socket.io-client`.
- `lazy()` em `Admin.tsx`, `Analytics.tsx`, `WidgetPage.tsx` (raramente usadas) — corta ~200KB.
- Trocar 96x `linear-gradient(135deg, #635BFF 0%, #4B44E8 100%)` por var `--brand-gradient` em `index.css`.
- Remover re-export `AddNegocioModal` de `Negocios.tsx` dentro de `Funil.tsx` (resolve warning de chunk).
- Tornar scrollbar de 4px (linha 354) opcional — em macOS some, em Windows fica fino demais para grab.

## Big bets
- **Adotar shadcn/ui ou Radix Primitives** como base (Dialog, Tabs, DropdownMenu, Tooltip, Popover): herda a11y, kbd nav e API consistente; mantém os tokens atuais. Reduz `pages/` em ~30% LOC.
- **Quebrar páginas-monstro**: `Negocios.tsx` (1772) e `Companies.tsx` (1349) viram `pages/Negocios/{index,List,Detail,Modals}.tsx`. Habilita lazy loading granular e revisões de PR sãs.
- **i18n com `react-i18next`** agora antes de espalhar mais strings PT-BR hardcoded — barato hoje, caro depois. Roadmap: PT → EN → ES.
- **Design system documentado** (Storybook + tokens.json exportados pra Figma via Style Dictionary) — desacopla design de dev e desbloqueia contratação de designer externo.

## Arquivos relevantes

- `frontend/src/index.css`
- `frontend/src/App.tsx`
- `frontend/src/components/ui/Modal.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Negocios.tsx`
- `frontend/vite.config.ts`
- `frontend/tailwind.config.ts`
