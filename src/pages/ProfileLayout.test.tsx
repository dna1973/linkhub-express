// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProfileLayout from './ProfileLayout';

vi.mock('@/contexts/CurrentProfileContext', () => ({
  CurrentProfileProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="provedor">{children}</div>,
}));

afterEach(() => cleanup());

describe('ProfileLayout', () => {
  it('desenha a rota filha dentro do Provider do perfil atual', () => {
    render(
      <MemoryRouter initialEntries={['/analytics']}>
        <Routes>
          <Route element={<ProfileLayout />}>
            <Route path="/dashboard" element={<p>painel</p>} />
            <Route path="/analytics" element={<p>relatórios</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('provedor').textContent).toBe('relatórios');
  });
});
