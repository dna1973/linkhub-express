# Ícones dos links com customização total — plano de implementação

> **Para agentes executores:** sub-skill obrigatória: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** o ícone de cada link passa a sair da URL (marca detectada ou favicon) e pode ser personalizado (marca, Lucide, emoji, favicon ou upload), com cor de destaque opcional só no ícone. Isso vale na lista do painel, na página pública e na prévia.

**Arquitetura:**
- Três colunas novas em `linkhub.links` e o bucket `linkhub-link-icons` (PNG/WebP, 512 KB).
- Os SVGs do `simple-icons` 16.35.0 e do `lucide-static` 0.462.0 são servidos pelo próprio domínio em `/vendor-icons/` e desenhados por máscara CSS, sem entrar no bundle.
- Funções puras em `src/lib/linkIcons/` decidem o que desenhar, e um componente `LinkIcon` desenha.
- O `LinksTab` é dividido em modais de adicionar e de editar, com seletor de ícone e de cor.

**Stack:** React 18, Vite 5, TypeScript (`strict: false`), shadcn/ui (Radix Tabs, Dialog), Supabase self-hosted (schema `linkhub`), Vitest 2 com Testing Library e jsdom 25.

**Especificação (fonte da verdade, leia a seção citada em cada tarefa):** `docs/superpowers/specs/2026-10-25-icones-dos-links-design.md`.

**Convenções do ambiente (Windows):**
- Os comandos rodam no PowerShell, na raiz do repositório.
- `ssh` perde aspas duplas internas: use aspas simples por fora.
- Cada commit termina com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Escreva commits e respostas em português.
- O Vitest roda em ambiente **node** por padrão; testes de DOM declaram `// @vitest-environment jsdom` na primeira linha.
- O repositório **não** tem `@testing-library/user-event` nem `jest-dom`: use `fireEvent` e asserções simples (`toBeTruthy`, `getAttribute`, `style`).
- O jsdom 25 não tem `Blob.text()`, `File.text()` nem `URL.createObjectURL`. Imagens não carregam e o `naturalWidth` é 0. As abas do Radix trocam no `fireEvent.mouseDown`. O cssstyle não guarda as propriedades `-webkit-`.
- Se o `npm test` falhar com `Error: UNKNOWN: unknown error, open '...\ssr\...'` (ou `...\web\...`) e mostrar menos arquivos que o esperado, é falha intermitente do cache do Vitest no Windows: rode de novo e conte só uma execução sem esse erro.
- Nada roda contra o servidor (`ssh`/`scp`) nas tarefas 1 a 10; a migração e o deploy são da tarefa 11.
- Push não faz parte de nenhuma tarefa.

**Referência de contagem:** hoje `npm test` dá 24 arquivos / 266 testes. Cada tarefa informa os arquivos de teste novos. O implementador relata a contagem final, e ela tem de ser a anterior somada aos testes novos.

---

## Mapa de arquivos

| Arquivo | Ação | Tarefa |
|---|---|---|
| `deploy/vpsavila/migrations/2026-10-25-link-icons.sql` | Criar | 1 |
| `deploy/vpsavila/linkhub_schema.sql` | Modificar | 1 |
| `src/integrations/supabase/types.ts` | Modificar | 1 |
| `src/lib/supabase.ts` | Modificar (`LINK_ICONS_BUCKET`) | 1 |
| `src/lib/linkIcons/storagePrefix.ts` (+ teste) | Criar | 1 |
| `package.json`, `package-lock.json` | Modificar | 2 |
| `scripts/prepare-icons.mjs` | Criar | 2 |
| `.gitignore`, `vite.config.ts`, `deploy/vpsavila/nginx.conf`, `deploy/vpsavila/DEPLOY.md` | Modificar | 2 |
| `src/lib/linkIcons/vendor.ts` (+ teste) | Criar | 2 |
| `src/lib/linkIcons/detect.ts`, `validate.ts`, `emoji.ts`, `catalog.ts` (+ testes) | Criar | 3 |
| `src/lib/formatClicks.ts` (+ teste) | Criar | 3 |
| `src/lib/linkIcons/resolve.ts` (+ teste) | Criar | 4 |
| `src/components/links/LinkIcon.tsx` (+ teste) | Criar | 4 |
| `src/index.css` | Modificar (forced-colors) | 4 |
| `src/components/profile/ProfileView.tsx` (+ testes) | Modificar | 5 |
| `src/components/dashboard/ProfilePreview.test.tsx` | Modificar | 5 |
| `src/components/profile/linkIcons.tsx` | Remover | 5 |
| `src/lib/linkIcons/storage.ts` (+ teste) | Criar | 6 |
| `src/components/dashboard/links/AddLinkDialog.tsx` (+ teste) | Criar | 7 |
| `src/components/dashboard/LinksTab.tsx` | Modificar | 7 e 9 |
| `src/components/dashboard/LinksTab.test.tsx` | Criar | 7 |
| `src/components/dashboard/links/IconPicker.tsx` (+ teste) | Criar | 8 |
| `src/components/dashboard/links/AccentColorPicker.tsx` (+ teste) | Criar | 8 |
| `src/components/dashboard/links/EditLinkDialog.tsx` (+ teste) | Criar | 9 |
| `src/pages/Privacy.tsx` | Modificar | 10 |

