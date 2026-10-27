import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMMON_LUCIDE_ICONS,
  getBrandHex,
  loadBrandCatalog,
  loadLucideCatalog,
  resetCatalogCacheForTests,
  type BrandEntry,
  type LucideEntry,
} from './catalog';
import { BRAND_CATALOG_URL, BRAND_SLUG_RE, LUCIDE_CATALOG_URL } from './vendor';

const brandCatalog: BrandEntry[] = [
  { s: 'youtube', t: 'YouTube', h: '#123456' },
  { s: 'snapchat', t: 'Snapchat', h: '#fffc00' },
  { s: 'uniqlo_ja', t: 'Uniqlo', h: '#ff0000', a: ['ユニクロ'] },
  { s: 'dotnet', t: '.NET', h: '#512bd4', a: ['dot net'] },
];

const lucideCatalog: LucideEntry[] = [
  { n: 'globe', k: ['world', 'planeta'] },
  { n: 'house', k: ['home'] },
];

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 404, json: async () => body } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetCatalogCacheForTests();
  fetchMock = vi.fn(async (url: string) =>
    jsonResponse(url === BRAND_CATALOG_URL ? brandCatalog : lucideCatalog),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetCatalogCacheForTests();
});

describe('loadBrandCatalog', () => {
  it('faz um fetch só e devolve o mesmo catálogo nas chamadas seguintes', async () => {
    const [a, b] = await Promise.all([loadBrandCatalog(), loadBrandCatalog()]);
    const c = await loadBrandCatalog();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(BRAND_CATALOG_URL);
    expect(a).toEqual(brandCatalog);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('na falha, limpa o cache e rejeita; a chamada seguinte busca de novo', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(loadBrandCatalog()).rejects.toThrow('offline');
    await expect(loadBrandCatalog()).resolves.toEqual(brandCatalog);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('duas chamadas simultâneas que falham usam um fetch só; a terceira busca de novo', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const results = await Promise.allSettled([loadBrandCatalog(), loadBrandCatalog()]);
    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(loadBrandCatalog()).resolves.toEqual(brandCatalog);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('resposta que não é ok rejeita', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(null, false));
    await expect(loadBrandCatalog()).rejects.toThrow();
    await expect(loadBrandCatalog()).resolves.toEqual(brandCatalog);
  });

  it('todos os slugs do catálogo de teste passam na regex de brand', async () => {
    const entries = await loadBrandCatalog();
    for (const entry of entries) expect(BRAND_SLUG_RE.test(entry.s)).toBe(true);
  });
});

describe('loadLucideCatalog', () => {
  it('faz um fetch só', async () => {
    const [a, b] = await Promise.all([loadLucideCatalog(), loadLucideCatalog()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(LUCIDE_CATALOG_URL);
    expect(a).toEqual(lucideCatalog);
    expect(b).toBe(a);
  });

  it('na falha, limpa o cache e rejeita', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(loadLucideCatalog()).rejects.toThrow('offline');
    await expect(loadLucideCatalog()).resolves.toEqual(lucideCatalog);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('getBrandHex', () => {
  it('usa a tabela de detecção sem precisar do catálogo', () => {
    expect(getBrandHex('youtube')).toBe('#ff0000');
    expect(getBrandHex('discord')).toBe('#5865f2');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a linha lucide do LinkedIn não conta como marca', () => {
    expect(getBrandHex('linkedin')).toBeNull();
  });

  it('sem catálogo carregado, slug fora da tabela dá null', () => {
    expect(getBrandHex('snapchat')).toBeNull();
  });

  it('depois do catálogo carregado, usa o cache; a tabela continua na frente', async () => {
    await loadBrandCatalog();
    expect(getBrandHex('snapchat')).toBe('#fffc00');
    expect(getBrandHex('uniqlo_ja')).toBe('#ff0000');
    expect(getBrandHex('youtube')).toBe('#ff0000');
    expect(getBrandHex('naoexiste')).toBeNull();
  });

  it('o cache só guarda hex #rrggbb válido, em minúsculas', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { s: 'maiusculas', t: 'Maiúsculas', h: '#ABCDEF' },
        { s: 'semcerquilha', t: 'Sem cerquilha', h: 'abcdef' },
        { s: 'curto', t: 'Curto', h: '#abc' },
        { s: 'injecao', t: 'Injeção', h: '#000000;background:red' },
        { s: 'semhex', t: 'Sem hex' },
        { s: 42, t: 'Slug numérico', h: '#123456' },
        null,
      ]),
    );
    await loadBrandCatalog();
    expect(getBrandHex('maiusculas')).toBe('#abcdef');
    expect(getBrandHex('semcerquilha')).toBeNull();
    expect(getBrandHex('curto')).toBeNull();
    expect(getBrandHex('injecao')).toBeNull();
    expect(getBrandHex('semhex')).toBeNull();
    expect(getBrandHex('42')).toBeNull();
  });

  it('valor vazio ou ausente dá null', () => {
    expect(getBrandHex('')).toBeNull();
    expect(getBrandHex(null)).toBeNull();
    expect(getBrandHex(undefined)).toBeNull();
  });
});

describe('COMMON_LUCIDE_ICONS', () => {
  it('é a lista fixa da especificação, na ordem', () => {
    expect(COMMON_LUCIDE_ICONS).toEqual([
      'globe',
      'link',
      'mail',
      'phone',
      'map-pin',
      'calendar',
      'book-open',
      'file-text',
      'video',
      'music',
      'camera',
      'shopping-bag',
      'briefcase',
      'graduation-cap',
      'heart',
      'star',
      'house',
      'building-2',
      'wrench',
      'code',
      'rss',
      'podcast',
      'newspaper',
      'message-circle',
    ]);
  });

  it('tem os 24 ícones comuns, com house no lugar de home', () => {
    expect(COMMON_LUCIDE_ICONS).toHaveLength(24);
    expect(new Set(COMMON_LUCIDE_ICONS).size).toBe(24);
    expect(COMMON_LUCIDE_ICONS).toContain('house');
    expect(COMMON_LUCIDE_ICONS).not.toContain('home');
    expect(COMMON_LUCIDE_ICONS[0]).toBe('globe');
  });
});
