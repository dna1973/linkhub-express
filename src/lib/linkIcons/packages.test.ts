import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COMMON_LUCIDE_ICONS } from './catalog';
import { DETECTION_TABLE } from './detect';
import { BRAND_SLUG_RE, LUCIDE_NAME_RE } from './vendor';

// Confere as regex, a lista fixa e a tabela de detecção contra os pacotes instalados
// (simple-icons e lucide-static, as mesmas versões servidas em /vendor-icons/).
const root = path.resolve(__dirname, '..', '..', '..');
const simpleIconsDir = path.join(root, 'node_modules', 'simple-icons');
const lucideIconsDir = path.join(root, 'node_modules', 'lucide-static', 'icons');

type SimpleIcon = { slug: string; hex: string };
const simpleIcons: SimpleIcon[] = JSON.parse(
  readFileSync(path.join(simpleIconsDir, 'data', 'simple-icons.json'), 'utf8'),
);

describe('pacotes de ícones instalados', () => {
  it('todo slug do Simple Icons passa na regex de brand', () => {
    expect(simpleIcons.length).toBe(3466);
    const invalid = simpleIcons.map((icon) => icon.slug).filter((slug) => !BRAND_SLUG_RE.test(slug));
    expect(invalid).toEqual([]);
  });

  it('todo arquivo do lucide-static passa na regex de lucide', () => {
    const names = readdirSync(lucideIconsDir)
      .filter((file) => file.endsWith('.svg'))
      .map((file) => file.slice(0, -'.svg'.length));
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !LUCIDE_NAME_RE.test(name))).toEqual([]);
  });

  it('cada ícone comum tem SVG no lucide-static', () => {
    const missing = COMMON_LUCIDE_ICONS.filter((name) => !existsSync(path.join(lucideIconsDir, `${name}.svg`)));
    expect(missing).toEqual([]);
  });

  it('cada linha brand da detecção tem SVG e o mesmo hex do Simple Icons', () => {
    const bySlug = new Map(simpleIcons.map((icon) => [icon.slug, icon]));
    for (const entry of DETECTION_TABLE.filter((item) => item.kind === 'brand')) {
      expect(existsSync(path.join(simpleIconsDir, 'icons', `${entry.value}.svg`)), entry.value).toBe(true);
      const icon = bySlug.get(entry.value);
      expect(icon, entry.value).toBeDefined();
      expect(entry.hex, entry.value).toBe(`#${icon!.hex.toLowerCase()}`);
    }
  });

  it('as linhas lucide da detecção (LinkedIn) e o e-mail existem no Lucide', () => {
    expect(existsSync(path.join(lucideIconsDir, 'linkedin.svg'))).toBe(true);
    expect(existsSync(path.join(lucideIconsDir, 'mail.svg'))).toBe(true);
    for (const entry of DETECTION_TABLE.filter((item) => item.kind === 'lucide')) {
      expect(existsSync(path.join(lucideIconsDir, `${entry.value}.svg`)), entry.value).toBe(true);
    }
  });
});
