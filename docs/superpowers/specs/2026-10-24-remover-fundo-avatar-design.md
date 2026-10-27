# Remover o fundo da foto do avatar

Data: 2026-10-24 · Status: aprovado no brainstorming e na revisão da especificação; aguardando leitura do usuário

## Objetivo

Permitir que o dono do perfil remova o fundo da foto do avatar no próprio navegador, sem custo e sem enviar a imagem a terceiros, e deixar atrás da pessoa fundo transparente ou uma cor sólida.

## Situação atual

- **Aba Perfil** (`src/components/dashboard/SettingsTab.tsx`):
  - `handleImageUpload` aceita imagem de até 5 MB e abre o `ImageCropDialog` com um `objectURL`.
  - `handleCropComplete` apaga o avatar antigo do bucket `AVATARS_BUCKET` (`linkhub-avatars`), envia o novo como `${Date.now()}.jpg` com tipo `image/jpeg` fixo, grava `avatar_url` no perfil e chama `onProfileUpdate`.
- **Janela de recorte** (`src/components/dashboard/ImageCropDialog.tsx`): usa o `react-easy-crop` (aspecto 1, recorte redondo, zoom de 1 a 3, rotação de 0 a 360). `getCroppedImg` gira e recorta num canvas e devolve um JPEG de qualidade 0,9 no tamanho original do recorte, sem limite.
- **Onboarding** (`OnboardingDialog.tsx`): envia a foto sem janela de recorte.
- **Bucket `linkhub-avatars`**: público, limite de 2 MB, aceita `image/jpeg`, `image/png`, `image/webp` e `image/gif` (`deploy/vpsavila/linkhub_schema.sql:209-212`).
- **Defeito antigo:** `handleDeleteImage` (`SettingsTab.tsx`, por volta da linha 202) apaga no bucket `'avatars'`, que não é o do LinkHub, e o arquivo fica órfão em `linkhub-avatars`.
- **Biblioteca:** `@mediapipe/tasks-vision` 1.1.1, licença Apache-2.0. O modelo `selfie_multiclass_256x256` tem 15,6 MB (16.371.837 bytes, float32). O motor WASM tem 13,5 MB com SIMD (12,6 MB sem SIMD), e o loader `.js`, cerca de 334 KB.

## Decisões

| Tema | Decisão |
|---|---|
| Onde | Janela de recorte da aba Perfil, mais o botão "Remover fundo" da foto atual |
| Atrás da pessoa | Transparente (padrão) ou cor sólida, com atalhos para as cores do tema |
| Modelo | `selfie_multiclass_256x256` (mais preciso; ~30 MB no primeiro uso, ~20 MB pela rede com gzip no motor) |
| Hospedagem | Motor e modelo servidos pelo próprio domínio em caminho versionado, carregados sob demanda, fora do pré-cache do PWA |
| Fora | Onboarding, rembg no servidor, gradiente atrás da pessoa |

## Desenho

### 1. Módulo `src/utils/backgroundRemoval.ts`

Não importa nada do MediaPipe no topo. O carregamento é dinâmico, para não pesar no painel nem no perfil público.

- `MEDIAPIPE_VERSION = '1.1.1'`, `MEDIAPIPE_WASM_BASE = '/mediapipe/1.1.1/wasm'` e `MEDIAPIPE_MODEL_URL = '/mediapipe/1.1.1/models/selfie_multiclass_256x256.tflite'`. A versão no caminho evita que o cache de 30 dias misture arquivos de versões diferentes numa atualização futura.
- `loadSegmenter(): Promise<ImageSegmenter>`:
  - Faz `import('@mediapipe/tasks-vision')`, depois `FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_BASE)` e `ImageSegmenter.createFromOptions` com `baseOptions.modelAssetPath = MEDIAPIPE_MODEL_URL`, `delegate: 'CPU'`, `runningMode: 'IMAGE'`, `outputConfidenceMasks: true` e `outputCategoryMask: false`.
  - Guarda a Promise num cache do módulo: a segunda chamada reaproveita o segmentador.
  - Se falhar, limpa o cache, para permitir nova tentativa, e relança o erro.
  - Exporta `resetSegmenterForTests()`, que limpa o cache e só existe para os testes.