---

### Tarefa 1: banco, bucket e prefixo público

**Especificação:** seções "Dados" (tabelas, bucket, migração) e a nota de `LINK_ICONS_PUBLIC_PREFIX`.

- [ ] **Passo 1: teste do prefixo (falha)**

`src/lib/linkIcons/storagePrefix.test.ts` (ambiente node):
- com `vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase-api.avila.ia.br')` e com `'https://supabase-api.avila.ia.br/'`, `getLinkIconsPublicPrefix()` devolve `'https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-link-icons/'`;
- o export `LINK_ICONS_BUCKET` de `./storagePrefix` é `'linkhub-link-icons'`;
- `afterEach(() => vi.unstubAllEnvs())`.

O prefixo vem de uma **função** que lê `import.meta.env` na chamada, e não de uma constante calculada na carga do módulo; assim o `stubEnv` funciona. O módulo também exporta `LINK_ICONS_PUBLIC_PREFIX = getLinkIconsPublicPrefix()`, para uso comum.

A conferência contra o `getPublicUrl` real do Supabase fica num segundo teste no mesmo arquivo: `createClient('https://supabase-api.avila.ia.br', 'chave-falsa').storage.from('linkhub-link-icons').getPublicUrl('u1/a.png').data.publicUrl`, que começa com o prefixo. O `createClient` vem de `@supabase/supabase-js` e não faz rede.

- [ ] **Passo 2: confirmar a falha** (`npx vitest run src/lib/linkIcons/storagePrefix.test.ts`: falha de import)

- [ ] **Passo 3: implementar**
- `src/lib/linkIcons/storagePrefix.ts`: exporta `LINK_ICONS_BUCKET = 'linkhub-link-icons'`, `getLinkIconsPublicPrefix()` e `LINK_ICONS_PUBLIC_PREFIX`. Sem importar o cliente.
- `src/lib/supabase.ts`: `export { LINK_ICONS_BUCKET } from './linkIcons/storagePrefix';`, ao lado do `AVATARS_BUCKET`.
- `deploy/vpsavila/migrations/2026-10-25-link-icons.sql`, conforme a especificação:
  - começa com `SET lock_timeout = '5s'`;
  - `ALTER TABLE linkhub.links ADD COLUMN IF NOT EXISTS icon_type text NOT NULL DEFAULT 'auto'`, depois `icon_value text` e `accent_color text`;
  - um bloco `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'links_icon_type_check') THEN ALTER TABLE linkhub.links ADD CONSTRAINT … ; END IF; END $$;` para cada uma das três constraints;
  - o bucket com `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('linkhub-link-icons','linkhub-link-icons', true, 524288, ARRAY['image/png','image/webp']) ON CONFLICT (id) DO NOTHING;`;
  - as quatro políticas `linkhub_link_icons_public_read`, `_insert_own`, `_update_own` e `_delete_own`, copiadas das de avatares, cada uma precedida de `DROP POLICY IF EXISTS … ON storage.objects;`;
  - termina com `NOTIFY pgrst, 'reload schema';`.
