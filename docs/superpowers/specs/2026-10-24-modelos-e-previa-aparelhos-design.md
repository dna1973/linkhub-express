# Mais modelos visuais e prévia por aparelho

Data: 2026-10-24 · Status: aprovado no brainstorming e na revisão da especificação; aguardando leitura do usuário

Pacote 1 de 2. O pacote 2 (redesign do app com mais movimento) terá brainstorming e especificação próprios.

## Objetivo

1. Oferecer 12 modelos visuais novos, em quatro estilos: profissional, neo-brutalista, neon/tech e suave.
2. Dar aos modelos (e ao editor) recursos visuais novos: fonte no perfil público, padrão de fundo, gradiente animado, sombra/brilho nos botões e formato do avatar.
3. Mostrar a prévia do perfil dentro de um aparelho escolhido (iPhone ou Galaxy), com tela no tamanho real, inclusive em tela estreita.

## Situação atual

- A página pública (`src/pages/PublicProfile.tsx`) e a prévia (`src/components/dashboard/ProfilePreview.tsx`) desenham o perfil cada uma com sua cópia: avatar, nome, bio, botões, mapa de ícones (`ICON_MAP`) e rodapé. Os estilos de botão e de fundo já vêm do módulo comum `src/utils/linkButtonStyle.ts`.
- A fonte escolhida só aparece na prévia (`getFontClasses`/`getFontStyle` em `ProfilePreview.tsx`). A página pública ignora `font`. As 8 famílias já são carregadas pelo `index.html` (Google Fonts).
- O editor já oferece padrões de fundo (`BACKGROUND_PATTERNS` em `DesignTab.tsx`: nenhum, pontos, grade, ondas) e grava `background.pattern`, mas nenhum renderizador desenha o padrão.
- Clicar num link na prévia soma clique real nas estatísticas (`ProfilePreview.tsx`, `handleLinkClick`).
- A prévia é uma moldura genérica (320×640, preta, `rounded-[3rem]`) e só aparece a partir de 1024 px (`hidden lg:block` em `Dashboard.tsx`).
- Existem 10 modelos em `src/components/dashboard/onboardingTemplates.ts`, desenhados pela miniatura `TemplateMockup.tsx` e testados por `onboardingTemplates.test.ts`.
- Não há biblioteca de animação. Há `tailwindcss-animate` e keyframes próprios em `src/index.css`.

## Decisões

| Tema | Decisão |
|---|---|
| Escopo | Modelos e prévia de aparelhos agora; redesign com movimento num segundo pacote |
| Arquitetura | Abordagem A: extrair um componente único `ProfileView`, usado pela página pública e pela prévia |
| Recursos novos | Fonte no público, padrão de fundo, gradiente animado, sombra/brilho do botão, formato do avatar |
| Aparelhos | iPhone 16 Pro, 16 Pro Max, SE; Galaxy S25, S25 Ultra, A55, Z Flip |
| Onde fica a prévia | Painel lateral com seletor em tela larga; botão "Prévia" que abre em tela cheia em tela estreita; aparelho lembrado no navegador |
| Estilos dos modelos | Profissional, neo-brutalista, neon/tech, suave (3 modelos cada) |

## Desenho

### 1. Configuração visual (`ThemeConfig` em `src/stores/useDesignStore.ts`)

Todos os campos novos são opcionais. Ausente significa o comportamento atual, então perfis existentes não mudam.

```ts
background: {
  type: 'solid' | 'gradient' | 'pattern';
  color?: string;
  colors?: string[];
  pattern?: 'none' | 'dots' | 'grid' | 'waves' | 'stripes';   // tipado (já existia como string)
  animated?: boolean;                                         // novo: só vale para gradiente
};
buttonStyle: {
  // campos atuais: type, color, textColor, borderRadius, size
  shadow?: 'none' | 'soft' | 'hard' | 'glow';                // novo
  shadowColor?: string;                                       // novo, hex; usado por modelos, sem controle no editor
};
avatar?: { shape?: 'circle' | 'rounded' | 'hexagon' };       // novo bloco
```

O padrão é desenhado sobre qualquer tipo de fundo (sólido ou gradiente). `background.type === 'pattern'` (valor legado do editor) é tratado como sólido com o padrão aplicado por cima. Um `background.pattern` já gravado passa a ser desenhado de propósito. Em 2026-10-24, nenhum perfil em produção tem padrão gravado (o único perfil, `dna`, tem só gradiente), então nada publicado muda.

