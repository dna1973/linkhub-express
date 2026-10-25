import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { AVATARS_BUCKET, AVATARS_PUBLIC_PREFIX, avatarPathFromUrl, getAvatarsPublicPrefix } from './avatarStorage';

const PREFIXO = 'https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-avatars/';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('prefixo público dos avatares', () => {
  it('é o bucket linkhub-avatars', () => {
    expect(AVATARS_BUCKET).toBe('linkhub-avatars');
  });

  it('monta o prefixo a partir do VITE_SUPABASE_URL, com ou sem barra no fim', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase-api.avila.ia.br');
    expect(getAvatarsPublicPrefix()).toBe(PREFIXO);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase-api.avila.ia.br/');
    expect(getAvatarsPublicPrefix()).toBe(PREFIXO);
  });

  it('bate com o getPublicUrl do cliente Supabase', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase-api.avila.ia.br');
    const cliente = createClient('https://supabase-api.avila.ia.br', 'chave-falsa', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const url = cliente.storage.from(AVATARS_BUCKET).getPublicUrl('p1/1.jpg').data.publicUrl;
    expect(url.startsWith(getAvatarsPublicPrefix())).toBe(true);
  });
});

describe('avatarPathFromUrl', () => {
  const url = (rest: string) => `${AVATARS_PUBLIC_PREFIX}${rest}`;

  it('devolve o caminho de uma foto na pasta do perfil', () => {
    expect(avatarPathFromUrl(url('p1/1700000000000.jpg'), 'p1')).toBe('p1/1700000000000.jpg');
    expect(avatarPathFromUrl(url('p1/avatar-1700000000000.jpg'), 'p1')).toBe('p1/avatar-1700000000000.jpg');
    const uuid = '3f0c8a4e-2b1d-4c5e-9a7b-1c2d3e4f5a6b';
    expect(avatarPathFromUrl(url(`${uuid}/1.png`), uuid)).toBe(`${uuid}/1.png`);
  });

  it('ignora foto do provedor, de outro perfil e de outro bucket', () => {
    expect(avatarPathFromUrl('https://lh3.googleusercontent.com/a/foto=s96-c', 'p1')).toBeNull();
    // Outro host com o mesmo caminho: tem de ter o tamanho do prefixo, senão a regex recusaria sozinha
    const outroHost = 'https://evil.example/'.padEnd(AVATARS_PUBLIC_PREFIX.length, 'x');
    expect(avatarPathFromUrl(`${outroHost}p1/1.jpg`, 'p1')).toBeNull();
    expect(avatarPathFromUrl(url('p2/1.jpg'), 'p1')).toBeNull();
    // Prefixo do id não basta: "p10/" não é "p1/"
    expect(avatarPathFromUrl(url('p10/1.jpg'), 'p1')).toBeNull();
    const outroBucket = AVATARS_PUBLIC_PREFIX.replace('linkhub-avatars', 'avatars');
    expect(avatarPathFromUrl(`${outroBucket}p1/1.jpg`, 'p1')).toBeNull();
  });

  it('recusa caminho fora do formato', () => {
    expect(avatarPathFromUrl(url('p1/../p2/1.jpg'), 'p1')).toBeNull();
    expect(avatarPathFromUrl(url('p1/sub/1.jpg'), 'p1')).toBeNull();
    expect(avatarPathFromUrl(url('p1/1.jpg?t=1'), 'p1')).toBeNull();
    expect(avatarPathFromUrl(url('p1/'), 'p1')).toBeNull();
    expect(avatarPathFromUrl(url('p1/%2e%2e.jpg'), 'p1')).toBeNull();
  });

  it('sem URL ou sem perfil, devolve null', () => {
    expect(avatarPathFromUrl(null, 'p1')).toBeNull();
    expect(avatarPathFromUrl('', 'p1')).toBeNull();
    expect(avatarPathFromUrl(url('p1/1.jpg'), '')).toBeNull();
    expect(avatarPathFromUrl(url('p1/1.jpg'), undefined)).toBeNull();
  });
});