- `deploy/vpsavila/linkhub_schema.sql`:
  - na tabela `links`, as três colunas e constraints;
  - na seção 7 (Storage), o bucket e as políticas, com título "bucket de ícones dos links (público, 512 KB, PNG e WebP)".
- `src/integrations/supabase/types.ts`, em `links`:
  - `Row`: `accent_color: string | null`, `icon_type: string`, `icon_value: string | null`;
  - `Insert`/`Update`: as mesmas como opcionais;
  - em ordem alfabética, como o resto do arquivo.

- [ ] **Passo 4: conferir o SQL sem servidor**

Leia a migração e confirme que todo comando é idempotente: `IF NOT EXISTS`, blocos `DO` com checagem, `ON CONFLICT` e `DROP POLICY IF EXISTS`. Não há Postgres local; isso é conferido na leitura.

- [ ] **Passo 5: verificação e commit**

Rode `npx tsc --noEmit -p tsconfig.app.json` e `npm test`. Os testes novos são os do `storagePrefix.test.ts`. Mensagem do commit: "Colunas de ícone nos links, bucket linkhub-link-icons e prefixo público".

---

### Tarefa 2: ícones servidos pelo próprio domínio

**Especificação:** seção "Ícones servidos pelo próprio domínio" e Publicação, item 4 (`DEPLOY.md`).

- [ ] **Passo 1: dependências**

`npm install --save-dev --save-exact simple-icons@16.35.0 lucide-static@0.462.0`. Confira no `package.json` que as duas estão em `devDependencies`, sem `^`.

- [ ] **Passo 2: teste das versões (falha)**

`src/lib/linkIcons/vendor.test.ts` (ambiente node). Leia o `package.json` e o script com `readFileSync`, como em `src/utils/mediapipeVersion.test.ts`, e confira:
- `pkg.devDependencies['simple-icons'] === SIMPLE_ICONS_VERSION` e `pkg.devDependencies['lucide-static'] === LUCIDE_STATIC_VERSION`;
- o script contém `const SIMPLE_ICONS_VERSION = '16.35.0'` e `const LUCIDE_STATIC_VERSION = '0.462.0'` (regex);
- `brandIconUrl('youtube') === '/vendor-icons/simple-icons/16.35.0/youtube.svg'` e `brandIconUrl('uniqlo_ja')` não é `null`;
- `brandIconUrl('a")b')`, `brandIconUrl('../x')` e `brandIconUrl('')` são `null`;
- `lucideIconUrl('building-2') === '/vendor-icons/lucide/0.462.0/building-2.svg'` e `lucideIconUrl('-x')` é `null`;
- `BRAND_CATALOG_URL` e `LUCIDE_CATALOG_URL` terminam em `/catalog.json`.

- [ ] **Passo 3: implementar `src/lib/linkIcons/vendor.ts`**

```ts
// Versões fixas: as mesmas do package.json (devDependencies) e de scripts/prepare-icons.mjs
export const SIMPLE_ICONS_VERSION = '16.35.0';
export const LUCIDE_STATIC_VERSION = '0.462.0';

export const BRAND_SLUG_RE = /^[a-z0-9_]+$/;
export const LUCIDE_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const BRAND_BASE = `/vendor-icons/simple-icons/${SIMPLE_ICONS_VERSION}`;
const LUCIDE_BASE = `/vendor-icons/lucide/${LUCIDE_STATIC_VERSION}`;

export const BRAND_CATALOG_URL = `${BRAND_BASE}/catalog.json`;
export const LUCIDE_CATALOG_URL = `${LUCIDE_BASE}/catalog.json`;

export function brandIconUrl(slug: string | null | undefined): string | null {
  return slug && BRAND_SLUG_RE.test(slug) ? `${BRAND_BASE}/${slug}.svg` : null;
}

export function lucideIconUrl(name: string | null | undefined): string | null {
  return name && LUCIDE_NAME_RE.test(name) ? `${LUCIDE_BASE}/${name}.svg` : null;
}
```

- [ ] **Passo 4: `scripts/prepare-icons.mjs`**