### 2. Funções de aparência

- `src/utils/linkButtonStyle.ts` ganha a sombra no `getLinkButtonStyle`:
  - `soft`: `0 4px 14px rgba(0,0,0,0.18)`.
  - `hard`: borda `2px solid <cor>` e `boxShadow: <4·s>px <4·s>px 0 <cor>`, com `<cor>` = `shadowColor` normalizado, senão `#000000`. Sobrepõe a borda do estilo.
  - `glow`: `0 0 <18·s>px <cor>99, 0 0 <4·s>px <cor>`, com `<cor>` = `shadowColor` normalizado, senão a cor do botão.
  - `s` é o `radiusScale` atual, que passa a escalar também os deslocamentos de sombra (documentar no JSDoc). Ausente ou `none`: sem `boxShadow`.
- Novo `src/utils/profileAppearance.ts`, com funções puras:
  - `getPatternLayerStyle(config)`: `CSSProperties | null` para uma camada sobre o fundo (`backgroundImage` + `backgroundSize`). A cor do padrão é `colors.text` normalizado com alfa `1f` (~12%), com reserva `#ffffff`. Padrões:
    - `dots`: radial 1.5px, grade de 18px;
    - `grid`: linhas de 1px a cada 24px;
    - `waves`: `repeating-linear-gradient` diagonal, como o preview atual do editor;
    - `stripes`: listras verticais de 1px a cada 12px.
    - `none` ou ausente devolve `null`.
  - `getBackgroundLayer(config)`: `{ style: CSSProperties; className?: string }` para a camada de fundo. NÃO usa o atalho `background`: com ele, uma atualização do React zera o `background-size` e a animação para de ter efeito.
    - Sólido ou legado: `style = { backgroundColor }`, com a mesma reserva do `getBackgroundStyle` (`color` → `colors[0]` → `#111827`).
    - Gradiente: `style = { backgroundImage: 'linear-gradient(135deg, c0, c1)' }`, com as mesmas reservas.
    - Gradiente com `animated === true`: acrescenta `backgroundSize: '200% 200%'` e `className: 'linkhub-gradient-animated'`.
    - `config` nulo: `{ style: { backgroundColor: '#111827' } }`.
    - Keyframes `linkhub-gradient-shift` em `src/index.css` (posição `0% 50%` → `100% 50%` → `0% 50%`, 18s, `ease-in-out`, infinito), aplicados pela classe.
    - Bloco `@media (prefers-reduced-motion: reduce)` que zera a animação.
    - `getBackgroundStyle` (string) continua existindo para quem já usa. `ProfileView` e `TemplateMockup` passam a usar `getBackgroundLayer`.
  - `getBaseBackgroundColor(config)`: a cor sólida de referência (cor do sólido ou `colors[0]` do gradiente). Serve para a cor da barra de status do aparelho: `getContrastText(base)`.
  - `getAvatarShapeStyle(shape)`:
    - `circle` (padrão): `borderRadius: '9999px'`;
    - `rounded`: `borderRadius: '28%'`;
    - `hexagon`: `clipPath: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)`, `borderRadius: 0`, sem borda (`borderWidth: 0`), porque o recorte esconde a borda.
  - `FONT_FAMILY_CSS`: mapa único de família para CSS, com as 8 famílias e os mesmos valores de `cssFamily` do `DesignTab`. O `DesignTab` passa a importar esse mapa, para não haver duas listas. O itálico que o editor dava ao Dancing Script sai, porque a fonte já é cursiva.
  - `getFontWeight(weight)`: `light` 300, `normal` 400, `medium` 500, `bold` 700. Retorna `undefined` quando `font` ou `weight` faltam. Nesse caso, o `ProfileView` mantém os pesos atuais: bio 400 e texto do botão 500. Assim, `theme=null` e temas sem fonte ficam iguais a hoje.
  - `getTextSizeClasses(size)`: `{ bio, button }`. `sm` dá `{ 'text-sm', 'text-base' }`, `md` (padrão) dá `{ 'text-base', 'text-lg' }` e `lg` dá `{ 'text-lg', 'text-xl' }`. O padrão `md` reproduz os tamanhos atuais da página pública (bio `text-base`, botão `text-lg`).
  - Como cada elemento usa o tema, no `ProfileView`:
    - a família vai na raiz, e nome, @, bio e botões herdam;
    - o peso vai na bio e no texto dos botões, onde o `font-medium` fixo atual sai;
    - o nome mantém `text-2xl font-bold`;
    - o tamanho vale para a bio e para o texto dos botões.

