// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canvasToBlob, getCroppedCanvas, resetCropImageCacheForTests, scaleCanvas } from './cropImage';

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
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((callback: BlobCallback) => callback(blob));

    await expect(canvasToBlob(canvasOf(1, 1), 'image/jpeg', 0.9)).resolves.toBe(blob);
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9);
  });

  it('JPEG: pinta de branco por baixo, porque o JPEG transformaria a transparência em preto', async () => {
    const calls: string[] = [];
    const ctx = {
      fillStyle: '',
      fillRect: vi.fn(() => calls.push(`fillRect ${ctx.fillStyle}`)),
      drawImage: vi.fn(() => calls.push('drawImage')),
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    let exported: HTMLCanvasElement | null = null;
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback: BlobCallback) {
      exported = this;
      callback(new Blob(['x'], { type: 'image/jpeg' }));
    });
    const source = canvasOf(300, 200);

    await canvasToBlob(source, 'image/jpeg', 0.9);

    // Exporta uma cópia opaca do mesmo tamanho: branco primeiro, a imagem por cima
    expect(exported).not.toBe(source);
    expect([exported!.width, exported!.height]).toEqual([300, 200]);
    expect(calls).toEqual(['fillRect #ffffff', 'drawImage']);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 300, 200);
    expect(ctx.drawImage).toHaveBeenCalledWith(source, 0, 0);
  });

  it('PNG: exporta o próprio canvas, com a transparência', async () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext');
    let exported: HTMLCanvasElement | null = null;
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback: BlobCallback) {
      exported = this;
      callback(new Blob(['x'], { type: 'image/png' }));
    });
    const source = canvasOf(10, 10);

    await canvasToBlob(source, 'image/png');
    expect(exported).toBe(source);
    expect(getContext).not.toHaveBeenCalled();
  });

  it('JPEG sem canvas 2D: rejeita em vez de exportar com fundo preto', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob');
    await expect(canvasToBlob(canvasOf(1, 1), 'image/jpeg', 0.9)).rejects.toThrow();
    expect(toBlob).not.toHaveBeenCalled();
  });

  it('rejeita quando o blob vem null', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback: BlobCallback) => callback(null));
    await expect(canvasToBlob(canvasOf(1, 1), 'image/png')).rejects.toThrow('Canvas toBlob failed');
  });
});

describe('getCroppedCanvas', () => {
  // O jsdom não carrega imagens: o Image simulado dispara onload (ou onerror) assim que recebe a src
  let images: FakeImage[] = [];
  let failNext = false;

  class FakeImage {
    width = 800;
    height = 600;
    crossOrigin = '';
    onload: (() => void) | null = null;
    onerror: ((err: unknown) => void) | null = null;
    private currentSrc = '';
    constructor() {
      images.push(this);
    }
    get src() {
      return this.currentSrc;
    }
    set src(value: string) {
      this.currentSrc = value;
      const fail = failNext;
      failNext = false;
      queueMicrotask(() => (fail ? this.onerror?.(new Error('falha ao carregar')) : this.onload?.()));
    }
  }

  const area = { x: 10, y: 20, width: 300, height: 200 };
  let ctx: { translate: ReturnType<typeof vi.fn>; rotate: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    images = [];
    failNext = false;
    resetCropImageCacheForTests();
    vi.stubGlobal('Image', FakeImage);
    ctx = { translate: vi.fn(), rotate: vi.fn(), drawImage: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetCropImageCacheForTests();
  });

  it('gira, recorta e devolve o canvas no tamanho do recorte', async () => {
    const canvas = await getCroppedCanvas('blob:foto', area, 90);

    expect([canvas.width, canvas.height]).toEqual([300, 200]);
    expect(images[0].crossOrigin).toBe('anonymous');
    expect(images[0].src).toBe('blob:foto');
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(ctx.drawImage).toHaveBeenNthCalledWith(1, images[0], -400, -300);
    expect(ctx.drawImage).toHaveBeenNthCalledWith(2, expect.any(HTMLCanvasElement), 10, 20, 300, 200, 0, 0, 300, 200);
  });

  it('decodifica a mesma src uma vez só e uma src diferente de novo', async () => {
    await getCroppedCanvas('blob:foto', area, 0);
    await getCroppedCanvas('blob:foto', { ...area, x: 50 }, 45);
    expect(images).toHaveLength(1);
    // As duas chamadas desenharam a mesma imagem decodificada
    expect(ctx.drawImage.mock.calls.filter(([source]) => source === images[0])).toHaveLength(2);

    await getCroppedCanvas('blob:outra', area, 0);
    expect(images).toHaveLength(2);
    expect(images[1].src).toBe('blob:outra');
  });

  it('se a carga falhar, limpa o cache e tenta de novo na próxima chamada', async () => {
    failNext = true;
    await expect(getCroppedCanvas('blob:foto', area, 0)).rejects.toThrow('falha ao carregar');

    await expect(getCroppedCanvas('blob:foto', area, 0)).resolves.toBeInstanceOf(HTMLCanvasElement);
    expect(images).toHaveLength(2);
  });
});
