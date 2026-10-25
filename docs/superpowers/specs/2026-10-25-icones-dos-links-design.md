# Ícones dos links com customização total — especificação

**Data:** 25/10/2026
**Situação:** plano de arquivos aprovado pelo Daniel em 25/10/2026, com estas escolhas:
- a cor de destaque vale **só para o ícone**;
- o SVG enviado é **limpo no navegador antes do upload**.

## Objetivo

Hoje o ícone de cada link é adivinhado pelo título, com reserva na URL. X e TikTok usam o ícone genérico de link externo, e o modal "Adicionar Novo Link" obriga a escolher um tipo antes de digitar.

Depois desta mudança:
- **Adicionar link:** o modal tem só URL e título. Ao colar a URL, o app detecta a marca pelo domínio e mostra o ícone. Domínios não reconhecidos usam o favicon do site.
- **Personalizar o ícone:** cada link pode ter um ícone escolhido pelo dono (marca, ícone Lucide, emoji, favicon ou imagem enviada) e uma cor de destaque opcional.
- **Onde aparece:** o mesmo ícone é desenhado na lista do painel, na página pública e na prévia do celular.
- **Contador de cliques:** o plural fica certo ("1 clique", "2 cliques").

## Fora do escopo

- A página de exemplo (`src/pages/ExampleProfile.tsx`), com ícones fixos.
- A edge function `linkhub-profile-og`.
- Proxy próprio para favicons. O favicon vem do serviço público do Google, como pedido, e por isso o navegador do visitante consulta o Google para cada link sem marca reconhecida. Isso fica registrado aqui.
- O `OnboardingDialog`, que cria links com o padrão `auto` e passa a ganhar os ícones novos sem mudança.

## Dados

### Colunas novas em `linkhub.links`

| Coluna | Tipo | Regra |
|---|---|---|
| `icon_type` | `text NOT NULL DEFAULT 'auto'` | `CHECK (icon_type IN ('auto','lucide','brand','emoji','favicon','upload'))` |
| `icon_value` | `text NULL` | Depende do tipo, conforme a tabela abaixo |
| `accent_color` | `text NULL` | `CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9a-fA-F]{6}$')` |

Significado de `icon_value` por tipo:

| `icon_type` | `icon_value` |
|---|---|
| `auto` | `NULL`: o ícone sai da URL a cada desenho |
| `brand` | `slug` do Simple Icons (ex.: `youtube`) |
| `lucide` | nome do arquivo do `lucide-static` (ex.: `globe`, `linkedin`) |
| `emoji` | um único emoji (grafema) |
| `favicon` | `NULL`: usa o domínio da URL do link |
| `upload` | URL pública do arquivo no bucket `link-icons` |

**Compatibilidade:** os links existentes recebem `auto` pelo padrão. O app trata `icon_type` ausente como `auto` e `icon_value` inválido para o tipo como `auto`.

### Bucket `link-icons`

- Público.
- `file_size_limit` = 524288 (512 KB).
- `allowed_mime_types` = `image/png`, `image/svg+xml`, `image/webp`.
- Políticas iguais às de `linkhub-avatars`, com prefixo `linkhub_link_icons_`:
  - leitura pública;
  - insert, update e delete só na pasta `auth.uid()`.
- Caminho do arquivo: `<user_id>/<link_id>-<timestamp>.<ext>`.

### Migração

Arquivo `deploy/vpsavila/migrations/2026-10-25-link-icons.sql`. É idempotente e aplicado antes do frontend, pelo procedimento do `DEPLOY.md` (`scp` e `psql` no servidor).
- **Colunas:** `ADD COLUMN IF NOT EXISTS`. As constraints são nomeadas e criadas dentro de blocos `DO` que checam `pg_constraint`.
- **Bucket:** `INSERT … ON CONFLICT (id) DO NOTHING`.
- **Políticas:** `DROP POLICY IF EXISTS` seguido de `CREATE POLICY`.
- **Início:** `SET lock_timeout = '5s'`.
- **Fim:** `NOTIFY pgrst, 'reload schema'`.

O `deploy/vpsavila/linkhub_schema.sql` recebe as mesmas colunas, constraints, bucket e políticas. O `src/integrations/supabase/types.ts` recebe as colunas em `links` (`Row`, `Insert`, `Update`).

