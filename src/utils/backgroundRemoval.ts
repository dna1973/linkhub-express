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
