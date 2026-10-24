# Melhorias de visual, sidebar e desempenho

Data: 2026-10-23 · Status: aprovado no brainstorming e na revisão da especificação; aguardando leitura do usuário

## Objetivo

1. Permitir escolher a cor do texto dos botões de link.
2. Fazer o modelo escolhido no onboarding aparecer no perfil publicado exatamente como no desenho da escolha.
3. Fazer a sidebar do painel funcionar em janela estreita.
4. Reduzir o que o visitante do perfil público baixa.

## Situação atual (o que motivou)

- Não existe controle de cor do texto do botão. A cor é decidida por regra fixa em `getButtonStyle`, copiada em `src/pages/PublicProfile.tsx:227` e `src/components/dashboard/ProfilePreview.tsx:116`. No estilo sólido, o texto é preto só se o botão for exatamente `#ffffff`. Nos estilos `modern`, `rounded` e `glass`, o texto usa `colors.text`, a mesma "Cor do Texto" de nome e bio.
- O controle "Cor do Botão" (`buttonStyle.color`, DesignTab.tsx:387) é gravado, mas nenhum renderizador lê esse campo. O fundo do botão vem de `colors.primary` ("Cor Primária", DesignTab.tsx:433). `colors.accent` ("Cor de Destaque") não é lido em lugar nenhum.
- O onboarding grava `theme_options = { themeId, custom: template.config }`, mas o desenho (`PhoneMockup`) usa campos próprios (`bg`, `btnBg`, `btnText`, `textColor`, `btnRadius`) que não batem com o `config`. Exemplo: Peach mostra botão `#F5A876` com texto `#3D2B1F`, e o perfil sai com botão `#3D2B1F` e texto branco.
- `DesignTab.tsx:450` chama `handleThemeSelect('custom')` e depois `handleSaveTheme()` na mesma closure. O save ainda vê o `selectedTheme` anterior e, se ele for `pebble-blue` ou `cyber-neon` (predefinidos), grava a config predefinida e descarta as edições.
- Existe um segundo editor ("Design System": `src/components/design-system/**`, `DesignSystemTab`, `src/stores/designStore.ts`). Ele não persiste nada e não aparece em menu algum: a aba `design-v2` só existe no `Dashboard.tsx:132`.
- Sidebar: em janela de PC estreita, clicar no botão de mostrar/recolher não faz aparecer nada (relato do usuário, ainda não reproduzido). `AppSidebar` também força `w-14`/`w-60`, que não batem com o espaço reservado pelo componente (`3rem`/`16rem`).
- Todas as páginas são importadas de forma estática em `src/App.tsx`. O build gera um único JS de 1,5 MB (427 kB gzip), baixado inteiro por quem abre `/:username`.

## Decisões

| Tema | Decisão |
|---|---|
| Editor | Fica a aba Design. O Design System é removido. |
| Cor do texto do botão | Modo "Automático" (padrão) mais cor manual. |
| Cor do fundo do botão | Abordagem A: `buttonStyle.color` passa a valer, com `colors.primary` como reserva para dados antigos. Sem migração no banco. |
| Extras | Só o perfil público mais leve. A unificação completa entre prévia e página pública, a fonte no perfil público, os cliques na prévia e o fundo com padrão ficam de fora. |

## Desenho

### 1. Modelo de dados (`theme_options.custom`, tipo `ThemeConfig` em `src/stores/useDesignStore.ts`)

- `buttonStyle.color`: cor do botão. Quando ausente, usa `colors.primary`. Quando os dois faltam, usa `#ffffff`, como hoje.
- `buttonStyle.textColor` (novo, opcional): `'auto'` ou uma cor hex. Quando ausente, equivale a `'auto'`.
- `buttonStyle.size` entra no tipo. Hoje é gravado via `as any`.
- `colors.primary`, `colors.secondary` e `colors.accent` continuam no tipo, por compatibilidade, mas saem da interface.

Nenhuma alteração de schema no Postgres: `theme_options` é JSONB.

