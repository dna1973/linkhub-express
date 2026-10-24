// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'x@y.z' }, signOut: vi.fn() }),
}));
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/lib/supabase', () => {
  const chain: any = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.maybeSingle = () => Promise.resolve({ data: null });
  return {
    supabase: { from: () => chain },
    PUBLIC_SITE_URL: 'https://example.test',
  };
});

beforeAll(() => {
  // Janela estreita: o shadcn usa o painel deslizante (Sheet)
  (window as any).innerWidth = 500;
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as any;
});

afterEach(() => cleanup());

function renderSidebar(onTabChange = vi.fn()) {
  render(
    <SidebarProvider defaultOpen={false}>
      <SidebarTrigger />
      <AppSidebar activeTab="links" onTabChange={onTabChange} profile={{ username: 'dna' }} />
    </SidebarProvider>,
  );
  return onTabChange;
}

describe('AppSidebar em janela estreita', () => {
  it('abre o painel com os rótulos mesmo com a barra de desktop recolhida', async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    await waitFor(() => {
      for (const texto of ['Links', 'Design', 'Perfil', 'Analytics']) {
        expect(screen.getByText(texto)).toBeTruthy();
      }
    });
  });

  it('fecha o painel ao escolher um item do menu', async () => {
    const onTabChange = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    fireEvent.click(await screen.findByText('Design'));
    expect(onTabChange).toHaveBeenCalledWith('design');
    await waitFor(() => {
      expect(document.querySelector('[data-mobile="true"]')).toBeNull();
    });
  });
});
