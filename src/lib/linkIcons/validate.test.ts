import { describe, expect, it } from 'vitest';
import { LINK_ICON_UPLOAD_PATH_RE } from './storagePrefix';
import { isValidIconValue } from './validate';

const uploadPrefix = 'https://supabase.example.test/storage/v1/object/public/linkhub-link-icons/';
const context = { url: 'https://example.com', uploadPrefix };

describe('isValidIconValue', () => {
  it('auto vale sempre', () => {
    expect(isValidIconValue('auto', null, context)).toBe(true);
    expect(isValidIconValue('auto', 'qualquer coisa', context)).toBe(true);
  });

  it('brand segue a regex do slug', () => {
    expect(isValidIconValue('brand', 'youtube', context)).toBe(true);
    expect(isValidIconValue('brand', 'uniqlo_ja', context)).toBe(true);
    expect(isValidIconValue('brand', 'a")b', context)).toBe(false);
    expect(isValidIconValue('brand', 'url(x)', context)).toBe(false);
    expect(isValidIconValue('brand', '../x', context)).toBe(false);
    expect(isValidIconValue('brand', 'YouTube', context)).toBe(false);
    expect(isValidIconValue('brand', '', context)).toBe(false);
    expect(isValidIconValue('brand', null, context)).toBe(false);
  });

  it('lucide segue a regex do nome', () => {
    expect(isValidIconValue('lucide', 'globe', context)).toBe(true);
    expect(isValidIconValue('lucide', 'building-2', context)).toBe(true);
    expect(isValidIconValue('lucide', '-x', context)).toBe(false);
    expect(isValidIconValue('lucide', 'a--b', context)).toBe(false);
    expect(isValidIconValue('lucide', 'x")', context)).toBe(false);
    expect(isValidIconValue('lucide', 'url(x)', context)).toBe(false);
    expect(isValidIconValue('lucide', '', context)).toBe(false);
    expect(isValidIconValue('lucide', null, context)).toBe(false);
  });

  it('emoji aceita um único emoji', () => {
    expect(isValidIconValue('emoji', '😀', context)).toBe(true);
    expect(isValidIconValue('emoji', '😀😀', context)).toBe(false);
    expect(isValidIconValue('emoji', 'abc', context)).toBe(false);
    expect(isValidIconValue('emoji', null, context)).toBe(false);
  });

  it('favicon depende de a URL do link ter site', () => {
    expect(isValidIconValue('favicon', null, { ...context, url: 'https://example.com' })).toBe(true);
    expect(isValidIconValue('favicon', null, { ...context, url: 'example.com' })).toBe(true);
    expect(isValidIconValue('favicon', null, { ...context, url: 'mailto:alguem@example.com' })).toBe(false);
    expect(isValidIconValue('favicon', null, { ...context, url: 'tel:+5511999999999' })).toBe(false);
    expect(isValidIconValue('favicon', null, { ...context, url: '' })).toBe(false);
  });

  it('upload exige o prefixo do bucket e um caminho limpo', () => {
    expect(isValidIconValue('upload', `${uploadPrefix}u1/7-123.png`, context)).toBe(true);
    expect(isValidIconValue('upload', 'https://outro.example.test/u1/7-123.png', context)).toBe(false);
    expect(
      isValidIconValue(
        'upload',
        'https://supabase.example.test/storage/v1/object/public/linkhub-avatars/u1/a.png',
        context,
      ),
    ).toBe(false);
    expect(isValidIconValue('upload', uploadPrefix, context)).toBe(false);
    expect(isValidIconValue('upload', `${uploadPrefix}u1/../u2/a.png`, context)).toBe(false);
    expect(isValidIconValue('upload', `${uploadPrefix}u1/a.png?x=1`, context)).toBe(false);
    expect(isValidIconValue('upload', `${uploadPrefix}u1/a.png#x`, context)).toBe(false);
    expect(isValidIconValue('upload', `${uploadPrefix}u1\\a.png`, context)).toBe(false);
    expect(isValidIconValue('upload', null, context)).toBe(false);
  });

  it('upload aceita só o caminho que o app gera: <user_id>/<link_id>-<timestamp>.<png|webp>', () => {
    expect(isValidIconValue('upload', `${uploadPrefix}u1/7-123.png`, context)).toBe(true);
    expect(isValidIconValue('upload', `${uploadPrefix}u1/7-123.webp`, context)).toBe(true);
    expect(
      isValidIconValue('upload', `${uploadPrefix}3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c/42-1761400000000.png`, context),
    ).toBe(true);
    expect(LINK_ICON_UPLOAD_PATH_RE.test('u1/7-123.png')).toBe(true);
  });

  it('upload recusa caminhos codificados, com controles, espaço ou outra extensão', () => {
    const invalid = [
      '%2e%2e/linkhub-avatars/u/a.png',
      '.%2E/.%2e/x',
      '.\t./x',
      '.\n./x',
      'u1/7 123.png',
      'u1/7-123.png ',
      'u1/7-123.svg',
      'u1/7-123.gif',
      'u1/a.png',
      'u1/7-123.PNG',
      '7-123.png',
      'u1/u2/7-123.png',
    ];
    for (const rest of invalid) {
      expect(isValidIconValue('upload', `${uploadPrefix}${rest}`, context), JSON.stringify(rest)).toBe(false);
      expect(LINK_ICON_UPLOAD_PATH_RE.test(rest), JSON.stringify(rest)).toBe(false);
    }
  });

  it('upload sem prefixo configurado é recusado', () => {
    expect(isValidIconValue('upload', 'u1/a.png', { ...context, uploadPrefix: '' })).toBe(false);
    expect(isValidIconValue('upload', 'u1/7-123.png', { ...context, uploadPrefix: '' })).toBe(false);
  });

  it('tipo desconhecido ou ausente é recusado', () => {
    expect(isValidIconValue('svg', 'x', context)).toBe(false);
    expect(isValidIconValue(null, null, context)).toBe(false);
    expect(isValidIconValue(undefined, null, context)).toBe(false);
  });
});