### 3. Componente único do perfil

- `src/components/profile/linkIcons.tsx`: `ICON_MAP` e `getLinkIcon(title, url)`, movidos das duas cópias atuais. Hoje as duas são iguais; se divergirem, vale a da página pública.
- `src/components/profile/ProfileView.tsx`:

```ts
interface ProfileViewProps {
  profile: { full_name?: string; username?: string; bio?: string; avatar_url?: string; show_username?: boolean } | null;
  links: { id: number; title: string; url: string }[];
  theme: ThemeConfig | null;          // null = padrão atual (#111827, glass, texto branco)
  onLinkClick: (link: { id: number; url: string }) => void;
  variant: 'page' | 'device';        // page: min-h-screen com fundo fixo; device: min-h-full, quem rola é o DeviceFrame
  topInset?: number;                 // só device: padding-top em px (altura da barra de status)
  emptyMessage?: string;             // texto quando não há links
}
```

  - O componente desenha:
    - o fundo (`getBackgroundLayer`) e a camada de padrão;
    - o avatar com formato e borda (`colors.avatarBorder`). O formato vale também para o `AvatarFallback`, que hoje tem `rounded-full` fixo;
    - nome, @username (respeitando `show_username`) e bio na cor `colors.text`, com fonte, peso e tamanho conforme o §2;
    - os botões (`getLinkButtonStyle`, `getLinkButtonClassName`, ícone, altura por `size`);
    - o rodapé.
  - As medidas são as da página pública atual (avatar `w-24`, nome `text-2xl`) nos dois `variant`, porque a tela do aparelho agora tem tamanho real.
  - **`variant="page"`:** a camada de fundo e a de padrão ficam `fixed inset-0` (como o fundo atual da página pública), e o conteúdo, num contêiner `relative z-10 min-h-screen`.
  - **`variant="device"`:** a raiz é `relative min-h-full`, com o fundo aplicado na própria raiz. A camada de padrão é `absolute inset-0` dentro dela, então fundo e padrão acompanham toda a altura do conteúdo ao rolar. A raiz NÃO rola: quem rola é a tela do `DeviceFrame`. Recebe `topInset` (px) e aplica como `padding-top`, para o conteúdo não ficar sob a barra de status.
  - **Rodapé:** no `page`, mantém o comportamento atual. No `device`, aparece como texto e não navega, para não tirar o usuário do painel.
  - A busca de dados, as estatísticas de visita e clique e o 404 continuam na página.
- `PublicProfile.tsx` passa a renderizar `<ProfileView variant="page" onLinkClick={registra clique e abre o link} />`. A lógica atual de `handleLinkClick` (abrir primeiro e registrar depois) não muda.
- A prévia renderiza `<ProfileView variant="device" onLinkClick={só abre o link} />`. Assim a prévia deixa de contar clique.

### 4. Aba Design (`DesignTab.tsx`)

- **Fundo:** o seletor de padrão, que hoje só aparece quando o tipo é `pattern` (`DesignTab.tsx`, por volta da linha 287), passa a aparecer para qualquer tipo, com os 5 valores (inclui `stripes`). Isso permite tirar o padrão de um modelo sem perder o gradiente. O tipo "Padrão" sai das opções de tipo, porque um padrão agora é camada e não tipo. O valor legado continua sendo lido como sólido, e o seletor de tipo do editor mostra "Sólido" quando o valor gravado é `pattern`. Entra o interruptor "Animado", visível só quando o tipo é gradiente.
- **Botões:** entra o seletor "Sombra" (Nenhuma, Suave, Dura, Brilho). `shadowColor` não tem controle; a edição preserva o valor vindo do modelo.
- **Avatar:** entra o seletor "Formato" (Círculo, Arredondado, Hexágono), gravando em `avatar.shape`.
- Tudo grava pelo `updateCustomConfig` existente e entra no salvamento atual sem mudança.
- `updateCustomConfig` faz merge raso por seção. Para `avatar`, que pode não existir, a atualização cria o bloco.

### 5. Modelos

