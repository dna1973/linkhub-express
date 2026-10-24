# Remover o fundo da foto do avatar — plano de implementação

> **Para agentes executores:** sub-skill obrigatória: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa por tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** o dono do perfil remove o fundo da foto do avatar no próprio navegador, sem custo e sem enviar a imagem a terceiros, e escolhe o que fica atrás da pessoa: transparente ou uma cor sólida. Funciona na janela de recorte da aba Perfil e num botão "Remover fundo" para a foto atual.

**Arquitetura:** o MediaPipe Image Segmenter (`@mediapipe/tasks-vision` 1.1.1, modelo `selfie_multiclass_256x256`) roda no navegador. O motor WASM e o modelo são servidos pelo próprio domínio, em `/mediapipe/1.1.1/...`, preparados por `scripts/prepare-mediapipe.mjs` (`predev`/`prebuild`), fora do git e fora do pré-cache do PWA. O pacote JS só é importado sob demanda, em `src/utils/backgroundRemoval.ts`, que também tem a composição pura dos pixels (`composeWithoutBackground`). As operações de canvas do recorte saem do componente para `src/utils/cropImage.ts`, que os testes simulam. A janela de recorte ganha o interruptor, a miniatura e "Atrás da pessoa"; a aba Perfil passa a subir PNG quando o fundo é removido, ganha o botão da foto atual e corrige o bucket do "Remover".

**Stack:** React 18, Vite 5, TypeScript (`strict: false`), shadcn/ui, Zustand, Supabase, Vitest 2 com Testing Library e jsdom, vite-plugin-pwa 1.2.0, `@mediapipe/tasks-vision` 1.1.1.

**Especificação:** `docs/superpowers/specs/2026-10-24-remover-fundo-avatar-design.md`

**Convenções do ambiente (Windows):**
- Os comandos rodam no PowerShell, na raiz do repositório.
- `ssh` perde aspas duplas internas: use aspas simples por fora.
- Cada commit termina com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Responda e escreva commits em português.
- Vários arquivos estão com CRLF na cópia de trabalho (`core.autocrlf=true`), entre eles `ImageCropDialog.tsx`, `SettingsTab.tsx`, `.gitignore` e `deploy/vpsavila/nginx.conf`. As trocas de trecho deste plano valem pelo texto; a ferramenta Edit cuida do final de linha.
- Se o `npm test` falhar com `Error: UNKNOWN: unknown error, open '...\ssr\...'` (ou `...\web\...`) e mostrar menos arquivos de teste que o esperado, é falha intermitente do cache temporário do Vitest no Windows, não do código: rode de novo. Só conte a contagem de referência de uma execução sem esse erro, conferindo o número de **arquivos**.
- Push não faz parte de nenhuma tarefa.
- O primeiro `npm run dev` ou `npm run build` depois da Tarefa 1 baixa o modelo (15,6 MB) uma vez, para `public/mediapipe/`. Sem internet, o build não quebra: só avisa no console.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `package.json`, `package-lock.json` | Modificar | `@mediapipe/tasks-vision` `1.1.1` fixo; `predev` e `prebuild` |
| `scripts/prepare-mediapipe.mjs` | Criar | Copia as duas variantes do motor e baixa o modelo para `public/mediapipe/1.1.1/` |
| `.gitignore` | Modificar | `public/mediapipe/` fora do git |
| `vite.config.ts` | Modificar | `workbox.globIgnores: ['**/mediapipe/**']` |
| `deploy/vpsavila/nginx.conf` | Modificar | `location /mediapipe/` com 30 dias de cache e `application/wasm` no `gzip_types` |
| `src/utils/backgroundRemoval.ts` | Criar | Caminhos versionados, `loadSegmenter`, `getBackgroundConfidence`, `composeWithoutBackground`, `removeBackground`, `AVATAR_MAX_SIZE` |
| `src/utils/backgroundRemoval.test.ts` | Criar | Composição pura, carregamento com cache e nova tentativa, `close()` do resultado |
| `src/utils/cropImage.ts` | Criar | `getCroppedCanvas`, `scaleCanvas`, `canvasToBlob` (tirados do `ImageCropDialog`) |
| `src/utils/cropImage.test.ts` | Criar | Redução sem ampliar e rejeição do `toBlob` nulo |
| `src/components/dashboard/ImageCropDialog.tsx` | Modificar (T3) e reescrever (T4) | T3: usa `cropImage.ts`, sem mudar o comportamento. T4: interruptor, miniatura, "Atrás da pessoa", PNG com remoção |
| `src/components/dashboard/ImageCropDialog.test.tsx` | Criar | Carregamento, falhas, JPEG/PNG, `initialRemoveBackground`, atalhos |
| `src/components/dashboard/SettingsTab.tsx` | Modificar | Extensão e tipo pelo blob, botão "Remover fundo", `themeColors`, bucket certo no "Remover" |
| `src/components/dashboard/SettingsTab.test.tsx` | Criar | Botão da foto atual, falhas do `fetch`, `.png`/`.jpg`, bucket do "Remover" |

Testes existentes não são tocados e continuam passando, em especial `ProfilePreview.test.tsx`, `AppSidebar.test.tsx`, `AppSidebar.desktop.test.tsx` e `DeviceFrame.test.tsx`. Nenhum deles importa os arquivos alterados.

Contagem de referência de `npm test` (arquivos / testes) ao fim de cada tarefa: antes 15/176; T1 15/176; T2 16/189; T3 17/194; T4 18/203; T5 19/210.

---

### Tarefa 1: dependência, arquivos do MediaPipe no próprio domínio, PWA e nginx

**Arquivos:**
- Modificar: `package.json` e `package-lock.json` (pelo `npm install` e pelos scripts)
- Criar: `scripts/prepare-mediapipe.mjs`
- Modificar: `.gitignore`, `vite.config.ts` (bloco `workbox`), `deploy/vpsavila/nginx.conf`

- [ ] **Passo 1: instalar a dependência com versão fixa**

```powershell
npm install --save-exact @mediapipe/tasks-vision@1.1.1
Select-String -Path package.json -Pattern 'tasks-vision'
```

Esperado: a linha `"@mediapipe/tasks-vision": "1.1.1",`, sem `^`. O pacote traz `node_modules/@mediapipe/tasks-vision/wasm/` com seis arquivos; só quatro serão servidos.

- [ ] **Passo 2: criar o script que prepara motor e modelo**

Crie `scripts/prepare-mediapipe.mjs`:

```js
// Prepara os arquivos do MediaPipe que o próprio domínio serve para a remoção de fundo do avatar:
// o motor WASM (copiado de node_modules) e o modelo de segmentação (baixado uma vez).
//
// Roda sozinho antes de `npm run dev` ("predev") e de `npm run build` ("prebuild").
// O `npm run build:dev` (vite build --mode development) NÃO aciona o "prebuild": se precisar dele,
// rode `node scripts/prepare-mediapipe.mjs` antes.
//
// Nunca derruba o build: se algo falhar, avisa no console e a remoção de fundo só fica indisponível no app.
import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

// Mesma versão do package.json (sem ^) e de MEDIAPIPE_VERSION em src/utils/backgroundRemoval.ts
const VERSION = '1.1.1';
const WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];
const MODEL_NAME = 'selfie_multiclass_256x256.tflite';
const MODEL_SIZE = 16371837;
const MODEL_URL = `https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/${MODEL_NAME}`;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageDir = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision');
const targetDir = path.join(root, 'public', 'mediapipe', VERSION);

async function sizeOf(file) {
  try {
    return (await stat(file)).size;
  } catch {
    return null;
  }
}

async function checkInstalledVersion() {
  try {
    const pkg = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
    if (pkg.version !== VERSION) {
      console.warn(`[mediapipe] node_modules tem @mediapipe/tasks-vision ${pkg.version}, mas o script espera ${VERSION}. Atualize VERSION aqui e em src/utils/backgroundRemoval.ts.`);
    }
  } catch {
    console.warn('[mediapipe] @mediapipe/tasks-vision não está instalado. Rode npm install.');
  }
}

async function copyWasm() {
  const sourceDir = path.join(packageDir, 'wasm');
  const destDir = path.join(targetDir, 'wasm');
  await mkdir(destDir, { recursive: true });
  let copied = 0;
  for (const name of WASM_FILES) {
    const source = path.join(sourceDir, name);
    const dest = path.join(destDir, name);
    const sourceSize = await sizeOf(source);
    if (sourceSize === null) throw new Error(`arquivo ausente em node_modules: ${name}`);
    // Só copia se faltar ou se o tamanho mudou: evita recopiar ~26 MB a cada npm run dev
    if ((await sizeOf(dest)) === sourceSize) continue;
    await copyFile(source, dest);
    copied += 1;
  }
  console.log(`[mediapipe] motor: ${copied} arquivo(s) copiado(s), ${WASM_FILES.length - copied} já em dia.`);
}

async function moveFile(from, to) {
  try {
    await rename(from, to);
  } catch (error) {
    // Pasta temporária em outro disco: rename não atravessa sistemas de arquivos
    if (error.code !== 'EXDEV') throw error;
    await copyFile(from, to);
    await rm(from, { force: true });
  }
}

async function downloadModel() {
  const destDir = path.join(targetDir, 'models');
  const dest = path.join(destDir, MODEL_NAME);
  if ((await sizeOf(dest)) === MODEL_SIZE) {
    console.log('[mediapipe] modelo já baixado.');
    return;
  }

  // Baixa fora de public/: um download interrompido não pode virar arquivo corrompido nem subir no dist
  const temp = path.join(os.tmpdir(), `linkhub-${MODEL_NAME}.${process.pid}.part`);
  console.log(`[mediapipe] baixando o modelo (${(MODEL_SIZE / 1024 / 1024).toFixed(1)} MB)...`);
  try {
    // 60 s: numa rede com proxy que segura a conexão, o npm run dev não fica preso por minutos
  const response = await fetch(MODEL_URL, { signal: AbortSignal.timeout(60 * 1000) });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temp));
    const size = await sizeOf(temp);
    if (size !== MODEL_SIZE) throw new Error(`tamanho ${size}, esperado ${MODEL_SIZE}`);
    await mkdir(destDir, { recursive: true });
    await rm(dest, { force: true });
    await moveFile(temp, dest);
    console.log('[mediapipe] modelo pronto.');
  } finally {
    await rm(temp, { force: true });
  }
}

async function main() {
  // SKIP_MEDIAPIPE=1 pula cópia e download (máquina sem internet ou build rápido); a remoção de fundo fica indisponível
  if (process.env.SKIP_MEDIAPIPE === '1') {
    console.log('[mediapipe] SKIP_MEDIAPIPE=1: pulando preparo do MediaPipe.');
    return;
  }
  await checkInstalledVersion();
  try {
    await copyWasm();
  } catch (error) {
    console.warn(`[mediapipe] não foi possível copiar o motor: ${error.message}. A remoção de fundo ficará indisponível.`);
  }
  try {
    await downloadModel();
  } catch (error) {
    console.warn(`[mediapipe] não foi possível baixar o modelo: ${error.message}. A remoção de fundo ficará indisponível.`);
  }
}

await main();
```