## Ícones servidos pelo próprio domínio

O pacote `simple-icons` tem 3.466 marcas, e o `index.mjs` dele pesa 5,2 MB: não pode entrar no bundle. O mesmo vale para importar todos os ícones do Lucide. Por isso:

- **Dependências de desenvolvimento**, com versão fixa: `simple-icons` `16.35.0` (CC0) e `lucide-static` `0.462.0` (ISC, a mesma versão do `lucide-react` do app). Elas servem só de fonte de arquivos.
- **`scripts/prepare-icons.mjs`**, chamado no `predev` e no `prebuild` junto com o `prepare-mediapipe.mjs`.
  - Copia `node_modules/simple-icons/icons/*.svg` para `public/vendor-icons/simple-icons/16.35.0/` e `node_modules/lucide-static/icons/*.svg` para `public/vendor-icons/lucide/0.462.0/`. São cerca de 5.000 arquivos e 5,5 MB.
  - Só copia se o arquivo-marca da versão (`.complete`) não existir.
  - Gera dois catálogos de busca:
    - `public/vendor-icons/simple-icons/16.35.0/catalog.json`: `[{ "s": slug, "t": título, "h": "RRGGBB", "a": [apelidos] }]`, a partir de `data/simple-icons.json`. Os apelidos vêm de `aliases.aka`, `aliases.dup[].title` e `aliases.loc` (valores), quando existem.
    - `public/vendor-icons/lucide/0.462.0/catalog.json`: `[{ "n": nome, "k": [palavras-chave] }]`, a partir de `tags.json`, só com ícones que tenham SVG.
  - No `prebuild` (ou com `REQUIRE_VENDOR_ICONS=1`), se faltar algo, o build para com erro, como no MediaPipe. `SKIP_VENDOR_ICONS=1` pula tudo.
- **Git:** `.gitignore` recebe `public/vendor-icons/`.
- **`vite.config.ts`:** acrescenta `'**/vendor-icons/**'` ao `globIgnores` do PWA.
- **`deploy/vpsavila/nginx.conf`:** `location /vendor-icons/ { try_files $uri =404; add_header Cache-Control "public, max-age=2592000"; }`. A versão vai no caminho.
- **`deploy/vpsavila/DEPLOY.md`:** registra que o deploy passa a enviar cerca de 5.000 arquivos a mais.
- **`src/lib/linkIcons/vendor.ts`:** exporta `SIMPLE_ICONS_VERSION`, `LUCIDE_STATIC_VERSION`, `brandIconUrl(slug)`, `lucideIconUrl(name)`, `BRAND_CATALOG_URL` e `LUCIDE_CATALOG_URL`. Um teste amarra as versões ao `package.json` e ao script, como no MediaPipe.

**Como desenhar:** os SVGs de marca e do Lucide são monocromáticos. O ícone é um `<span>` com `mask-image: url(...)` (e `-webkit-mask-image`), `mask-size: contain`, `mask-repeat: no-repeat`, `mask-position: center` e `background-color: <cor>`. Assim, o mesmo arquivo serve em qualquer cor.

## Lógica (funções puras, com testes)

### `src/lib/linkIcons/detect.ts`

`detectIconFromUrl(url): DetectedIcon | null`, com `DetectedIcon = { kind: 'brand' | 'lucide'; value: string; title: string; hex: string | null }`.

A URL é normalizada antes:
- `mailto:` vira o caso de e-mail;
- sem esquema, prefixa `https://`;
- o host fica em minúsculas, sem `www.` nem `m.`.

Um host casa com a entrada se for igual a um domínio da tabela ou terminar em `.<domínio>`. Por exemplo, `music.youtube.com` e `open.spotify.com` casam.

