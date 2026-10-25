// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSvgAspect,
  linkIconPathFromUrl,
  prepareIconUpload,
  prepareSvgForRaster,
  rasterizeSvgToPng,
  validateIconFile,
} from './storage';
import { LINK_ICONS_PUBLIC_PREFIX } from './storagePrefix';

const KB = 1024;

function fileOf(size: number, name: string, type: string): File {
  return new File([new Uint8Array(size)], name, { type });
}

function svgFile(text: string, name = 'icone.svg', type = 'image/svg+xml'): File {
  return new File([text], name, { type });
}

// O jsdom 25 não tem Blob.text(): lê pelo FileReader
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function parseRoot(svgText: string): Element {
  return new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
}

describe('linkIconPathFromUrl', () => {
  it('devolve o caminho quando o arquivo é do próprio usuário', () => {
    expect(linkIconPathFromUrl(`${LINK_ICONS_PUBLIC_PREFIX}u1/7-123.png`, 'u1', LINK_ICONS_PUBLIC_PREFIX)).toBe('u1/7-123.png');
  });

  it('recusa o arquivo de outro usuário', () => {
    expect(linkIconPathFromUrl(`${LINK_ICONS_PUBLIC_PREFIX}u2/7-123.png`, 'u1', LINK_ICONS_PUBLIC_PREFIX)).toBeNull();
    // Prefixo do id não basta: "u10/" não é "u1/"
    expect(linkIconPathFromUrl(`${LINK_ICONS_PUBLIC_PREFIX}u10/7-123.png`, 'u1', LINK_ICONS_PUBLIC_PREFIX)).toBeNull();
  });

  it('recusa caminho com ..', () => {
    expect(linkIconPathFromUrl(`${LINK_ICONS_PUBLIC_PREFIX}u1/../u2/7-123.png`, 'u1', LINK_ICONS_PUBLIC_PREFIX)).toBeNull();
    expect(linkIconPathFromUrl(`${LINK_ICONS_PUBLIC_PREFIX}u1/%2e%2e/u2/7-123.png`, 'u1', LINK_ICONS_PUBLIC_PREFIX)).toBeNull();
  });

  it('recusa URL de outro bucket ou de fora do storage', () => {
    const otherBucket = LINK_ICONS_PUBLIC_PREFIX.replace('linkhub-link-icons', 'linkhub-avatars');
    expect(linkIconPathFromUrl(`${otherBucket}u1/7-123.png`, 'u1', LINK_ICONS_PUBLIC_PREFIX)).toBeNull();
    expect(linkIconPathFromUrl('https://example.com/u1/7-123.png', 'u1', LINK_ICONS_PUBLIC_PREFIX)).toBeNull();
    expect(linkIconPathFromUrl(null, 'u1', LINK_ICONS_PUBLIC_PREFIX)).toBeNull();
  });
});

describe('validateIconFile', () => {
  it('reconhece o tipo pelo MIME', () => {
    expect(validateIconFile(fileOf(10, 'a.png', 'image/png'))).toEqual({ ok: true, kind: 'png' });
    expect(validateIconFile(fileOf(10, 'a.webp', 'image/webp'))).toEqual({ ok: true, kind: 'webp' });
    expect(validateIconFile(fileOf(10, 'a.svg', 'image/svg+xml'))).toEqual({ ok: true, kind: 'svg' });
  });

  it('usa a extensão quando o MIME vem vazio', () => {
    expect(validateIconFile(fileOf(10, 'A.PNG', ''))).toEqual({ ok: true, kind: 'png' });
    expect(validateIconFile(fileOf(10, 'a.webp', ''))).toEqual({ ok: true, kind: 'webp' });
    expect(validateIconFile(fileOf(10, 'a.svg', ''))).toEqual({ ok: true, kind: 'svg' });
  });

  it('recusa outros tipos', () => {
    const error = { ok: false, error: 'Use PNG, WebP ou SVG' };
    expect(validateIconFile(fileOf(10, 'a.jpg', 'image/jpeg'))).toEqual(error);
    expect(validateIconFile(fileOf(10, 'a.gif', ''))).toEqual(error);
    // MIME diferente vence a extensão
    expect(validateIconFile(fileOf(10, 'a.png', 'image/jpeg'))).toEqual(error);
  });

  it('limita PNG e WebP a 512 KB, mas não o SVG (conferido depois da conversão)', () => {
    expect(validateIconFile(fileOf(512 * KB, 'a.png', 'image/png'))).toEqual({ ok: true, kind: 'png' });
    const tooBig = { ok: false, error: 'A imagem deve ter no máximo 512 KB' };
    expect(validateIconFile(fileOf(512 * KB + 1, 'a.png', 'image/png'))).toEqual(tooBig);
    expect(validateIconFile(fileOf(512 * KB + 1, 'a.webp', 'image/webp'))).toEqual(tooBig);
    expect(validateIconFile(fileOf(2048 * KB, 'a.svg', 'image/svg+xml'))).toEqual({ ok: true, kind: 'svg' });
  });
});