Compatibilidade com dados existentes. Os modelos e temas antigos já gravavam `buttonStyle.color`, muitas vezes com valor diferente de `colors.primary`, então a reserva simples mudaria a aparência de perfis assim. Em 2026-10-23, porém, a produção tem um único perfil (`dna`), com `buttonStyle.color = colors.primary = #22D3EE`. Por isso a regra simples não altera nada do que está publicado, e não se cria regra de leitura especial para dado legado. Se surgirem outros perfis antes do deploy, refazer a consulta:

```sql
SELECT username, theme_options->'custom'->'buttonStyle'->>'color' AS cor,
       theme_options->'custom'->'colors'->>'primary' AS primaria
FROM linkhub.profiles;
```

### 2. Estilo do botão compartilhado: `src/utils/linkButtonStyle.ts`

Funções puras, sem React:

- `normalizeHex(cor)`: converte `#rgb` em `#rrggbb` e põe em minúsculas. Devolve `null` se a cor não for hex válido. Todas as funções abaixo normalizam antes de usar. Assim, sufixos de opacidade como `${cor}20` sempre geram CSS válido.
- `getContrastText(hex)`: retorna `#000000` ou `#ffffff`, o que tiver maior razão de contraste (luminância relativa da WCAG 2.x) com a cor dada. Para entrada inválida, retorna `#ffffff`.
- `resolveButtonColors(config)`: retorna `{ bg, text }` aplicando a reserva `color` → `primary` → `#ffffff` e a regra de texto:

| Estilo | Fundo | Borda (largura, cor) | Texto em `auto` |
|---|---|---|---|
| `solid` | cor do botão | 0 | `getContrastText(cor do botão)` |
| `outline` | transparente | 2px, cor do botão | cor do botão |
| `modern`, `rounded` | gradiente 135° de `${cor}20` a `${cor}40` | 1px, `${cor}50` | `colors.text` |
| `glass` e desconhecido | `rgba(255,255,255,0.1)` | 1px, `rgba(255,255,255,0.2)` | `colors.text` |

  Um `textColor` manual (hex) vale para todos os estilos. Se `colors.text` faltar, usa `#ffffff`, como hoje.

- `getLinkButtonStyle(config, { radiusScale = 1 } = {})`: retorna o `React.CSSProperties` completo: `background`, `borderWidth`, `borderStyle: 'solid'`, `borderColor`, `color` e `borderRadius`. O raio vem de `none|sm|md|lg|full` (0, 4, 8, 16 e 9999 px, padrão 8), multiplicado por `radiusScale`, exceto `full`. O desenho em miniatura usa `radiusScale` para manter a proporção do botão real.
  - Como o estilo é inline, ele prevalece sobre as classes de borda e de fundo do `PublicProfile` e do `ProfilePreview` (`border-0`, `border-2`, `border`, `bg-white/10`). Essas classes saem, para não haver duas fontes de verdade.
  - Perda aceita: o `hover:bg-white/20` do glass deixa de funcionar, porque o fundo inline o anula. O efeito de hover de escala continua.
- `getBackgroundStyle(config)`: retorna o `background` da página (sólido ou gradiente 135°). Usa a mesma regra do `PublicProfile.tsx:184-206`, que vira a referência.

`PublicProfile` e `ProfilePreview` trocam a cópia local de `getButtonStyle` por `getLinkButtonStyle`. O `ProfilePreview` também passa a usar `getBackgroundStyle`. Hoje ele usa `background.color || '#111827'` e ignora `colors[0]`, por isso o modelo Clean aparece escuro na prévia. Fora esses pontos e a remoção das classes de borda e fundo, os dois arquivos não mudam (`backdrop-blur`, `hover:opacity-90` e `hover-bounce` ficam). A unificação completa ficou fora do escopo.

### 3. Onboarding fiel ao desenho