- `getBackgroundConfidence(segmenter, source: HTMLCanvasElement): { mask: Float32Array; width: number; height: number }`:
  - Roda `segmenter.segment(source)`. No Tasks, as máscaras já saem no tamanho da imagem de entrada, porque o pós-processamento reamostra.
  - Pega `result.confidenceMasks[0]` (categoria 0 = fundo no `selfie_multiclass_256x256`) e copia com `getAsFloat32Array().slice()`, lendo `mask.width` e `mask.height`.
  - Chama `result.close()` num `finally`. Sem isso, cada miniatura recalculada deixaria máscaras sem liberar.
  - Se o tamanho da máscara for diferente do canvas (só por defesa), a composição faz amostragem do vizinho mais próximo.
- `composeWithoutBackground(image: PixelBuffer, background: { mask: Float32Array; width: number; height: number }, fill: string | null): PixelBuffer` é uma **função pura**, com `PixelBuffer = { data: Uint8ClampedArray; width: number; height: number }`. A tipagem é estrutural porque o jsdom não tem `ImageData`.
  - O alfa da pessoa é `a = smoothstep(0.35, 0.65, 1 - conf)`. A suavização entre 0,35 e 0,65 evita a borda serrilhada no cabelo.
  - Com `fill = null`, o pixel mantém o RGB e o alfa vira `round(a × alfa_original)`.
  - Com `fill` em hex (normalizado por `normalizeHex`; se for inválido, vale como `null`): `rgb = a·rgb + (1-a)·fill` e alfa 255.
  - Não altera a entrada; devolve um buffer novo.
- `removeBackground(source: HTMLCanvasElement, fill: string | null): Promise<HTMLCanvasElement>` junta as funções acima. Só ela cria o `ImageData` real (`new ImageData(buffer.data, w, h)`) e o canvas de saída.
- `AVATAR_MAX_SIZE = 512`: o recorte com fundo removido é reduzido para no máximo 512×512 antes da segmentação. Esse tamanho é suficiente para o avatar (exibido com até 96 px, ou 192 px em tela de alta densidade) e mantém o PNG bem abaixo do limite de 2 MB.

### 2. Janela de recorte (`ImageCropDialog.tsx`)

- **Props novas, opcionais:**
  - `initialRemoveBackground?: boolean`;
  - `themeColors?: { background: string; button: string }`, com as cores para os atalhos;
  - `onCropComplete(blob: Blob)` continua igual, e o tipo do blob (`image/jpeg` ou `image/png`) diz ao chamador a extensão.
- As operações de canvas saem do componente para um módulo próprio, `src/utils/cropImage.ts`, que os testes simulam. No jsdom sem o pacote `canvas`, `getContext('2d')` devolve `null` e `toBlob` nunca responde. O módulo tem:
  - `getCroppedCanvas(imageSrc, pixelCrop, rotation)`: a lógica atual de `getCroppedImg`, devolvendo o canvas;
  - `scaleCanvas(canvas, maxSize)`: reduz mantendo a proporção, sem ampliar;
  - `canvasToBlob(canvas, type, quality?)`: com rejeição se o blob vier `null`.
- O `handleSave` usa essas funções:
  - **sem remoção de fundo:** JPEG 0,9, exatamente como hoje, sem redução de tamanho;
  - **com remoção:** `scaleCanvas(…, 512)`, `removeBackground` e PNG.
