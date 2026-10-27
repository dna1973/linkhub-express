import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { getLinkIconsPublicPrefix, LINK_ICONS_BUCKET } from './storagePrefix';

const PREFIXO = 'https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-link-icons/';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('LINK_ICONS_BUCKET', () => {
  it('é o bucket dos ícones dos links', () => {
    expect(LINK_ICONS_BUCKET).toBe('linkhub-link-icons');
  });
});

describe('getLinkIconsPublicPrefix', () => {
  it('monta o prefixo público a partir do VITE_SUPABASE_URL', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase-api.avila.ia.br');
    expect(getLinkIconsPublicPrefix()).toBe(PREFIXO);
  });

  it('remove a barra final do VITE_SUPABASE_URL', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase-api.avila.ia.br/');
    expect(getLinkIconsPublicPrefix()).toBe(PREFIXO);
  });

  it('bate com o getPublicUrl do cliente Supabase', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase-api.avila.ia.br');
    const cliente = createClient('https://supabase-api.avila.ia.br', 'chave-falsa', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const url = cliente.storage.from(LINK_ICONS_BUCKET).getPublicUrl('u1/a.png').data.publicUrl;
    expect(url.startsWith(getLinkIconsPublicPrefix())).toBe(true);
  });
});