Siga o padrão de `scripts/prepare-mediapipe.mjs`: comentário de cabeçalho, `sizeOf`, modo estrito e `SKIP`/`REQUIRE`. Comportamento:
- **Constantes:** `SIMPLE_ICONS_VERSION` e `LUCIDE_STATIC_VERSION`.
- **Versão instalada:** confere o `version` do `package.json` de cada pacote em `node_modules` e avisa se for outra.
- **Simple Icons:**
  - origem: `node_modules/simple-icons/icons/*.svg`; destino: `public/vendor-icons/simple-icons/<versão>/`;
  - o catálogo vem de `node_modules/simple-icons/data/simple-icons.json`, como `[{s, t, h:'#'+hex.toLowerCase(), a?}]`;
  - `a` junta, sem repetir, `aliases.aka`, `aliases.dup[].title`, `Object.values(aliases.loc)` e `aliases.old`, e é omitido se ficar vazio.
- **Lucide:**
  - origem: `node_modules/lucide-static/icons/*.svg`; destino: `public/vendor-icons/lucide/<versão>/`;
  - o catálogo vem de `node_modules/lucide-static/tags.json`, como `[{n, k}]`, só com nomes que tenham SVG, ordenado por nome.
- **"Completo":** existe `.complete`, existe `catalog.json` e a contagem de `.svg` no destino é igual à da origem. Se estiver completo, não copia. Senão, apaga o destino, copia tudo, grava o catálogo e por último o `.complete`.
- **Limpeza:** apaga as pastas irmãs de **outras versões** dentro de `public/vendor-icons/simple-icons/` e `public/vendor-icons/lucide/`.
- **Saída:** `[vendor-icons] simple-icons: N ícones (copiados|em dia)` e o mesmo para o Lucide.
- **Modo estrito:** com `npm_lifecycle_event === 'prebuild'` ou `REQUIRE_VENDOR_ICONS=1`, depois de tentar, se algo continuar incompleto: `process.exitCode = 1` com mensagem clara. `SKIP_VENDOR_ICONS=1` pula tudo.

Em `package.json`:
- `"predev": "node scripts/prepare-mediapipe.mjs && node scripts/prepare-icons.mjs"`;
- `"prebuild": "node scripts/prepare-mediapipe.mjs && node scripts/prepare-icons.mjs"`.

- [ ] **Passo 5: configuração**
- `.gitignore`: `public/vendor-icons/`.
- `vite.config.ts`: `globIgnores: ['**/mediapipe/**', '**/vendor-icons/**']`, com um comentário curto ao lado.
- `deploy/vpsavila/nginx.conf`: `location /vendor-icons/ { try_files $uri =404; add_header Cache-Control "public, max-age=2592000"; }`, logo após o bloco `/mediapipe/`, com um comentário de uma linha.
- `deploy/vpsavila/DEPLOY.md`:
  - **"Publicar"** passa a usar `tar`. É o procedimento da Publicação, item 4, da especificação, com `--format ustar`, `rm -rf html.new && mkdir html.new` antes do `tar -xzf` e a remoção do `.tgz`.
  - **"Conferir"** ganha o `curl` do `youtube.svg`.
  - **Tamanho:** "cerca de 44 MB" passa a "cerca de 50 MB".
  - **Seção nova** "Subir a versão dos ícones (simple-icons / lucide-static)", com o SQL `SELECT DISTINCT icon_value FROM linkhub.links WHERE icon_type = 'brand';` e a instrução de conferir cada slug em `node_modules/simple-icons/icons/` da versão nova antes de publicar.

- [ ] **Passo 6: verificar**
- `npx vitest run src/lib/linkIcons/vendor.test.ts` passa.
- `node scripts/prepare-icons.mjs` copia, e rodar de novo diz "em dia".
- Conferir com PowerShell:
  - contagem de `public/vendor-icons/simple-icons/16.35.0/*.svg` igual à da origem (3466);
  - Lucide com 1541;
  - `catalog.json` existente nas duas pastas;
  - `Test-Path public/vendor-icons/lucide/0.462.0/house.svg` verdadeiro.
- `npm run build` verde. O `dist/sw.js` não menciona `vendor-icons`. Nenhum `dist/assets/*.js` contém o trecho `M23.498 6.186a3.016`, o começo do path do YouTube.
- `npx tsc --noEmit -p tsconfig.app.json` e `npm test`.