- `ONBOARDING_TEMPLATES` sai do `OnboardingDialog.tsx` para `src/components/dashboard/onboardingTemplates.ts`, um arquivo sem React e sem `@/lib/supabase`, que os testes conseguem importar. O `OnboardingDialog` e o `DesignTab` importam desse arquivo.
- Cada modelo perde os campos `bg`, `textColor`, `btnBg`, `btnText` e `btnRadius`. Fica só `id`, `name`, `config` e `font` (só a família CSS, usada no desenho).
- O desenho em miniatura vira um componente único, `src/components/dashboard/TemplateMockup.tsx`, extraído do `PhoneMockup` do `OnboardingDialog.tsx:206`. Ele desenha o fundo com `getBackgroundStyle(config)`, nome e bio com `config.colors.text` e os botões com `getLinkButtonStyle(config, { radiusScale: 0.4 })`.
- A aba Modelos do `DesignTab` (cópia inline em `DesignTab.tsx:461-525`) e o `OnboardingDialog` passam a usar o `TemplateMockup`. A cópia inline é apagada. O que aparece na escolha passa a ser, por construção, o que o perfil publica.
- Os `config` são revistos para preservar o visual pretendido de cada modelo:

| Modelo | Estilo | Cor do botão | Texto do botão | `colors.text` | Raio |
|---|---|---|---|---|---|
| Peach | solid | `#F5A876` | `#3D2B1F` | `#3D2B1F` | lg |
| Clean | outline | `#1A1A1A` | auto | `#1A1A1A` | full |
| Ocean | glass | `#22D3EE` | auto | `#FFFFFF` | md |
| Sunset | outline | `#FFFFFF` | auto | `#FFFFFF` | full |
| Midnight | glass | `#3B82F6` | auto | `#E2E8F0` | lg |
| Forest | glass | `#10B981` | `#6EE7B7` | `#D1FAE5` | lg |
| Neon | outline | `#00FF88` | auto | `#00FF88` | none |
| Rose | solid | `#FB7185` | `#FFFFFF` | `#881337` | full |
| Sand | solid | `#D97706` | `#FFFBEB` | `#78350F` | lg |
| Purple | glass | `#D946EF` | auto | `#2D1B4E` | md |

  `colors.primary` de cada modelo passa a ser igual à cor do botão, para que dados lidos por código antigo continuem coerentes. O gradiente do desenho passa a ser 135°, igual ao da página.

  Escolha consciente: o Rose mantém texto branco sobre `#FB7185` para preservar o desenho original, mesmo com contraste de cerca de 2,7:1, abaixo do recomendado pela WCAG. O usuário pode trocar para "Automático" na aba Design.

### 4. Aba Design (`DesignTab.tsx`)

- Sub-aba Botões: entra "Cor do texto do botão", com um interruptor "Automático". Desligado, aparece o seletor de cor, iniciado com o valor que o modo automático produz para a config atual (`resolveButtonColors(config).text`).
- Saem os controles "Cor Primária" e "Cor de Destaque". "Cor do Botão" fica como o controle do fundo do botão.
- Correção do save. `handleSaveTheme(themeId)` recebe o id por parâmetro e grava sempre `{ themeId, custom: customConfig }`. O ramo que trocava `customConfig` pela config de `PREDEFINED_THEMES` sai: nenhuma tela oferece temas predefinidos, e esse ramo fazia o modelo Neon (id `cyber-neon`, repetido nas duas listas) ser salvo com a config errada.
  - "Salvar Configurações" chama `handleSaveTheme('custom')`.
  - "Salvar Modelo" (aba Modelos, `DesignTab.tsx:532`) chama `handleSaveTheme(selectedTheme)`. Ao clicar num modelo, `customConfig` já recebe `template.config` (`DesignTab.tsx:474`).
  - `PREDEFINED_THEMES` e `resolveThemeConfig` continuam em `src/utils/themes.ts` só para leitura de dados antigos.
- Ao abrir um perfil sem `buttonStyle.color`, o editor mostra a cor da reserva (`colors.primary`). Ao salvar, grava em `buttonStyle.color`.

### 5. Remoção do Design System

Remover:
- `src/components/design-system/**`
- `src/components/dashboard/DesignSystemTab.tsx`
- `src/stores/designStore.ts`
- `src/types/design-system.ts`, `src/hooks/useResizable.ts` e `src/components/design-system/ResizablePanel.tsx`, se só forem usados por ele
- a aba `design-v2` e as condições dela em `Dashboard.tsx`

Antes de apagar cada arquivo, confirmar com busca que nada fora do conjunto o importa. O build tem que passar.

### 6. Sidebar