- `OnboardingTemplate` ganha `category: 'classico' | 'profissional' | 'brutalista' | 'neon' | 'suave'` e perde o campo `font`: a miniatura passa a usar `FONT_FAMILY_CSS[config.font.family]`. Os 10 atuais ficam em `classico`; além disso, só perdem o campo `font`.
- O onboarding (passo 3) e a aba Modelos ganham filtros por categoria, em linha de chips: "Todos", "Clássico", "Profissional", "Neo-brutalista", "Neon", "Suave". O padrão é "Todos".
- A miniatura `TemplateMockup` passa a mostrar sombra, padrão, animação e formato do avatar, usando as mesmas funções.
- Os 12 modelos novos:

| id | Nome | Categoria | Fundo | Padrão / animado | Botão (estilo, cor, texto) | Sombra | `colors.text` | Fonte | Raio | Avatar |
|---|---|---|---|---|---|---|---|---|---|---|
| pro-navy | Marinho | profissional | gradiente `#0B1F3A`→`#132F55` | — | solid `#FFFFFF`, auto | soft | `#F1F5F9` | inter md medium | md | circle |
| pro-slate | Grafite | profissional | sólido `#F8FAFC` | grid | outline `#1E293B`, auto | none | `#0F172A` | inter md normal | sm | rounded |
| pro-olive | Oliva | profissional | gradiente `#1F3B2D`→`#2F5D46` | — | solid `#E9F5EC`, `#1F3B2D` | soft | `#F0FDF4` | lora md medium | lg | circle |
| brut-yellow | Amarelo | brutalista | sólido `#FDE047` | — | solid `#FFFFFF`, auto | hard (`#000000`) | `#111111` | poppins md bold | none | rounded |
| brut-pink | Chiclete | brutalista | sólido `#F9A8D4` | dots | solid `#A3E635`, auto | hard (`#000000`) | `#111111` | montserrat md bold | sm | hexagon |
| brut-cobalt | Cobalto | brutalista | sólido `#2563EB` | — | solid `#FFFFFF`, auto | hard (`#000000`) | `#FFFFFF` | poppins md bold | none | rounded |
| neon-cyber | Cyber | neon | gradiente `#0F0C29`→`#302B63` | grid, animado | outline `#00F0FF`, auto | glow | `#E0F7FF` | source-code-pro md medium | sm | hexagon |
| neon-synth | Synthwave | neon | gradiente `#2B1055`→`#D53369` | animado | solid `#FF2E97`, `#FFFFFF` | glow | `#FFE3F1` | montserrat md bold | full | circle |
| neon-terminal | Terminal | neon | sólido `#050505` | stripes | outline `#39FF14`, auto | glow | `#39FF14` | roboto-mono md normal | none | rounded |
| soft-lavender | Lavanda | suave | gradiente `#E9D5FF`→`#FBCFE8` | dots | solid `#FFFFFF`, `#6B21A8` | soft | `#4C1D95` | poppins md medium | full | circle |
| soft-mint | Menta | suave | gradiente `#D1FAE5`→`#CFFAFE` | waves, animado | modern `#10B981`, auto | soft | `#065F46` | lora md normal | lg | rounded |
| soft-blush | Blush | suave | sólido `#FFF7ED` | grid | solid `#FDBA74`, `#7C2D12` | soft | `#7C2D12` | dancing-script lg medium | lg | rounded |

  Regras para todos: `colors.primary` igual à cor do botão, como nos modelos atuais, e `buttonStyle.size` ausente (md).

  Ajustes de legibilidade em relação ao rascunho:
  - O Menta usa `modern` em vez de `glass`, porque o glass ignora a cor e some sobre o fundo claro.
  - O Blush usa um botão mais saturado (`#FDBA74`) e sombra suave, para o botão se destacar do fundo.

  Escolha consciente, como no Rose: o Synthwave mantém texto branco sobre `#FF2E97` (contraste de cerca de 3,4:1), pelo estilo. O usuário pode trocar para "Automático".

### 6. Prévia por aparelho

- `src/components/preview/devices.ts`, um catálogo só de dados:

