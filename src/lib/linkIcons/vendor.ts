// Versões fixas: as mesmas do package.json (devDependencies) e de scripts/prepare-icons.mjs
export const SIMPLE_ICONS_VERSION = '16.35.0';
export const LUCIDE_STATIC_VERSION = '0.462.0';

export const BRAND_SLUG_RE = /^[a-z0-9_]+$/;
export const LUCIDE_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const BRAND_BASE = `/vendor-icons/simple-icons/${SIMPLE_ICONS_VERSION}`;
const LUCIDE_BASE = `/vendor-icons/lucide/${LUCIDE_STATIC_VERSION}`;

// A versão do formato do catálogo vai no nome do arquivo (o mesmo CATALOG_NAME de scripts/prepare-icons.mjs)
export const BRAND_CATALOG_URL = `${BRAND_BASE}/catalog.v1.json`;
export const LUCIDE_CATALOG_URL = `${LUCIDE_BASE}/catalog.v1.json`;

export function brandIconUrl(slug: string | null | undefined): string | null {
  return slug && BRAND_SLUG_RE.test(slug) ? `${BRAND_BASE}/${slug}.svg` : null;
}

export function lucideIconUrl(name: string | null | undefined): string | null {
  return name && LUCIDE_NAME_RE.test(name) ? `${LUCIDE_BASE}/${name}.svg` : null;
}
