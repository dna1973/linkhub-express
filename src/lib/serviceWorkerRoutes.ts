/**
 * Primeiro segmento de cada rota do app que não é perfil público.
 * Mantenha em sincronia com as <Route> de src/App.tsx.
 */
export const APP_ROUTE_SEGMENTS = ['auth', 'dashboard', 'admin', 'analytics', 'exemplo', 'install', 'privacy'] as const;

/** true quando o caminho é /:username (um segmento que não é rota do app). */
export function isPublicProfilePath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 1) return false;
  return !(APP_ROUTE_SEGMENTS as readonly string[]).includes(segments[0].toLowerCase());
}
