import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ThemeConfig } from '@/stores/useDesignStore';
import { getBaseBackgroundColor } from '@/utils/profileAppearance';
import { LINK_ICONS_PUBLIC_PREFIX } from './storagePrefix';
import { getOfficialHex, getProfileIconBackgrounds, resolveLinkIcon } from './resolve';
import { brandIconUrl, lucideIconUrl } from './vendor';
import { resetCatalogCacheForTests, loadBrandCatalog } from './catalog';
import { getContrastRatio } from '@/utils/linkButtonStyle';

// Envolve o getContrastRatio real, para um teste forçar o contraste de exatamente 3,0
vi.mock('@/utils/linkButtonStyle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/linkButtonStyle')>();
  return { ...actual, getContrastRatio: vi.fn(actual.getContrastRatio) };
});

const options = { defaultColor: '#ffffff', uploadPrefix: LINK_ICONS_PUBLIC_PREFIX };
const uploadUrl = `${LINK_ICONS_PUBLIC_PREFIX}u1/7-123.png`;

describe('resolveLinkIcon: tipos', () => {
  it('auto com marca detectada desenha a máscara da marca, com título e hex', () => {
    expect(resolveLinkIcon({ url: 'https://youtube.com/@dna', icon_type: 'auto' }, options)).toEqual({
      kind: 'mask',
      src: brandIconUrl('youtube'),
      color: '#ffffff',
      label: 'YouTube',
      hex: '#ff0000',
    });
  });

  it('auto com LinkedIn detectado desenha o Lucide com o hex oficial', () => {
    expect(resolveLinkIcon({ url: 'https://www.linkedin.com/in/dna' }, options)).toEqual({
      kind: 'mask',
      src: lucideIconUrl('linkedin'),
      color: '#ffffff',
      label: 'LinkedIn',
      hex: '#0a66c2',
    });
  });

  it('auto sem marca usa o favicon', () => {
    expect(resolveLinkIcon({ url: 'https://example.com' }, options)).toEqual({
      kind: 'image',
      src: 'https://www.google.com/s2/favicons?domain=example.com&sz=64',
      source: 'favicon',
    });
  });

  it('auto sem marca e sem favicon cai no globe', () => {
    expect(resolveLinkIcon({ url: 'tel:+5511999999999', icon_type: 'auto' }, options)).toEqual({
      kind: 'mask',
      src: lucideIconUrl('globe'),
      color: '#ffffff',
      label: 'Ícone do link',
      hex: null,
    });
  });

  it('icon_type ausente, nulo ou desconhecido vira auto', () => {
    const expected = resolveLinkIcon({ url: 'https://github.com/dna', icon_type: 'auto' }, options);
    expect(expected).toMatchObject({ kind: 'mask', label: 'GitHub' });
    expect(resolveLinkIcon({ url: 'https://github.com/dna' }, options)).toEqual(expected);
    expect(resolveLinkIcon({ url: 'https://github.com/dna', icon_type: null, icon_value: null }, options)).toEqual(
      expected,
    );
    expect(resolveLinkIcon({ url: 'https://github.com/dna', icon_type: 'svg', icon_value: 'x' }, options)).toEqual(
      expected,
    );
  });

  it('brand da tabela de detecção traz título e hex', () => {
    expect(resolveLinkIcon({ url: 'https://example.com', icon_type: 'brand', icon_value: 'spotify' }, options)).toEqual({
      kind: 'mask',
      src: brandIconUrl('spotify'),
      color: '#ffffff',
      label: 'Spotify',
      hex: '#1ed760',
    });
  });

  it('brand fora da tabela usa o slug como rótulo e não conhece o hex', () => {
    expect(resolveLinkIcon({ url: 'https://example.com', icon_type: 'brand', icon_value: 'figma' }, options)).toEqual({
      kind: 'mask',
      src: brandIconUrl('figma'),
      color: '#ffffff',
      label: 'figma',
      hex: null,
    });
  });

  it('lucide usa o nome do ícone como rótulo', () => {
    expect(resolveLinkIcon({ url: 'https://example.com', icon_type: 'lucide', icon_value: 'map-pin' }, options)).toEqual({
      kind: 'mask',
      src: lucideIconUrl('map-pin'),
      color: '#ffffff',
      label: 'map-pin',
      hex: null,
    });
  });

  it('lucide linkedin escolhido à mão conhece o hex da tabela', () => {
    expect(
      resolveLinkIcon({ url: 'https://example.com', icon_type: 'lucide', icon_value: 'linkedin' }, options),
    ).toMatchObject({ kind: 'mask', label: 'LinkedIn', hex: '#0a66c2' });
  });

  it('emoji devolve o próprio valor e ignora a cor', () => {
    expect(
      resolveLinkIcon(
        { url: 'https://example.com', icon_type: 'emoji', icon_value: '🚀', accent_color: '#ff0000' },
        options,
      ),
    ).toEqual({ kind: 'emoji', value: '🚀' });
  });

  it('favicon escolhido usa o serviço de favicon', () => {
    expect(resolveLinkIcon({ url: 'https://www.github.com/dna', icon_type: 'favicon' }, options)).toEqual({
      kind: 'image',
      src: 'https://www.google.com/s2/favicons?domain=github.com&sz=64',
      source: 'favicon',
    });
  });

  it('favicon sem host possível cai em auto e chega ao globe', () => {
    expect(resolveLinkIcon({ url: 'tel:123', icon_type: 'favicon' }, options)).toMatchObject({
      kind: 'mask',
      src: lucideIconUrl('globe'),
    });
  });

  it('upload devolve o icon_value com source upload', () => {
    expect(resolveLinkIcon({ url: 'https://example.com', icon_type: 'upload', icon_value: uploadUrl }, options)).toEqual({
      kind: 'image',
      src: uploadUrl,
      source: 'upload',
    });
  });
});