| Domínio(s) | Resultado |
|---|---|
| `youtube.com`, `youtu.be` | brand `youtube` |
| `instagram.com` | brand `instagram` |
| `tiktok.com` | brand `tiktok` |
| `x.com`, `twitter.com` | brand `x` |
| `linkedin.com` | **lucide `linkedin`**, hex `#0A66C2` (o Simple Icons removeu o LinkedIn) |
| `github.com` | brand `github` |
| `facebook.com` | brand `facebook` |
| `drive.google.com` | brand `googledrive` |
| `notebooklm.google.com` | brand `notebooklm` |
| `wa.me` | brand `whatsapp` |
| `t.me` | brand `telegram` |
| `spotify.com` | brand `spotify` |
| `threads.net`, `threads.com` | brand `threads` |
| `discord.gg` | brand `discord` |
| `mailto:` | **lucide `mail`**, hex `null` |

- Os testes cobrem cada linha.
- `drive.google.com` e `notebooklm.google.com` são checados antes de qualquer regra genérica de `google.com`. Não há regra genérica.
- O `title` e o `hex` de cada marca ficam na própria tabela, copiados do catálogo: YouTube `FF0000`, Instagram `FF0069`, TikTok `000000`, X `000000`, GitHub `181717`, Facebook `0866FF`, Google Drive `4285F4`, NotebookLM `000000`, WhatsApp `25D366`, Telegram `26A5E4`, Spotify `1ED760`, Threads `000000` e Discord `5865F2`. Assim, a detecção não precisa do catálogo.

`getFaviconUrl(url): string | null`: devolve `https://www.google.com/s2/favicons?domain=<host>&sz=64`, com o host sem `www.`. Para `mailto:` e URL inválida, devolve `null`.

### `src/lib/linkIcons/resolve.ts`

`resolveLinkIcon(link, options): ResolvedIcon`, onde:
- `link` = `{ url, icon_type?, icon_value?, accent_color? }`;
- `options` = `{ defaultColor: string; background?: string }`.

`ResolvedIcon` é uma união:
- `{ kind: 'mask'; src: string; color: string; label: string }`, para marca e Lucide;
- `{ kind: 'emoji'; value: string }`;
- `{ kind: 'image'; src: string; fallback: 'globe' }`, para favicon e upload.

Regras:
1. Tipo efetivo:
   - `auto` (ou ausente, ou `icon_value` inválido para o tipo): usa `detectIconFromUrl`. Se não houver detecção, cai em favicon. Se não houver favicon (por exemplo, `tel:`), usa Lucide `globe`.
   - `brand`: `brandIconUrl(icon_value)`.
   - `lucide`: `lucideIconUrl(icon_value)`.
   - `emoji`: o próprio valor.
   - `favicon`: `getFaviconUrl(url)`, com a mesma reserva em `globe`.
   - `upload`: o `icon_value`, se começar com `https://`. Senão, cai em `auto`.
2. Cor dos tipos `mask`: `accent_color` normalizada, se houver; senão `defaultColor`. Se `background` for dado e o contraste entre a cor e o fundo for menor que **3:1** (`getContrastRatio`), usa `defaultColor`. Isso cobre o caso de X, TikTok, Threads e NotebookLM, pretos, sobre botão escuro.
3. Emoji, favicon e upload ignoram a cor.
4. `label` é o nome acessível: o título da marca, o nome do ícone, ou "Ícone do link".

### `src/lib/linkIcons/emoji.ts`

`isSingleEmoji(text)`:
- tem exatamente um grafema (`Intl.Segmenter` com `granularity: 'grapheme'`);
- casa com `/\p{Extended_Pictographic}|\p{Regional_Indicator}/u`.

Aceita sequências com ZWJ (👨‍💻) e bandeiras. Recusa texto, dois emojis e vazio.

### `src/lib/formatClicks.ts`

`formatClicks(n)`:
- `1` → "1 clique";
- os demais, incluindo 0 → "N cliques";
- números com separador `pt-BR` ("1.234 cliques").

## Renderização

### `src/components/links/LinkIcon.tsx`

Props: `link`, `defaultColor`, `background?`, `className` (tamanho) e `decorative?`. O padrão de `decorative` é `true`, porque o título do link já está ao lado.

| Tipo resolvido | Elemento |
|---|---|
| `mask` | `<span>` com o estilo de máscara e `aria-hidden`, ou `role="img"` com `aria-label` quando não for decorativo |
| `emoji` | `<span>` com o emoji, `leading-none` e tamanho de fonte proporcional à classe |
| `image` | `<img>` com `alt=""` e `loading="lazy"` (decorativo), `referrerPolicy="no-referrer"` |

