# Ícones dos links com customização total — especificação

**Data:** 25/10/2026
**Situação:** plano de arquivos aprovado pelo Daniel em 25/10/2026 e revisado contra o código. Escolhas dele:
- a cor de destaque vale **só para o ícone**;
- o bucket se chama **`linkhub-link-icons`**;
- o **SVG enviado é convertido para PNG** no navegador antes do upload.

## Objetivo

Hoje o ícone de cada link é adivinhado pelo título, com reserva na URL. X e TikTok usam o ícone genérico de link externo, e o modal "Adicionar Novo Link" obriga a escolher um tipo antes de digitar.

Depois desta mudança:
- **Adicionar link:** o modal tem só URL e título. Ao colar a URL, o app detecta a marca pelo domínio e mostra o ícone. Domínios não reconhecidos usam o favicon do site.
- **Personalizar o ícone:** cada link pode ter um ícone escolhido pelo dono (marca, ícone Lucide, emoji, favicon ou imagem enviada) e uma cor de destaque opcional para o ícone.
- **Onde aparece:** o mesmo ícone aparece na lista do painel, na página pública e na prévia do celular.
- **Contador de cliques:** o plural fica certo ("1 clique", "2 cliques").

## Fora do escopo

- A página de exemplo (`src/pages/ExampleProfile.tsx`), com ícones fixos.
- A edge function `linkhub-profile-og`.
- Proxy próprio para favicons: o favicon vem do serviço público do Google, como pedido.
- O `OnboardingDialog`, que cria links com o padrão `auto` e passa a ganhar os ícones novos sem mudança.
- Efeitos aceitos:
  - sites que só têm favicon de 16 px aparecem com o Globe (regra da seção `LinkIcon`);
  - no modo de alto contraste do Windows, os ícones mascarados ficam na cor do texto do sistema.

## Dados

### Colunas novas em `linkhub.links`

| Coluna | Tipo | Regra |
|---|---|---|
| `icon_type` | `text NOT NULL DEFAULT 'auto'` | constraint `links_icon_type_check`: `icon_type IN ('auto','lucide','brand','emoji','favicon','upload')` |
| `icon_value` | `text NULL` | constraint `links_icon_value_length`: `icon_value IS NULL OR length(icon_value) <= 2048` |
| `accent_color` | `text NULL` | constraint `links_accent_color_check`: `accent_color IS NULL OR accent_color ~ '^#[0-9a-fA-F]{6}$'` |

Significado e validação de `icon_value`. O banco só limita o tamanho; o app valida antes de gravar **e** antes de desenhar, porque o dono pode gravar qualquer valor pela API.

