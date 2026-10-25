import type { ThemeConfig } from '@/stores/useDesignStore';
import { getContrastRatio, normalizeHex, resolveButtonColors } from './linkButtonStyle';
import { getBaseBackgroundColor } from './profileAppearance';

// Contraste mínimo dos módulos contra o branco do cartão (o mesmo do WCAG AA para texto)
const MIN_CONTRAST = 4.5;

/**
 * Cor dos módulos do QR code: a primeira cor do tema legível sobre o cartão branco.
 * Ordem: texto, fundo de referência, botão. Nenhuma servindo, preto.
 */
export function getQrModuleColor(theme: ThemeConfig | null | undefined): string {
  const candidates = [
    theme?.colors?.text || '#ffffff',
    getBaseBackgroundColor(theme),
    resolveButtonColors(theme ?? {}).bg,
  ];
  for (const color of candidates) {
    const hex = normalizeHex(color);
    const ratio = getContrastRatio(hex, '#ffffff');
    if (hex && ratio !== null && ratio >= MIN_CONTRAST) return hex;
  }
  return '#000000';
}
