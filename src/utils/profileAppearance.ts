import type { CSSProperties } from 'react';
import type { ThemeConfig } from '@/stores/useDesignStore';
import { normalizeHex } from './linkButtonStyle';

/** Parte da config que define o fundo. Tudo opcional: dados antigos podem vir incompletos. */
export type BackgroundSource = Pick<Partial<ThemeConfig>, 'background' | 'colors'> | null | undefined;

export type FontFamily = ThemeConfig['font']['family'];

const DEFAULT_BACKGROUND = '#111827';
const DEFAULT_GRADIENT_END = '#1f2937';

/**
 * Camada de padrão, desenhada por cima do fundo (sólido, gradiente ou o legado 'pattern').
 * A cor é colors.text com alfa 1f (~12%), com reserva branca.
 */
export function getPatternLayerStyle(config: BackgroundSource): CSSProperties | null {
  const pattern = config?.background?.pattern;
  if (!pattern || pattern === 'none') return null;
  const color = `${normalizeHex(config?.colors?.text) ?? '#ffffff'}1f`;

  switch (pattern) {
    case 'dots':
      return { backgroundImage: `radial-gradient(circle, ${color} 1.5px, transparent 1.5px)`, backgroundSize: '18px 18px' };
    case 'grid':
      return {
        backgroundImage: `linear-gradient(${color} 1px, transparent 1px), linear-gradient(90deg, ${color} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      };
    case 'waves':
      return {
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${color} 10px, ${color} 20px)`,
        backgroundSize: 'auto',
      };
    case 'stripes':
      return { backgroundImage: `linear-gradient(90deg, ${color} 1px, transparent 1px)`, backgroundSize: '12px 12px' };
    default:
      return null;
  }
}

export interface BackgroundLayer {
  style: CSSProperties;
  className?: string;
}

/**
 * Camada de fundo do perfil.
 *
 * Não usa o atalho `background`: com ele, uma atualização do React zera o `background-size`
 * e a animação do gradiente para de ter efeito.
 */
export function getBackgroundLayer(config: BackgroundSource): BackgroundLayer {
  const background = config?.background;
  if (!background) return { style: { backgroundColor: DEFAULT_BACKGROUND } };

  if (background.type === 'gradient') {
    const backgroundImage = `linear-gradient(135deg, ${background.colors?.[0] || DEFAULT_BACKGROUND}, ${background.colors?.[1] || DEFAULT_GRADIENT_END})`;
    if (background.animated === true) {
      return { style: { backgroundImage, backgroundSize: '200% 200%' }, className: 'linkhub-gradient-animated' };
    }
    return { style: { backgroundImage } };
  }

  // Sólido e o legado 'pattern': mesma reserva do getBackgroundStyle
  return { style: { backgroundColor: background.color || background.colors?.[0] || DEFAULT_BACKGROUND } };
}

/** Cor sólida de referência do fundo: a do sólido ou a primeira do gradiente. */
export function getBaseBackgroundColor(config: BackgroundSource): string {
  const background = config?.background;
  if (!background) return DEFAULT_BACKGROUND;
  if (background.type === 'gradient') return background.colors?.[0] || DEFAULT_BACKGROUND;
  return background.color || background.colors?.[0] || DEFAULT_BACKGROUND;
}

/** Formato do avatar. Vale para a raiz do Avatar e para o AvatarFallback. */
export function getAvatarShapeStyle(shape: string | undefined): CSSProperties {
  switch (shape) {
    case 'rounded':
      return { borderRadius: '28%' };
    case 'hexagon':
      // O recorte esconderia a borda, então ela sai
      return {
        clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)',
        borderRadius: 0,
        borderWidth: 0,
      };
    default:
      return { borderRadius: '9999px' };
  }
}

/** Única lista de família CSS por fonte: usada pelo perfil, pela miniatura dos modelos e pelo editor. */
export const FONT_FAMILY_CSS: Record<FontFamily, string> = {
  inter: 'Inter, system-ui, sans-serif',
  playfair: 'Playfair Display, serif',
  poppins: 'Poppins, sans-serif',
  'roboto-mono': 'Roboto Mono, monospace',
  'dancing-script': 'Dancing Script, cursive',
  montserrat: 'Montserrat, sans-serif',
  lora: 'Lora, serif',
  'source-code-pro': 'Source Code Pro, monospace',
};

const FONT_WEIGHTS: Record<ThemeConfig['font']['weight'], number> = { light: 300, normal: 400, medium: 500, bold: 700 };

/** Peso numérico. undefined quando não há peso: quem usa mantém o peso atual do elemento. */
export function getFontWeight(weight: string | undefined): number | undefined {
  return weight ? FONT_WEIGHTS[weight as ThemeConfig['font']['weight']] : undefined;
}

const TEXT_SIZES: Record<ThemeConfig['font']['size'], { bio: string; button: string }> = {
  sm: { bio: 'text-sm', button: 'text-base' },
  md: { bio: 'text-base', button: 'text-lg' },
  lg: { bio: 'text-lg', button: 'text-xl' },
};

/** Tamanho da bio e do texto dos botões. md (padrão) reproduz a página pública atual. */
export function getTextSizeClasses(size: string | undefined): { bio: string; button: string } {
  return TEXT_SIZES[size as ThemeConfig['font']['size']] ?? TEXT_SIZES.md;
}
