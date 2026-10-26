// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

type Response = { data: { id: string }[]; error: null };

const mocks = vi.hoisted(() => ({
  rows: [] as { id: string }[],
  eq: vi.fn(),
  // Quando definido, a consulta fica pendente até o teste resolver a resposta daquele @
  pending: null as null | Map<string, (response: Response) => void>,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: async (column: string, value: string) => {
          mocks.eq(column, value);
          if (mocks.pending) return new Promise<Response>((resolve) => mocks.pending!.set(value, resolve));
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
  mocks.pending = null;
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
    await waitFor(() => expect(result.current.error).toBe('Este @username não pode ser usado'));
    expect(result.current.isAvailable).toBe(false);
    expect(mocks.eq).not.toHaveBeenCalled();
  });

  it('informa qual @ o resultado conferiu', async () => {
    mocks.rows = [];
    const { result } = renderHook(() => useUsernameValidation('loja', 0));
    await waitFor(() => expect(result.current.isAvailable).toBe(true));
    expect(result.current.checkedUsername).toBe('loja');
  });

  it('trocar o @ põe "verificando" na hora, antes do debounce, sem dizer que conferiu o novo', async () => {
    mocks.rows = [];
    const { result, rerender } = renderHook(({ u }) => useUsernameValidation(u, 500), { initialProps: { u: 'loja' } });
    await waitFor(() => expect(result.current.isAvailable).toBe(true), { timeout: 2000 });

    rerender({ u: 'admin' });
    expect(result.current.isChecking).toBe(true);
    expect(result.current.checkedUsername).not.toBe('admin');
  });

  it('resposta antiga que chega depois não grava por cima da nova', async () => {
    mocks.pending = new Map();
    const { result, rerender } = renderHook(({ u }) => useUsernameValidation(u, 0), { initialProps: { u: 'loja' } });
    await waitFor(() => expect(mocks.pending!.has('loja')).toBe(true));

    rerender({ u: 'loja_nova' });
    await waitFor(() => expect(mocks.pending!.has('loja_nova')).toBe(true));

    await act(async () => mocks.pending!.get('loja_nova')!({ data: [], error: null }));
    await waitFor(() => expect(result.current.checkedUsername).toBe('loja_nova'));
    expect(result.current.isAvailable).toBe(true);

    // A consulta de "loja" (em uso) volta por último
    await act(async () => mocks.pending!.get('loja')!({ data: [{ id: 'outro' }], error: null }));
    expect(result.current.checkedUsername).toBe('loja_nova');
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('trocar o @ antes do debounce não consulta o abandonado', async () => {
    mocks.rows = [];
    const { result, rerender } = renderHook(({ u }) => useUsernameValidation(u, 100), { initialProps: { u: 'loja' } });
    rerender({ u: 'loja_nova' });
    await waitFor(() => expect(result.current.checkedUsername).toBe('loja_nova'));
    expect(mocks.eq.mock.calls).toEqual([['username', 'loja_nova']]);
  });

  it('desmontar antes do debounce não consulta nada', async () => {
    const { unmount } = renderHook(() => useUsernameValidation('loja', 50));
    unmount();
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(mocks.eq).not.toHaveBeenCalled();
  });

  it('@ reservado sugere variações', async () => {
    const { result } = renderHook(() => useUsernameValidation('admin', 0));
    await waitFor(() => expect(result.current.checkedUsername).toBe('admin'));
    expect(result.current.suggestions).toEqual(['admin1', 'admin2', 'admin3', 'admin_', '_admin']);
  });

  it('@ em uso sugere variações; @ disponível, nenhuma', async () => {
    const { result, rerender } = renderHook(({ u }) => useUsernameValidation(u, 0), { initialProps: { u: 'dna' } });
    await waitFor(() => expect(result.current.checkedUsername).toBe('dna'));
    expect(result.current.isAvailable).toBe(false);
    expect(result.current.suggestions).toEqual(['dna1', 'dna2', 'dna3', 'dna_', '_dna']);

    mocks.rows = [];
    rerender({ u: 'loja_nova' });
    await waitFor(() => expect(result.current.checkedUsername).toBe('loja_nova'));
    expect(result.current.suggestions).toEqual([]);
  });
});