describe('resolveLinkIcon: valores inválidos caem em auto', () => {
  it.each([
    ['brand', 'you")tube'],
    ['brand', 'url(x)'],
    ['lucide', 'Map Pin'],
    ['emoji', 'texto'],
    ['emoji', '😀😀'],
    ['upload', 'https://outro.exemplo/u1/7.png'],
    ['upload', `${LINK_ICONS_PUBLIC_PREFIX}../x.png`],
    ['brand', null],
  ])('%s com %s', (icon_type, icon_value) => {
    expect(resolveLinkIcon({ url: 'https://youtu.be/abc', icon_type, icon_value }, options)).toMatchObject({
      kind: 'mask',
      src: brandIconUrl('youtube'),
      label: 'YouTube',
    });
  });

  it('upload com outro prefixo nas opções não é aceito', () => {
    expect(
      resolveLinkIcon(
        { url: 'https://example.com', icon_type: 'upload', icon_value: uploadUrl },
        { ...options, uploadPrefix: 'https://outro.exemplo/storage/' },
      ),
    ).toMatchObject({ kind: 'image', source: 'favicon' });
  });
});

describe('resolveLinkIcon: cor da máscara', () => {
  const youtube = { url: 'https://youtube.com/@dna' };

  it('sem accent_color usa defaultColor', () => {
    expect(resolveLinkIcon(youtube, { ...options, defaultColor: '#1f2937' })).toMatchObject({ color: '#1f2937' });
  });

  it('accent_color normalizada vence defaultColor sem fundos', () => {
    expect(resolveLinkIcon({ ...youtube, accent_color: '#F00' }, options)).toMatchObject({ color: '#ff0000' });
  });

  it('accent_color inválida cai em defaultColor', () => {
    expect(resolveLinkIcon({ ...youtube, accent_color: 'vermelho' }, options)).toMatchObject({ color: '#ffffff' });
  });

  it('accent_color com contraste menor que 3:1 contra o botão escuro cai em defaultColor', () => {
    // #000000 sobre #111827: 1,18:1
    expect(
      resolveLinkIcon({ url: 'https://x.com/dna', accent_color: '#000000' }, { ...options, backgrounds: ['#111827'] }),
    ).toMatchObject({ color: '#ffffff' });
  });

  it('com dois fundos (gradiente) fica com o pior contraste', () => {
    const link = { url: 'https://wa.me/5511', accent_color: '#25d366' };
    // #25d366: 8,33 contra #0b1f3a e 1,90 contra #f8fafc
    expect(resolveLinkIcon(link, { ...options, backgrounds: ['#0b1f3a', '#f8fafc'] })).toMatchObject({
      color: '#ffffff',
    });
    expect(resolveLinkIcon(link, { ...options, backgrounds: ['#0b1f3a'] })).toMatchObject({ color: '#25d366' });
  });

  it('limite de 3:1: logo acima mantém a cor, logo abaixo cai em defaultColor', () => {
    const above = getContrastRatio('#949494', '#ffffff');
    const below = getContrastRatio('#959595', '#ffffff');
    expect(above).toBeGreaterThanOrEqual(3);
    expect(above).toBeLessThan(3.05);
    expect(below).toBeLessThan(3);
    expect(below).toBeGreaterThan(2.95);
    const opts = { ...options, defaultColor: '#1f2937', backgrounds: ['#ffffff'] };
    expect(resolveLinkIcon({ ...youtube, accent_color: '#949494' }, opts)).toMatchObject({ color: '#949494' });
    expect(resolveLinkIcon({ ...youtube, accent_color: '#959595' }, opts)).toMatchObject({ color: '#1f2937' });
  });

  it('contraste de exatamente 3,0 mantém a cor (só "menor que 3:1" cai)', () => {
    vi.mocked(getContrastRatio).mockReturnValueOnce(3);
    expect(
      resolveLinkIcon(
        { ...youtube, accent_color: '#25d366' },
        { ...options, defaultColor: '#1f2937', backgrounds: ['#ffffff'] },
      ),
    ).toMatchObject({ color: '#25d366' });
    expect(getContrastRatio).toHaveBeenCalledWith('#25d366', '#ffffff');
  });

  it('contraste incalculável (null) cai em defaultColor', () => {
    expect(
      resolveLinkIcon({ ...youtube, accent_color: '#25d366' }, { ...options, backgrounds: ['rgba(0,0,0,0.5)'] }),
    ).toMatchObject({ color: '#ffffff' });
  });

  it('lista de fundos vazia não restringe a cor', () => {
    expect(resolveLinkIcon({ ...youtube, accent_color: '#25d366' }, { ...options, backgrounds: [] })).toMatchObject({
      color: '#25d366',
    });
  });

  it('o globe de reserva também usa accent_color', () => {
    expect(resolveLinkIcon({ url: 'tel:1', accent_color: '#25d366' }, options)).toMatchObject({
      src: lucideIconUrl('globe'),
      color: '#25d366',
    });
  });

  it('imagem ignora a cor', () => {
    expect(resolveLinkIcon({ url: 'https://example.com', accent_color: '#25d366' }, options)).not.toHaveProperty(
      'color',
    );
  });
});

