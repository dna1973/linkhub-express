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

/**
 * Navegações que o service worker não responde com o index.html pré-cacheado: vão sempre à rede.
 * - /~oauth: callbacks de OAuth.
 * - /auth, /auth/callback, /auth/nova-senha: o link do e-mail chega com o token no hash, e o
 *   supabase-js do bundle que abrir a página o consome. Um index.html pré-cacheado de um deploy
 *   antigo (sem a rota nova nem o listener do PASSWORD_RECOVERY) gastava o link e, depois do
 *   recarregamento do service worker novo, a conta caía no painel. Offline, essas páginas não
 *   abrem (login precisa de rede de qualquer jeito).
 * O Workbox compara com pathname + search.
 */
export const SW_NAVIGATE_FALLBACK_DENYLIST: RegExp[] = [/^\/~oauth/, /^\/auth(?:[/?]|$)/];
