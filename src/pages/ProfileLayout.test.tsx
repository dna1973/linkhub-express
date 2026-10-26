// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProfileLayout from './ProfileLayout';
import { markRecoveryUser } from '@/lib/passwordRecovery';

const mocks = vi.hoisted(() => ({ user: { id: 'u1' } as { id: string } | null }));

vi.mock('@/contexts/CurrentProfileContext', () => ({
  CurrentProfileProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="provedor">{children}</div>,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));

beforeEach(() => {
  window.localStorage.clear();
  mocks.user = { id: 'u1' };
});
afterEach(() => cleanup());

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProfileLayout />}>
          <Route path="/dashboard" element={<p>painel</p>} />
          <Route path="/analytics" element={<p>relatórios</p>} />
        </Route>
        <Route path="/auth/nova-senha" element={<p>página de senha nova</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProfileLayout', () => {
  it('desenha a rota filha dentro do Provider do perfil atual', () => {
    renderAt('/analytics');
    expect(screen.getByTestId('provedor').textContent).toBe('relatórios');
  });

  it('sessão de recuperação de senha não abre o painel nem o Provider: vai à senha nova', () => {
    markRecoveryUser('u1');
    renderAt('/dashboard');
    expect(screen.getByText('página de senha nova')).toBeTruthy();
    expect(screen.queryByTestId('provedor')).toBeNull();
    expect(screen.queryByText('painel')).toBeNull();
  });

  it('marca de outra conta não atrapalha o painel', () => {
    markRecoveryUser('u2');
    renderAt('/dashboard');
    expect(screen.getByTestId('provedor').textContent).toBe('painel');
  });
});