Decisões do script:
- Copia só `vision_wasm_internal.{js,wasm}` e `vision_wasm_nosimd_internal.{js,wasm}`. O `FilesetResolver.forVisionTasks(base)` da 1.1.1 monta `${base}/vision_wasm_internal.js` ou, sem SIMD, `${base}/vision_wasm_nosimd_internal.js`; a variante `_module_` só serve com `useModule` e fica de fora.
- Cada arquivo só é copiado se faltar ou se o tamanho for diferente.
- O modelo é baixado da URL de versão fixa (`/float32/1/`) para `os.tmpdir()` e só vai para `public/` se tiver exatamente 16.371.837 bytes. O temporário é apagado em qualquer caso (`finally`), e o `rename` cai para cópia se a pasta temporária estiver em outro disco (`EXDEV`).
- Qualquer falha vira aviso no console e o processo termina com código 0: o build segue e a remoção de fundo só fica indisponível no app.

- [ ] **Passo 3: ligar o script ao `dev` e ao `build`**

Em `package.json`, troque:

```json
    "dev": "vite",
    "build": "vite build",
```

por:

```json
    "predev": "node scripts/prepare-mediapipe.mjs",
    "dev": "vite",
    "prebuild": "node scripts/prepare-mediapipe.mjs",
    "build": "vite build",
```

O `build:dev` não aciona o `prebuild`; isso está registrado no comentário do script.

- [ ] **Passo 4: tirar os ~43 MB do git**

Em `.gitignore`, troque:

```
dist
dist-ssr
*.local
```

por:

```
dist
dist-ssr
*.local

# Motor e modelo do MediaPipe, preparados por scripts/prepare-mediapipe.mjs
public/mediapipe/
```

- [ ] **Passo 5: tirar o MediaPipe do pré-cache do PWA**

Em `vite.config.ts`, troque:

```ts
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}'],
```

por:

```ts
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,woff,woff2}'],
        // Motor e modelo da remoção de fundo (~43 MB): carregados sob demanda, nunca no pré-cache
        globIgnores: ['**/mediapipe/**'],
```

Sem isso, os loaders `vision_wasm_*.js` (334 KB cada) entrariam no pré-cache pelo `**/*.js`. O pedaço JS do pacote (`assets/vision_bundle-*.js`, ~145 KB, 44 KB com gzip) é código do app dividido pelo Vite e continua no pré-cache, como os demais pedaços de `assets/`.

- [ ] **Passo 6: nginx**

Em `deploy/vpsavila/nginx.conf`, troque:

```nginx
    gzip_types text/plain text/css text/javascript application/javascript application/json application/manifest+json image/svg+xml;
```

por:

```nginx
    gzip_types text/plain text/css text/javascript application/javascript application/json application/manifest+json image/svg+xml application/wasm;
```

E, no mesmo arquivo, troque:

```nginx
    # PWA: service worker e manifest nunca podem ficar presos em cache
```

por:

```nginx
    # Motor e modelo da remoção de fundo. A versão está no caminho (/mediapipe/1.1.1/...): 30 dias de cache.
    # Sem bloco types aqui: o mime.types do nginx 1.27 já tem application/wasm, e um bloco types
    # substituiria todos os outros tipos. O .tflite comprime pouco e fica fora do gzip_types.
    location /mediapipe/ {
        try_files $uri =404;
        add_header Cache-Control "public, max-age=2592000";
    }

    # PWA: service worker e manifest nunca podem ficar presos em cache
```

O `try_files $uri =404` impede que um arquivo ausente caia no fallback do SPA (`location /` devolveria o `index.html` com 200, e o MediaPipe tentaria ler HTML como WASM). Nenhuma das `location` com expressão regular do arquivo casa com `/mediapipe/1.1.1/...`.

- [ ] **Passo 7: rodar o script duas vezes**

```powershell
node scripts/prepare-mediapipe.mjs
node scripts/prepare-mediapipe.mjs
Get-ChildItem -Recurse -File public/mediapipe | Select-Object Length, FullName
git status --short
```

Esperado na primeira execução: `motor: 4 arquivo(s) copiado(s), 0 já em dia.`, `baixando o modelo (15.6 MB)...` e `modelo pronto.`. Na segunda: `motor: 0 arquivo(s) copiado(s), 4 já em dia.` e `modelo já baixado.`. A listagem mostra cinco arquivos: `selfie_multiclass_256x256.tflite` com 16371837, `vision_wasm_internal.js` com 334128, `vision_wasm_internal.wasm` com 13519922, `vision_wasm_nosimd_internal.js` com 333931 e `vision_wasm_nosimd_internal.wasm` com 12627509. O `git status` não cita `public/mediapipe`.

Se aparecer `não foi possível baixar o modelo`, confira a rede e rode de novo; não siga sem o modelo.

- [ ] **Passo 8: tipos, testes, build e conferência do `dist`**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
Get-ChildItem -Recurse -File dist/mediapipe | Select-Object Length, FullName
Select-String -Path dist/sw.js -Pattern 'mediapipe' -Quiet
```

Esperado: tsc sem saída; 15 arquivos e 176 testes; o build começa com `> node scripts/prepare-mediapipe.mjs` (motor e modelo já em dia) e termina com `✓ built in` e `precache  44 entries`; o `dist/mediapipe` tem os mesmos cinco arquivos do passo 7 (só as duas variantes do motor, sem `_module_`); o `Select-String` responde `False`.

- [ ] **Passo 9: commit**

```powershell
git add package.json package-lock.json scripts/prepare-mediapipe.mjs .gitignore vite.config.ts deploy/vpsavila/nginx.conf
git commit -m "Serve o motor e o modelo do MediaPipe pelo próprio domínio" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 2: módulo de remoção de fundo

**Arquivos:**
- Criar: `src/utils/backgroundRemoval.ts`
- Teste: `src/utils/backgroundRemoval.test.ts`

API real conferida nos tipos instalados (`node_modules/@mediapipe/tasks-vision/vision.d.ts`): `FilesetResolver.forVisionTasks(basePath?: string, useModule?: boolean): Promise<WasmFileset>`, `ImageSegmenter.createFromOptions(wasmFileset, options)`, `segment(image): ImageSegmenterResult` (sem callback, no modo `IMAGE`), `result.confidenceMasks?: MPMask[]`, `result.close()`, e `MPMask` com `width`, `height` e `getAsFloat32Array()`. Os rótulos do modelo são `background`, `hair`, `body-skin`, `face-skin`, `clothes` e `others`: a máscara 0 é o fundo.

- [ ] **Passo 1: escrever os testes que falham**