- [ ] **Passo 7: commit:** "Ícones de marca e do Lucide servidos pelo próprio domínio".

---

### Tarefa 3: detecção, validação, emoji, catálogos e contagem de cliques

**Especificação:** seções `detect.ts`, `validate.ts`, `emoji.ts`, `getBrandHex` e `formatClicks.ts`.

Um arquivo de teste por módulo, todos em ambiente node, escritos antes da implementação. Os casos mínimos estão na tabela "Testes" da especificação: linhas `detect`, `validate`, `emoji`, `catalog` e `formatClicks`.

- [ ] **Passo 1: `detect.ts` (teste e depois implementação)**

`DETECTION_TABLE` exportada: um array de `{ domains: string[]; kind; value; title; hex }`, na ordem da tabela da especificação, com hex em `#rrggbb` minúsculo. Exporta também:
- `detectIconFromUrl`, `getFaviconUrl` e `getUrlHost`;
- `DETECTED_BRAND_SLUGS`: os 13 slugs `brand` da tabela, na ordem, usados pela grade de marcas com a busca vazia.

Implementação sugerida da normalização:

```ts
function parseHttpUrl(raw: string): URL | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  if (hasScheme && !/^https?:/i.test(trimmed)) return null;
  try {
    const url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
    return url.hostname ? url : null;
  } catch {
    return null;
  }
}

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^(www|m)\./, '');
}
```

O `mailto:` é checado antes, sem diferenciar maiúsculas (`/^mailto:/i`). Uma entrada casa se o host normalizado for igual ao domínio ou terminar em `.${domínio}`.

- [ ] **Passo 2: `catalog.ts` (teste com `fetch` stubado, depois implementação)**

Exporta:
- `loadBrandCatalog(): Promise<BrandEntry[]>`, com `BrandEntry = { s; t; h; a? }`. Faz o `fetch(BRAND_CATALOG_URL)` uma vez e guarda a promessa no módulo; na falha, limpa o cache e rejeita;
- `loadLucideCatalog()`, no mesmo padrão;
- `getBrandHex(slug)`: a tabela de detecção primeiro, depois o mapa slug→hex do catálogo já carregado. Síncrona: sem catálogo carregado, devolve `null`;
- `resetCatalogCacheForTests()`.

O teste confere, com um catálogo de exemplo, que todos os `s` passam em `BRAND_SLUG_RE`.

- [ ] **Passo 3: `validate.ts`**

`isValidIconValue(type, value, { url, uploadPrefix })`:
- `brand`: `BRAND_SLUG_RE`;
- `lucide`: `LUCIDE_NAME_RE`;
- `emoji`: `isSingleEmoji`;
- `favicon`: `getFaviconUrl(url) !== null`;
- `upload`: começa com `uploadPrefix`, e o resto não é vazio nem contém `..`, `?`, `#` ou `\`;
- `auto`: `true`;
- qualquer outro tipo: `false`.

- [ ] **Passo 4: `emoji.ts`**, com a regra exata da especificação, nos dois caminhos.

- [ ] **Passo 5: `src/lib/formatClicks.ts`**

```ts
const numberFormat = new Intl.NumberFormat('pt-BR');

/** "1 clique", "0 cliques", "1.234 cliques". */
export function formatClicks(count: number): string {
  return `${numberFormat.format(count)} ${count === 1 ? 'clique' : 'cliques'}`;
}
```

- [ ] **Passo 6: verificação e commit**

Rode tsc e `npm test`. Mensagem do commit: "Detecção de marca pela URL, validação dos ícones, emoji e plural dos cliques".

---

### Tarefa 4: resolver e desenhar o ícone

**Especificação:** seções `resolve.ts`, "Como desenhar" e `LinkIcon.tsx`.

- [ ] **Passo 1: `resolve.test.ts` (node), com os casos da tabela "Testes"**

Fundos e cores de referência para os testes de contraste:
- botão escuro `#111827` com `defaultColor` `#ffffff`, e `accent_color` `#000000`: dá `#ffffff`;
- dois fundos `['#0b1f3a', '#f8fafc']` com `accent_color` `#ff0000`: o pior contraste cai abaixo de 3, então dá `defaultColor`.

