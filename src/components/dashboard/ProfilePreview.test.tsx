// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useDesignStore } from '@/stores/useDesignStore';
import { safeOpenUrl } from '@/utils/sanitize';
import { supabase } from '@/lib/supabase';
import { ProfilePreview } from './ProfilePreview';

vi.mock('@/contexts/AuthContext', () => {
  // Mesmo objeto a cada render, como no AuthContext real
  const user = { id: 'u1', email: 'dna@example.com' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/utils/sanitize', () => ({
  safeOpenUrl: vi.fn(),
}));
vi.mock('@/lib/supabase', () => {
  // Só a leitura de links existe: qualquer gravação (update, insert) quebraria o teste
  const chain: any = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.order = () =>
    Promise.resolve({ data: [{ id: 7, title: 'Meu site', url: 'https://example.com', position: 0 }], error: null });
  return { supabase: { from: vi.fn(() => chain) } };
});

beforeEach(() => {
  vi.mocked(supabase.from).mockClear();
  vi.mocked(safeOpenUrl).mockClear();
});
afterEach(() => cleanup());

describe('ProfilePreview', () => {
  it('busca os links uma vez ao montar e não busca de novo quando o tema muda', async () => {
    render(<ProfilePreview profile={{ full_name: 'Daniel', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    expect(supabase.from).toHaveBeenCalledTimes(1);

    act(() => {
      const theme = useDesignStore.getState().customTheme;
      useDesignStore.getState().setCustomTheme({ ...theme, colors: { ...theme.colors, text: '#123456' } });
    });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('busca de novo no evento linksUpdated', async () => {
    render(<ProfilePreview profile={{ full_name: 'Daniel', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    act(() => {
      window.dispatchEvent(new Event('linksUpdated'));
    });
    await waitFor(() => expect(supabase.from).toHaveBeenCalledTimes(2));
  });

  it('clicar num link só abre o endereço, sem registrar clique', async () => {
    render(<ProfilePreview profile={{ full_name: 'Daniel', username: 'dna' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /Meu site/ }));
    expect(safeOpenUrl).toHaveBeenCalledWith('https://example.com');
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith('links');
  });

  it('sem nome no perfil, usa o início do e-mail', async () => {
    render(<ProfilePreview profile={{ username: 'dna' }} />);
    expect(await screen.findByText('dna')).toBeTruthy();
  });
});
