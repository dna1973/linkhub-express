// Decide o que desenhar no ícone de um link: máscara (marca ou Lucide), emoji ou imagem.
// Não importa @/lib/supabase: o prefixo dos uploads vem de storagePrefix.ts.
import type { ThemeConfig } from '@/stores/useDesignStore';
import { getContrastRatio, normalizeHex, resolveButtonColors } from '@/utils/linkButtonStyle';
import { getBaseBackgroundColor } from '@/utils/profileAppearance';
import { getBrandHex } from './catalog';
import { DETECTION_TABLE, detectIconFromUrl, getFaviconUrl } from './detect';
import { LINK_ICONS_PUBLIC_PREFIX } from './storagePrefix';
import { isValidIconValue, type IconType } from './validate';
import { brandIconUrl, lucideIconUrl } from './vendor';

export type LinkIconSource = {
  url: string;
  icon_type?: string | null;
  icon_value?: string | null;
  accent_color?: string | null;
};

export type ResolveLinkIconOptions = {
  /** Cor usada sem accent_color ou quando o contraste fica abaixo de 3:1. */
  defaultColor: string;
  /** Fundos sobre os quais o ícone aparece; vale o pior contraste. */
  backgrounds?: string[];
  /** Prefixo público do bucket de ícones (LINK_ICONS_PUBLIC_PREFIX). */
  uploadPrefix: string;
};

export type ResolvedIcon =
  | { kind: 'mask'; src: string; color: string; label: string; hex: string | null }
  | { kind: 'emoji'; value: string }
  | { kind: 'image'; src: string; source: 'favicon' | 'upload' };

const ICON_TYPES: IconType[] = ['auto', 'brand', 'lucide', 'emoji', 'favicon', 'upload'];
const MIN_CONTRAST = 3;
const DEFAULT_LABEL = 'Ícone do link';
const DEFAULT_BACKGROUND = '#111827';
const DEFAULT_GRADIENT_END = '#1f2937';

/** Tipo que vale de fato: ausente, desconhecido ou com valor inválido vira `auto`. */
function getEffectiveType(link: LinkIconSource, uploadPrefix: string): IconType {
  const type = link.icon_type as IconType;
  if (!type || !ICON_TYPES.includes(type)) return 'auto';
  return isValidIconValue(type, link.icon_value, { url: link.url, uploadPrefix }) ? type : 'auto';
}

function findDetectionEntry(kind: 'brand' | 'lucide', value: string) {
  return DETECTION_TABLE.find((entry) => entry.kind === kind && entry.value === value) ?? null;
}

function resolveMaskColor(accentColor: string | null | undefined, options: ResolveLinkIconOptions): string {
  const color = normalizeHex(accentColor) ?? options.defaultColor;
  const backgrounds = options.backgrounds ?? [];
  if (backgrounds.length === 0) return color;
  let worst = Infinity;
  for (const background of backgrounds) {
    const ratio = getContrastRatio(color, background);
    if (ratio === null) return options.defaultColor;
    worst = Math.min(worst, ratio);
  }
  return worst < MIN_CONTRAST ? options.defaultColor : color;
}

export function resolveLinkIcon(link: LinkIconSource, options: ResolveLinkIconOptions): ResolvedIcon {
  const type = getEffectiveType(link, options.uploadPrefix);
  const mask = (src: string | null, label: string, hex: string | null): ResolvedIcon => ({
    kind: 'mask',
    // O globe é a última reserva: os valores já foram validados, então src só falta por engano
    src: src ?? lucideIconUrl('globe'),
    color: resolveMaskColor(link.accent_color, options),
    label,
    hex,
  });
  const faviconOrGlobe = (): ResolvedIcon => {
    const favicon = getFaviconUrl(link.url);
    return favicon ? { kind: 'image', src: favicon, source: 'favicon' } : mask(lucideIconUrl('globe'), DEFAULT_LABEL, null);
  };

  switch (type) {
    case 'brand': {
      const entry = findDetectionEntry('brand', link.icon_value);
      return mask(brandIconUrl(link.icon_value), entry?.title ?? link.icon_value, entry?.hex ?? null);
    }
    case 'lucide': {
      const entry = findDetectionEntry('lucide', link.icon_value);
      return mask(lucideIconUrl(link.icon_value), entry?.title ?? link.icon_value, entry?.hex ?? null);
    }
    case 'emoji':
      return { kind: 'emoji', value: link.icon_value };
    case 'favicon':
      return faviconOrGlobe();
    case 'upload':
      return { kind: 'image', src: link.icon_value, source: 'upload' };
    default: {
      const detected = detectIconFromUrl(link.url);
      if (!detected) return faviconOrGlobe();
      const src = detected.kind === 'brand' ? brandIconUrl(detected.value) : lucideIconUrl(detected.value);
      return mask(src, detected.title, detected.hex);
    }
  }
}

/**
 * A única fonte do "hex oficial" de um link (regra "acompanha a marca" e o AccentColorPicker).
 * Na marca, usa também o catálogo já carregado; o lucide só conhece as linhas da tabela.
 */
export function getOfficialHex(
  link: Pick<LinkIconSource, 'url' | 'icon_type' | 'icon_value'>,
  uploadPrefix: string = LINK_ICONS_PUBLIC_PREFIX,
): string | null {
  switch (getEffectiveType(link, uploadPrefix)) {
    case 'brand':
      return getBrandHex(link.icon_value);
    case 'lucide':
      return findDetectionEntry('lucide', link.icon_value)?.hex ?? null;
    case 'auto':
      return detectIconFromUrl(link.url)?.hex ?? null;
    default:
      return null;
  }
}

export type IconBackgroundTheme =
  | {
      background?: ThemeConfig['background'];
      buttonStyle?: Partial<ThemeConfig['buttonStyle']>;
      colors?: ThemeConfig['colors'];
    }
  | null
  | undefined;

/**
 * Fundos sobre os quais o ícone aparece no ProfileView: o do botão sólido; nos outros estilos,
 * o da página (as duas cores no gradiente, com as reservas do getBackgroundLayer).
 */
export function getProfileIconBackgrounds(theme: IconBackgroundTheme): string[] {
  if (!theme) return [DEFAULT_BACKGROUND];
  if (theme.buttonStyle?.type === 'solid') return [resolveButtonColors(theme).bg];
  const background = theme.background;
  if (background?.type === 'gradient') {
    return [background.colors?.[0] || DEFAULT_BACKGROUND, background.colors?.[1] || DEFAULT_GRADIENT_END];
  }
  return [getBaseBackgroundColor(theme)];
}