| id | Nome | Marca | Tela CSS (L×A) | Raio da tela | Borda | Recorte | Barra de status |
|---|---|---|---|---|---|---|---|
| iphone-16-pro | iPhone 16 Pro | Apple | 402×874 | 55 | 12 | dynamic-island | ios (54 px) |
| iphone-16-pro-max | iPhone 16 Pro Max | Apple | 440×956 | 55 | 12 | dynamic-island | ios (54 px) |
| iphone-se | iPhone SE | Apple | 375×667 | 0 | 16 lateral; 64 topo e base | home-button | ios-classic (20 px) |
| galaxy-s25 | Galaxy S25 | Samsung | 360×780 | 32 | 9 | punch-hole | android (28 px) |
| galaxy-s25-ultra | Galaxy S25 Ultra | Samsung | 412×891 | 14 | 9 | punch-hole | android (28 px) |
| galaxy-a55 | Galaxy A55 | Samsung | 384×832 | 34 | 12 | punch-hole | android (28 px) |
| galaxy-z-flip | Galaxy Z Flip | Samsung | 412×1004 | 26 | 10 | punch-hole + vinco | android (28 px) |

  As dimensões são viewports CSS aproximados, tirados de tabelas públicas de viewport. Uma diferença de poucos pixels é aceitável. O padrão é o `iphone-16-pro`.

- `src/components/preview/DeviceFrame.tsx`. Recebe `device` e `children` e desenha:
  - a moldura (corpo escuro, raio externo = raio da tela + borda, sombra);
  - o recorte de câmera:
    - Dynamic Island: pílula preta de 126×37, a 11 px do topo;
    - furo: círculo de 10 px, centralizado a 12 px;
    - botão Home: círculo com borda na base;
    - Z Flip: linha sutil no meio da altura;
  - a barra de status: horário "9:41" (iOS) ou "12:00" (Android), mais ícones de sinal, Wi-Fi e bateria (lucide);
  - a tela, com largura e altura reais, onde vai `children` (ver "Camadas da tela").

  Props: `device`, `statusBarColor` (cor dos ícones e do horário, calculada por quem usa) e `children`.

  - **Camadas da tela:** a tela é `relative overflow-hidden`, com o raio da tela.
    - A barra de status e o recorte de câmera ficam por cima (`absolute`, `z-10`, sem fundo próprio), e o fundo do perfil aparece atrás deles, como num aparelho real.
    - A cor dos ícones e do horário é `getContrastText(getBaseBackgroundColor(theme))`, para continuar legível em fundo claro (Grafite, Blush).
    - A área de rolagem é `absolute inset-0 overflow-y-auto` e contém o `ProfileView variant="device"`, com `topInset` igual à altura da barra de status do aparelho.
    - No iPhone SE, as bordas superior e inferior ficam fora da tela (moldura), e a barra de status clássica (20 px) fica dentro.
  - **Escala:** a moldura se reduz com `transform: scale(f)`, com `transform-origin: top left`. O wrapper que reserva o espaço (abaixo) fica centralizado horizontalmente no contêiner medido (`mx-auto`).
    - `f = min(larguraDisponível / larguraTotal, alturaDisponível / alturaTotal, 1)`, com o total já incluindo as bordas.
    - Largura e altura disponíveis vêm de um `ResizeObserver` sobre um contêiner de área com altura definida pelo pai (nunca pelo conteúdo escalado).
    - Um wrapper com `width = larguraTotal × f` e `height = alturaTotal × f` reserva o espaço visual, sem sobra.
    - Sem `ResizeObserver` (jsdom), `f = 1`.
- `src/components/preview/DeviceSelect.tsx`: `Select` do shadcn com grupos Apple e Samsung.
- `src/hooks/useSelectedDevice.ts`: guarda o id em `localStorage` (`linkhub:preview-device`), sempre dentro de try/catch. Um id inválido ou ausente cai no padrão.
- `ProfilePreview.tsx` vira uma coluna `flex flex-col h-full`, com `DeviceSelect` no topo e, embaixo, a área `flex-1 min-h-0` medida, com `DeviceFrame` e `ProfileView variant="device"`, alimentado pelo `customTheme` do store como hoje.
  - Os links passam a ser recarregados só ao montar, quando o usuário muda e no evento `linksUpdated`. Deixam de ser recarregados a cada mudança de tema, como acontece hoje.