Crie `src/utils/backgroundRemoval.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImageSegmenter } from '@mediapipe/tasks-vision';
import {
  MEDIAPIPE_MODEL_URL,
  MEDIAPIPE_WASM_BASE,
  composeWithoutBackground,
  getBackgroundConfidence,
  loadSegmenter,
  resetSegmenterForTests,
  type PixelBuffer,
} from './backgroundRemoval';

const mediapipe = vi.hoisted(() => ({
  forVisionTasks: vi.fn(),
  createFromOptions: vi.fn(),
}));

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: mediapipe.forVisionTasks },
  ImageSegmenter: { createFromOptions: mediapipe.createFromOptions },
}));

/** Buffer de 1 linha com os pixels dados ([r, g, b, a] cada). */
function row(...pixels: number[][]): PixelBuffer {
  return { data: new Uint8ClampedArray(pixels.flat()), width: pixels.length, height: 1 };
}

function pixel(buffer: PixelBuffer, index: number): number[] {
  return Array.from(buffer.data.slice(index * 4, index * 4 + 4));
}

describe('composeWithoutBackground', () => {
  const background = (...conf: number[]) => ({ mask: new Float32Array(conf), width: conf.length, height: 1 });

  it('fundo certo (conf = 1): transparente sem cor, ou a cor com alfa 255', () => {
    const image = row([10, 20, 30, 255]);
    expect(pixel(composeWithoutBackground(image, background(1), null), 0)).toEqual([10, 20, 30, 0]);
    expect(pixel(composeWithoutBackground(image, background(1), '#FF0000'), 0)).toEqual([255, 0, 0, 255]);
  });

  it('pessoa certa (conf = 0): pixel intacto, com ou sem cor', () => {
    const image = row([10, 20, 30, 200]);
    expect(pixel(composeWithoutBackground(image, background(0), null), 0)).toEqual([10, 20, 30, 200]);
    expect(pixel(composeWithoutBackground(image, background(0), '#ff0000'), 0)).toEqual([10, 20, 30, 255]);
  });

  it('borda (conf = 0.5): alfa e mistura pela metade', () => {
    const image = row([0, 0, 0, 255]);
    expect(pixel(composeWithoutBackground(image, background(0.5), null), 0)).toEqual([0, 0, 0, 128]);
    expect(pixel(composeWithoutBackground(image, background(0.5), '#c8c8c8'), 0)).toEqual([100, 100, 100, 255]);
  });

  it('suaviza só entre 0,35 e 0,65', () => {
    const image = row([0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255], [0, 0, 0, 255]);
    const out = composeWithoutBackground(image, background(0.3, 0.4, 0.6, 0.7), null);
    // 1 - conf: 0.7 -> 1; 0.6 -> smoothstep(0.35, 0.65, 0.6); 0.4 -> simétrico; 0.3 -> 0
    const t = (0.6 - 0.35) / 0.3;
    const edge = Math.round(255 * t * t * (3 - 2 * t));
    expect([3, 2, 1, 0].map((i) => pixel(out, i)[3])).toEqual([0, 255 - edge, edge, 255]);
  });

  it('cor inválida vale como transparente', () => {
    const image = row([10, 20, 30, 255]);
    expect(pixel(composeWithoutBackground(image, background(1), 'vermelho'), 0)).toEqual([10, 20, 30, 0]);
    expect(pixel(composeWithoutBackground(image, background(1), ''), 0)).toEqual([10, 20, 30, 0]);
  });

  it('máscara de outro tamanho: vizinho mais próximo', () => {
    // Imagem 4×1, máscara 2×1: pixels 0 e 1 usam a máscara 0 (pessoa); 2 e 3 usam a 1 (fundo)
    const image = row([1, 1, 1, 255], [2, 2, 2, 255], [3, 3, 3, 255], [4, 4, 4, 255]);
    const out = composeWithoutBackground(image, background(0, 1), null);
    expect([0, 1, 2, 3].map((i) => pixel(out, i)[3])).toEqual([255, 255, 0, 0]);
  });

  it('não altera a entrada e devolve buffer novo do mesmo tamanho', () => {
    const image = row([10, 20, 30, 255], [40, 50, 60, 255]);
    const before = Array.from(image.data);
    const out = composeWithoutBackground(image, background(1, 1), '#ffffff');
    expect(Array.from(image.data)).toEqual(before);
    expect(out.data).not.toBe(image.data);
    expect(out.width).toBe(2);
    expect(out.height).toBe(1);
  });
});

describe('loadSegmenter', () => {
  beforeEach(() => {
    resetSegmenterForTests();
    mediapipe.forVisionTasks.mockReset();
    mediapipe.createFromOptions.mockReset();
  });

  it('usa os caminhos locais versionados e as opções da especificação', async () => {
    const fileset = { wasmLoaderPath: 'x', wasmBinaryPath: 'y' };
    const segmenter = { segment: vi.fn() };
    mediapipe.forVisionTasks.mockResolvedValue(fileset);
    mediapipe.createFromOptions.mockResolvedValue(segmenter);

    await expect(loadSegmenter()).resolves.toBe(segmenter);
    expect(MEDIAPIPE_WASM_BASE).toBe('/mediapipe/1.1.1/wasm');
    expect(MEDIAPIPE_MODEL_URL).toBe('/mediapipe/1.1.1/models/selfie_multiclass_256x256.tflite');
    expect(mediapipe.forVisionTasks).toHaveBeenCalledWith('/mediapipe/1.1.1/wasm');
    expect(mediapipe.createFromOptions).toHaveBeenCalledWith(fileset, {
      baseOptions: { modelAssetPath: '/mediapipe/1.1.1/models/selfie_multiclass_256x256.tflite', delegate: 'CPU' },
      runningMode: 'IMAGE',
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    });
  });

  it('a segunda chamada reaproveita o segmentador', async () => {
    mediapipe.forVisionTasks.mockResolvedValue({});
    mediapipe.createFromOptions.mockResolvedValue({ segment: vi.fn() });

    const first = await loadSegmenter();
    const second = await loadSegmenter();
    expect(second).toBe(first);
    expect(mediapipe.createFromOptions).toHaveBeenCalledTimes(1);
  });

  it('depois de uma falha, a próxima chamada tenta de novo', async () => {
    mediapipe.forVisionTasks.mockRejectedValueOnce(new Error('sem rede')).mockResolvedValue({});
    const segmenter = { segment: vi.fn() };
    mediapipe.createFromOptions.mockResolvedValue(segmenter);

    await expect(loadSegmenter()).rejects.toThrow('sem rede');
    await expect(loadSegmenter()).resolves.toBe(segmenter);
    expect(mediapipe.forVisionTasks).toHaveBeenCalledTimes(2);
  });
});

describe('getBackgroundConfidence', () => {
  const source = {} as HTMLCanvasElement;

  function fakeSegmenter(result: unknown) {
    return { segment: vi.fn(() => result) } as unknown as ImageSegmenter;
  }

  it('copia a máscara 0 (fundo), lê o tamanho dela e libera o resultado', () => {
    const data = new Float32Array([0.1, 0.9]);
    const close = vi.fn();
    const segmenter = fakeSegmenter({
      confidenceMasks: [
        { getAsFloat32Array: () => data, width: 2, height: 1 },
        { getAsFloat32Array: () => new Float32Array([0.9, 0.1]), width: 2, height: 1 },
      ],
      close,
    });

    const background = getBackgroundConfidence(segmenter, source);
    expect(segmenter.segment).toHaveBeenCalledWith(source);
    expect(Array.from(background.mask)).toEqual([data[0], data[1]]);
    expect(background.mask).not.toBe(data);
    expect(background.width).toBe(2);
    expect(background.height).toBe(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('chama close mesmo quando a leitura falha', () => {
    const close = vi.fn();
    const segmenter = fakeSegmenter({
      confidenceMasks: [
        {
          getAsFloat32Array: () => {
            throw new Error('falha na GPU');
          },
          width: 2,
          height: 1,
        },
      ],
      close,
    });

    expect(() => getBackgroundConfidence(segmenter, source)).toThrow('falha na GPU');
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('sem máscara de confiança: erro e close', () => {
    const close = vi.fn();
    expect(() => getBackgroundConfidence(fakeSegmenter({ close }), source)).toThrow();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
```

Contas do teste "suaviza só entre 0,35 e 0,65": com `conf = 0.4`, `1 - conf = 0.6`, `t = 5/6` e `smoothstep = 200/216`, alfa `round(255 × 0,926) = 236`; com `conf = 0.6`, o simétrico, 19. O `Float32Array` guarda 0,4 e 0,6 com erro na 8ª casa, que não muda o arredondamento.

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/utils/backgroundRemoval.test.ts`.
Esperado: FAIL com `Failed to load url ./backgroundRemoval ... Does the file exist?` e `no tests`.

- [ ] **Passo 3: implementar**

Crie `src/utils/backgroundRemoval.ts`:

```ts
import type { ImageSegmenter } from '@mediapipe/tasks-vision';
import { normalizeHex } from '@/utils/linkButtonStyle';

/*
 * Remoção do fundo do avatar no próprio navegador, com o MediaPipe Image Segmenter.
 * Nada do MediaPipe é importado no topo: o pacote só é carregado quando o usuário liga "Remover fundo".
 * O motor e o modelo são servidos pelo próprio domínio (scripts/prepare-mediapipe.mjs), em caminho
 * versionado para o cache de 30 dias não misturar versões.
 */

export const MEDIAPIPE_VERSION = '1.1.1';
export const MEDIAPIPE_WASM_BASE = `/mediapipe/${MEDIAPIPE_VERSION}/wasm`;
export const MEDIAPIPE_MODEL_URL = `/mediapipe/${MEDIAPIPE_VERSION}/models/selfie_multiclass_256x256.tflite`;

/** Lado máximo do recorte com fundo removido: basta para o avatar e mantém o PNG bem abaixo de 2 MB. */
export const AVATAR_MAX_SIZE = 512;

/** Pixels RGBA. Tipagem estrutural porque o jsdom não tem ImageData. */
export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Confiança de fundo por pixel (0 = pessoa, 1 = fundo). */
export interface BackgroundConfidence {
  mask: Float32Array;
  width: number;
  height: number;
}

let segmenterPromise: Promise<ImageSegmenter> | null = null;

/** Carrega o segmentador uma vez. Se falhar, a próxima chamada tenta de novo. */
export function loadSegmenter(): Promise<ImageSegmenter> {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE);
      return ImageSegmenter.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MEDIAPIPE_MODEL_URL, delegate: 'CPU' },
        runningMode: 'IMAGE',
        outputConfidenceMasks: true,
        outputCategoryMask: false,
      });
    })().catch((error) => {
      segmenterPromise = null;
      throw error;
    });
  }
  return segmenterPromise;
}

/** Só para os testes: esquece o segmentador guardado. */
export function resetSegmenterForTests(): void {
  segmenterPromise = null;
}

/**
 * Confiança de fundo de cada pixel. No selfie_multiclass_256x256 a categoria 0 é o fundo.
 * As máscaras já saem no tamanho da imagem de entrada (o Tasks reamostra no pós-processamento).
 */
export function getBackgroundConfidence(segmenter: ImageSegmenter, source: HTMLCanvasElement): BackgroundConfidence {
  const result = segmenter.segment(source);
  try {
    const mask = result.confidenceMasks?.[0];
    if (!mask) throw new Error('O segmentador não devolveu a máscara de fundo.');
    // Cópia: a memória da máscara é liberada no close()
    return { mask: mask.getAsFloat32Array().slice(), width: mask.width, height: mask.height };
  } finally {
    // Sem isso, cada miniatura recalculada deixaria máscaras sem liberar
    result.close();
  }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Função pura: tira o fundo dos pixels. Com `fill` null o fundo fica transparente; com uma cor hex,
 * o fundo vira essa cor e o resultado é opaco. Cor inválida vale como transparente.
 */
export function composeWithoutBackground(
  image: PixelBuffer,
  background: BackgroundConfidence,
  fill: string | null,
): PixelBuffer {
  const { width, height, data } = image;
  const out = new Uint8ClampedArray(data.length);
  const hex = normalizeHex(fill);
  const fillRgb = hex ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) : null;
  // Por defesa: o Tasks devolve a máscara no tamanho da imagem, mas se vier diferente usa o vizinho mais próximo
  const sameSize = background.width === width && background.height === height;

  for (let y = 0; y < height; y++) {
    const my = sameSize ? y : Math.min(background.height - 1, Math.floor(((y + 0.5) * background.height) / height));
    for (let x = 0; x < width; x++) {
      const mx = sameSize ? x : Math.min(background.width - 1, Math.floor(((x + 0.5) * background.width) / width));
      const conf = background.mask[my * background.width + mx] ?? 1;
      // Alfa da pessoa, suavizado entre 0,35 e 0,65 para a borda do cabelo não serrilhar
      const a = smoothstep(0.35, 0.65, 1 - conf);
      const i = (y * width + x) * 4;
      if (fillRgb) {
        out[i] = a * data[i] + (1 - a) * fillRgb[0];
        out[i + 1] = a * data[i + 1] + (1 - a) * fillRgb[1];
        out[i + 2] = a * data[i + 2] + (1 - a) * fillRgb[2];
        out[i + 3] = 255;
      } else {
        out[i] = data[i];
        out[i + 1] = data[i + 1];
        out[i + 2] = data[i + 2];
        out[i + 3] = Math.round(a * data[i + 3]);
      }
    }
  }
  return { data: out, width, height };
}

