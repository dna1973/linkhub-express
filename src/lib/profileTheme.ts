import type { ThemeConfig } from '@/stores/useDesignStore';
import { resolveThemeConfig } from '@/utils/themes';

/**
 * Tema salvo em `theme_options` de um perfil, já resolvido. Sem tema salvo (ou com
 * `theme_options` que não é um objeto), devolve null: quem chama decide o padrão.
 */
export function profileThemeOf(
  profile: { theme_options?: unknown } | null | undefined,
): { themeId: string; config: ThemeConfig } | null {
  const raw = profile?.theme_options;
  const options = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, any>) : null;
  const config = resolveThemeConfig(options);
  if (!config) return null;
  return { themeId: options.themeId || 'custom', config };
}
