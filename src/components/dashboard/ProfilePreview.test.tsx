// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useDesignStore } from '@/stores/useDesignStore';
import { safeOpenUrl } from '@/utils/sanitize';
import { supabase } from '@/lib/supabase';
import { ProfilePreview } from './ProfilePreview';

const mocks = vi.hoisted(() => ({ eq: vi.fn(), hold: null as Promise<void> | null }));

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
  chain.eq = (...args: unknown[]) => {
    mocks.eq(...args);
    return chain;
  };
  chain.order = () =>
    (mocks.hold ?? Promise.resolve()).then(() => ({
      data: [{ id: 7, title: 'Meu site', url: 'https://youtube.com/@x', position: 0 }],
      error: null,
    }));
  return { supabase: { from: vi.fn(() => chain) } };
});

beforeEach(() => {
  vi.mocked(supabase.from).mockClear();
  vi.mocked(safeOpenUrl).mockClear();
  mocks.eq.mockClear();
  mocks.hold = null;
});
afterEach(() => cleanup());

describe('ProfilePreview', () => {
  it('busca os links uma vez ao montar e não busca de novo quando o tema muda', async () => {
    render(<ProfilePreview profile={{ id: 'p1', full_name: 'Daniel', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    expect(supabase.from).toHaveBeenCalledTimes(1);

    act(() => {
      const theme = useDesignStore.getState().customTheme;
      useDesignStore.getState().setCustomTheme({ ...theme, colors: { ...theme.colors, text: '#123456' } });
    });
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('busca de novo no evento linksUpdated', async () => {
    render(<ProfilePreview profile={{ id: 'p1', full_name: 'Daniel', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    act(() => {
      window.dispatchEvent(new Event('linksUpdated'));
    });
    await waitFor(() => expect(supabase.from).toHaveBeenCalledTimes(2));
  });

  it('clicar num link só abre o endereço, sem registrar clique', async () => {
    render(<ProfilePreview profile={{ id: 'p1', full_name: 'Daniel', username: 'dna' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /Meu site/ }));
    expect(safeOpenUrl).toHaveBeenCalledWith('https://youtube.com/@x');
    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith('links');
  });

  it('sem nome no perfil, usa o início do e-mail', async () => {
    render(<ProfilePreview profile={{ id: 'p1', username: 'dna' }} />);
    expect(await screen.findByText('dna')).toBeTruthy();
  });

  it('desenha o perfil no aparelho escolhido, com o conteúdo abaixo da barra de status', async () => {
    window.localStorage.clear();
    render(<ProfilePreview profile={{ id: 'p1', full_name: 'Daniel', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    expect(screen.getByTestId('device-frame').getAttribute('data-device')).toBe('iphone-16-pro');
    expect(screen.getByLabelText('Aparelho da prévia')).toBeTruthy();
    // topInset = altura da barra de status do iPhone 16 Pro (54 px)
    expect(screen.getByTestId('profile-view').style.paddingTop).toBe('54px');
  });

  it('a cor da barra de status contrasta com a cor base do fundo', async () => {
    act(() => {
      const theme = useDesignStore.getState().customTheme;
      useDesignStore.getState().setCustomTheme({ ...theme, background: { ...theme.background, type: 'solid', color: '#ffffff' } });
    });
    const { unmount } = render(<ProfilePreview profile={{ id: 'p1', full_name: 'Daniel', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    expect(screen.getByTestId('device-status-bar').style.color).toBe('rgb(0, 0, 0)');
    unmount();

    act(() => {
      const theme = useDesignStore.getState().customTheme;
      useDesignStore.getState().setCustomTheme({ ...theme, background: { ...theme.background, type: 'solid', color: '#111111' } });
    });
    render(<ProfilePreview profile={{ id: 'p1', full_name: 'Daniel', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    expect(screen.getByTestId('device-status-bar').style.color).toBe('rgb(255, 255, 255)');
  });

  it('mostra o QR code com o endereço público do perfil gravado', async () => {
    render(<ProfilePreview profile={{ id: 'p1', full_name: 'Daniel', username: 'dna' }} />);
    expect(await screen.findByRole('img', { name: /^QR code para abrir .*\/dna$/ })).toBeTruthy();
  });

  it('perfil gravado com show_qr_code false: a prévia fica sem QR code', async () => {
    render(<ProfilePreview profile={{ id: 'p1', full_name: 'Daniel', username: 'dna', show_qr_code: false }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    expect(screen.queryByRole('img', { name: /QR code/ })).toBeNull();
  });

  it('o link do YouTube aparece com a máscara da marca na prévia', async () => {
    render(<ProfilePreview profile={{ id: 'p1', full_name: 'Daniel', username: 'dna' }} />);
    const mask = (await screen.findByRole('button', { name: /Meu site/ })).querySelector<HTMLElement>('span.link-icon-mask');
    expect(mask).not.toBeNull();
    expect(mask!.style.maskImage).toContain('youtube.svg');
  });

  it('o conteúdo extra do cabeçalho aparece ao lado do seletor', async () => {
    render(<ProfilePreview profile={{ id: 'p1', full_name: 'Daniel' }} headerEnd={<button type="button">Fechar</button>} />);
    await screen.findByRole('button', { name: /Meu site/ });
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeTruthy();
  });

  it('busca os links do perfil recebido, não da conta', async () => {
    render(<ProfilePreview profile={{ id: 'p1', full_name: 'Daniel', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'p1');
    expect(mocks.eq).not.toHaveBeenCalledWith('user_id', 'u1');
  });

  it('outro perfil recebido busca os links dele', async () => {
    const { rerender } = render(<ProfilePreview profile={{ id: 'p1', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    rerender(<ProfilePreview profile={{ id: 'p2', username: 'loja' }} />);

    await waitFor(() => expect(mocks.eq).toHaveBeenCalledWith('user_id', 'p2'));
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it('ao trocar de perfil, esconde os links do anterior enquanto os do novo carregam', async () => {
    const { rerender } = render(<ProfilePreview profile={{ id: 'p1', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });

    mocks.hold = new Promise<void>(() => {});
    rerender(<ProfilePreview profile={{ id: 'p2', username: 'loja' }} />);

    await waitFor(() => expect(mocks.eq).toHaveBeenCalledWith('user_id', 'p2'));
    expect(screen.queryByRole('button', { name: /Meu site/ })).toBeNull();
  });

  it('sem id de perfil não busca links', () => {
    render(<ProfilePreview profile={{ full_name: 'Daniel' }} />);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
