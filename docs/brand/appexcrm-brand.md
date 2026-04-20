# AppexCRM — Brand Guidelines

> Identidade visual extraída do código-fonte atual do produto (pós-rebrand de FlowCRM → AppexCRM, 2026-04-20). Tudo aqui é o que já está implementado — este documento formaliza e serve como referência para evoluções.

---

## 1. Nome

**AppexCRM** (com dois Ps)

- Grafia oficial: `AppexCRM` (camel case, sem espaço)
- Em frases: *"o AppexCRM"* (masculino, como produto/SaaS)
- Em URLs/packages/slugs: `appexcrm` (minúsculo)
- Nunca: "Apex CRM", "Appex-CRM", "APPEXCRM", "appex crm"

**Tagline atual:** *"Gestão de vendas inteligente"*

---

## 2. Personalidade da marca

Extraída do visual atual (dark-first, paleta Stripe purple, Inter + JetBrains Mono, micro-interações Apple-like):

- **Premium** sem ser corporativo pesado
- **Minimalista** e limpo — muito espaço negativo, pouca decoração
- **Tech-first** — vibe de ferramenta profissional moderna (Stripe/Linear/Vercel)
- **Dark-first** — default do produto é modo escuro
- **Confiável e discreto** — cores de status sutis, shadows suaves, bordas quase invisíveis

**Tom de voz:** direto, seguro, em português brasileiro natural. Sem jargão técnico exagerado, sem emojis institucionais, sem exclamações em excesso. Comunica com clareza e respeito ao tempo do usuário.

---

## 3. Logo

### Mark (ícone)