- [ ] **Passo 2: implementar `resolve.ts`**

Use `detect`, `validate`, `vendor` e `getContrastRatio`/`normalizeHex` de `@/utils/linkButtonStyle`. Exporte também `getProfileIconBackgrounds(theme)`:
- botão `solid`: `[resolveButtonColors(theme).bg]`;
- outros estilos, fundo `gradient`: `[colors[0] ?? '#111827', colors[1] ?? '#1f2937']`;
- outros estilos, fundo sólido: `[getBaseBackgroundColor(theme)]`;
- tema `null`: `['#111827']`.

Ela também tem testes.

- [ ] **Passo 3: `LinkIcon.test.tsx` (jsdom)**

Casos da tabela. Para a imagem, use `Object.defineProperty(img, 'naturalWidth', { value: 16, configurable: true })` com `fireEvent.load(img)`, e `fireEvent.error(img)`. Para a máscara, confira `span.style.maskImage` com `url("/vendor-icons/simple-icons/16.35.0/youtube.svg")` e `span.style.backgroundColor`.

- [ ] **Passo 4: implementar `src/components/links/LinkIcon.tsx`**

O componente recebe `uploadPrefix`, que por padrão é `LINK_ICONS_PUBLIC_PREFIX`. Estilo da máscara:

```ts
const maskStyle = (src: string, color: string, size: number): React.CSSProperties => ({
  width: size,
  height: size,
  backgroundColor: color,
  maskImage: `url("${src}")`,
  WebkitMaskImage: `url("${src}")`,
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
});
```

O `src` já vem validado do `vendor.ts`, só com `[a-z0-9_-]`, então as aspas não podem ser quebradas. Classe: `link-icon-mask inline-block shrink-0`.

Em `src/index.css`, dentro de `@layer components`, acrescente o `@media (forced-colors: active)` da especificação.

- [ ] **Passo 5: verificação e commit**

Rode tsc e `npm test`. Mensagem do commit: "Resolução e desenho do ícone dos links".

---

### Tarefa 5: ícone novo na página pública e na prévia

**Especificação:** seção "Onde muda", item `ProfileView`.

- [ ] **Passo 1: testes (falham)**

Em `ProfileView.test.tsx`, acrescente:
- link `https://youtube.com/@x` com `theme` do arquivo: o botão contém um `span.link-icon-mask` cuja `style.maskImage` cita `youtube.svg`;
- link `https://example.org`: o botão contém `img` com `src` do `s2/favicons` e `domain=example.org`;
- link `https://x.com/dna` com `accent_color: '#000000'` e tema de botão sólido escuro (`buttonStyle: { type: 'solid', color: '#111827' }`): a máscara usa a cor do texto do botão, e não `#000000`.

Em `ProfilePreview.test.tsx`, o mock de links passa a ter `url: 'https://youtube.com/@x'`, e um teste confere a máscara do YouTube na prévia.

- [ ] **Passo 2: implementar**

No `ProfileView.tsx`:
- troque o import de `getLinkIcon` por `LinkIcon` e `getProfileIconBackgrounds`;
- `ProfileViewLink` ganha `icon_type?: string | null`, `icon_value?: string | null` e `accent_color?: string | null`;
- no botão, troque `<Icon className="h-6 w-6" />` por `<LinkIcon link={link} size={20} defaultColor={buttonTextColor} backgrounds={iconBackgrounds} />`. `buttonTextColor` vem de `resolveButtonColors(theme ?? { colors: { text: '#ffffff' } }).text`; `iconBackgrounds = getProfileIconBackgrounds(theme)`, calculado uma vez fora do `map`.

Depois, remova `src/components/profile/linkIcons.tsx` e confirme com busca que não sobrou import (`getLinkIcon`, `ICON_MAP`, `profile/linkIcons`).

- [ ] **Passo 3: verificação e commit**

Rode tsc, `npm test` e `npm run build`. Mensagem do commit: "Ícone novo dos links na página pública e na prévia".

---

### Tarefa 6: armazenamento dos ícones enviados

**Especificação:** seção `storage.ts`.

- [ ] **Passo 1: `storage.test.ts` (jsdom, por causa do `DOMParser` e do `FileReader`)**