| `icon_type` | `icon_value` | Válido quando |
|---|---|---|
| `auto` | `NULL` (o ícone sai da URL a cada desenho) | sempre |
| `brand` | `slug` do Simple Icons (ex.: `youtube`) | `^[a-z0-9_]+$` (há slugs com `_`, ex.: `uniqlo_ja`; um teste valida todos os slugs do catálogo) |
| `lucide` | nome do arquivo do `lucide-static` (ex.: `globe`) | `^[a-z0-9]+(-[a-z0-9]+)*$` |
| `emoji` | um único emoji | `isSingleEmoji` |
| `favicon` | `NULL` (usa o domínio da URL do link) | `getFaviconUrl(url)` não é `null` (mesma normalização do detect: aceita URL sem esquema) |
| `upload` | URL pública do arquivo | começa com `LINK_ICONS_PUBLIC_PREFIX` e o resto não contém `..`, `?`, `#` nem `\` |

`LINK_ICONS_PUBLIC_PREFIX` = `${VITE_SUPABASE_URL sem barra final}/storage/v1/object/public/linkhub-link-icons/`. Fica em `src/lib/linkIcons/storagePrefix.ts`, sem importar o cliente Supabase (padrão do `siteUrl.ts`), porque o `ProfileView` precisa dele. Um teste confere que `supabase.storage.from(LINK_ICONS_BUCKET).getPublicUrl('u1/a.png').data.publicUrl` começa com o prefixo; nos testes o `VITE_SUPABASE_URL` vem de `vi.stubEnv`.

**Compatibilidade:** os links existentes recebem `auto` pelo padrão. Para o app, `icon_type` ausente ou desconhecido conta como `auto`, e `icon_value` inválido para o tipo também conta como `auto`.

### Bucket `linkhub-link-icons`

- Público.
- `file_size_limit` = 524288 (512 KB).
- `allowed_mime_types` = `image/png`, `image/webp`. O SVG nunca chega ao Storage: o app o converte para PNG.
- Políticas iguais às de `linkhub-avatars`, com prefixo `linkhub_link_icons_`: leitura pública; insert, update e delete só na pasta `auth.uid()`.
- Caminho do arquivo: `<user_id>/<link_id>-<timestamp>.<png|webp>`.
- Constante `LINK_ICONS_BUCKET = 'linkhub-link-icons'` em `src/lib/supabase.ts`, ao lado de `AVATARS_BUCKET`.

### Migração

Arquivo `deploy/vpsavila/migrations/2026-10-25-link-icons.sql`, idempotente e numa transação só (`BEGIN; … COMMIT;`):
- começa com `BEGIN;` e `SET LOCAL lock_timeout = '5s'`;
- colunas com `ADD COLUMN IF NOT EXISTS`;
- as três constraints criadas dentro de blocos `DO $$ … $$`, só se o nome não existir em `pg_constraint`;
- bucket com `INSERT … ON CONFLICT (id) DO NOTHING`;
- políticas com `DROP POLICY IF EXISTS` + `CREATE POLICY`;
- termina com `NOTIFY pgrst, 'reload schema'` (entregue no commit) e `COMMIT;`.

É aplicada antes do frontend, pelo procedimento do `DEPLOY.md` (`scp` + `psql` no servidor).

Recebem as mesmas mudanças:
- `deploy/vpsavila/linkhub_schema.sql`: colunas, constraints, bucket e políticas;
- `src/integrations/supabase/types.ts`: as colunas em `links` (`Row`, `Insert`, `Update`).

## Ícones servidos pelo próprio domínio

O `simple-icons` tem 3.466 marcas, e o `index.mjs` dele pesa 5,25 MB. Importar todo o Lucide também pesaria. Nenhum dos dois entra no bundle.

- **Dependências de desenvolvimento**, com versão fixa: `simple-icons` `16.35.0` (CC0) e `lucide-static` `0.462.0` (ISC, a mesma versão do `lucide-react` do app). Servem só de fonte de arquivos.
- **`scripts/prepare-icons.mjs`**, no padrão do `prepare-mediapipe.mjs`:
  - Constantes `SIMPLE_ICONS_VERSION = '16.35.0'` e `LUCIDE_STATIC_VERSION = '0.462.0'`. O script avisa se o `node_modules` tiver outra versão.
  - Destinos: `public/vendor-icons/simple-icons/<versão>/*.svg` e `public/vendor-icons/lucide/<versão>/*.svg` (cerca de 5.000 arquivos e 6 MB).
  - Catálogos:
    - O nome traz a versão do formato (`catalog.v1.json`): um formato novo ganha outro nome e não reaproveita um catálogo antigo em cache. Um `catalog.json` de antes é apagado pelo script.
    - **Marcas:** `public/vendor-icons/simple-icons/<versão>/catalog.v1.json`, com `[{ "s": slug, "t": título, "h": "#rrggbb", "a": [apelidos] }]`, cerca de 160 KB. Os apelidos vêm de `aliases.aka`, `aliases.dup[].title`, os valores de `aliases.loc` e `aliases.old`.
    - **Lucide:** `public/vendor-icons/lucide/<versão>/catalog.v1.json`, com `[{ "n": nome, "k": [palavras-chave] }]`, cerca de 140 KB, a partir de `tags.json`. Só entra ícone que tenha SVG.
  - "Completo" = o marcador `.complete` existe, o `catalog.v1.json` existe e a contagem de `.svg` na pasta é igual à da origem. Quando a pasta está completa, o script não copia nada. Se só faltar o catálogo, ele é regerado sem recopiar os SVGs.
  - Apaga as pastas de **outras versões** em `public/vendor-icons/simple-icons/` e `public/vendor-icons/lucide/`, para não irem junto no `dist`. Os `rm` usam `maxRetries: 5` (arquivos presos por instantes no Windows).
  - Com `npm_lifecycle_event === 'prebuild'` ou `REQUIRE_VENDOR_ICONS=1`, sai com código 1 se algo continuar incompleto ou se o `node_modules` tiver outra versão de um dos pacotes (fora desse modo, a versão diferente só gera aviso). Com `SKIP_VENDOR_ICONS=1`, pula tudo.
  - No `package.json`:
    - `"predev": "node scripts/prepare-mediapipe.mjs && node scripts/prepare-icons.mjs"`
    - `"prebuild": "node scripts/prepare-mediapipe.mjs && node scripts/prepare-icons.mjs"`
- **`.gitignore`:** `public/vendor-icons/`.
- **`vite.config.ts`:** `'**/vendor-icons/**'` no `globIgnores`.
- **`deploy/vpsavila/nginx.conf`:** `location /vendor-icons/ { try_files $uri =404; add_header Cache-Control "public, max-age=2592000"; }`. A versão vai no caminho, e o `image/svg+xml` já está no `mime.types`.
- **`src/lib/linkIcons/vendor.ts`:**
  - exporta as duas versões, `brandIconUrl(slug)`, `lucideIconUrl(name)`, `BRAND_CATALOG_URL` e `LUCIDE_CATALOG_URL`;
  - as funções só aceitam valores válidos pelas regex da tabela e devolvem `null` para os outros;
  - o teste confere que as versões batem com `pkg.devDependencies`, com o script e com o arquivo.
- **Subir de versão no futuro:** o `DEPLOY.md` registra um SQL que lista os slugs `brand` gravados (`SELECT DISTINCT icon_value FROM linkhub.links WHERE icon_type = 'brand'`), para conferir contra a nova versão antes de publicar. O Simple Icons remove marcas.

**Como desenhar:** os SVGs de marca e do Lucide são monocromáticos. O ícone é um `<span>` com:
- `mask-image: url("…")` (URL entre aspas) e `mask-size: contain`, `mask-repeat: no-repeat`, `mask-position: center`;
- os quatro também com prefixo (`WebkitMaskImage`, `WebkitMaskSize`, `WebkitMaskRepeat`, `WebkitMaskPosition`), para Chrome anterior à 120 e WebViews;
- `background-color: <cor>`;
- a classe `link-icon-mask`.

No `src/index.css`: `@media (forced-colors: active) { .link-icon-mask { forced-color-adjust: none; background-color: CanvasText !important; } }`.

## Lógica (funções puras, com testes)

### `src/lib/linkIcons/detect.ts`

`detectIconFromUrl(url): DetectedIcon | null`, com `DetectedIcon = { kind: 'brand' | 'lucide'; value: string; title: string; hex: string | null }`. O `hex`, quando existe, vem sempre como `#rrggbb`, em minúsculas.

Normalização:
- esquema comparado sem diferenciar maiúsculas;
- `mailto:` vira o caso do e-mail;
- sem esquema, prefixa `https://`;
- só http(s) segue;
- o host fica em minúsculas, sem `www.` nem `m.` na frente.

Um host casa com a entrada se for igual a um domínio da tabela ou terminar em `.<domínio>` (ex.: `music.youtube.com`, `open.spotify.com`, `api.whatsapp.com`).

| Domínio(s) | Resultado | Título | Hex |
|---|---|---|---|
| `youtube.com`, `youtu.be` | brand `youtube` | YouTube | `#ff0000` |
| `instagram.com` | brand `instagram` | Instagram | `#ff0069` |
| `tiktok.com` | brand `tiktok` | TikTok | `#000000` |
| `x.com`, `twitter.com` | brand `x` | X | `#000000` |
| `linkedin.com`, `lnkd.in` | **lucide `linkedin`** (o Simple Icons removeu o LinkedIn) | LinkedIn | `#0a66c2` |
| `github.com` | brand `github` | GitHub | `#181717` |
| `facebook.com`, `fb.com`, `fb.me` | brand `facebook` | Facebook | `#0866ff` |
| `drive.google.com` | brand `googledrive` | Google Drive | `#4285f4` |
| `notebooklm.google.com` | brand `notebooklm` | NotebookLM | `#000000` |
| `wa.me`, `whatsapp.com` | brand `whatsapp` | WhatsApp | `#25d366` |
| `t.me`, `telegram.me` | brand `telegram` | Telegram | `#26a5e4` |
| `spotify.com` | brand `spotify` | Spotify | `#1ed760` |
| `threads.net`, `threads.com` | brand `threads` | Threads | `#000000` |
| `discord.gg`, `discord.com` | brand `discord` | Discord | `#5865f2` |
| `mailto:` | **lucide `mail`** | E-mail | `null` |

Não há regra genérica para `google.com`. A tabela fica no próprio arquivo, então a detecção não precisa do catálogo.

`getFaviconUrl(url): string | null`:
- devolve `https://www.google.com/s2/favicons?domain=<host>&sz=64`, com o host sem `www.`;
- devolve `null` para qualquer esquema que não seja http(s), para host vazio e para URL inválida (`mailto:`, `tel:`, lixo).

`getUrlHost(url): string | null`: o mesmo host normalizado, usado no título automático.

`getBrandHex(slug): string | null`: o hex da tabela de detecção; se o slug não estiver nela, o do cache em memória do catálogo de marcas (preenchido por `loadBrandCatalog()`, em `src/lib/linkIcons/catalog.ts`, que faz o `fetch` uma vez e guarda a promessa). Sem catálogo carregado, `null`. O `AccentColorPicker` e a regra "cor oficial acompanha a marca" usam esta função, não o `hex` do ícone resolvido.

### `src/lib/linkIcons/validate.ts`

`isValidIconValue(type, value, context)`, com as regras da tabela de dados. O `context` traz a URL do link e o prefixo público do bucket. Usada pelo `resolve.ts` (antes de desenhar) e pelos modais (antes de gravar).

### `src/lib/linkIcons/resolve.ts`

`resolveLinkIcon(link, options): ResolvedIcon`:
- `link` = `{ url; icon_type?; icon_value?; accent_color? }`;
- `options` = `{ defaultColor: string; backgrounds?: string[]; uploadPrefix: string }`.

`ResolvedIcon` pode ser:
- `{ kind: 'mask'; src: string; color: string; label: string; hex: string | null }`, para marca e Lucide. `hex` é o oficial, quando se sabe;
- `{ kind: 'emoji'; value: string }`;
- `{ kind: 'image'; src: string; source: 'favicon' | 'upload' }`.

Regras:
1. **Tipo efetivo:**
   - `auto` (ou ausente, desconhecido ou com valor inválido): `detectIconFromUrl`. Sem detecção, favicon. Sem favicon, Lucide `globe`.
   - `brand` e `lucide`: as URLs do `vendor.ts`. O `hex` só é conhecido se o slug estiver na tabela de detecção.
   - `emoji`: o próprio valor.
   - `favicon`: `getFaviconUrl`, com a mesma reserva em `globe`.
   - `upload`: o `icon_value`.
2. **Cor do tipo `mask`:**
   - parte de `accent_color` normalizada, se houver; senão, de `defaultColor`;
   - se houver `backgrounds`, usa `getContrastRatio` contra **cada** fundo e fica com o pior valor;
   - se o pior contraste for menor que **3:1**, ou não der para calcular (`null`), usa `defaultColor`.
3. Emoji e imagem ignoram a cor.
4. `label`: o título da marca, o nome do ícone ou "Ícone do link".

**Fundos usados pelo `ProfileView`:**
- botão `solid`: o fundo do botão (`resolveButtonColors(theme).bg`);
- `outline`, `glass`, `modern` e `rounded`: o fundo da página. Se for sólido, é a cor dele; se for gradiente, as duas cores (`colors[0]` e `colors[1]`, com as mesmas reservas do `getBackgroundLayer`: `#111827` e `#1f2937`), o que dá o pior caso. Para tema `null`, `#111827`.

O glass é branco a 10% e o modern/rounded é a cor do botão a 12–25%, ambos sobre o fundo da página. Por isso o fundo da página é a referência.

### `src/lib/linkIcons/emoji.ts`

`isSingleEmoji(text)`:
- sem espaços nas pontas e com no máximo 32 caracteres;
- casa com `/\p{Extended_Pictographic}|\p{Regional_Indicator}/u`;
- com `Intl.Segmenter`: exatamente um grafema;
- **sem `Intl.Segmenter`** (Firefox ESR 115):
  1. separa o texto por `‍` (ZWJ);
  2. em cada parte, tira `︎`, `️`, os tons de pele `\u{1F3FB}-\u{1F3FF}` e as tags `\u{E0020}-\u{E007F}`;
  3. aceita se houver de 1 a 8 partes e cada uma sobrar com exatamente 1 code point `\p{Extended_Pictographic}`;
  4. aceita também, sem ZWJ, exatamente 2 code points `\p{Regional_Indicator}` (bandeira).
- `Intl.Segmenter` é lido **na hora da chamada**, não ao carregar o módulo.
- **Limitação aceita:** keycaps (1️⃣) são recusados nos dois caminhos.

Os testes cobrem as duas implementações: simples, tom de pele, família 👨‍👩‍👧‍👦, beijo 👩‍❤️‍💋‍👨, aperto de mãos com tons 🧑🏽‍🤝‍🧑🏿, bandeira 🇧🇷, bandeira por tags 🏴󠁧󠁢󠁥󠁮󠁧󠁿 (aceitos); "😀😀", "🇧🇷🇺🇸", texto e vazio (recusados). No caminho sem o Segmenter, o teste apaga `Intl.Segmenter` e o restaura depois.

### `src/lib/linkIcons/storage.ts`

- `linkIconPathFromUrl(url, userId, publicPrefix)`: tira o prefixo público e devolve o caminho só se começar com `${userId}/` e não tiver `..`; senão, `null`.
- Partes puras, testáveis no jsdom (o `DOMParser` funciona lá):
  - `getSvgAspect(svgText)`: largura/altura, nesta ordem: `viewBox` válido (4 números separados por espaço ou vírgula, largura e altura maiores que 0); senão `width`/`height` numéricos da raiz; senão 1:1;
  - `prepareSvgForRaster(svgText, size = 256)`: faz o parse com `DOMParser` (`image/svg+xml`); se houver `<parsererror>` ou a raiz não for `svg`, lança "Não foi possível ler este SVG"; grava `width` e `height` explícitos na raiz (lado maior = `size`, o outro pela proporção) e devolve o texto serializado com `XMLSerializer`. Isso evita SVG sem tamanho intrínseco, que o Firefox não desenha no canvas.
- `rasterizeSvgToPng(file, size = 256, loadImage = defaultLoadImage)`:
  - lê o arquivo com `FileReader` (o jsdom 25 não tem `Blob.text()`);
  - aplica `prepareSvgForRaster`;
  - cria um Blob `image/svg+xml` e uma objectURL **`blob:`** (nunca `data:`), carrega com o `loadImage` injetável e desenha num canvas do tamanho final;
  - devolve `canvasToBlob(canvas, 'image/png')`, do `src/utils/cropImage.ts`; `SecurityError` (canvas sujo) ou blob `null` viram o erro "Não foi possível converter este SVG";
  - revoga a objectURL no `finally`.
  - **Segurança:** o SVG renderizado como imagem não executa script nem carrega recursos externos.
- PNG e WebP enviados acima de 256 px também são reduzidos para 256 px (`scaleCanvas`) antes do upload, quando o canvas estiver disponível.
- `validateIconFile(file)`:
  - tipo pelo MIME, com reserva na extensão (`.png`, `.webp`, `.svg`), porque `file.type` às vezes vem vazio;
  - limite de 512 KB para PNG e WebP;
  - o SVG é convertido primeiro, e o PNG resultante também é conferido contra os 512 KB;
  - mensagens: "Use PNG, WebP ou SVG" e "A imagem deve ter no máximo 512 KB".

### `src/lib/formatClicks.ts`

`formatClicks(n)`:
- 1 → "1 clique";
- os demais, incluindo 0 → "N cliques";
- separador `pt-BR` para milhar ("1.234 cliques").

## Renderização

### `src/components/links/LinkIcon.tsx`

Props:
- `link`, `defaultColor`, `backgrounds?`;
- `size` (px, padrão 20);
- `className?`;
- `decorative?` (padrão `true`, porque o título do link já está ao lado).

Todo elemento leva `shrink-0` e `style={{ width: size, height: size }}`. O `<Button>` usa `whitespace-nowrap`, e o `button.tsx` força `[&_svg]:size-4`. O estilo inline vence a classe.

| Tipo resolvido | Elemento |
|---|---|
| `mask` | `<span>` com o estilo de máscara. Decorativo: `aria-hidden="true"`; senão: `role="img"` com `aria-label` |
| `emoji` | `<span aria-hidden="true">` com o emoji, `leading-none`, `fontSize: size * 0.9` e centralizado |
| `image` | `<img alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer">` |

**Reserva do `image`:** troca para o `Globe` do `lucide-react`, com `color: defaultColor` e o mesmo tamanho inline, quando:
- o `onError` dispara (favicon ou upload);
- ou, só se `source === 'favicon'`, o `onLoad` vê `naturalWidth < 32` (o Google devolve um globo de 16 px quando não acha o favicon).

O estado de reserva é reiniciado quando o `src` muda.

**Tamanhos:**
- página pública e prévia: 20 px. Hoje, na prática, são 16 px por causa do `[&_svg]:size-4`;
- card do painel: 18 px.

### Onde muda

- **`ProfileView`** (página pública e prévia):
  - troca `getLinkIcon` por `<LinkIcon size={20} …>`, com `defaultColor` = cor do texto do botão (`resolveButtonColors(theme ?? {…}).text`, com a mesma reserva de hoje) e `backgrounds` conforme a seção acima;
  - o `ProfileViewLink` ganha `icon_type?`, `icon_value?` e `accent_color?`. A `PublicProfile` e a `ProfilePreview` já buscam `select('*')`.
  - O ícone continua um `<span>` ou `<img>`. O teste atual da camada de padrão procura o único `div[aria-hidden]`.
- **Card da lista do painel (`LinksTab`):** à esquerda do título entra um quadrado de 28 px branco (`bg-white`, `border`, `rounded-md`), com o ícone de 18 px dentro, `defaultColor` `#1f2937` e `backgrounds` `['#ffffff']`. Assim, os ícones pretos aparecem também no tema escuro do painel.
- **`src/components/profile/linkIcons.tsx`:** sai, porque é a detecção por título e não sobra uso. Os arquivos `src/assets/google-drive.png` e `notebook-lm.svg` ficam: o `ExampleProfile` ainda os usa.

## Modais

O `LinksTab.tsx` tem 518 linhas e passa a delegar.

### `src/components/dashboard/links/AddLinkDialog.tsx`

- Campos **URL** (primeiro, com foco) e **Título (opcional)**.
- A cada mudança da URL (`onChange`, que também pega o colar), mostra a prévia do ícone resolvido em `auto`, com o texto "Ícone detectado: <título>" ou "Ícone do site". Para URL inválida, não mostra prévia.
- **Título automático:** enquanto o usuário não digitar no título, ele acompanha a URL. Fica o título da marca; sem marca, o host (`getUrlHost`); para `mailto:`, "E-mail". Quando o usuário digita, o automático para. Se o usuário apagar tudo, o automático volta.
- **Adicionar:**
  - valida com `isValidUrl`;
  - o título final é o digitado ou o automático;
  - insere com `icon_type: 'auto'`, `icon_value: null` e `accent_color: null`;
  - sem URL válida, mostra "A URL fornecida não é válida".
- Saem o `LINK_TYPES` e o passo de escolher o tipo.

### `src/components/dashboard/links/EditLinkDialog.tsx`

- **Título e URL:** continuam com o salvamento automático de hoje (`useAutosave`, 1,5 s). Quando a URL ou o título estiverem inválidos, o salvamento não acontece, e o modal mostra "Corrija a URL para salvar" ou "O título não pode ficar vazio", em vez de ficar calado.
- **Ícone e cor:** são gravados **na hora**, com um `update` direto, porque fechar o modal antes do salvamento automático perderia a escolha. Durante a gravação, o `IconPicker` e o `AccentColorPicker` ficam desabilitados e aparece um indicador; se falhar, um toast de erro, e o estado volta ao anterior.
- **Upload:**
  1. envia o arquivo novo;
  2. grava `icon_type`/`icon_value` no banco;
  3. só depois disso apaga o arquivo anterior desse link, se havia;
  4. se o `update` do passo 2 falhar, apaga o arquivo novo (senão ficaria órfão).
- **Troca de tipo:** ao trocar de `upload` para qualquer outro tipo, apaga o arquivo anterior depois do `update` dar certo. A remoção que falhar só vai para o console.
- **Cor oficial acompanha a marca:**
  - **ao trocar o ícone** (gravação imediata): se o `accent_color` atual for igual a `getBrandHex` da marca anterior, ele vai no mesmo `update` como o hex oficial da nova (`getBrandHex`, ou o hex da detecção para `auto`/LinkedIn), ou `null` se a nova não tiver hex;
  - **ao trocar a URL de um `auto`**: a regra roda **só dentro do `handleAutoSaveEdit`**, comparando a URL gravada com a nova (e não a cada tecla, para `youtube.co` no meio da digitação não apagar a cor). O `accent_color` ajustado vai no mesmo `update` da URL;
  - uma cor escolhida à mão não é mexida.
- O modal rola em telas baixas (`max-h-[90dvh] overflow-y-auto`).

### `src/components/dashboard/links/IconPicker.tsx`

- No topo: a prévia do ícone atual e o botão "Automático (pela URL)", que volta a `auto`.
- Abas (`Tabs` do shadcn): **Marcas, Ícones, Emoji, Favicon, Upload**.

**Marcas:**
- busca o catálogo de marcas (`fetch`) na primeira abertura da aba, guarda em memória no módulo e mostra os estados de carregando e de erro;
- a busca tem debounce de 200 ms e ignora maiúsculas e acentos (NFD), procurando no título e nos apelidos;
- com a busca vazia, mostra primeiro as 13 marcas da tabela de detecção;
- mostra até 60 resultados, cada um num quadrado branco igual ao do card, com o ícone na cor oficial **pela mesma regra de contraste** (`backgrounds: ['#ffffff']`, `defaultColor` `#1f2937`): 27% das marcas têm cor clara demais para o branco (ex.: Snapchat `#fffc00`) e aparecem em `#1f2937`;
- cada célula é um `button` com `aria-label` = título e `aria-pressed` no item atual;
- uma região `aria-live="polite"` anuncia "Carregando…", o erro e "N marcas";
- clicar grava `brand` e o slug.

**Ícones:**
- o mesmo esquema, com o catálogo do Lucide e busca por nome e palavras-chave;
- os ícones aparecem em `#1f2937`, no quadrado branco;
- com a busca vazia, mostra uma lista fixa de 24 ícones comuns: `globe`, `link`, `mail`, `phone`, `map-pin`, `calendar`, `book-open`, `file-text`, `video`, `music`, `camera`, `shopping-bag`, `briefcase`, `graduation-cap`, `heart`, `star`, `home`, `building-2`, `wrench`, `code`, `rss`, `podcast`, `newspaper` e `message-circle`, com `house` no lugar de `home` (renomeado no 0.462.0). Um teste confere a lista contra o catálogo;
- clicar grava `lucide` e o nome.

**Emoji:**
- campo de texto e botão "Usar";
- só aceita o que passa em `isSingleEmoji`; senão mostra "Use um único emoji";
- grava `emoji`.

**Favicon:**
- mostra o favicon do domínio da URL atual e o botão "Usar o ícone do site", que grava `favicon`;
- para URL sem site (`mailto:`, `tel:` ou inválida), avisa que não há site e desabilita o botão.

**Upload:**
- `input type=file` com `accept=".png,.webp,.svg,image/png,image/webp,image/svg+xml"`;
- passa por `validateIconFile` e, se for SVG, por `rasterizeSvgToPng`;
- envia com `contentType` explícito para `linkhub-link-icons/<user_id>/<link_id>-<timestamp>.<ext>`;
- segue o fluxo de upload do `EditLinkDialog`.

**Tema escuro:** as abas se desenham no tema do painel, mas todas as grades usam o quadrado branco. Assim, os ícones de marca pretos não somem.

**Catálogo de marcas na reabertura:** se o link estiver com `brand` e o slug não estiver na tabela de detecção, o `EditLinkDialog` carrega o catálogo ao abrir, só para saber o hex oficial. O cache em memória evita baixar de novo.

### `src/components/dashboard/links/AccentColorPicker.tsx`

Três opções:
- "Sem cor" (grava `null`);
- "Cor oficial da marca", disponível quando houver hex oficial: `getBrandHex(slug)` para `brand`, o hex da detecção para `auto` e LinkedIn. Grava esse hex;
- "Escolher cor", com `<input type="color">` e campo hex, que grava normalizado.

Fica **desabilitado**, com a nota "A cor vale para ícones de marca e da biblioteca", quando o ícone efetivo for emoji, favicon ou upload.

A prévia mostra o ícone sobre um quadrado claro (`#ffffff`, `defaultColor` `#1f2937`) e um escuro (`#111827`, `defaultColor` `#f9fafb`), já com a regra de contraste.

### `LinksTab.tsx`

- usa os dois modais;
- mostra o ícone no card;
- usa `formatClicks` no badge (a versão curta do celular continua só o número);
- ao excluir um link com `upload`, apaga o arquivo do bucket depois do `delete`. A falha só vai para o console.

## Página de privacidade

`src/pages/Privacy.tsx`, seção "2. Uso dos Dados": acrescentar que, para mostrar o ícone de alguns links, o navegador do visitante busca o favicon do site no serviço público de favicons do Google, que recebe o endereço IP e o domínio consultado. Atualizar "Última atualização" para "Outubro 2026".

## Testes (jsdom: notas de viabilidade)

- **Abas do Radix:** trocam no `mouseDown` (`fireEvent.mouseDown`), e as abas inativas são desmontadas.
- **Campos:** `fireEvent.change`. O repositório não tem `user-event` nem `jest-dom`.
- **Imagens:** o jsdom não carrega, e o `naturalWidth` é 0. O teste usa `Object.defineProperty(img, 'naturalWidth', { value: 16 })` com `fireEvent.load` e `fireEvent.error`.
- **Máscara:** o cssstyle não guarda as propriedades `-webkit-`. Conferir `el.style.maskImage` ou `getPropertyValue('mask-image')`.
- **Canvas e `toBlob`:** simulados como em `cropImage.test.ts`. A leitura do SVG usa `FileReader`.

| Arquivo | O que cobre |
|---|---|
| `src/lib/linkIcons/detect.test.ts` | Cada linha da tabela; `www.`, `m.`, subdomínio, sem esquema, maiúsculas, `MAILTO:`; `tel:` e lixo dão `null`; `getFaviconUrl` (http(s), host vazio, `tel:`); `getUrlHost` |
| `src/lib/linkIcons/validate.test.ts` | Regex de `brand` e `lucide` (inclui tentativa de `")` e `url(`), emoji, upload com e sem o prefixo do bucket |
| `src/lib/linkIcons/resolve.test.ts` | Os 6 tipos; `auto` com marca, com favicon e com `globe`; valor inválido cai em `auto`; cor por `accent_color`; contraste 3:1 com um fundo e com dois (gradiente); `null` no contraste cai em `defaultColor`; `source` da imagem |
| `src/lib/linkIcons/emoji.test.ts` | Simples, ZWJ, tom de pele, bandeira, texto, dois emojis, vazio, com e sem `Intl.Segmenter` |
| `src/lib/linkIcons/storage.test.ts` | `linkIconPathFromUrl` (dono certo, outro usuário, `..`, outro bucket); `validateIconFile` (tipo por MIME e extensão, limite); `getSvgAspect` (viewBox com vírgula, inválido, só width/height, nada); `prepareSvgForRaster` (grava width/height, recusa XML quebrado e raiz não-svg); `rasterizeSvgToPng` com `loadImage` injetado, canvas e `toBlob` simulados e `URL.createObjectURL`/`revokeObjectURL` stubados (o jsdom não os tem) |
| `src/lib/linkIcons/vendor.test.ts` | Versões iguais em `pkg.devDependencies`, no script e no `vendor.ts`; URLs; valores inválidos dão `null` |
| `src/lib/formatClicks.test.ts` | 0, 1, 2, 1234 |
| `src/components/links/LinkIcon.test.tsx` | Máscara com URL entre aspas e cor; emoji `aria-hidden`; imagem; erro e `naturalWidth < 32` só no favicon trocam para o Globe; upload pequeno não troca; tamanho inline |
| `src/components/dashboard/links/AddLinkDialog.test.tsx` | Mudar a URL para o YouTube mostra a detecção e o título "YouTube"; mudar para o Instagram troca o título automático; título digitado não é sobrescrito; sem marca, o título é o host; insert com `auto`; URL inválida recusa |
| `src/components/dashboard/links/IconPicker.test.tsx` | Catálogo simulado (`fetch`); busca vazia mostra as marcas da detecção; busca por título e apelido; clique grava o par certo; emoji inválido recusado; arquivo grande e tipo errado recusados; SVG vira PNG antes do upload simulado |
| `src/components/dashboard/links/EditLinkDialog.test.tsx` | Escolher ícone grava na hora; upload grava e só depois apaga o anterior; trocar de upload para marca apaga o arquivo; cor oficial acompanha a marca; erro de gravação desfaz |
| `src/components/dashboard/links/AccentColorPicker.test.tsx` | "Cor oficial" só com hex (inclui LinkedIn); desabilitado para emoji, favicon e upload; cor manual normalizada; "Sem cor" grava `null` |
| `src/components/dashboard/LinksTab.test.tsx` (novo; mocks de `supabase`, `useAuth` e `toast` como no `SettingsTab.test.tsx`) | Badge "1 clique" e "2 cliques"; ícone no card; excluir link com upload apaga o arquivo |
| `ProfileView.test.tsx`, `ProfilePreview.test.tsx` | Link do YouTube desenha a máscara da marca; link sem marca desenha o favicon; X com `accent_color: '#000000'` sobre botão escuro cai na cor do texto |
| `src/lib/linkIcons/catalog.test.ts` | `loadBrandCatalog` faz um `fetch` só; `getBrandHex` usa a tabela e depois o cache; todos os slugs do catálogo de teste passam na regex de `brand` |
| `src/lib/linkIcons/storagePrefix.test.ts` | Prefixo com e sem barra final em `VITE_SUPABASE_URL` (`vi.stubEnv`); `getPublicUrl` do Supabase começa com ele |

## Publicação

1. **Migração** no banco, antes do frontend.
2. **Build:** o `prebuild` prepara o MediaPipe e os ícones, e para se faltar algo.
3. **Conferências do build:**
   - SVGs e catálogos fora do `sw.js`;
   - `simple-icons` e `lucide-static` fora dos chunks de JS. Procurar em `dist/assets/*.js` um trecho do `d=` do path do YouTube: não pode aparecer;
   - nenhum `dompurify`.
4. **`DEPLOY.md`, "Publicar":** passa a empacotar o `dist`, porque `scp -r` com cerca de 5.000 arquivos fica lento:
   ```powershell
   tar.exe -czf "$env:TEMP\linkhub-dist.tgz" -C dist .
   scp "$env:TEMP\linkhub-dist.tgz" avila@192.168.1.24:/tmp/
   ```
   No servidor, na ordem: `rm -rf html.new && mkdir html.new` (como hoje), `tar -xzf /tmp/linkhub-dist.tgz -C ~/docker/linkhub-frontend/html.new`, o `chmod`, a troca de pastas e a remoção do `.tgz`. Usar `tar.exe --format ustar` no Windows, para o GNU tar do servidor não avisar de cabeçalhos `LIBARCHIVE.*` (o aviso seria inofensivo).
   - O "Conferir" ganha `curl.exe -s -o NUL -w '%{http_code} %{content_type}\n'` de `/vendor-icons/simple-icons/16.35.0/youtube.svg`: esperado `200 image/svg+xml`.
   - O "cerca de 44 MB" do `DEPLOY.md` passa a "cerca de 50 MB".
   - Fica registrado o SQL de slugs para futuras trocas de versão.
5. **Navegador:**
   - perfil público com marca (YouTube), favicon e Globe;
   - prévia do celular;
   - modal de adicionar detectando ao colar.
   - O modal de edição é testado num link criado só para isso e apagado no fim, com o arquivo enviado: marca, cor oficial, emoji, upload de SVG convertido, volta ao automático e exclusão. Os links reais do Daniel não são alterados.