- **Símbolo:** ⚡ Zap (raio) do conjunto [lucide-react](https://lucide.dev)
- **Stroke:** `2.5`, `fill="white"`
- **Container:** quadrado arredondado (`rounded-lg` no sidebar, `rounded-xl` no login/signup)
- **Fundo:** gradiente linear `135deg, #635BFF 0%, #4B44E8 100%`
- **Shadow colorida:** `0 2px 8px rgba(99,91,255,0.35)` (compacta) / `0 4px 16px rgba(99,91,255,0.40)` (destaque)

**Tamanhos de referência:**
| Uso | Container | Ícone |
|---|---|---|
| Sidebar | 28×28px | 14×14px |
| Login / Signup | 40×40px | 20×20px |
| Assinar (hero) | 48×48px | 24×24px |

### Wordmark (assinatura de texto)

- **Fonte:** Inter
- **Peso:** 600 (semibold)
- **Letter-spacing:** `-0.01em` (sidebar compacto) a `-0.02em` (títulos grandes)
- **Cor:** `var(--ink-1)` — `#0F172A` no light / `#F5F5F7` no dark

### Lockup padrão (sidebar)

`[Mark] AppexCRM` — mark + wordmark alinhados horizontalmente, gap `10px` (`gap-2.5`).

### Regras

- ✅ Mark sempre com o gradiente roxo oficial
- ✅ Wordmark sempre em Inter semibold
- ❌ Nunca usar o mark sem o gradient (ex: mark chapado em preto ou branco)
- ❌ Nunca stretchar ou distorcer o container
- ❌ Nunca trocar o ícone Zap por outro

---

## 4. Paleta de cores

### Brand (roxo — Stripe-inspired)

| Token | Hex | Uso |
|---|---|---|
| `brand-50`  | `#EEEEFF` | Backgrounds sutis, badges brand |
| `brand-100` | `#D8D8FF` | Highlights de hover |
| `brand-200` | `#B8B7FF` | |
| `brand-300` | `#9996FF` | Brand 500 em dark mode |
| `brand-400` | `#7A77FF` | Brand 500 em dark mode |
| **`brand-500`** | **`#635BFF`** | **Cor primária — botões, links, focus rings** |
| `brand-600` | `#4B44E8` | Gradiente do logo (parte final), hover |
| `brand-700` | `#3830C5` | |
| `brand-800` | `#2820A0` | |
| `brand-900` | `#1A1480` | |

### Neutros (superfícies e texto)

**Light mode (Stripe-inspired):**
| Token | Hex | Função |
|---|---|---|
| `--canvas` | `#F6F9FC` | Background do app |
| `--surface` | `#FFFFFF` | Cards, sidebar |
| `--surface-hover` | `#F6F9FC` | Hover em linhas/itens |
| `--edge` | `rgba(0,0,0,0.08)` | Bordas sutis |
| `--edge-strong` | `rgba(0,0,0,0.14)` | Bordas de input/select |
| `--ink-1` | `#0F172A` | Texto principal |
| `--ink-2` | `#425466` | Texto secundário |
| `--ink-3` | `#8898AA` | Placeholders, labels fracos |

**Dark mode (Apple-inspired):**
| Token | Hex | Função |
|---|---|---|
| `--canvas` | `#0C0C0F` | Background do app |
| `--surface` | `#161618` | Cards, sidebar |
| `--surface-hover` | `#1D1D20` | Hover |
| `--edge` | `rgba(255,255,255,0.06)` | Bordas sutis |
| `--edge-strong` | `rgba(255,255,255,0.10)` | Bordas fortes |
| `--ink-1` | `#F5F5F7` | Texto principal |
| `--ink-2` | `#86868B` | Texto secundário |
| `--ink-3` | `#48484E` | Placeholders |

Sidebar em dark usa tom um pouco mais escuro que a surface padrão: `#111113`.

### Status (idêntico em light e dark, com bg alpha ajustado)

| Token | Hex (light) | Hex (dark) | Uso |
|---|---|---|---|
| `--success` | `#00C07F` | `#00C07F` | Sucesso, conectado, ativo |
| `--danger` | `#E5484D` | `#FF6166` | Erros, destrutivos |
| `--warning` | `#F59E0B` | `#FFA825` | Avisos, trial expirando |

---

## 5. Tipografia

### Famílias

- **Sans (padrão):** `Inter`, fallback `system-ui, -apple-system, sans-serif`
- **Mono (números tabulares):** `"JetBrains Mono"`, fallback `monospace`

Ambas carregadas via Google Fonts no `<head>`.

### Pesos usados

Inter: **300, 400, 500, 600, 700**
JetBrains Mono: **400, 500**

### Escala de texto (do `index.css`)

| Uso | Tamanho | Peso | Notas |
|---|---|---|---|
| Page title | 18px | 600 | `letter-spacing: -0.02em` |
| Page subtitle | 13px | 400 | `var(--ink-3)` |
| Body padrão | 14px | 400 | line-height 1.5 |
| Inputs | 13.5px | 400 | |
| Buttons | 13px | 500 | |
| Badges | 11px | 500 | `letter-spacing: 0.01em` |

**Regra:** títulos sempre com letter-spacing negativo (`-0.01em` a `-0.02em`) para o ar premium do Inter em pesos altos.

---

## 6. Sistema de espaçamento e shape

### Border radius

- Badges: `20px` (pill)
- Inputs: `8px`
- Buttons, selects: `6px`
- Cards: `10-12px`
- Containers de ícone (logo): `8-12px` (`rounded-lg`/`rounded-xl`)

### Sombras (Stripe-style: soft + inner ring)

| Token | Uso |
|---|---|
| `--shadow-sm` | Botões secundários |
| `--shadow-md` | Cards padrão |
| `--shadow-lg` | Cards destacados, login |
| `--shadow-xl` | Modais, overlays |

Todas incluem um ring border sutil (`0 0 0 1px rgba(0,0,0,0.04-0.05)`) além da blur drop — assinatura Stripe.

### Alturas padrão de UI compacta

- Input: `36px`
- Button primary/secondary: `34px`
- Button ghost: `32px`
- Table row: `48px`
- Sidebar item: variável, padding `10px 10px`
- Sidebar logo row: `52px`

---

## 7. Animações

Transitions curtas, easing `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo suave).

| Animação | Duração | Uso |
|---|---|---|
| `slide-in` | 220ms | Toasts entrando pela direita |
| `fade-up` | 200ms | Modais, dropdowns |
| `fade-in` | 150ms | Overlays simples |
| `shimmer` | 1800ms loop | Skeletons de loading |

**Regra:** micro-interações sempre sutis. Nunca `ease-in` puro, nunca `bounce`. Transições discretas reforçam a sensação premium.

---

## 8. Iconografia

- **Biblioteca única:** [`lucide-react`](https://lucide.dev) — usar sempre, nunca misturar com outras libs
- **Stroke padrão:** `1.75` (regular) / `2` (ativo) / `2.5` (logo/hero)
- **Tamanho padrão:** `16px` (`w-4 h-4`) no corpo, `14px` no sidebar colapsado
- Sempre com `flex-shrink-0` em layouts flex

---

## 9. Tom de voz (baseado nos textos atuais)

Exemplos reais do produto:

> "Gestão de vendas inteligente"
> "Entrar no AppexCRM"
> "7 dias grátis. Sem cartão."
> "Seu código de recuperação de senha no *AppexCRM* é: XXXXXX"
> "Tarefas criadas no AppexCRM aparecem automaticamente no Google Calendar"

**Características:**
- Frases curtas, diretas
- Zero marketing-ês ("revolucione", "potencialize", "plataforma completa")
- Benefício concreto ou instrução clara
- Português BR natural, sem formalidade excessiva ("Entrar" não "Entre", "Assine um plano" não "Adquira uma assinatura")
- Não usa emojis em UI (exceto no WhatsApp OTP — canal informal)

---

## 10. Referências de inspiração (para evolução)

O visual atual bebe conscientemente de três fontes:

1. **Stripe** — light mode, paleta roxa `#635BFF`, shadows com ring, compactness
2. **Apple** — dark mode, pretos profundos (`#0C0C0F`, `#161618`, `#F5F5F7`), ink sutil
3. **Linear/Vercel** — densidade de UI, micro-interações, tipografia Inter

Qualquer expansão de identidade deve respeitar essa tríade.