Casos da tabela. Para `rasterizeSvgToPng`:
- `vi.stubGlobal` ou `Object.defineProperty` em `URL.createObjectURL`/`revokeObjectURL`;
- `loadImage` injetado, que devolve um objeto `{ width: 256, height: 128 }`;
- `HTMLCanvasElement.prototype.getContext` e `toBlob` simulados, como em `src/utils/cropImage.test.ts`;
- conferir o tamanho do canvas (256 × 128 para `viewBox="0 0 200 100"`), que o `revokeObjectURL` é chamado e o tipo `image/png`.

- [ ] **Passo 2: implementar `src/lib/linkIcons/storage.ts`**

Exporta:
- `linkIconPathFromUrl`, `validateIconFile`, `getSvgAspect`, `prepareSvgForRaster` e `rasterizeSvgToPng`;
- `prepareIconUpload(file): Promise<{ blob: Blob; ext: 'png' | 'webp'; contentType: string }>`, que junta validação, conversão do SVG e redução para 256 px com `scaleCanvas` e `canvasToBlob`.

`readFileAsText(file)` usa `FileReader`.

- [ ] **Passo 3: verificação e commit**

Rode tsc e `npm test`. Mensagem do commit: "Validação, conversão de SVG e caminhos dos ícones enviados".

---

### Tarefa 7: modal de adicionar e lista do painel

**Especificação:** seções `AddLinkDialog.tsx`, "Card da lista do painel" e `LinksTab.tsx`.

- [ ] **Passo 1: testes (falham)**
- `src/components/dashboard/links/AddLinkDialog.test.tsx` (jsdom): os casos da tabela. Props sugeridas: `open`, `onOpenChange`, `onAdd(data: { title: string; url: string })`. O insert fica no `LinksTab`, então o teste confere a chamada de `onAdd` com o título final e a URL limpa.
- `src/components/dashboard/LinksTab.test.tsx` (jsdom). Mocks como no `SettingsTab.test.tsx`:
  - `@/lib/supabase`, com `from('links')` e cadeia `select/eq/order` que devolve 3 links (com 0, 1 e 2 cliques, e um deles com `icon_type: 'upload'`), `delete/eq` e `storage.from(...).remove`;
  - `@/contexts/AuthContext`, `@/hooks/use-toast` e `@/hooks/useAutosave`.

  O teste confere:
  - os badges "0 cliques", "1 clique" e "2 cliques";
  - o quadrado branco do ícone em cada card;
  - excluir o link com upload chama `storage.from('linkhub-link-icons').remove([caminho])` depois do `delete`;
  - o botão "Adicionar Link" abre o modal sem a grade de tipos.

- [ ] **Passo 2: implementar**
- `AddLinkDialog.tsx`, com o título automático da especificação (estado `titleTouched`).
- No `LinksTab.tsx`:
  - remova `LINK_TYPES`, `selectedLinkType` e `selectLinkType`, e os imports que sobrarem (`Instagram`, `Youtube` e os outros, mais as imagens);
  - use o `AddLinkDialog`, com o insert de `icon_type: 'auto'`;
  - no `SortableLink`, o quadrado de 28 px com `<LinkIcon size={18} defaultColor="#1f2937" backgrounds={['#ffffff']} …/>` e o badge com `formatClicks`;
  - `handleDeleteLink` apaga o arquivo se `icon_type === 'upload'`, com `linkIconPathFromUrl`;
  - a interface `Link` ganha as três colunas;
  - o modal de edição atual fica até a tarefa 9.

- [ ] **Passo 3: verificação e commit**

Rode tsc, `npm test` e `npm run build`. Mensagem do commit: "Adicionar link só com URL e título, ícone na lista e plural dos cliques".

---

### Tarefa 8: seletores de ícone e de cor

**Especificação:** seções `IconPicker.tsx` e `AccentColorPicker.tsx`.

Os dois componentes são **controlados**: recebem o valor atual e chamam `onChange`, sem tocar no banco. A gravação é da tarefa 9.

- `IconPicker` props:
  - `url`, `iconType`, `iconValue`, `userId`, `linkId` e `disabled`;
  - `onChange({ icon_type, icon_value })`;
  - `onUpload(file: File): Promise<void>`. O upload em si fica no `EditLinkDialog`; o picker só valida e repassa.