/** Recorte com o fundo removido, num canvas novo do mesmo tamanho. */
export async function removeBackground(source: HTMLCanvasElement, fill: string | null): Promise<HTMLCanvasElement> {
  const segmenter = await loadSegmenter();
  const background = getBackgroundConfidence(segmenter, source);

  const { width, height } = source;
  const sourceCtx = source.getContext('2d');
  if (!sourceCtx) throw new Error('Canvas 2D indisponível.');
  const pixels = sourceCtx.getImageData(0, 0, width, height);
  const composed = composeWithoutBackground({ data: pixels.data, width, height }, background, fill);

  const output = document.createElement('canvas');
  output.width = width;
  output.height = height;
  const outputCtx = output.getContext('2d');
  if (!outputCtx) throw new Error('Canvas 2D indisponível.');
  outputCtx.putImageData(new ImageData(composed.data, width, height), 0, 0);
  return output;
}
```

Notas:
- O `import type` do topo some na compilação: o pacote só entra no `import()` dinâmico, que o Vite separa num pedaço próprio (`vision_bundle-*.js`), carregado só quando o usuário liga "Remover fundo".
- A Promise guardada é limpa no `catch`, então uma falha (sem rede, sem WebGL) permite nova tentativa.
- `?? 1` no `conf` é defesa contra máscara mais curta que a imagem: pixel sem dado conta como fundo.
- Atribuir número fracionário a `Uint8ClampedArray` arredonda e limita a 0..255, por isso a mistura com a cor não precisa de `Math.round`.

- [ ] **Passo 4: confirmar que passa**

Rode `npx vitest run src/utils/backgroundRemoval.test.ts`. Esperado: PASS, 13 testes.

- [ ] **Passo 5: tipos e testes**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
```

Esperado: tsc sem saída; 16 arquivos e 189 testes.

- [ ] **Passo 6: commit**

```powershell
git add src/utils/backgroundRemoval.ts src/utils/backgroundRemoval.test.ts
git commit -m "Módulo de remoção de fundo com MediaPipe carregado sob demanda" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 3: operações de canvas fora da janela de recorte

**Arquivos:**
- Criar: `src/utils/cropImage.ts`
- Teste: `src/utils/cropImage.test.ts`
- Modificar: `src/components/dashboard/ImageCropDialog.tsx` (imports, função `getCroppedImg` e `handleSave`)

- [ ] **Passo 1: escrever os testes que falham**

Crie `src/utils/cropImage.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canvasToBlob, scaleCanvas } from './cropImage';

function canvasOf(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

afterEach(() => vi.restoreAllMocks());

describe('scaleCanvas', () => {
  it('reduz mantendo a proporção e desenha o original no tamanho novo', () => {
    // O jsdom sem o pacote canvas devolve null em getContext: simula um contexto
    const ctx = { drawImage: vi.fn(), imageSmoothingQuality: 'low' };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    const source = canvasOf(1024, 768);

    const out = scaleCanvas(source, 512);
    expect(out).not.toBe(source);
    expect([out.width, out.height]).toEqual([512, 384]);
    expect(ctx.drawImage).toHaveBeenCalledWith(source, 0, 0, 512, 384);
    expect(ctx.imageSmoothingQuality).toBe('high');
  });

  it('usa o maior lado como referência (retrato)', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    const out = scaleCanvas(canvasOf(300, 900), 256);
    expect([out.width, out.height]).toEqual([85, 256]);
  });

  it('não amplia: devolve o mesmo canvas quando já cabe', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    const source = canvasOf(400, 400);
    expect(scaleCanvas(source, 512)).toBe(source);
    expect(scaleCanvas(source, 400)).toBe(source);
    expect(getContext).not.toHaveBeenCalled();
  });
});

describe('canvasToBlob', () => {
  it('repassa tipo e qualidade e resolve com o blob', async () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback: BlobCallback) => callback(blob));

    await expect(canvasToBlob(canvasOf(1, 1), 'image/jpeg', 0.9)).resolves.toBe(blob);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9);
  });

  it('rejeita quando o blob vem null', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback) => callback(null));
    await expect(canvasToBlob(canvasOf(1, 1), 'image/png')).rejects.toThrow('Canvas toBlob failed');
  });
});
```

`getCroppedCanvas` não tem teste próprio: depende de `Image` carregar, o que não acontece no jsdom. Ele é o código atual de `getCroppedImg` sem a conversão final, e fica coberto pela verificação no navegador da Tarefa 6.

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/utils/cropImage.test.ts`.
Esperado: FAIL com `Failed to resolve import "./cropImage" from "src/utils/cropImage.test.ts". Does the file exist?`.

- [ ] **Passo 3: implementar**

Crie `src/utils/cropImage.ts`:

```ts
import type { Area } from 'react-easy-crop';

/*
 * Operações de canvas da janela de recorte do avatar. Ficam fora do componente para os testes
 * simularem: no jsdom sem o pacote canvas, getContext('2d') devolve null e toBlob nunca responde.
 */

/** Gira a imagem e recorta a área escolhida, no tamanho original do recorte. */
export async function getCroppedCanvas(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<HTMLCanvasElement> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  // Caixa que contém a imagem girada
  const rotatedWidth = image.width * cos + image.height * sin;
  const rotatedHeight = image.width * sin + image.height * cos;

  // Desenha a imagem inteira, girada, num canvas auxiliar
  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = rotatedWidth;
  rotCanvas.height = rotatedHeight;
  const rotCtx = rotCanvas.getContext('2d')!;

  rotCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
  rotCtx.rotate(radians);
  rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

  // Recorta do canvas girado
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    rotCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas;
}

/** Reduz para caber em maxSize × maxSize, mantendo a proporção. Nunca amplia: se já cabe, devolve o mesmo canvas. */
export function scaleCanvas(canvas: HTMLCanvasElement, maxSize: number): HTMLCanvasElement {
  const scale = maxSize / Math.max(canvas.width, canvas.height);
  if (scale >= 1) return canvas;

  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(canvas.width * scale));
  out.height = Math.max(1, Math.round(canvas.height * scale));
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, type, quality);
  });
}
```

- [ ] **Passo 4: confirmar que passa**

Rode `npx vitest run src/utils/cropImage.test.ts`. Esperado: PASS, 5 testes.

- [ ] **Passo 5: a janela de recorte passa a usar o módulo, sem mudar o comportamento**

Em `src/components/dashboard/ImageCropDialog.tsx`, troque:

```tsx
import { RotateCcw, ZoomIn } from 'lucide-react';
```

por:

```tsx
import { RotateCcw, ZoomIn } from 'lucide-react';
import { canvasToBlob, getCroppedCanvas } from '@/utils/cropImage';
```

Em `src/components/dashboard/ImageCropDialog.tsx`, troque a interface e a função `getCroppedImg` inteira:

```tsx
interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const radians = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));

  // Calculate bounding box of the rotated image
  const rotatedWidth = image.width * cos + image.height * sin;
  const rotatedHeight = image.width * sin + image.height * cos;

  // Draw the full rotated image onto an offscreen canvas
  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = rotatedWidth;
  rotCanvas.height = rotatedHeight;
  const rotCtx = rotCanvas.getContext('2d')!;

  rotCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
  rotCtx.rotate(radians);
  rotCtx.drawImage(image, -image.width / 2, -image.height / 2);

  // Now crop from the rotated canvas
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    rotCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/jpeg', 0.9);
  });
}
```

por:

```tsx
interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob) => void;
}
```

Em `src/components/dashboard/ImageCropDialog.tsx`, troque:

```tsx
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
```

por:

```tsx
      const canvas = await getCroppedCanvas(imageSrc, croppedAreaPixels, rotation);
      const croppedBlob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
```

O resultado é o mesmo de antes: recorte girado no tamanho original, JPEG de qualidade 0,9, e o mesmo erro `Canvas toBlob failed` se o blob vier nulo. O `Area` continua importado e usado em `handleCropComplete`.

- [ ] **Passo 6: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 17 arquivos e 194 testes; build terminando com `✓ built in`.

- [ ] **Passo 7: commit**

```powershell
git add src/utils/cropImage.ts src/utils/cropImage.test.ts src/components/dashboard/ImageCropDialog.tsx
git commit -m "Tira as operações de canvas da janela de recorte" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 4: "Remover fundo" na janela de recorte

**Arquivos:**
- Reescrever: `src/components/dashboard/ImageCropDialog.tsx`
- Teste: `src/components/dashboard/ImageCropDialog.test.tsx`

- [ ] **Passo 1: escrever os testes que falham**

Crie `src/components/dashboard/ImageCropDialog.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { canvasToBlob, getCroppedCanvas, scaleCanvas } from '@/utils/cropImage';
import { loadSegmenter, removeBackground } from '@/utils/backgroundRemoval';
import { ImageCropDialog } from './ImageCropDialog';

const toast = vi.hoisted(() => vi.fn());
const CROP_AREA = { x: 10, y: 20, width: 400, height: 400 };

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

// O Cropper real só chama onCropComplete depois de carregar a imagem, o que não acontece no jsdom
vi.mock('react-easy-crop', async () => {
  const { useEffect } = await import('react');
  return {
    default: function FakeCropper({ onCropComplete }: { onCropComplete: (area: unknown, pixels: unknown) => void }) {
      useEffect(() => {
        onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 10, y: 20, width: 400, height: 400 });
      }, [onCropComplete]);
      return <div data-testid="cropper" />;
    },
  };
});

vi.mock('@/utils/cropImage', () => ({
  getCroppedCanvas: vi.fn(),
  scaleCanvas: vi.fn(),
  canvasToBlob: vi.fn(),
}));

vi.mock('@/utils/backgroundRemoval', () => ({
  AVATAR_MAX_SIZE: 512,
  loadSegmenter: vi.fn(),
  removeBackground: vi.fn(),
}));

const croppedCanvas = { id: 'recorte' } as unknown as HTMLCanvasElement;
const scaledCanvas = { id: 'reduzido' } as unknown as HTMLCanvasElement;
const resultCanvas = { id: 'sem-fundo' } as unknown as HTMLCanvasElement;

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let urlCount = 0;
let consoleError: { mockRestore: () => void };

beforeEach(() => {
  urlCount = 0;
  toast.mockReset();
  // As falhas simuladas são registradas com console.error de propósito
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  // Os componentes do Radix (Switch, Slider) usam ResizeObserver, que o jsdom não tem
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
  // O jsdom não tem createObjectURL/revokeObjectURL
  URL.createObjectURL = vi.fn(() => `blob:previa-${++urlCount}`);
  URL.revokeObjectURL = vi.fn();
  vi.mocked(getCroppedCanvas).mockReset().mockResolvedValue(croppedCanvas);
  vi.mocked(scaleCanvas).mockReset().mockReturnValue(scaledCanvas);
  vi.mocked(canvasToBlob).mockReset().mockImplementation(async (_canvas, type) => new Blob(['x'], { type }));
  vi.mocked(loadSegmenter).mockReset().mockResolvedValue({} as never);
  vi.mocked(removeBackground).mockReset().mockResolvedValue(resultCanvas);
});

afterEach(() => {
  cleanup();
  consoleError.mockRestore();
  vi.unstubAllGlobals();
  delete (URL as { createObjectURL?: unknown }).createObjectURL;
  delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
});