Comportamento esperado:
- Abaixo de 768 px: o botão do topo abre a sidebar como painel por cima do conteúdo, sempre com os nomes dos menus (ignora o estado "recolhido" do desktop). O painel fecha ao escolher um item do menu ou ao clicar fora.
- A partir de 768 px: a sidebar fica fixa e o botão alterna entre aberta (16rem) e só ícones (3rem).

Passos:
1. Reproduzir no navegador embutido, com login feito pelo usuário, em 375, 600 e 767 px, e achar a causa do "não aparece nada" antes de corrigir.
2. Corrigir a causa.
3. `AppSidebar`: usar `isMobile` de `useSidebar()`, para que no painel móvel os rótulos apareçam mesmo com `state === 'collapsed'`.
4. Chamar `setOpenMobile(false)` ao trocar de aba no móvel.
5. Remover as classes `w-14`/`w-60` que conflitam com as larguras do componente.

### 7. Perfil público leve (`App.tsx`)

- Páginas com `React.lazy` e `Suspense` (fallback simples de carregamento). `PublicProfile` também vira lazy. O objetivo é que o pacote baixado em `/:username` não inclua Dashboard, Admin, Analytics, `recharts` e `react-simple-maps`.
- Service worker fora da página pública. Hoje o `registerSW.js` é injetado em todas as páginas e pré-cacheia todos os JS, o que faria o visitante baixar o painel em segundo plano.
  - O `VitePWA` passa a usar `injectRegister: false`.
  - O registro vira manual (`registerSW` de `virtual:pwa-register`), feito no app só quando a rota não é a página pública. Regra: registrar quando o caminho for `/`, quando tiver mais de um segmento (`/auth/callback`) ou quando o primeiro segmento for uma rota conhecida do app (`auth`, `dashboard`, `admin`, `analytics`, `install`, `privacy`, `exemplo`). A lista de rotas conhecidas fica numa constante única, ao lado das rotas do `App.tsx`.
  - Para os tipos de `virtual:pwa-register`, `src/vite-env.d.ts` ganha `/// <reference types="vite-plugin-pwa/client" />`.
  - A instalação do PWA continua disponível para o dono do perfil. Visitantes que já tenham o service worker antigo instalado continuam com ele até expirar, e isso é aceito.
- Métrica, medida antes e depois numa visita limpa a `/:username` (sem service worker, cache desativado): soma em gzip dos JS baixados até a página ficar ociosa. Confirmar na aba Network que nenhum chunk do painel é baixado. Registrar os números no commit.
- Verificar que `npm run build` gera o `sw.js` sem erro e que `/dashboard` registra o service worker.

## Testes e verificação

- Vitest, em `src/utils/linkButtonStyle.test.ts`:
  - contraste (branco, preto, `#F5A876`, `#FB7185`, `#rgb` curto, maiúsculas, entrada inválida);
  - reserva `color` → `primary` → `#ffffff`;
  - texto `auto` e manual em cada estilo;
  - mapeamento de raio e `radiusScale`;
  - `normalizeHex`: `#ABC` no estilo modern gera `#aabbcc20` e `#aabbcc40`.
- Vitest, em `src/components/dashboard/onboardingTemplates.test.ts`: os 10 modelos produzem a cor de botão e de texto da tabela da seção 3, e nenhum gera texto de botão igual ao fundo do botão no estilo sólido.
- Os testes existentes (`useAutosave`), `tsc --noEmit` e `npm run build` passam.
- Navegador embutido, com login do usuário:
  - sidebar em 375, 600, 767, 900 e 1280 px;
  - aba Design (trocar a cor do texto, salvar, recarregar e conferir que persistiu);
  - perfil público mostrando a cor escolhida.
- Deploy no vpsavila pelo procedimento "Atualizações futuras" do `deploy/vpsavila/DEPLOY.md`, depois da validação local.

## Fora do escopo

- Aplicar a fonte escolhida no perfil público. Hoje só a prévia aplica, então o desenho do onboarding mostra uma fonte que o perfil publicado não usa. Fica registrado como divergência conhecida.
- Unificar o restante da prévia com a página pública (ícones, tamanhos, padrão quando `theme_options` está vazio).
- Não contar cliques feitos na prévia.
- Renderizar fundo com padrão (`background.pattern`).
- Migrar dados antigos no banco.
- Corrigir a configuração quebrada do ESLint.