- `AccentColorPicker` props: `url`, `iconType`, `iconValue`, `accentColor`, `disabled` e `onChange(color | null)`.

- [ ] **Passo 1: testes (falham)**

`IconPicker.test.tsx` e `AccentColorPicker.test.tsx` (jsdom), com os casos da tabela:
- `fetch` stubado com um catálogo pequeno que inclui `youtube`, `snapchat` (`#fffc00`) e uma marca com apelido;
- abas com `fireEvent.mouseDown`;
- busca com `vi.useFakeTimers()` e `vi.advanceTimersByTime(200)` para o debounce;
- Snapchat na grade aparece em `#1f2937`;
- a lista fixa do Lucide é conferida contra um catálogo de teste que tenha os 24 nomes;
- arquivo de 600 KB recusado; `.gif` recusado;
- o upload de SVG chama `onUpload` com o `File` original. A conversão é testada na tarefa 6, e o `EditLinkDialog` chama `prepareIconUpload`.

- [ ] **Passo 2: implementar** os dois componentes, com:
- `aria-live`, `aria-pressed` e o quadrado branco em todas as grades;
- "Automático (pela URL)";
- avisos de URL sem site;
- `getBrandHex` e `loadBrandCatalog` do `catalog.ts`.

- [ ] **Passo 3: verificação e commit**

Rode tsc e `npm test`. Mensagem do commit: "Seletores de ícone e de cor de destaque dos links".

---

### Tarefa 9: modal de edição com gravação imediata

**Especificação:** seção `EditLinkDialog.tsx`.

- [ ] **Passo 1: testes (falham)**

`EditLinkDialog.test.tsx` (jsdom). Mocks:
- `supabase.from('links').update(...).eq(...)`: grava e devolve `{ error }` controlável;
- `supabase.storage.from(...).upload/remove/getPublicUrl`;
- `useAutosave`: guarda o callback, como no `SettingsTab.test.tsx`;
- `prepareIconUpload`: simulado.

Casos da tabela, incluindo:
- a ordem `upload` → `update` → `remove` antigo, conferida com `mock.invocationCallOrder`;
- falha do `update` apaga o arquivo novo e mostra o toast;
- cor oficial acompanha a troca de marca (YouTube `#ff0000` → Instagram `#ff0069`) no mesmo `update`;
- trocar a URL de `auto` só ajusta a cor dentro do salvamento automático.

- [ ] **Passo 2: implementar** o `EditLinkDialog.tsx` e trocar o modal de edição do `LinksTab` por ele. O `LinksTab` só controla `open` e `link` e recarrega a lista no `onSaved`.

- [ ] **Passo 3: verificação e commit**

Rode tsc, `npm test` e `npm run build`. Mensagem do commit: "Edição do link com ícone e cor gravados na hora".

---

### Tarefa 10: página de privacidade

- [ ] **Passo 1:** em `src/pages/Privacy.tsx`, na seção "2. Uso dos Dados", acrescente um parágrafo com o texto da especificação e troque "Fevereiro 2026" por "Outubro 2026".

- [ ] **Passo 2:** rode `npm test` e `npm run build` e faça o commit "Privacidade: favicons dos links pelo serviço do Google".

---

### Tarefa 11: verificação, migração e deploy

Feita pelo agente principal, seguindo a seção "Publicação" da especificação, nesta ordem:
1. `npm test`, tsc e build, com as conferências do bundle.
2. Migração: `scp` e `psql`, e depois:
   - `SELECT icon_type, count(id) FROM linkhub.links GROUP BY 1`: todos `auto`;
   - conferir que o bucket existe com 524288 e `{image/png,image/webp}`.
3. Publicação com `tar`, pelo `DEPLOY.md` novo, e o `curl` do `youtube.svg`.
4. Navegador, com o login do Daniel:
   - perfil público e prévia;
   - modal de adicionar detectando ao colar (sem salvar, ou salvando um link de teste);
   - edição completa num link de teste, apagado no fim junto com o arquivo enviado;
   - conferir no banco e no bucket que nada sobrou do teste.
5. Commit final, se algo mudou. Push só a pedido do Daniel.
