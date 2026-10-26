import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APP_ROUTE_SEGMENTS, SW_NAVIGATE_FALLBACK_DENYLIST, isPublicProfilePath } from './serviceWorkerRoutes';

describe('isPublicProfilePath', () => {
  it('reconhece /:username como perfil público', () => {
    expect(isPublicProfilePath('/dna')).toBe(true);
    expect(isPublicProfilePath('/dna/')).toBe(true);
    expect(isPublicProfilePath('/Maria_Silva')).toBe(true);
  });
  it('não trata rotas do app como perfil', () => {
    for (const path of ['/', '', '/auth', '/auth/callback', '/auth/nova-senha', '/dashboard', '/admin', '/analytics', '/exemplo', '/install', '/privacy', '/Dashboard']) {
      expect(isPublicProfilePath(path)).toBe(false);
    }
  });
  it('APP_ROUTE_SEGMENTS acompanha as <Route> de src/App.tsx', () => {
    const app = readFileSync(fileURLToPath(new URL('../App.tsx', import.meta.url)), 'utf8');
    const paths = [...app.matchAll(/<Route\s+path="([^"]*)"/g)].map((m) => m[1]);
    const segments = paths
      .filter((p) => p !== '/' && p !== '/:username' && p !== '*')
      .map((p) => p.split('/').filter(Boolean)[0]);
    expect(segments.length).toBeGreaterThan(0);
    for (const seg of segments) expect(APP_ROUTE_SEGMENTS as readonly string[]).toContain(seg);
    for (const seg of APP_ROUTE_SEGMENTS) expect(segments).toContain(seg);
  });
});

describe('SW_NAVIGATE_FALLBACK_DENYLIST', () => {
  // O Workbox compara a lista com pathname + search da navegação
  const denied = (path: string) => SW_NAVIGATE_FALLBACK_DENYLIST.some((pattern) => pattern.test(path));

  it('as páginas de login sempre vêm da rede, nunca do index.html pré-cacheado', () => {
    for (const path of ['/auth', '/auth/', '/auth?x=1', '/auth/callback', '/auth/nova-senha', '/~oauth', '/~oauth/x']) {
      expect(denied(path), path).toBe(true);
    }
  });

  it('o resto do app continua com o index.html do pré-cache (funciona offline)', () => {
    for (const path of ['/', '/dashboard', '/analytics', '/admin', '/install', '/dna', '/authors', '/auth_x']) {
      expect(denied(path), path).toBe(false);
    }
  });

  it('o vite.config.ts entrega essa lista ao Workbox', () => {
    const config = readFileSync(fileURLToPath(new URL('../../vite.config.ts', import.meta.url)), 'utf8');
    expect(config).toMatch(/navigateFallbackDenylist:\s*\[\s*\.\.\.SW_NAVIGATE_FALLBACK_DENYLIST\s*\]/);
    expect(config).toMatch(/import\s*\{\s*SW_NAVIGATE_FALLBACK_DENYLIST\s*\}\s*from\s*["']\.\/src\/lib\/serviceWorkerRoutes["']/);
  });
});