describe('getProfileIconBackgrounds', () => {
  const base: ThemeConfig = {
    background: { type: 'solid', color: '#f8fafc' },
    buttonStyle: { type: 'solid', color: '#111827' },
    font: { family: 'inter', size: 'md', weight: 'normal' },
    colors: { primary: '#2563eb', text: '#0f172a' },
  };

  it('tema null usa #111827', () => {
    expect(getProfileIconBackgrounds(null)).toEqual(['#111827']);
    expect(getProfileIconBackgrounds(undefined)).toEqual(['#111827']);
  });

  it('botão solid usa o fundo do botão', () => {
    expect(getProfileIconBackgrounds(base)).toEqual(['#111827']);
  });

  it('botão solid sem cor própria usa a reserva do resolveButtonColors', () => {
    expect(getProfileIconBackgrounds({ ...base, buttonStyle: { type: 'solid' } })).toEqual(['#2563eb']);
  });

  it.each(['outline', 'glass', 'modern', 'rounded'] as const)('botão %s com fundo sólido usa o fundo da página', (type) => {
    expect(getProfileIconBackgrounds({ ...base, buttonStyle: { type, color: '#111827' } })).toEqual(['#f8fafc']);
  });

  it('fundo gradiente usa as duas cores', () => {
    expect(
      getProfileIconBackgrounds({
        ...base,
        buttonStyle: { type: 'glass' },
        background: { type: 'gradient', colors: ['#0b1f3a', '#f8fafc'] },
      }),
    ).toEqual(['#0b1f3a', '#f8fafc']);
  });

  it('gradiente sem cores usa as reservas do getBackgroundLayer', () => {
    expect(
      getProfileIconBackgrounds({ ...base, buttonStyle: { type: 'outline' }, background: { type: 'gradient', colors: [] } }),
    ).toEqual(['#111827', '#1f2937']);
    expect(
      getProfileIconBackgrounds({
        ...base,
        buttonStyle: { type: 'outline' },
        background: { type: 'gradient', colors: ['', '#ffffff'] },
      }),
    ).toEqual(['#111827', '#ffffff']);
  });

  it('background.type desconhecido cai no getBaseBackgroundColor', () => {
    const theme = {
      ...base,
      buttonStyle: { type: 'glass' },
      background: { type: 'video', color: '#0b1f3a', colors: ['#f8fafc', '#000000'] },
    } as unknown as ThemeConfig;
    expect(getProfileIconBackgrounds(theme)).toEqual([getBaseBackgroundColor(theme)]);
    expect(getProfileIconBackgrounds(theme)).toEqual(['#0b1f3a']);
  });

  it('sem buttonStyle (glass, o padrão do ProfileView) usa o fundo da página', () => {
    expect(getProfileIconBackgrounds({ background: { type: 'solid', color: '#0b1f3a' } } as ThemeConfig)).toEqual([
      '#0b1f3a',
    ]);
  });
});

