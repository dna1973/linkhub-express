// Catálogos de marcas e do Lucide, servidos em /vendor-icons/ e buscados uma vez por sessão.
import { DETECTION_TABLE } from './detect';
import { BRAND_CATALOG_URL, LUCIDE_CATALOG_URL } from './vendor';

/** Marca do Simple Icons: slug, título, hex `#rrggbb` e apelidos. */
export type BrandEntry = { s: string; t: string; h: string; a?: string[] };

/** Ícone do Lucide: nome e palavras-chave. */
export type LucideEntry = { n: string; k: string[] };

/** Ícones mostrados com a busca vazia (`house` no lugar de `home`, renomeado no lucide 0.462.0). */
export const COMMON_LUCIDE_ICONS: string[] = [
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
];

// Só as linhas brand: a linha lucide do LinkedIn não é um slug do Simple Icons.
const DETECTION_BRAND_HEX = new Map(
  DETECTION_TABLE.filter((entry) => entry.kind === 'brand' && entry.hex).map((entry) => [entry.value, entry.hex]),
);

let brandCatalogPromise: Promise<BrandEntry[]> | null = null;
let lucideCatalogPromise: Promise<LucideEntry[]> | null = null;
let brandHexBySlug: Map<string, string> | null = null;

async function fetchCatalog<T>(url: string): Promise<T[]> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Não foi possível carregar o catálogo de ícones (${response.status})`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Catálogo de ícones inválido');
  return data as T[];
}

export function loadBrandCatalog(): Promise<BrandEntry[]> {
  if (!brandCatalogPromise) {
    const promise = fetchCatalog<BrandEntry>(BRAND_CATALOG_URL).then(
      (entries) => {
        brandHexBySlug = new Map(entries.map((entry) => [entry.s, entry.h]));
        return entries;
      },
      (error) => {
        // Na falha, a próxima chamada tenta de novo
        if (brandCatalogPromise === promise) brandCatalogPromise = null;
        throw error;
      },
    );
    brandCatalogPromise = promise;
  }
  return brandCatalogPromise;
}

export function loadLucideCatalog(): Promise<LucideEntry[]> {
  if (!lucideCatalogPromise) {
    const promise = fetchCatalog<LucideEntry>(LUCIDE_CATALOG_URL).catch((error) => {
      if (lucideCatalogPromise === promise) lucideCatalogPromise = null;
      throw error;
    });
    lucideCatalogPromise = promise;
  }
  return lucideCatalogPromise;
}

/**
 * Hex oficial da marca: primeiro a tabela de detecção, depois o catálogo já carregado.
 * Síncrona: sem catálogo carregado, só a tabela responde.
 */
export function getBrandHex(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return DETECTION_BRAND_HEX.get(slug) ?? brandHexBySlug?.get(slug) ?? null;
}

export function resetCatalogCacheForTests(): void {
  brandCatalogPromise = null;
  lucideCatalogPromise = null;
  brandHexBySlug = null;
}
