// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

type Listener = (event: string, session: { user: { id: string } } | null) => void;

const mocks = vi.hoisted(() => ({
  listener: null as Listener | null,
  session: null as { user: { id: string } } | null,
  signOut: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (listener: Listener) => {
        mocks.listener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession: async () => ({ data: { session: mocks.session } }),
      signOut: mocks.signOut,
    },
  },
}));

const KEY_U1 = 'linkhub:currentProfile:u1';
const KEY_U2 = 'linkhub:currentProfile:u2';

function Probe() {
  const { user } = useAuth();
  return <p data-testid="conta">{user?.id ?? 'ninguém'}</p>;
}

const conta = () => screen.getByTestId('conta').textContent;

async function renderLoggedIn() {
  mocks.session = { user: { id: 'u1' } };
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await waitFor(() => expect(conta()).toBe('u1'));
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.listener = null;
  mocks.session = null;
  // O supabase-js avisa a saída pelo onAuthStateChange antes de resolver o signOut
  mocks.signOut.mockReset().mockImplementation(async () => {
    mocks.listener?.('SIGNED_OUT', null);
    return { error: null };
  });
});

afterEach(() => cleanup());

describe('AuthProvider: perfil escolhido no localStorage', () => {
  it('ao sair, apaga a chave do perfil atual da conta e deixa a de outra conta', async () => {
    window.localStorage.setItem(KEY_U1, 'p2');
    window.localStorage.setItem(KEY_U2, 'p9');
    mocks.session = { user: { id: 'u1' } };
    let signOut!: () => Promise<void>;
    function Sair() {
      signOut = useAuth().signOut;
      return null;
    }
    render(
      <AuthProvider>
        <Probe />
        <Sair />
      </AuthProvider>,
    );
    await waitFor(() => expect(conta()).toBe('u1'));

    await act(async () => {
      await signOut();
    });

    expect(conta()).toBe('ninguém');
    expect(window.localStorage.getItem(KEY_U1)).toBeNull();
    expect(window.localStorage.getItem(KEY_U2)).toBe('p9');
  });

  it('a sessão que acaba sem o signOut desta aba (outra aba, token vencido) também apaga a chave', async () => {
    window.localStorage.setItem(KEY_U1, 'p2');
    await renderLoggedIn();

    act(() => mocks.listener?.('SIGNED_OUT', null));

    expect(conta()).toBe('ninguém');
    expect(window.localStorage.getItem(KEY_U1)).toBeNull();
  });

  it('renovar o token da mesma conta não apaga a escolha', async () => {
    window.localStorage.setItem(KEY_U1, 'p2');
    await renderLoggedIn();

    act(() => mocks.listener?.('TOKEN_REFRESHED', { user: { id: 'u1' } }));

    expect(conta()).toBe('u1');
    expect(window.localStorage.getItem(KEY_U1)).toBe('p2');
  });

  it('abrir o app sem sessão não mexe em chave nenhuma', async () => {
    window.localStorage.setItem(KEY_U1, 'p2');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    act(() => mocks.listener?.('INITIAL_SESSION', null));
    await waitFor(() => expect(conta()).toBe('ninguém'));
    expect(window.localStorage.getItem(KEY_U1)).toBe('p2');
  });
});