describe('getOfficialHex', () => {
  afterEach(() => {
    resetCatalogCacheForTests();
    vi.unstubAllGlobals();
  });

  it('brand da tabela usa o hex da tabela', () => {
    expect(getOfficialHex({ url: 'https://example.com', icon_type: 'brand', icon_value: 'whatsapp' })).toBe('#25d366');
  });

  it('brand fora da tabela, sem catálogo carregado, dá null', () => {
    expect(getOfficialHex({ url: 'https://example.com', icon_type: 'brand', icon_value: 'figma' })).toBeNull();
  });

  it('brand fora da tabela usa o catálogo carregado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, status: 200, json: async () => [{ s: 'figma', t: 'Figma', h: '#f24e1e' }] })),
    );
    await loadBrandCatalog();
    expect(getOfficialHex({ url: 'https://example.com', icon_type: 'brand', icon_value: 'figma' })).toBe('#f24e1e');
  });

  it('lucide linkedin dá o hex da linha lucide da tabela', () => {
    expect(getOfficialHex({ url: 'https://example.com', icon_type: 'lucide', icon_value: 'linkedin' })).toBe('#0a66c2');
  });

  it('lucide mail e outros dão null', () => {
    expect(getOfficialHex({ url: 'mailto:a@b.com', icon_type: 'lucide', icon_value: 'mail' })).toBeNull();
    expect(getOfficialHex({ url: 'https://youtube.com', icon_type: 'lucide', icon_value: 'globe' })).toBeNull();
  });

  it('auto usa o hex da detecção', () => {
    expect(getOfficialHex({ url: 'https://youtube.com/@dna', icon_type: 'auto' })).toBe('#ff0000');
    expect(getOfficialHex({ url: 'https://lnkd.in/x' })).toBe('#0a66c2');
    expect(getOfficialHex({ url: 'mailto:a@b.com', icon_type: 'auto' })).toBeNull();
    expect(getOfficialHex({ url: 'https://example.com', icon_type: 'auto' })).toBeNull();
  });

  it('valor inválido cai em auto', () => {
    expect(getOfficialHex({ url: 'https://t.me/dna', icon_type: 'brand', icon_value: 'Bad Slug' })).toBe('#26a5e4');
    expect(getOfficialHex({ url: 'https://t.me/dna', icon_type: 'emoji', icon_value: 'texto' })).toBe('#26a5e4');
  });

  it('emoji, favicon e upload dão null', () => {
    expect(getOfficialHex({ url: 'https://youtube.com', icon_type: 'emoji', icon_value: '🚀' })).toBeNull();
    expect(getOfficialHex({ url: 'https://youtube.com', icon_type: 'favicon', icon_value: null })).toBeNull();
    expect(getOfficialHex({ url: 'https://youtube.com', icon_type: 'upload', icon_value: uploadUrl })).toBeNull();
  });
});