**Reserva do `image`:** troca para o `Globe` do `lucide-react`, na `defaultColor`, quando:
- o `onError` dispara;
- ou, no `onLoad`, `naturalWidth < 32`, para o favicon. O serviço do Google devolve um globo de 16 px quando não acha o favicon.

O teste simula os dois eventos.

### Onde muda

- **`ProfileView`** (página pública e prévia):
  - troca `getLinkIcon` por `<LinkIcon className="h-6 w-6" …>`;
  - usa `defaultColor` = cor do texto do botão (`resolveButtonColors(theme).text`, com a mesma reserva de hoje);
  - usa `background` = fundo do botão quando o estilo é sólido, senão a cor de fundo de referência do tema (`getBaseBackgroundColor`).
  - O `ProfileViewLink` ganha `icon_type?`, `icon_value?` e `accent_color?`. A `PublicProfile` e a `ProfilePreview` já buscam `select('*')`.
- **Lista do painel (`LinksTab`):** cada card ganha, à esquerda do título, um quadrado de 28 px branco, com borda e cantos arredondados, com o ícone de 18 px dentro. Usa `defaultColor` `#1f2937` e `background` `#ffffff`. Assim, X e TikTok pretos aparecem também no tema escuro do painel.
- **`src/components/profile/linkIcons.tsx`:** sai. Ele é a detecção por título, e não sobra uso. Os arquivos `src/assets/google-drive.png` e `notebook-lm.svg` ficam, porque o `ExampleProfile` ainda os usa.

## Modais

O `LinksTab.tsx` tem 518 linhas e passa a delegar:
- **`src/components/dashboard/links/AddLinkDialog.tsx`**:
  - Campos **URL** (primeiro, com foco) e **Título**.
  - Ao mudar a URL (digitando ou colando), mostra a prévia do ícone resolvido com `icon_type: 'auto'`, com o texto "Ícone detectado: <título da marca>" ou "Ícone do site".
  - Se o título estiver vazio e houver marca detectada, preenche o título com o nome da marca. Não sobrescreve o que o usuário digitou.
  - "Adicionar" valida com `isValidUrl` e insere com `icon_type: 'auto'`, `icon_value: null` e `accent_color: null`. A personalização vem no modal de edição.
  - Some o `LINK_TYPES` e o passo de escolher o tipo.
- **`src/components/dashboard/links/EditLinkDialog.tsx`**:
  - Campos título e URL, o `IconPicker` e o `AccentColorPicker`, com o salvamento automático de hoje (`useAutosave`, 1,5 s).
  - Grava `title`, `url`, `icon_type`, `icon_value` e `accent_color`.
  - O modal rola em telas baixas (`max-h-[90dvh] overflow-y-auto`).
- **`src/components/dashboard/links/IconPicker.tsx`**:
  - Prévia do ícone atual e botão "Automático (pela URL)", que volta a `auto`.
  - Abas (`Tabs` do shadcn):
    - **Marcas:**
      - carrega o catálogo de marcas na primeira abertura da aba, com estado de carregando e de erro;
      - a busca ignora maiúsculas e acentos e procura no título e nos apelidos;
      - mostra até 60 resultados em grade, cada um com o ícone na cor oficial e o nome no `title` e no `aria-label`;
      - clicar grava `brand` e o slug.
    - **Ícones:** catálogo do Lucide e busca por nome e palavras-chave, com no máximo 60 resultados. Os ícones aparecem em `currentColor`. Clicar grava `lucide` e o nome.
    - **Emoji:** campo de texto com um emoji. Só aceita valor que passe em `isSingleEmoji`; senão mostra "Use um único emoji". Grava `emoji`.
    - **Favicon:** mostra o favicon do domínio da URL atual e o botão "Usar o ícone do site", que grava `favicon`. Para `mailto:` e URL inválida, a aba avisa que não há site.
    - **Upload:**
      - aceita `.png`, `.svg` e `.webp`;
      - recusa acima de 512 KB com "A imagem deve ter no máximo 512 KB" e recusa outro tipo;
      - o SVG passa por `DOMPurify.sanitize(text, { USE_PROFILES: { svg: true, svgFilters: true } })` e vira um `Blob` `image/svg+xml`. O tamanho é conferido depois da limpeza. Se a limpeza esvaziar o arquivo, mostra erro;
      - envia para `link-icons/<user_id>/<link_id>-<timestamp>.<ext>`, grava `upload` e a URL pública, e apaga o upload anterior desse link, se houver.