function renderDialog(props: Partial<React.ComponentProps<typeof ImageCropDialog>> = {}) {
  const onCropComplete = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <ImageCropDialog open imageSrc="blob:original" onClose={onClose} onCropComplete={onCropComplete} {...props} />,
  );
  return { ...view, onCropComplete, onClose };
}

const removeSwitch = () => screen.getByRole('switch', { name: 'Remover fundo' });

describe('ImageCropDialog', () => {
  it('Aplicar sem remoção entrega JPEG 0,9 do recorte, sem carregar o MediaPipe', async () => {
    const { onCropComplete } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() => expect(onCropComplete).toHaveBeenCalledTimes(1));
    expect(onCropComplete.mock.calls[0][0].type).toBe('image/jpeg');
    expect(getCroppedCanvas).toHaveBeenCalledWith('blob:original', CROP_AREA, 0);
    expect(canvasToBlob).toHaveBeenCalledWith(croppedCanvas, 'image/jpeg', 0.9);
    expect(scaleCanvas).not.toHaveBeenCalled();
    expect(loadSegmenter).not.toHaveBeenCalled();
    expect(removeBackground).not.toHaveBeenCalled();
  });

  it('o interruptor mostra o carregamento e depois os controles e a miniatura', async () => {
    let finishLoading: () => void = () => {};
    vi.mocked(loadSegmenter).mockReturnValue(new Promise((resolve) => (finishLoading = () => resolve({} as never))));
    renderDialog();

    fireEvent.click(removeSwitch());
    expect(screen.getByRole('status').textContent).toContain('Preparando remoção de fundo… (só na primeira vez, cerca de 30 MB)');
    expect(removeSwitch().hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Aplicar' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Transparente' })).toBeNull();

    await act(async () => finishLoading());

    expect(screen.queryByRole('status')).toBeNull();
    expect(removeSwitch().getAttribute('aria-checked')).toBe('true');
    expect(removeSwitch().hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Transparente' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Cor' }).getAttribute('aria-pressed')).toBe('false');

    const preview = await screen.findByRole('img', { name: 'Prévia sem fundo' });
    expect(preview.getAttribute('src')).toBe('blob:previa-1');
    expect(scaleCanvas).toHaveBeenCalledWith(croppedCanvas, 256);
    expect(removeBackground).toHaveBeenCalledWith(scaledCanvas, null);
    expect(canvasToBlob).toHaveBeenCalledWith(resultCanvas, 'image/png');
  });

  it('na falha do carregamento aparece o toast, o interruptor desliga e o recorte normal continua', async () => {
    vi.mocked(loadSegmenter).mockRejectedValue(new Error('sem WebGL'));
    const { onCropComplete } = renderDialog();

    fireEvent.click(removeSwitch());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Não foi possível remover o fundo neste navegador.', variant: 'destructive' }),
      ),
    );
    expect(removeSwitch().getAttribute('aria-checked')).toBe('false');
    expect(removeSwitch().hasAttribute('disabled')).toBe(false);
    expect(screen.queryByRole('button', { name: 'Transparente' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    await waitFor(() => expect(onCropComplete).toHaveBeenCalledTimes(1));
    expect(onCropComplete.mock.calls[0][0].type).toBe('image/jpeg');
  });

  it('na falha da miniatura aparece o toast e o interruptor desliga', async () => {
    vi.mocked(removeBackground).mockRejectedValue(new Error('erro do modelo'));
    renderDialog();

    fireEvent.click(removeSwitch());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Não foi possível remover o fundo neste navegador.' })),
    );
    expect(removeSwitch().getAttribute('aria-checked')).toBe('false');
  });

  it('Aplicar com remoção reduz para 512 px e entrega PNG', async () => {
    const { onCropComplete } = renderDialog();
    fireEvent.click(removeSwitch());
    await screen.findByRole('button', { name: 'Transparente' });

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() => expect(onCropComplete).toHaveBeenCalledTimes(1));
    expect(onCropComplete.mock.calls[0][0].type).toBe('image/png');
    expect(scaleCanvas).toHaveBeenCalledWith(croppedCanvas, 512);
    expect(removeBackground).toHaveBeenCalledWith(scaledCanvas, null);
    expect(canvasToBlob).toHaveBeenCalledWith(resultCanvas, 'image/png');
    expect(canvasToBlob).not.toHaveBeenCalledWith(expect.anything(), 'image/jpeg', 0.9);
  });

  it('se Aplicar falhar com o fundo removido, mostra o toast e não fecha', async () => {
    const { onCropComplete } = renderDialog();
    fireEvent.click(removeSwitch());
    await screen.findByRole('button', { name: 'Transparente' });
    vi.mocked(removeBackground).mockRejectedValue(new Error('erro do modelo'));

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Não foi possível remover o fundo neste navegador.' })),
    );
    expect(onCropComplete).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Aplicar' }).hasAttribute('disabled')).toBe(false));
  });

  it('initialRemoveBackground já abre ligado', async () => {
    renderDialog({ initialRemoveBackground: true });

    expect(loadSegmenter).toHaveBeenCalledTimes(1);
    expect(removeSwitch().getAttribute('aria-checked')).toBe('true');
    await screen.findByRole('button', { name: 'Transparente' });
  });

  it('Cor: atalhos normalizados, sem o inválido, e a cor escolhida vai para a remoção', async () => {
    const { unmount } = renderDialog({ themeColors: { background: '#1E3A8A', button: 'vermelho' } });
    fireEvent.click(removeSwitch());
    await screen.findByRole('img', { name: 'Prévia sem fundo' });

    fireEvent.click(screen.getByRole('button', { name: 'Cor' }));
    const shortcuts = screen.getAllByRole('button', { name: /\(#/ });
    expect(shortcuts.map((b) => b.getAttribute('aria-label'))).toEqual(['Fundo do tema (#1e3a8a)', 'Branco (#ffffff)']);
    const colorInput = screen.getByLabelText('Cor atrás da pessoa') as HTMLInputElement;
    expect(colorInput.value).toBe('#1e3a8a');

    fireEvent.click(screen.getByRole('button', { name: 'Branco (#ffffff)' }));
    expect(colorInput.value).toBe('#ffffff');

    await waitFor(() => expect(removeBackground).toHaveBeenLastCalledWith(scaledCanvas, '#ffffff'));
    await waitFor(() => expect(screen.getByRole('img', { name: 'Prévia sem fundo' }).getAttribute('src')).not.toBe('blob:previa-1'));
    // A miniatura anterior é revogada a cada troca, e a última ao fechar
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa-1');
    const last = screen.getByRole('img', { name: 'Prévia sem fundo' }).getAttribute('src');
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(last);
  });

  it('sem themeColors, o único atalho é o branco', async () => {
    renderDialog();
    fireEvent.click(removeSwitch());
    fireEvent.click(await screen.findByRole('button', { name: 'Cor' }));

    expect(screen.getAllByRole('button', { name: /\(#/ }).map((b) => b.getAttribute('aria-label'))).toEqual(['Branco (#ffffff)']);
  });
});
```

Decisões dos testes:
- `react-easy-crop` simulado chama `onCropComplete` na montagem com uma área fixa (`CROP_AREA`), porque o original só dispara depois de carregar a imagem.
- `@/utils/cropImage` e `@/utils/backgroundRemoval` simulados: os canvases são objetos marcados (`recorte`, `reduzido`, `sem-fundo`) para conferir o caminho de cada um.
- `ResizeObserver` vazio, porque o `Switch` e o `Slider` do Radix o usam e o jsdom não tem. `URL.createObjectURL`/`revokeObjectURL` simulados e apagados no fim.
- A espera de 300 ms da miniatura roda com timers reais e `findBy`/`waitFor` (limite padrão de 1 s).
- `console.error` silenciado, porque as falhas simuladas são registradas de propósito.

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/components/dashboard/ImageCropDialog.test.tsx`.
Esperado: FAIL em 8 testes: sete com `Unable to find an accessible element with the role "switch" and name "Remover fundo"` e `initialRemoveBackground já abre ligado` com `expected "spy" to be called 1 times, but got 0 times`. Passa 1: `Aplicar sem remoção entrega JPEG 0,9...`, que já vale para o componente da Tarefa 3.

- [ ] **Passo 3: reescrever o componente**

Reescreva `src/components/dashboard/ImageCropDialog.tsx` inteiro:

```tsx
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Eraser, Loader2, RotateCcw, ZoomIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { canvasToBlob, getCroppedCanvas, scaleCanvas } from '@/utils/cropImage';
import { AVATAR_MAX_SIZE, loadSegmenter, removeBackground } from '@/utils/backgroundRemoval';
import { normalizeHex } from '@/utils/linkButtonStyle';

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  /** JPEG sem remoção de fundo; PNG com remoção. O tipo do blob diz a extensão. */
  onCropComplete: (croppedBlob: Blob) => void;
  /** Abre com "Remover fundo" já ligado (botão "Remover fundo" da foto atual) */
  initialRemoveBackground?: boolean;
  /** Cores do tema para os atalhos de "Atrás da pessoa" */
  themeColors?: { background: string; button: string };
}

const BACKGROUND_REMOVAL_ERROR = 'Não foi possível remover o fundo neste navegador.';
const PREVIEW_SIZE = 256;
const PREVIEW_DELAY_MS = 300;

// Xadrez que mostra a transparência da miniatura
const CHECKERBOARD_STYLE: React.CSSProperties = {
  backgroundColor: '#ffffff',
  backgroundImage: 'conic-gradient(#d4d4d8 25%, transparent 0 50%, #d4d4d8 0 75%, transparent 0)',
  backgroundSize: '16px 16px',
};

type SegmenterStatus = 'idle' | 'loading' | 'ready';
type BackgroundMode = 'transparent' | 'color';

export const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  open,
  imageSrc,
  onClose,
  onCropComplete,
  initialRemoveBackground = false,
  themeColors,
}) => {
  const { toast } = useToast();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [removeBg, setRemoveBg] = useState(false);
  const [segmenterStatus, setSegmenterStatus] = useState<SegmenterStatus>('idle');
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('transparent');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const shortcuts = useMemo(() => {
    const candidates = [
      { label: 'Fundo do tema', color: normalizeHex(themeColors?.background) },
      { label: 'Botão do tema', color: normalizeHex(themeColors?.button) },
      { label: 'Branco', color: '#ffffff' },
    ];
    // Atalho inválido não aparece; cor repetida aparece uma vez só
    return candidates.filter(
      (item, index) => item.color && candidates.findIndex((other) => other.color === item.color) === index,
    );
  }, [themeColors?.background, themeColors?.button]);
  const [fillColor, setFillColor] = useState<string>(() => shortcuts[0]?.color ?? '#ffffff');

  const fill = backgroundMode === 'color' ? normalizeHex(fillColor) : null;
  const isBackgroundReady = removeBg && segmenterStatus === 'ready';

  const mountedRef = useRef(true);
  const previewUrlRef = useRef<string | null>(null);

  const replacePreviewUrl = useCallback((url: string | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    };
  }, []);

  const showBackgroundError = useCallback(() => {
    toast({ title: 'Erro', description: BACKGROUND_REMOVAL_ERROR, variant: 'destructive' });
  }, [toast]);

  const turnOffRemoveBackground = useCallback(() => {
    setRemoveBg(false);
    replacePreviewUrl(null);
  }, [replacePreviewUrl]);

  const turnOnRemoveBackground = useCallback(async () => {
    setRemoveBg(true);
    setSegmenterStatus('loading');
    try {
      // Na primeira vez baixa motor e modelo; depois o segmentador já está guardado no módulo
      await loadSegmenter();
      if (mountedRef.current) setSegmenterStatus('ready');
    } catch (err) {
      console.error('Background removal load error:', err);
      if (!mountedRef.current) return;
      setSegmenterStatus('idle');
      turnOffRemoveBackground();
      showBackgroundError();
    }
  }, [showBackgroundError, turnOffRemoveBackground]);

  useEffect(() => {
    if (initialRemoveBackground) turnOnRemoveBackground();
    // Só na montagem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Miniatura do resultado, recalculada 300 ms depois da última mudança de recorte, zoom, rotação ou fundo
  useEffect(() => {
    if (!isBackgroundReady || !croppedAreaPixels) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const cropped = await getCroppedCanvas(imageSrc, croppedAreaPixels, rotation);
        const result = await removeBackground(scaleCanvas(cropped, PREVIEW_SIZE), fill);
        const blob = await canvasToBlob(result, 'image/png');
        if (cancelled) return;
        replacePreviewUrl(URL.createObjectURL(blob));
      } catch (err) {
        if (cancelled) return;
        console.error('Background removal preview error:', err);
        turnOffRemoveBackground();
        showBackgroundError();
      }
    }, PREVIEW_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isBackgroundReady, croppedAreaPixels, rotation, fill, imageSrc, replacePreviewUrl, turnOffRemoveBackground, showBackgroundError]);

  const handleCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsSaving(true);
    try {
      const canvas = await getCroppedCanvas(imageSrc, croppedAreaPixels, rotation);
      let croppedBlob: Blob;
      if (removeBg) {
        try {
          const result = await removeBackground(scaleCanvas(canvas, AVATAR_MAX_SIZE), fill);
          croppedBlob = await canvasToBlob(result, 'image/png');
        } catch (err) {
          // Mantém a janela aberta: o usuário pode desligar a remoção e aplicar o recorte normal
          console.error('Background removal error:', err);
          showBackgroundError();
          return;
        }
      } else {
        croppedBlob = await canvasToBlob(canvas, 'image/jpeg', 0.9);
      }
      onCropComplete(croppedBlob);
    } catch (err) {
      console.error('Crop error:', err);
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  const handleRemoveBgChange = (checked: boolean) => {
    if (checked) turnOnRemoveBackground();
    else turnOffRemoveBackground();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Recortar Imagem</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <ZoomIn className="h-3 w-3" /> Zoom
              </Label>
              <span className="text-xs text-muted-foreground">{zoom.toFixed(1)}x</span>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(v) => setZoom(v[0])}
              min={1}
              max={3}
              step={0.1}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> Rotação
              </Label>
              <span className="text-xs text-muted-foreground">{rotation}°</span>
            </div>
            <Slider
              value={[rotation]}
              onValueChange={(v) => setRotation(v[0])}
              min={0}
              max={360}
              step={1}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="remove-background" className="text-xs flex items-center gap-1">
                <Eraser className="h-3 w-3" /> Remover fundo
              </Label>
              <Switch
                id="remove-background"
                checked={removeBg}
                disabled={segmenterStatus === 'loading'}
                onCheckedChange={handleRemoveBgChange}
              />
            </div>

            {removeBg && segmenterStatus === 'loading' && (
              <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                Preparando remoção de fundo… (só na primeira vez, cerca de 30 MB)
              </p>
            )}

            {isBackgroundReady && (
              <div className="flex items-start gap-4">
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/60"
                  style={CHECKERBOARD_STYLE}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Prévia sem fundo" className="h-full w-full object-cover" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Calculando prévia" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Atrás da pessoa</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={backgroundMode === 'transparent' ? 'default' : 'outline'}
                      aria-pressed={backgroundMode === 'transparent'}
                      onClick={() => setBackgroundMode('transparent')}
                    >
                      Transparente
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={backgroundMode === 'color' ? 'default' : 'outline'}
                      aria-pressed={backgroundMode === 'color'}
                      onClick={() => setBackgroundMode('color')}
                    >
                      Cor
                    </Button>
                  </div>

                  {backgroundMode === 'color' && (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        aria-label="Cor atrás da pessoa"
                        value={normalizeHex(fillColor) ?? '#ffffff'}
                        onChange={(e) => setFillColor(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-border/60 bg-transparent p-0.5"
                      />
                      {shortcuts.map((item) => (
                        <button
                          key={item.color}
                          type="button"
                          title={item.label}
                          aria-label={`${item.label} (${item.color})`}
                          onClick={() => setFillColor(item.color!)}
                          className="h-7 w-7 rounded-full border border-border/60"
                          style={{ backgroundColor: item.color! }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Resetar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || segmenterStatus === 'loading'}>
              {isSaving ? 'Salvando...' : 'Aplicar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

Decisões:
- **Interruptor:** desabilitado durante o carregamento, e o "Aplicar" também. Ligar sempre chama `loadSegmenter()`; da segunda vez em diante a Promise guardada no módulo resolve na hora, então "Preparando…" só aparece de verdade no primeiro uso da página.
- **Miniatura:** `<img>` de 96 px (`h-24 w-24`) redondo, sobre xadrez em CSS (`conic-gradient`). Recalculada 300 ms depois da última mudança de `croppedAreaPixels` (que muda com recorte e zoom), `rotation` e `fill`. A limpeza do efeito cancela o cálculo anterior, e o `objectURL` anterior é revogado a cada troca, ao desligar e ao desmontar (a aba Perfil desmonta a janela ao fechar).
- **Atrás da pessoa:** Transparente (padrão) ou Cor. A cor inicial é o primeiro atalho válido (o fundo do tema, se vier). Os atalhos passam por `normalizeHex`; inválido não aparece, e cor repetida (por exemplo, fundo do tema branco) aparece uma vez só.
- **Falha:** no carregamento ou na miniatura, toast `Não foi possível remover o fundo neste navegador.` e o interruptor desliga. No "Aplicar" com remoção, o mesmo toast e a janela fica aberta.
- **Salvar:** sem remoção, JPEG 0,9 do recorte, como antes. Com remoção, `scaleCanvas(…, 512)`, `removeBackground` e PNG.
- `DialogContent` ganha `max-h-[90dvh] overflow-y-auto`, porque o bloco novo aumenta a altura da janela em celulares, e `aria-describedby={undefined}`, que tira o aviso de descrição ausente do Radix.

- [ ] **Passo 4: confirmar que passa**

Rode `npx vitest run src/components/dashboard/ImageCropDialog.test.tsx`. Esperado: PASS, 9 testes, sem avisos de `act(...)` no stderr.

- [ ] **Passo 5: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 18 arquivos e 203 testes; build verde, com o pedaço `assets/vision_bundle-*.js` (~145 KB) separado do `Dashboard-*.js` e `precache  45 entries` (a entrada nova é esse pedaço; nada de `mediapipe/`).

- [ ] **Passo 6: commit**

```powershell
git add src/components/dashboard/ImageCropDialog.tsx src/components/dashboard/ImageCropDialog.test.tsx
git commit -m "Remove o fundo da foto na janela de recorte" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 5: aba Perfil — PNG, botão "Remover fundo" e bucket do "Remover"

**Arquivos:**
- Modificar: `src/components/dashboard/SettingsTab.tsx`
- Teste: `src/components/dashboard/SettingsTab.test.tsx`

- [ ] **Passo 1: escrever os testes que falham**

Crie `src/components/dashboard/SettingsTab.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useDesignStore, type ThemeConfig } from '@/stores/useDesignStore';
import { SettingsTab } from './SettingsTab';

const mocks = vi.hoisted(() => {
  const storage = {
    remove: vi.fn(),
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
  };
  return {
    toast: vi.fn(),
    storage,
    storageFrom: vi.fn(() => storage),
    profileUpdate: vi.fn(),
  };
});

vi.mock('@/contexts/AuthContext', () => {
  const user = { id: 'u1', email: 'dna@example.com', app_metadata: {} };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useUsernameValidation', () => ({
  useUsernameValidation: () => ({ isValid: true, isAvailable: true, isChecking: false, error: null, suggestions: [] }),
}));
vi.mock('@/hooks/useAutosave', () => ({ useAutosave: () => 'idle' }));
vi.mock('./AuthProviderInfo', () => ({ AuthProviderInfo: () => null }));
vi.mock('@/lib/supabase', () => ({
  AVATARS_BUCKET: 'linkhub-avatars',
  PUBLIC_SITE_URL: 'https://linkhub.avila.ia.br',
  supabase: {
    storage: { from: mocks.storageFrom },
    from: vi.fn(() => ({ update: (values: unknown) => ({ eq: async () => mocks.profileUpdate(values) }) })),
  },
}));
// A janela de recorte real tem testes próprios: aqui só interessam as props e o blob devolvido
vi.mock('./ImageCropDialog', () => ({
  ImageCropDialog: (props: {
    imageSrc: string;
    initialRemoveBackground?: boolean;
    themeColors?: { background: string; button: string };
    onClose: () => void;
    onCropComplete: (blob: Blob) => void;
  }) => (
    <div data-testid="crop-dialog">
      <span data-testid="crop-src">{props.imageSrc}</span>
      <span data-testid="crop-remove-bg">{String(props.initialRemoveBackground)}</span>
      <span data-testid="crop-theme">{JSON.stringify(props.themeColors)}</span>
      <button onClick={props.onClose}>fechar recorte</button>
      <button onClick={() => props.onCropComplete(new Blob(['png'], { type: 'image/png' }))}>aplicar png</button>
      <button onClick={() => props.onCropComplete(new Blob(['jpg'], { type: 'image/jpeg' }))}>aplicar jpeg</button>
    </div>
  ),
}));

const AVATAR_URL = 'https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-avatars/u1/123.jpg';

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let consoleError: { mockRestore: () => void };
const originalTheme = useDesignStore.getState().customTheme;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  URL.createObjectURL = vi.fn(() => 'blob:foto-atual');
  URL.revokeObjectURL = vi.fn();
  mocks.toast.mockReset();
  mocks.storageFrom.mockClear();
  mocks.storage.remove.mockReset().mockResolvedValue({ error: null });
  mocks.storage.upload.mockReset().mockResolvedValue({ error: null });
  mocks.storage.getPublicUrl.mockReset().mockImplementation((path: string) => ({
    data: { publicUrl: `https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-avatars/${path}` },
  }));
  mocks.profileUpdate.mockReset().mockReturnValue({ error: null });
  useDesignStore.getState().setCustomTheme({
    ...originalTheme,
    background: { type: 'gradient', colors: ['#0F172A', '#1e293b'] },
    buttonStyle: { type: 'solid', color: '#F59E0B' },
  } as ThemeConfig);
});

afterEach(() => {
  cleanup();
  consoleError.mockRestore();
  vi.unstubAllGlobals();
  delete (URL as { createObjectURL?: unknown }).createObjectURL;
  delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
  useDesignStore.getState().setCustomTheme(originalTheme);
});

function renderTab(avatarUrl = AVATAR_URL) {
  const onProfileUpdate = vi.fn();
  render(
    <SettingsTab profile={{ username: 'dna', full_name: 'Daniel', avatar_url: avatarUrl }} onProfileUpdate={onProfileUpdate} />,
  );
  return { onProfileUpdate };
}

describe('SettingsTab, foto de perfil', () => {
  it('sem foto, não mostra "Remover fundo"', () => {
    renderTab('');
    expect(screen.queryByRole('button', { name: 'Remover fundo' })).toBeNull();
  });

  it('"Remover fundo" busca a foto atual sem cache e abre o recorte já com a remoção ligada', async () => {
    const blob = new Blob(['foto'], { type: 'image/jpeg' });
    const fetchMock = vi.fn(async () => new Response(blob, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Remover fundo' }));

    await screen.findByTestId('crop-dialog');
    expect(fetchMock).toHaveBeenCalledWith(AVATAR_URL, { cache: 'no-store' });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('crop-src').textContent).toBe('blob:foto-atual');
    expect(screen.getByTestId('crop-remove-bg').textContent).toBe('true');
    // Cores do tema do store: fundo = primeira cor do gradiente, botão = cor normalizada do botão
    expect(JSON.parse(screen.getByTestId('crop-theme').textContent!)).toEqual({ background: '#0F172A', button: '#f59e0b' });

    fireEvent.click(screen.getByRole('button', { name: 'fechar recorte' }));
    expect(screen.queryByTestId('crop-dialog')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto-atual');
  });

  it('se a foto atual não abrir, mostra o toast e não abre o recorte', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Remover fundo' }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Não foi possível abrir a foto atual. Envie a foto de novo para remover o fundo.',
          variant: 'destructive',
        }),
      ),
    );
    expect(screen.queryByTestId('crop-dialog')).toBeNull();
  });

  it('resposta sem sucesso (ex.: 404) também mostra o toast', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('não achou', { status: 404 })));
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Remover fundo' }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Não foi possível abrir a foto atual. Envie a foto de novo para remover o fundo.' }),
      ),
    );
    expect(screen.queryByTestId('crop-dialog')).toBeNull();
  });

  it('PNG do recorte sobe como .png com image/png, e o objectURL é revogado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['foto'], { type: 'image/jpeg' }), { status: 200 })));
    const { onProfileUpdate } = renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Remover fundo' }));
    fireEvent.click(await screen.findByRole('button', { name: 'aplicar png' }));

    await waitFor(() => expect(onProfileUpdate).toHaveBeenCalled());
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-avatars');
    expect(mocks.storageFrom).not.toHaveBeenCalledWith('avatars');
    expect(mocks.storage.remove).toHaveBeenCalledWith(['u1/123.jpg']);
    const [path, file] = mocks.storage.upload.mock.calls[0] as [string, File];
    expect(path).toMatch(/^u1\/\d+\.png$/);
    expect(file.name).toMatch(/^\d+\.png$/);
    expect(file.type).toBe('image/png');
    expect(mocks.profileUpdate).toHaveBeenCalledWith({
      avatar_url: `https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-avatars/${path}`,
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto-atual');
  });

  it('JPEG do recorte continua subindo como .jpg com image/jpeg', async () => {
    const { container } = render(
      <SettingsTab profile={{ username: 'dna', full_name: 'Daniel', avatar_url: '' }} onProfileUpdate={vi.fn()} />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] } });
    fireEvent.click(await screen.findByRole('button', { name: 'aplicar jpeg' }));

    await waitFor(() => expect(mocks.storage.upload).toHaveBeenCalled());
    const [path, file] = mocks.storage.upload.mock.calls[0] as [string, File];
    expect(path).toMatch(/^u1\/\d+\.jpg$/);
    expect(file.type).toBe('image/jpeg');
  });

  it('"Remover" apaga o arquivo no bucket do LinkHub', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(mocks.storage.remove).toHaveBeenCalledWith(['u1/123.jpg']));
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-avatars');
    expect(mocks.storageFrom).not.toHaveBeenCalledWith('avatars');
  });
});
```

O `ImageCropDialog` é simulado por um componente que mostra as props e devolve um blob PNG ou JPEG: a janela real tem testes próprios. `useAutosave` e `useUsernameValidation` são simulados para a aba não gravar nem consultar nada.

- [ ] **Passo 2: confirmar que falha**

Rode `npx vitest run src/components/dashboard/SettingsTab.test.tsx`.
Esperado: FAIL em 5 testes (`"Remover fundo" busca...`, `se a foto atual não abrir...`, `resposta sem sucesso...`, `PNG do recorte...` e `"Remover" apaga o arquivo no bucket do LinkHub`), os quatro primeiros com `Unable to find an accessible element with the role "button" and name "Remover fundo"` e o último com `expected "spy" to be called with arguments: [ 'linkhub-avatars' ]`. Passam 2: `sem foto...` e `JPEG do recorte continua...`.

- [ ] **Passo 3: implementar**

Em `src/components/dashboard/SettingsTab.tsx`, troque:

```tsx
import { Copy, Check, Upload, ExternalLink, Trash2, Globe, Loader2, CheckCircle2, Megaphone, Briefcase, User } from 'lucide-react';
```

por:

```tsx
import { Copy, Check, Upload, ExternalLink, Trash2, Globe, Loader2, CheckCircle2, Megaphone, Briefcase, User, Eraser } from 'lucide-react';
```

Em `src/components/dashboard/SettingsTab.tsx`, troque:

```tsx
import { ImageCropDialog } from './ImageCropDialog';
```

por:

```tsx
import { ImageCropDialog } from './ImageCropDialog';
import { useDesignStore } from '@/stores/useDesignStore';
import { getBaseBackgroundColor } from '@/utils/profileAppearance';
import { resolveButtonColors } from '@/utils/linkButtonStyle';
```

Em `src/components/dashboard/SettingsTab.tsx`, troque:

```tsx
  const [pendingFile, setPendingFile] = useState<File | null>(null);
```

por:

```tsx
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropRemoveBackground, setCropRemoveBackground] = useState(false);
  const [isOpeningCurrentAvatar, setIsOpeningCurrentAvatar] = useState(false);
  // Cores do tema para os atalhos de "Atrás da pessoa" na janela de recorte
  const customTheme = useDesignStore((state) => state.customTheme);
  const themeColors = useMemo(
    () => ({ background: getBaseBackgroundColor(customTheme), button: resolveButtonColors(customTheme).bg }),
    [customTheme],
  );
```

Em `src/components/dashboard/SettingsTab.tsx`, troque:

```tsx
    setPendingFile(file);
    const objectUrl = URL.createObjectURL(file);
```

por:

```tsx
    setPendingFile(file);
    setCropRemoveBackground(false);
    const objectUrl = URL.createObjectURL(file);
```

Em `src/components/dashboard/SettingsTab.tsx`, troque:

```tsx
  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropImageSrc(null);
    setPendingFile(null);
    if (!user) return;
```

por:

```tsx
  // Fecha a janela de recorte e libera o objectURL da imagem aberta nela
  const closeCropDialog = () => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc(null);
    setPendingFile(null);
    setCropRemoveBackground(false);
  };

  const handleRemoveCurrentBackground = async () => {
    if (!formData.avatar_url) return;
    setIsOpeningCurrentAvatar(true);
    try {
      // no-store: não reaproveita a resposta que o <img> guardou sem cabeçalho CORS
      const response = await fetch(formData.avatar_url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      // objectURL: o canvas do recorte não fica "sujo" com imagem de outra origem
      setCropRemoveBackground(true);
      setCropImageSrc(URL.createObjectURL(blob));
    } catch (error) {
      console.error('Error opening current avatar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível abrir a foto atual. Envie a foto de novo para remover o fundo.",
        variant: "destructive",
      });
    } finally {
      setIsOpeningCurrentAvatar(false);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    closeCropDialog();
    if (!user) return;
```

Em `src/components/dashboard/SettingsTab.tsx`, troque:

```tsx
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;
      const file = new File([croppedBlob], fileName, { type: 'image/jpeg' });
```

por:

```tsx
      // PNG quando o fundo foi removido; o resto continua JPEG
      const isPng = croppedBlob.type === 'image/png';
      const fileName = `${Date.now()}.${isPng ? 'png' : 'jpg'}`;
      const filePath = `${user.id}/${fileName}`;
      const file = new File([croppedBlob], fileName, { type: isPng ? 'image/png' : 'image/jpeg' });
```

Em `src/components/dashboard/SettingsTab.tsx`, troque (defeito antigo: o bucket `avatars` não é o do LinkHub):

```tsx
          await supabase.storage
            .from('avatars')
            .remove([`${user.id}/${fileName}`]);
```

por:

```tsx
          await supabase.storage
            .from(AVATARS_BUCKET)
            .remove([`${user.id}/${fileName}`]);
```

Em `src/components/dashboard/SettingsTab.tsx`, troque (três botões não cabem lado a lado em 320 px com `space-x-2`):

```tsx
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
```

por:

```tsx
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
```

Em `src/components/dashboard/SettingsTab.tsx`, troque:

```tsx
                  {formData.avatar_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteImage}
```

por:

```tsx
                  {formData.avatar_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveCurrentBackground}
                      disabled={isUploadingImage || isOpeningCurrentAvatar}
                      className="flex items-center space-x-2"
                    >
                      {isOpeningCurrentAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
                      <span>Remover fundo</span>
                    </Button>
                  )}
                  {formData.avatar_url && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteImage}
```

Em `src/components/dashboard/SettingsTab.tsx`, troque:

```tsx
          onClose={() => { setCropImageSrc(null); setPendingFile(null); }}
```

por:

```tsx
          initialRemoveBackground={cropRemoveBackground}
          themeColors={themeColors}
          onClose={closeCropDialog}
```

Decisões:
- `closeCropDialog` revoga o `objectURL` ao fechar e depois de aplicar, tanto o da foto atual quanto o do upload (antes, o do upload nunca era revogado).
- `getBaseBackgroundColor` devolve a cor como está gravada (por exemplo `#0F172A`); a janela de recorte normaliza.
- O `fetch` não confere o `Content-Type`: uma resposta que não for imagem falha no carregamento do `Image` dentro de `getCroppedCanvas` e cai no `Crop error` do `handleSave`, como qualquer imagem inválida já caía.

- [ ] **Passo 4: confirmar que passa**

Rode `npx vitest run src/components/dashboard/SettingsTab.test.tsx`. Esperado: PASS, 7 testes.

- [ ] **Passo 5: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npm test
npm run build
```

Esperado: tsc sem saída; 19 arquivos e 210 testes; build verde.

- [ ] **Passo 6: commit**

```powershell
git add src/components/dashboard/SettingsTab.tsx src/components/dashboard/SettingsTab.test.tsx
git commit -m "Remover fundo da foto atual, avatar em PNG e bucket certo no Remover" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarefa 6: verificação final e deploy

A verificação em produção **não salva nada sobre o avatar do usuário**. Cada "Aplicar" na aba Perfil sobe uma foto nova e apaga a anterior do bucket, e restaurar um objeto apagado do Storage exigiria mexer em tabelas internas do Supabase. O salvamento (PNG/JPEG, extensão e bucket do "Remover") é coberto pelos testes das Tarefas 4 e 5. Em produção, confere-se o que só o navegador real mostra: o carregamento do MediaPipe pelo próprio domínio, a miniatura, a busca da foto atual com CORS e os atalhos de cor, **terminando sempre em "Cancelar"**. Abrir e cancelar a janela não altera o `formData`, então o autosave não grava nada.

Um teste completo com salvamento só acontece se o usuário pedir, e numa conta de teste criada por ele, nunca no avatar real.

- [ ] **Passo 1: suíte completa**

```powershell
npm test
npx tsc --noEmit -p tsconfig.app.json
npm run build
Get-ChildItem -Recurse -File dist/mediapipe | Select-Object Length, FullName
Select-String -Path dist/sw.js -Pattern 'mediapipe' -Quiet
```

Esperado:
- 19 arquivos e 210 testes. Se o Vitest falhar com `UNKNOWN ... ssr` ou `\web\`, repita e confira a contagem de arquivos;
- tsc sem saída;
- build verde;
- os cinco arquivos do `dist/mediapipe` com os tamanhos da Tarefa 1;
- `False`.

**Não rode o build de novo antes do `scp`:** o passo 3 usa este mesmo `dist`, já conferido.

- [ ] **Passo 2: conferências só de leitura em produção**

```powershell
"SELECT file_size_limit, allowed_mime_types FROM storage.buckets WHERE id = 'linkhub-avatars';" |
  ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -At'
"SELECT coalesce(avatar_url, '') FROM linkhub.profiles WHERE username = 'dna';" |
  ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -At'
scp avila@192.168.1.24:~/docker/linkhub-frontend/nginx.conf "$env:TEMP\nginx.conf.servidor"
git diff --no-index -- "$env:TEMP\nginx.conf.servidor" deploy/vpsavila/nginx.conf
```

Esperado:
- o bucket com `2097152` e `image/png` na lista. Se não tiver PNG, **pare e avise o usuário**, porque o salvamento com fundo removido falharia em produção;
- a URL do avatar anotada, só para comparar no fim que ela não mudou;
- o diff mostrando **só** as mudanças da Tarefa 1 (o `location /mediapipe/` e o `application/wasm` no `gzip_types`). Se aparecer outra diferença, alguém editou o arquivo direto no servidor: **pare e pergunte** antes de sobrescrever.

- [ ] **Passo 3: deploy** (procedimento "Atualizações futuras" do `deploy/vpsavila/DEPLOY.md`, mais o `nginx.conf`, que mudou)

Primeiro teste o `nginx.conf` novo **sem tocar no que está em uso**:

```powershell
scp deploy/vpsavila/nginx.conf avila@192.168.1.24:~/docker/linkhub-frontend/nginx.conf.new
ssh avila@192.168.1.24 'docker run --rm -v ~/docker/linkhub-frontend/nginx.conf.new:/etc/nginx/conf.d/default.conf:ro nginx:1.27-alpine nginx -t'
```

Esperado: `syntax is ok` e `test is successful`. Se o teste falhar, pare: o nginx em execução continua com a configuração antiga. Corrija o arquivo e repita.

Com o teste ok, publique (o `dist` tem ~43 MB a mais, então o `scp` demora um pouco mais):

```powershell
ssh avila@192.168.1.24 'find ~/docker/linkhub-frontend/html -mindepth 1 -delete'
scp -r dist/* avila@192.168.1.24:~/docker/linkhub-frontend/html/
ssh avila@192.168.1.24 'find ~/docker/linkhub-frontend/html -type d -exec chmod 755 {} + && find ~/docker/linkhub-frontend/html -type f -exec chmod 644 {} +'
ssh avila@192.168.1.24 'cd ~/docker/linkhub-frontend && mv nginx.conf.new nginx.conf && chmod 644 nginx.conf && docker compose up -d --force-recreate && sleep 40 && docker inspect --format "{{.State.Health.Status}}" linkhub-nginx'
```

Esperado: `healthy`. O primeiro healthcheck roda 30 s depois da criação; se vier `starting`, repita só o `docker inspect`. O `--force-recreate` é necessário porque o bind mount do arquivo pode continuar apontando para o inode antigo. Confira que `https://linkhub.avila.ia.br` serve o `index-*.js` novo, comparando com o nome em `dist/index.html`.

- [ ] **Passo 4: conferir os arquivos do MediaPipe em produção**

Use GET mostrando só os cabeçalhos, e não HEAD: o gzip do nginx não se aplica a requisições HEAD.

```powershell
curl.exe -s -o NUL -D - -H 'Accept-Encoding: gzip' https://linkhub.avila.ia.br/mediapipe/1.1.1/wasm/vision_wasm_internal.wasm
curl.exe -s -o NUL -D - https://linkhub.avila.ia.br/mediapipe/1.1.1/models/selfie_multiclass_256x256.tflite
curl.exe -s -o NUL -w '%{http_code}\n' https://linkhub.avila.ia.br/mediapipe/1.1.1/wasm/nao-existe.js
curl.exe -s https://linkhub.avila.ia.br/sw.js | Select-String -Pattern 'mediapipe' -Quiet
```

Esperado:
- **wasm:** `200`, `content-type: application/wasm`, `cache-control: public, max-age=2592000` e `content-encoding: gzip`. O Cloudflare pode trocar por `br`, e os dois servem. Se não vier compressão nenhuma, confira o `gzip_types` no `nginx.conf` publicado;
- **modelo:** `200` e `cache-control: public, max-age=2592000`;
- **arquivo inexistente:** `404`, e não o `index.html` com 200;
- **`sw.js`:** `False`.

- [ ] **Passo 5: verificação no navegador embutido, com o login do usuário, sem salvar**

Use o navegador embutido (`mcp__Claude_Browser__*`). Abra `https://linkhub.avila.ia.br/dashboard`. Se pedir login, peça ao usuário para entrar ele mesmo no painel do navegador; nunca digite senha. Se o navegador servir a versão anterior pelo service worker, rode `(await navigator.serviceWorker.getRegistration())?.update()`, espere alguns segundos e recarregue. **Nunca clique em "Aplicar" nem em "Remover".**

1. **Falha simulada, sem mexer no servidor.** Na aba Perfil, com `javascript_tool`, faça os arquivos do MediaPipe falharem só nesta página:

```js
const original = window.fetch;
window.fetch = (input, init) =>
  String(input?.url ?? input).includes('/mediapipe/') ? Promise.reject(new TypeError('falha simulada')) : original(input, init);
'ok'
```

   Clique em "Remover fundo". A foto atual é buscada normalmente; só o modelo falha. Esperado:
   - a janela abre com o interruptor ligado e "Preparando remoção de fundo… (só na primeira vez, cerca de 30 MB)";
   - depois aparece o toast "Não foi possível remover o fundo neste navegador.";
   - o interruptor desliga.

   Clique em **"Cancelar"** e **recarregue a página** para desfazer a simulação.
2. **Foto atual, primeiro uso, transparente.** Na aba Perfil, clique em "Remover fundo". Esperado:
   - com `read_network_requests` (`urlPattern: "linkhub-avatars"`), a foto atual foi buscada com 200, ou seja, o CORS funciona em produção;
   - a janela abre com o interruptor ligado, mostra "Preparando…" e depois a miniatura redonda sobre o xadrez, com a pessoa recortada e "Transparente" marcado;
   - mude o zoom e a rotação: a miniatura acompanha;
   - com `read_network_requests` (`urlPattern: "mediapipe"`), aparecem o `vision_wasm_internal.js` (ou a variante `nosimd`), o `.wasm` e o `.tflite`, todos com 200 e vindos de `linkhub.avila.ia.br`. Nenhuma requisição vai a `storage.googleapis.com` nem a `cdn.jsdelivr.net`.

   Tire uma captura da janela para mostrar ao usuário. Clique em **"Cancelar"**.
3. **Cor sólida.** Clique em "Remover fundo" de novo. Desta vez não há download: o carregamento é imediato. Escolha "Cor" e confira os três atalhos (fundo do tema, botão do tema e branco; menos se algum se repetir). Clique no do fundo do tema e veja a miniatura mudar para a pessoa sobre um círculo dessa cor. Tire uma captura. Clique em **"Cancelar"**.
4. **Celular.** Use `resize_window` com `preset: "mobile"`, recarregue e abra a janela pelo "Remover fundo". Esperado: os três botões da foto quebram linha sem sair da tela, e a janela rola até o "Aplicar". Clique em **"Cancelar"** e volte com `preset: "desktop"`.
5. **Nada foi gravado.** Repita a consulta de `avatar_url` do passo 2. Esperado: exatamente a mesma URL.

Mostre as capturas ao usuário. Se ele quiser testar o salvamento de verdade, ele mesmo clica em "Aplicar" sabendo que a foto anterior será substituída, ou usa uma conta de teste.

- [ ] **Passo 6: commit final, se algo mudou**

Se os passos acima geraram ajustes, faça commit deles com uma mensagem descritiva, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Não faça push sem o usuário pedir.