- **Bloco novo**, abaixo de zoom e rotação: interruptor **"Remover fundo"** (`Switch` com `Label`). Ao ligar:
  - **na primeira vez**, chama `loadSegmenter()` e mostra "Preparando remoção de fundo… (só na primeira vez, cerca de 30 MB)" com um spinner. O interruptor fica desabilitado durante o carregamento. O número fica acima do download real (cerca de 4 MB do motor com gzip mais 16 MB do modelo);
  - **miniatura do resultado:** um `<img>` redondo de 96 px sobre fundo xadrez (CSS), que mostra a transparência.
    - Ela é recalculada com espera de 300 ms depois de cada mudança de recorte, zoom, rotação ou fundo: `getCroppedCanvas`, depois `scaleCanvas(…, 256)`, `removeBackground`, `canvasToBlob('image/png')` e `URL.createObjectURL`.
    - O `objectURL` anterior é revogado a cada troca e ao fechar.
    - Nos testes, `URL.createObjectURL` e `URL.revokeObjectURL` são simulados (o jsdom não os tem) e a espera usa `vi.useFakeTimers()` ou `waitFor`;
  - **"Atrás da pessoa":** botões alternados **Transparente** (padrão) e **Cor**. Em "Cor" aparecem um `input type="color"` e três atalhos, com as cores do fundo do tema e do botão do tema (se vierem em `themeColors`) e o branco `#ffffff`. Os atalhos passam por `normalizeHex`, porque o `input type="color"` exige `#rrggbb`. Um atalho inválido não aparece.
- **Falha** no carregamento ou na segmentação (sem WebAssembly, sem WebGL, porque o caminho de imagem do Tasks usa WebGL mesmo com `delegate: 'CPU'`, sem rede no primeiro uso, erro do modelo):
  - aparece um toast "Não foi possível remover o fundo neste navegador.";
  - o interruptor volta a desligar e o recorte normal continua funcionando;
  - se o `handleSave` falhar com o fundo removido, mostra o mesmo toast e mantém a janela aberta.
- **Dois cliques em "Aplicar":** o botão já fica desabilitado durante o processamento (`isSaving`).

### 3. Aba Perfil (`SettingsTab.tsx`)

- **`handleCropComplete`:** a extensão e o `type` do `File` vêm do blob (`image/png` vira `.png`, e o resto continua `.jpg` com `image/jpeg`). O resto do fluxo não muda.
- **Botão "Remover fundo"**, ao lado de "Upload" e "Remover", quando houver `formData.avatar_url`:
  - Busca a imagem atual com `fetch(avatar_url, { cache: 'no-store' })` e transforma em `objectURL`, para não sujar o canvas com imagem de outra origem. O `no-store` impede o reaproveitamento de uma resposta guardada pelo `<img>` sem cabeçalho CORS.
  - Abre o `ImageCropDialog` com `initialRemoveBackground`.
  - Se o `fetch` falhar (por exemplo, avatar externo sem CORS), mostra o toast "Não foi possível abrir a foto atual. Envie a foto de novo para remover o fundo."
  - O `objectURL` é revogado quando a janela fecha.
- **`themeColors`** vem do `customTheme` do store (`useDesignStore`): o fundo é `getBaseBackgroundColor(customTheme)` e o botão é `resolveButtonColors(customTheme).bg`.
- **Correção do defeito antigo:** `handleDeleteImage` passa a usar `AVATARS_BUCKET` em vez de `'avatars'`.

### 4. Arquivos do MediaPipe no próprio domínio

- **Dependência nova:** `@mediapipe/tasks-vision`, com a versão fixa `1.1.1` (sem `^`).
- **Script `scripts/prepare-mediapipe.mjs`** (Node, sem dependências, funciona no Windows), rodado por `"prebuild"` e `"predev"` no `package.json`. O `build:dev` não aciona o `prebuild`, e isso fica registrado num comentário do script.
  - **Motor:** copia de `node_modules/@mediapipe/tasks-vision/wasm/` para `public/mediapipe/1.1.1/wasm/` só `vision_wasm_internal.{js,wasm}` e `vision_wasm_nosimd_internal.{js,wasm}`. A variante `_module_` só serve com `useModule` e fica de fora. Cada arquivo só é copiado se faltar ou se o tamanho for diferente, para não recopiar ~26 MB a cada `npm run dev`.
  - **Modelo:** se `public/mediapipe/1.1.1/models/selfie_multiclass_256x256.tflite` não existir com 16.371.837 bytes, baixa da versão fixa `https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite`. O download vai para um arquivo temporário **fora de `public/`** (`os.tmpdir()`), que só é movido para o destino se o tamanho bater. Se a conferência falhar, ele é apagado. Assim um download interrompido não vira arquivo corrompido permanente nem sobe parcial no `dist`.
  - **Falha no download:** avisa no console e não derruba o build. A função só fica indisponível, e a falha aparece no app como descrito no item 2.
  - O build roda no notebook (DEPLOY.md, passo 5): o download acontece uma vez e fica em `public/mediapipe/`.
