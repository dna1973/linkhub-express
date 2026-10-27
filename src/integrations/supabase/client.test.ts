// @vitest-environment jsdom
// Cliente de verdade (sem mock do createClient): só o fetch é falso.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

const USER = { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'ana@exemplo.com', app_metadata: {}, user_metadata: {} };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function linkHash(type: string) {
  const now = Math.round(Date.now() / 1000);
  return `#access_token=tok&expires_in=3600&expires_at=${now + 3600}&refresh_token=r1&token_type=bearer&type=${type}`;
}

async function loadClient(url: string) {
  window.history.replaceState(null, '', url);
  const { supabase } = await import('./client');
  const recovery = await import('@/lib/passwordRecovery');
  return { supabase, recovery };
}

let stopRefresh: (() => Promise<void>) | null = null;

beforeEach(() => {
  vi.resetModules();
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url.endsWith('/auth/v1/user')) return json(USER);
      if (url.includes('/auth/v1/logout')) return new Response(null, { status: 204 });
      return json({}, 404);
    }),
  );
});
afterEach(async () => {
  await stopRefresh?.();
  stopRefresh = null;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('cliente do Supabase: marca da recuperação de senha', () => {
  it('o PASSWORD_RECOVERY do link marca a conta; sair apaga a marca', async () => {
    const { supabase, recovery } = await loadClient(`/auth/nova-senha${linkHash('recovery')}`);
    stopRefresh = () => supabase.auth.stopAutoRefresh();
    const { data } = await supabase.auth.getSession();
    expect(data.session?.user.id).toBe('u1');
    await waitFor(() => expect(recovery.getRecoveryUserId()).toBe('u1'));

    await supabase.auth.signOut({ scope: 'local' });
    expect(recovery.getRecoveryUserId()).toBeNull();
  });

  it('entrar por outro link (magic link) não marca a conta', async () => {
    const { supabase, recovery } = await loadClient(`/auth/callback${linkHash('magiclink')}`);
    stopRefresh = () => supabase.auth.stopAutoRefresh();
    await supabase.auth.getSession();
    await new Promise((r) => setTimeout(r, 10));
    expect(recovery.getRecoveryUserId()).toBeNull();
  });

  it('lembra o #error da página de senha nova antes de o cliente tocar na URL', async () => {
    const { supabase, recovery } = await loadClient('/auth/nova-senha#error=access_denied&error_code=otp_expired&error_description=Link+expirado');
    stopRefresh = () => supabase.auth.stopAutoRefresh();
    window.history.replaceState(null, '', '/auth/nova-senha');
    expect(recovery.getRecoveryLinkError()).toBe('Link expirado');
  });
});
