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
