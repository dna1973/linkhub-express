import { describe, expect, it } from 'vitest';
import { isPublicProfilePath } from './serviceWorkerRoutes';

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
});
