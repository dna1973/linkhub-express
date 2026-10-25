// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ rows: [] as { id: string }[], eq: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: async (column: string, value: string) => {
          mocks.eq(column, value);
          return { data: mocks.rows, error: null };
        },
      }),
    }),
  },
}));
// O hook não depende mais da conta: se ainda chamar useAuth, este mock devolve outra pessoa
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'p1' } }) }));

import { useUsernameValidation } from './useUsernameValidation';

beforeEach(() => {
  mocks.rows = [{ id: 'p1' }];
  mocks.eq.mockClear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useUsernameValidation', () => {
  it('o @ do próprio perfil fica disponível', async () => {
    const { result } = renderHook(() => useUsernameValidation('dna', 0, 'p1'));
    await waitFor(() => expect(result.current.isValid).toBe(true));
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mocks.eq).toHaveBeenCalledWith('username', 'dna');
  });

  it('o @ de outro perfil, mesmo da mesma conta, está em uso', async () => {
    const { result } = renderHook(() => useUsernameValidation('dna', 0, 'p2'));
    await waitFor(() => expect(result.current.isValid).toBe(true));
    expect(result.current.isAvailable).toBe(false);
    expect(result.current.error).toBe('Este username já está em uso');
  });

  it('sem perfil atual (perfil novo), um @ já gravado está em uso', async () => {
    const { result } = renderHook(() => useUsernameValidation('dna', 0));
    await waitFor(() => expect(result.current.isValid).toBe(true));
    expect(result.current.isAvailable).toBe(false);
  });

  it('@ livre fica disponível sem perfil atual', async () => {
    mocks.rows = [];
    const { result } = renderHook(() => useUsernameValidation('loja_nova', 0));
    await waitFor(() => expect(result.current.isValid).toBe(true));
    expect(result.current.isAvailable).toBe(true);
  });

  it('trocar o perfil atual revalida o mesmo @', async () => {
    const { result, rerender } = renderHook(({ id }) => useUsernameValidation('dna', 0, id), {
      initialProps: { id: 'p2' },
    });
    await waitFor(() => expect(result.current.isValid).toBe(true));
    expect(result.current.isAvailable).toBe(false);

    rerender({ id: 'p1' });
    await waitFor(() => expect(result.current.isAvailable).toBe(true));
    expect(result.current.error).toBeNull();
  });

  it('@ reservado é recusado sem consultar o banco', async () => {
    const { result } = renderHook(() => useUsernameValidation('admin', 0, 'p1'));
    await waitFor(() => expect(result.current.error).toBe('Este username é reservado pelo sistema'));
    expect(result.current.isAvailable).toBe(false);
    expect(mocks.eq).not.toHaveBeenCalled();
  });
});