describe('getSvgAspect', () => {
  it('usa o viewBox, separado por espaço ou vírgula', () => {
    expect(getSvgAspect('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"/>')).toEqual({ width: 200, height: 100 });
    expect(getSvgAspect('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,24,48" width="10" height="10"/>')).toEqual({
      width: 24,
      height: 48,
    });
  });

  it('ignora viewBox inválido e cai no width/height da raiz', () => {
    expect(getSvgAspect('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 0 100" width="30" height="60"/>')).toEqual({
      width: 30,
      height: 60,
    });
    expect(getSvgAspect('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 abc 10" width="30px" height="15px"/>')).toEqual({
      width: 30,
      height: 15,
    });
  });

  it('usa só width/height quando não há viewBox', () => {
    expect(getSvgAspect('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"/>')).toEqual({ width: 64, height: 32 });
  });

  it('sem nada utilizável, fica 1:1', () => {
    expect(getSvgAspect('<svg xmlns="http://www.w3.org/2000/svg"/>')).toEqual({ width: 1, height: 1 });
    expect(getSvgAspect('<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="50%"/>')).toEqual({ width: 1, height: 1 });
    expect(getSvgAspect('isto não é svg')).toEqual({ width: 1, height: 1 });
  });
});

describe('prepareSvgForRaster', () => {
  it('grava width e height com o lado maior no tamanho pedido', () => {
    const wide = parseRoot(prepareSvgForRaster('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect/></svg>'));
    expect(wide.localName).toBe('svg');
    expect([wide.getAttribute('width'), wide.getAttribute('height')]).toEqual(['256', '128']);
    expect(wide.getAttribute('viewBox')).toBe('0 0 200 100');
    expect(wide.getElementsByTagName('rect')).toHaveLength(1);

    const tall = parseRoot(prepareSvgForRaster('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 48"/>', 64));
    expect([tall.getAttribute('width'), tall.getAttribute('height')]).toEqual(['32', '64']);
  });

  it('sem viewBox, cria um a partir de width/height para o desenho acompanhar o tamanho novo', () => {
    const root = parseRoot(prepareSvgForRaster('<svg xmlns="http://www.w3.org/2000/svg" width="50" height="100"/>'));
    expect([root.getAttribute('width'), root.getAttribute('height')]).toEqual(['128', '256']);
    expect(root.getAttribute('viewBox')).toBe('0 0 50 100');
  });

  it('SVG sem tamanho nenhum sai quadrado', () => {
    const root = parseRoot(prepareSvgForRaster('<svg xmlns="http://www.w3.org/2000/svg"/>'));
    expect([root.getAttribute('width'), root.getAttribute('height')]).toEqual(['256', '256']);
  });

  it('recusa XML quebrado e raiz que não é svg', () => {
    expect(() => prepareSvgForRaster('<svg xmlns="http://www.w3.org/2000/svg"><g></svg>')).toThrow('Não foi possível ler este SVG');
    expect(() => prepareSvgForRaster('<html><body/></html>')).toThrow('Não foi possível ler este SVG');
    expect(() => prepareSvgForRaster('')).toThrow('Não foi possível ler este SVG');
  });
});