- `Dashboard.tsx`:
  - **Tela larga:** a prévia lateral continua (`hidden lg:block`). O contêiner `sticky top-6` passa a ter altura definida, `h-[calc(100dvh-6rem)]`: 48 px do cabeçalho, mais os paddings da página e o `top-6`. É essa altura que limita o `f`. Em 1440×900, por exemplo, o Pro Max aparece reduzido, inteiro, sem corte.
  - **Abaixo de `lg`:** entra um botão flutuante "Prévia" (canto inferior direito, ícone de olho, `fixed`, `z-40`). Ele abre um `Dialog` em tela cheia com a mesma `ProfilePreview`.
    - O `DialogContent` tem as classes padrão sobrescritas: `max-w-none w-screen h-[100dvh] p-0 gap-0 left-0 top-0 translate-x-0 translate-y-0 rounded-none flex flex-col`.
    - As classes de animação de deslizar e de zoom do `DialogContent` também são sobrescritas. A abertura fica só com fade.
    - O botão de fechar padrão fica escondido com `[&>button]:hidden`. No lugar, uma linha de cabeçalho própria (um `div`, para o seletor não pegar botões dentro dela) traz o `DeviceSelect` e um botão "Fechar", sem sobreposição.
    - Entra um `DialogTitle` "Prévia do perfil" com `sr-only`, mais um `aria-describedby={undefined}` no conteúdo, para atender à acessibilidade do Radix.
    - O botão "Prévia" não aparece na aba Analytics.

## Testes e verificação

- `src/utils/linkButtonStyle.test.ts`:
  - as sombras `soft`, `hard` e `glow`;
  - a reserva de cor da sombra;
  - a escala pelo `radiusScale`;
  - ausente e `none` sem `boxShadow`;
  - `hard` sobrepondo a borda.
- `src/utils/profileAppearance.test.ts`:
  - os 4 padrões mais `none`;
  - a cor do padrão com alfa;
  - `getBackgroundLayer` nunca usa o atalho `background`, e a animação só vale para gradiente animado;
  - `getBaseBackgroundColor`;
  - os formatos do avatar;
  - o mapa de fontes (8 famílias), os pesos e os tamanhos de bio e botão.
- `src/components/dashboard/onboardingTemplates.test.ts`:
  - a tabela de fidelidade estendida aos 12 novos (cor do botão, texto do botão, `colors.text`);
  - todo modelo tem `category`;
  - existem 3 modelos por categoria nova;
  - os ids são únicos.
- `src/components/profile/ProfileView.test.tsx` (jsdom):
  - renderiza nome, bio e os links;
  - `show_username=false` esconde o @;
  - clicar num link chama `onLinkClick` com id e url;
  - `theme=null` usa o padrão;
  - `variant="device"` não usa `min-h-screen`.
- `src/components/preview/devices.test.ts`:
  - 7 aparelhos com ids únicos;
  - dimensões positivas;
  - marcas Apple e Samsung;
  - padrão válido;
  - id inválido cai no padrão.
- `npm test`, `npx tsc --noEmit -p tsconfig.app.json` e `npm run build` passam.
- Verificação no navegador embutido, com o login do usuário:
  - troca entre os 7 aparelhos, conferindo que a moldura cabe inteira na prévia lateral em 1280×800 e 1440×900;
  - o botão "Prévia" em tela estreita;
  - 1 modelo de cada categoria nova aplicado e conferido no perfil público;
  - a animação do gradiente continuando depois de trocar uma cor no editor, e parando com `prefers-reduced-motion`;
  - o clique na prévia sem somar estatística;
  - a fonte do perfil agora aparecendo também no perfil público. É mudança visível e intencional para perfis que escolheram fonte;
  - o peso do tema passa a valer na bio e no texto dos botões. Por isso, temas com peso `light` ou `normal` ficam com o texto dos botões um pouco mais leve. Isso também é intencional e entra na verificação.
- Antes de qualquer teste em produção que altere o perfil, guardar o `theme_options` atual e restaurá-lo depois.
- Deploy no vpsavila pelo procedimento "Atualizações futuras" do `deploy/vpsavila/DEPLOY.md`.

## Ordem de implementação sugerida

Fases verificáveis em separado:
1. funções puras (sombra, fundo, padrão, avatar, fonte);
2. `ProfileView` e `linkIcons`, com a página pública e a prévia migradas;
3. controles novos do editor;
4. modelos com categoria e filtros;
5. catálogo de aparelhos, `DeviceFrame` e prévia;
6. verificação e deploy.

## Fora do escopo

- Redesign do app e animações de interface (pacote 2).
- O defeito da "Segunda Cor" em fundo gradiente (`DesignTab.tsx`, grava `colors[0]` errado). Só é corrigido se o trabalho do item 4 tocar exatamente nesse trecho.
- Controle de `shadowColor` no editor, upload de imagem de fundo e borda no avatar hexagonal.
- Frames de aparelho por imagem (PNG/SVG de fabricante): a moldura é desenhada em CSS.
