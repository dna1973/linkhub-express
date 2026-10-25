import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BRAND_CATALOG_URL,
  LUCIDE_CATALOG_URL,
  LUCIDE_STATIC_VERSION,
  SIMPLE_ICONS_VERSION,
  brandIconUrl,
  lucideIconUrl,
} from './vendor';

// As versões dos ícones aparecem em três lugares. Se um ficar para trás, o app pede
// /vendor-icons/<versão>/ que o script não preparou.
const root = path.resolve(__dirname, '..', '..', '..');

describe('versões dos ícones servidos pelo domínio', () => {
  it('package.json, script de preparo e vendor.ts usam as mesmas versões', () => {
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    // Versão fixa, sem ^ ou ~: os SVGs servidos precisam ser exatamente os do pacote
    expect(pkg.devDependencies['simple-icons']).toBe(SIMPLE_ICONS_VERSION);
    expect(pkg.devDependencies['lucide-static']).toBe(LUCIDE_STATIC_VERSION);

    const script = readFileSync(path.join(root, 'scripts', 'prepare-icons.mjs'), 'utf8');
    expect(/const SIMPLE_ICONS_VERSION = '([^']+)'/.exec(script)?.[1]).toBe(SIMPLE_ICONS_VERSION);
    expect(/const LUCIDE_STATIC_VERSION = '([^']+)'/.exec(script)?.[1]).toBe(LUCIDE_STATIC_VERSION);
  });
});

describe('brandIconUrl', () => {
  it('monta o caminho versionado do SVG da marca', () => {
    expect(brandIconUrl('youtube')).toBe('/vendor-icons/simple-icons/16.35.0/youtube.svg');
    expect(brandIconUrl('uniqlo_ja')).not.toBeNull();
  });

  it('recusa slugs inválidos', () => {
    expect(brandIconUrl('a")b')).toBeNull();
    expect(brandIconUrl('../x')).toBeNull();
    expect(brandIconUrl('')).toBeNull();
    expect(brandIconUrl(null)).toBeNull();
    expect(brandIconUrl(undefined)).toBeNull();
  });
});

describe('lucideIconUrl', () => {
  it('monta o caminho versionado do SVG do Lucide', () => {
    expect(lucideIconUrl('building-2')).toBe('/vendor-icons/lucide/0.462.0/building-2.svg');
  });

  it('recusa nomes inválidos', () => {
    expect(lucideIconUrl('-x')).toBeNull();
    expect(lucideIconUrl('')).toBeNull();
    expect(lucideIconUrl(null)).toBeNull();
  });
});

describe('catálogos', () => {
  it('ficam ao lado dos SVGs de cada versão', () => {
    expect(BRAND_CATALOG_URL.endsWith('/catalog.json')).toBe(true);
    expect(LUCIDE_CATALOG_URL.endsWith('/catalog.json')).toBe(true);
    expect(BRAND_CATALOG_URL).toBe('/vendor-icons/simple-icons/16.35.0/catalog.json');
    expect(LUCIDE_CATALOG_URL).toBe('/vendor-icons/lucide/0.462.0/catalog.json');
  });
});
