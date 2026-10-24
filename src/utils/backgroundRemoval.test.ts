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
    const opaque = row([10, 20, 30, 255]);
    expect(pixel(composeWithoutBackground(opaque, background(0), '#ff0000'), 0)).toEqual([10, 20, 30, 255]);
  });

  it('com cor, o alfa original pesa na mistura: pixel transparente da pessoa vira a cor', () => {
    const image = row([0, 0, 0, 0], [10, 20, 30, 255]);
    const out = composeWithoutBackground(image, background(0, 0), '#ff0000');
    expect(pixel(out, 0)).toEqual([255, 0, 0, 255]);
    expect(pixel(out, 1)).toEqual([10, 20, 30, 255]);
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
