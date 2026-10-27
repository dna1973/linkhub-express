import type { CSSProperties } from 'react';
import type { ThemeConfig } from '@/stores/useDesignStore';

/** Parte da config que define o botão. Tudo opcional: dados antigos podem vir incompletos. */
export interface LinkButtonConfig {
  buttonStyle?: Partial<ThemeConfig['buttonStyle']>;
  colors?: ThemeConfig['colors'];
}

type BorderRadius = NonNullable<ThemeConfig['buttonStyle']['borderRadius']>;

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** '#ABC' -> '#aabbcc'. Devolve null se não for hex válido. */
export function normalizeHex(color: string | null | undefined): string | null {
  if (!color) return null;
  const value = color.trim();
  if (!HEX_RE.test(value)) return null;
  const hex = value.slice(1).toLowerCase();
  if (hex.length === 3) return `#${hex.split('').map((c) => c + c).join('')}`;
  return `#${hex}`;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Contraste WCAG 2.x entre duas cores hex (de 1 a 21). null se alguma não for hex válido. */
export function getContrastRatio(a: string | null | undefined, b: string | null | undefined): number | null {
  const hexA = normalizeHex(a);
  const hexB = normalizeHex(b);
  if (!hexA || !hexB) return null;
  return contrastRatio(relativeLuminance(hexA), relativeLuminance(hexB));
}

/** Preto ou branco, o que tiver maior contraste (WCAG 2.x) com a cor dada. */
export function getContrastText(color: string | null | undefined): '#000000' | '#ffffff' {
  const hex = normalizeHex(color);
  if (!hex) return '#ffffff';
  const l = relativeLuminance(hex);
  return contrastRatio(l, 0) > contrastRatio(l, 1) ? '#000000' : '#ffffff';
}

/** Cor do botão e do texto do botão, já com reservas e modo automático. */
export function resolveButtonColors(config: LinkButtonConfig): { bg: string; text: string } {
  const bg = normalizeHex(config.buttonStyle?.color) ?? normalizeHex(config.colors?.primary) ?? '#ffffff';

  const textSetting = config.buttonStyle?.textColor;
  const manual = textSetting && textSetting !== 'auto' ? normalizeHex(textSetting) : null;
  if (manual) return { bg, text: manual };

  switch (config.buttonStyle?.type) {
    case 'solid':
      return { bg, text: getContrastText(bg) };
    case 'outline':
      return { bg, text: bg };
    default:
      return { bg, text: normalizeHex(config.colors?.text) ?? '#ffffff' };
  }
}

const RADIUS_PX: Record<BorderRadius, number> = { none: 0, sm: 4, md: 8, lg: 16, full: 9999 };

export function getButtonRadius(radius: string | undefined, radiusScale = 1): string {
  if (radius === 'full') return '9999px';
  const px = RADIUS_PX[radius as BorderRadius] ?? RADIUS_PX.md;
  return `${px * radiusScale}px`;
}

function getBaseButtonStyle(type: string | undefined, bg: string, text: string, borderRadius: string): CSSProperties {
  switch (type) {
    case 'solid':
      return { background: bg, borderWidth: '0px', borderStyle: 'solid', borderColor: bg, color: text, borderRadius };
    case 'outline':
      return { background: 'transparent', borderWidth: '2px', borderStyle: 'solid', borderColor: bg, color: text, borderRadius };
    case 'modern':
    case 'rounded':
      return {
        background: `linear-gradient(135deg, ${bg}20, ${bg}40)`,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: `${bg}50`,
        color: text,
        borderRadius,
      };
    default:
      return {
        background: 'rgba(255,255,255,0.1)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'rgba(255,255,255,0.2)',
        color: text,
        borderRadius,
      };
  }
}

/** Arredonda para 2 casas, para evitar valores como 7.200000000000001px */
function scaledPx(value: number, scale: number): string {
  return `${Math.round(value * scale * 100) / 100}px`;
}

/**
 * Estilo inline completo do botão de link. Única fonte de verdade para fundo, borda, cor e sombra.
 *
 * `options.radiusScale` reduz o raio da borda (exceto `full`) e também os deslocamentos e o
 * desfoque das sombras `hard` e `glow`, para a miniatura dos modelos ficar proporcional.
 */
export function getLinkButtonStyle(config: LinkButtonConfig, options: { radiusScale?: number } = {}): CSSProperties {
  const { bg, text } = resolveButtonColors(config);
  const scale = options.radiusScale ?? 1;
  const borderRadius = getButtonRadius(config.buttonStyle?.borderRadius, scale);
  const style = getBaseButtonStyle(config.buttonStyle?.type, bg, text, borderRadius);

  switch (config.buttonStyle?.shadow) {
    case 'soft':
      return { ...style, boxShadow: '0 4px 14px rgba(0,0,0,0.18)' };
    case 'hard': {
      // A borda dura sobrepõe a borda do estilo, para a sombra "colar" no botão
      const color = normalizeHex(config.buttonStyle?.shadowColor) ?? '#000000';
      return {
        ...style,
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: color,
        boxShadow: `${scaledPx(4, scale)} ${scaledPx(4, scale)} 0 ${color}`,
      };
    }
    case 'glow': {
      const color = normalizeHex(config.buttonStyle?.shadowColor) ?? bg;
      return { ...style, boxShadow: `0 0 ${scaledPx(18, scale)} ${color}99, 0 0 ${scaledPx(4, scale)} ${color}` };
    }
    default:
      return style;
  }
}

/** Classes que sobram depois do estilo inline (sem borda nem fundo). */
export function getLinkButtonClassName(type: string | undefined): string {
  return type === 'solid' || type === 'outline' ? 'hover:opacity-90' : 'backdrop-blur-sm hover:opacity-90';
}

/** Fundo da página do perfil. Mesma regra da página pública. */
export function getBackgroundStyle(config: Pick<Partial<ThemeConfig>, 'background'> | null | undefined): string {
  const background = config?.background;
  if (!background) return '#111827';
  if (background.type === 'gradient') {
    return `linear-gradient(135deg, ${background.colors?.[0] || '#111827'}, ${background.colors?.[1] || '#1f2937'})`;
  }
  return background.color || background.colors?.[0] || '#111827';
}