describe('conversão e redução no canvas', () => {
  // O jsdom não tem URL.createObjectURL/revokeObjectURL nem canvas 2D: tudo simulado
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let ctx: { drawImage: ReturnType<typeof vi.fn>; imageSmoothingQuality: string };
  let exported: HTMLCanvasElement[];
  let toBlobResult: (type: string) => Blob | null;

  beforeEach(() => {
    let n = 0;
    createObjectURL = vi.fn(() => `blob:fake-${++n}`);
    revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true, writable: true });

    ctx = { drawImage: vi.fn(), imageSmoothingQuality: 'low' };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);

    exported = [];
    toBlobResult = (type) => new Blob(['png'], { type });
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string
    ) {
      exported.push(this);
      callback(toBlobResult(type ?? 'image/png'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (URL as unknown as Record<string, unknown>).createObjectURL;
    delete (URL as unknown as Record<string, unknown>).revokeObjectURL;
  });

  const wideSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><circle r="5"/></svg>';

  describe('rasterizeSvgToPng', () => {
    it('desenha o SVG preparado num canvas do tamanho final e devolve PNG', async () => {
      const image = { width: 256, height: 128 };
      const loadImage = vi.fn(async () => image);

      const blob = await rasterizeSvgToPng(svgFile(wideSvg), 256, loadImage);

      expect(blob.type).toBe('image/png');
      expect(exported).toHaveLength(1);
      expect([exported[0].width, exported[0].height]).toEqual([256, 128]);
      expect(ctx.drawImage).toHaveBeenCalledWith(image, 0, 0, 256, 128);

      // Carrega por objectURL blob: (nunca data:) de um SVG já com tamanho explícito
      expect(loadImage).toHaveBeenCalledWith('blob:fake-1');
      const svgBlob = createObjectURL.mock.calls[0][0] as Blob;
      expect(svgBlob.type).toBe('image/svg+xml');
      const root = parseRoot(await readBlob(svgBlob));
      expect([root.getAttribute('width'), root.getAttribute('height')]).toEqual(['256', '128']);

      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-1');
    });

    it('blob null vira "Não foi possível converter este SVG" e a objectURL é revogada', async () => {
      toBlobResult = () => null;
      await expect(rasterizeSvgToPng(svgFile(wideSvg), 256, async () => ({ width: 256, height: 128 }))).rejects.toThrow(
        'Não foi possível converter este SVG'
      );
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-1');
    });

    it('canvas sujo (SecurityError) vira "Não foi possível converter este SVG"', async () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(() => {
        throw new DOMException('Tainted canvases may not be exported.', 'SecurityError');
      });
      await expect(rasterizeSvgToPng(svgFile(wideSvg), 256, async () => ({ width: 256, height: 128 }))).rejects.toThrow(
        'Não foi possível converter este SVG'
      );
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-1');
    });

    it('SVG ilegível falha antes de criar a objectURL', async () => {
      const loadImage = vi.fn();
      await expect(rasterizeSvgToPng(svgFile('<svg><g></svg>'), 256, loadImage)).rejects.toThrow('Não foi possível ler este SVG');
      expect(createObjectURL).not.toHaveBeenCalled();
      expect(loadImage).not.toHaveBeenCalled();
    });
  });

  describe('prepareIconUpload', () => {
    it('SVG vira PNG de 256 px', async () => {
      const result = await prepareIconUpload(svgFile(wideSvg, 'logo.svg', ''), {
        loadImage: async () => ({ width: 256, height: 128 }),
      });
      expect(result.ext).toBe('png');
      expect(result.contentType).toBe('image/png');
      expect(result.blob.type).toBe('image/png');
      expect([exported[0].width, exported[0].height]).toEqual([256, 128]);
    });

    it('PNG convertido do SVG acima de 512 KB é recusado', async () => {
      toBlobResult = (type) => new Blob([new Uint8Array(512 * KB + 1)], { type });
      await expect(prepareIconUpload(svgFile(wideSvg), { loadImage: async () => ({ width: 256, height: 128 }) })).rejects.toThrow(
        'A imagem deve ter no máximo 512 KB'
      );
    });

    it('PNG de 100 px sai igual: o mesmo File, sem passar pelo canvas', async () => {
      const file = fileOf(100, 'a.png', 'image/png');
      const result = await prepareIconUpload(file, { loadImage: async () => ({ width: 100, height: 100 }) });
      expect(result.blob).toBe(file);
      expect(result.ext).toBe('png');
      expect(result.contentType).toBe('image/png');
      expect(exported).toHaveLength(0);
      expect(createObjectURL).toHaveBeenCalledWith(file);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-1');
    });

    it('PNG de 1024 px é reduzido para 256 px no tipo original', async () => {
      const image = { width: 1024, height: 1024 };
      const result = await prepareIconUpload(fileOf(100, 'a.png', 'image/png'), { loadImage: async () => image });
      expect(result.ext).toBe('png');
      expect(result.contentType).toBe('image/png');
      expect(result.blob.type).toBe('image/png');
      expect(exported).toHaveLength(1);
      expect([exported[0].width, exported[0].height]).toEqual([256, 256]);
      expect(ctx.drawImage).toHaveBeenCalledWith(image, 0, 0, 1024, 1024);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-1');
    });

    it('WebP grande continua WebP, na proporção', async () => {
      const result = await prepareIconUpload(fileOf(100, 'a.webp', ''), { loadImage: async () => ({ width: 1024, height: 512 }) });
      expect(result.ext).toBe('webp');
      expect(result.contentType).toBe('image/webp');
      expect(result.blob.type).toBe('image/webp');
      expect([exported[0].width, exported[0].height]).toEqual([256, 128]);
    });

    it('sem canvas 2D, devolve o arquivo original', async () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
      const file = fileOf(100, 'a.png', 'image/png');
      const result = await prepareIconUpload(file, { loadImage: async () => ({ width: 1024, height: 1024 }) });
      expect(result.blob).toBe(file);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-1');
    });

    it('recusa tipo e tamanho inválidos com as mensagens da validação', async () => {
      const loadImage = vi.fn();
      await expect(prepareIconUpload(fileOf(10, 'a.jpg', 'image/jpeg'), { loadImage })).rejects.toThrow('Use PNG, WebP ou SVG');
      await expect(prepareIconUpload(fileOf(512 * KB + 1, 'a.png', 'image/png'), { loadImage })).rejects.toThrow(
        'A imagem deve ter no máximo 512 KB'
      );
      expect(loadImage).not.toHaveBeenCalled();
    });
  });
});