- **`src/components/dashboard/links/AccentColorPicker.tsx`**:
  - três opções:
    - "Sem cor" (grava `null`);
    - "Cor oficial da marca", disponível só quando o tipo efetivo for marca, inclusive `auto` detectado como marca. Grava o hex da marca;
    - "Escolher cor", com `<input type="color">` e campo hex. Grava normalizado;
  - mostra a prévia do ícone sobre um quadrado claro e um escuro.
- **`LinksTab.tsx`** passa a:
  - usar os dois modais;
  - mostrar o ícone no card;
  - usar `formatClicks` no badge (a versão curta do celular continua só o número);
  - ao excluir um link com `upload`, apagar o arquivo do bucket. Se a remoção falhar, só registra no console.

**Dependência nova de produção:** `dompurify` `3.4.17`, importada só no `IconPicker`, que fica no chunk do Dashboard.

## Testes

| Arquivo | O que cobre |
|---|---|
| `src/lib/linkIcons/detect.test.ts` | Cada linha da tabela; `www.` e `m.`; subdomínio; sem esquema; maiúsculas; `mailto:`; `tel:` e URL inválida dão `null`; `getFaviconUrl` |
| `src/lib/linkIcons/resolve.test.ts` | Os 6 tipos; `auto` com marca, com favicon e com `globe`; `icon_value` inválido cai em `auto`; upload sem `https://` cai em `auto`; cor por `accent_color`; regra de contraste 3:1 |
| `src/lib/linkIcons/emoji.test.ts` | Simples, ZWJ, bandeira, texto, dois emojis, vazio |
| `src/lib/linkIcons/vendor.test.ts` | Versões iguais no `package.json`, no script e no `vendor.ts`; formato das URLs |
| `src/lib/formatClicks.test.ts` | 0, 1, 2, 1234 |
| `src/components/links/LinkIcon.test.tsx` | Máscara com URL e cor; emoji; imagem; `onError` e `naturalWidth < 32` trocam para o Globe |
| `src/components/dashboard/links/AddLinkDialog.test.tsx` | Colar URL do YouTube mostra a detecção e preenche o título vazio; não sobrescreve título digitado; o insert grava `auto`; URL inválida recusa |
| `src/components/dashboard/links/IconPicker.test.tsx` | Catálogo simulado (`fetch`); busca filtra por título e apelido; clicar marca ou ícone chama `onChange` com o par certo; emoji inválido recusado; upload acima de 512 KB e tipo errado recusados; SVG com `<script>` sai limpo no `upload` simulado |
| `src/components/dashboard/links/AccentColorPicker.test.tsx` | "Cor oficial" só com marca; grava o hex da marca; cor manual normalizada; "Sem cor" grava `null` |
| `ProfileView.test.tsx`, `ProfilePreview.test.tsx` | Link do YouTube desenha a máscara da marca; link sem marca desenha o favicon |
| `LinksTab` | Badge "1 clique" e "2 cliques" |

## Publicação

1. Migração no banco, antes do frontend.
2. Build: o `prebuild` prepara o MediaPipe e os ícones, e o build para se faltar algo.
3. Conferências:
   - os SVGs e catálogos fora do `sw.js`;
   - `simple-icons` e `lucide-static` fora de qualquer chunk de JS (procurar o `d=` de um path de marca no `dist/assets`);
   - `dompurify` só no chunk do Dashboard.
4. Publicação pelo procedimento do `DEPLOY.md` e verificação no navegador:
   - perfil público com ícone de marca (YouTube), favicon e Globe;
   - prévia do celular;
   - modal de adicionar detectando ao colar;
   - modal de edição trocando entre as abas sem salvar sobre os links reais do Daniel, a não ser que ele peça. Os testes de gravação usam um link criado só para isso e apagado no fim.
