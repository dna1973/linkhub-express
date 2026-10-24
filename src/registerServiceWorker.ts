import { isPublicProfilePath } from '@/lib/serviceWorkerRoutes';

/**
 * O visitante de /:username não precisa do app instalável. Sem o service worker,
 * ele não baixa em segundo plano os arquivos do painel.
 */
export function registerServiceWorkerOutsidePublicProfile(pathname: string = window.location.pathname): void {
  if (isPublicProfilePath(pathname)) return;
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW())
    .catch((error) => console.error('Falha ao registrar o service worker:', error));
}
