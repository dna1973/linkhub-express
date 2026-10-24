import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { APP_ROUTE_SEGMENTS, isPublicProfilePath } from './serviceWorkerRoutes';

describe('isPublicProfilePath', () => {
  it('reconhece /:username como perfil público', () => {
    expect(isPublicProfilePath('/dna')).toBe(true);
    expect(isPublicProfilePath('/dna/')).toBe(true);
    expect(isPublicProfilePath('/Maria_Silva')).toBe(true);
  });
  it('não trata rotas do app como perfil', () => {
    for (const path of ['/', '', '/auth', '/auth/callback', '/dashboard', '/admin', '/analytics', '/exemplo', '/install', '/privacy', '/Dashboard']) {
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