- **`.gitignore`:** acrescentar `public/mediapipe/`, para não versionar ~43 MB.
- **PWA (`vite.config.ts`):** `workbox.globIgnores: ['**/mediapipe/**']`. O `globPatterns` atual pega `**/*.js`, e sem isso os loaders `.js` entrariam no pré-cache.
- **nginx (`deploy/vpsavila/nginx.conf`):**
  - `location /mediapipe/ { try_files $uri =404; add_header Cache-Control "public, max-age=2592000"; }`, para 30 dias de cache. A versão está no caminho. Não usar bloco `types {}` ali: o `mime.types` do nginx 1.27 já tem `application/wasm`, e um bloco `types` substituiria os demais tipos;
  - acrescentar `application/wasm` ao `gzip_types` (o wasm cai de 13,5 MB para cerca de 4 MB). O `.tflite` comprime pouco e não entra;
  - depois de alterar o arquivo, recriar o contêiner do nginx no deploy (`docker compose up -d --force-recreate`).

## Testes e verificação

- `src/utils/backgroundRemoval.test.ts`:
  - **`composeWithoutBackground`**, com buffers estruturais, sem `ImageData`:
    - pixel de fundo certo (`conf = 1`) fica com alfa 0, ou com a cor de preenchimento e alfa 255;
    - pixel de pessoa certa (`conf = 0`) fica intacto;
    - borda (`conf = 0.5`) fica parcial;
    - cor inválida vale como transparente;
    - máscara de outro tamanho usa o vizinho mais próximo;
    - não altera a entrada.
  - **`loadSegmenter`** (com `vi.mock` de `@mediapipe/tasks-vision` e `resetSegmenterForTests()` em `beforeEach`):
    - usa os caminhos locais versionados;
    - a segunda chamada reaproveita o segmentador;
    - depois de uma falha, a próxima chamada tenta de novo.
  - **`getBackgroundConfidence`**, com segmentador falso: copia a máscara 0 e chama `result.close()`, inclusive quando a leitura falha.
- `src/components/dashboard/ImageCropDialog.test.tsx`, em jsdom, simulando `@/utils/backgroundRemoval`, `@/utils/cropImage` e `react-easy-crop`. O `react-easy-crop` simulado chama `onCropComplete` com uma área fixa, porque o original só dispara depois de carregar a imagem, o que não acontece no jsdom. Os casos:
  - o interruptor mostra o carregamento e depois os controles;
  - na falha, aparece o toast e o interruptor desliga;
  - "Aplicar" com remoção entrega um blob `image/png`, e sem remoção entrega `image/jpeg`;
  - `initialRemoveBackground` já abre ligado;
  - os atalhos de cor aparecem normalizados.
- Testes existentes, `tsc` e `build` passando. O build precisa gerar `dist/mediapipe/1.1.1/wasm/*` (só as duas variantes) e `dist/mediapipe/1.1.1/models/*.tflite`, e o `dist/sw.js` não pode citar `mediapipe`.
- **No navegador**, com o login do usuário:
  - enviar uma foto de rosto, remover o fundo e salvar, conferindo que o perfil público mostra o avatar transparente sobre o fundo do tema;
  - fazer o mesmo com cor sólida;
  - usar o botão "Remover fundo" na foto atual;
  - simular falha com os arquivos indisponíveis.
- **Em produção não se salva nada sobre o avatar do usuário:** a verificação abre a janela, confere carregamento, miniatura, CORS da foto atual e atalhos de cor, e termina em "Cancelar". O salvamento é coberto pelos testes; um teste completo de salvamento só com conta de teste criada pelo usuário.

## Fora do escopo

- Onboarding com janela de recorte e remoção de fundo.
- Remoção no servidor (rembg) e qualquer API paga.
- Gradiente atrás da pessoa e ajuste fino manual da máscara (pincel).
- Processamento num Web Worker. O modelo de 256 px num recorte de até 512 px roda em poucas centenas de milissegundos na thread principal. Se isso travar em celulares fracos, é a evolução natural.
