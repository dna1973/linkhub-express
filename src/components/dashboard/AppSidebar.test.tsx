// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { CurrentProfileProvider } from '@/contexts/CurrentProfileContext';
import { AppSidebar } from './AppSidebar';

const mocks = vi.hoisted(() => ({
  profiles: [{ id: 'u1', username: 'dna', full_name: 'Daniel', avatar_url: null, theme_options: {} }] as unknown[],
}));

vi.mock('@/contexts/AuthContext', () => {
  const user = { id: 'u1', email: 'x@y.z', user_metadata: {} };
  return { useAuth: () => ({ user, signOut: vi.fn() }) };
});
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
    supabase: {
      from: () => chain,
      rpc: async (fn: string) => (fn === 'list_own_profiles' ? { data: mocks.profiles, error: null } : { data: null, error: null }),
    },
  };
});

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalInnerWidth = window.innerWidth;
const originalMatchMedia = window.matchMedia;

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
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
});

afterAll(() => {
  (window as any).innerWidth = originalInnerWidth;
  window.matchMedia = originalMatchMedia;
  vi.unstubAllGlobals();
});

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

function renderSidebar(onTabChange = vi.fn()) {
  render(
    // defaultOpen={false}: simula a barra de desktop recolhida antes de estreitar a janela (cenário do defeito)
    <SidebarProvider defaultOpen={false}>
      <CurrentProfileProvider>
        <SidebarTrigger />
        <AppSidebar activeTab="links" onTabChange={onTabChange} onCreateProfile={vi.fn()} />
      </CurrentProfileProvider>
    </SidebarProvider>,
  );
  return onTabChange;
}

describe('AppSidebar em janela estreita', () => {
  it('abre o painel com os rótulos mesmo com a barra de desktop recolhida', async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    await waitFor(() => {
      for (const texto of ['Links', 'Design', 'Perfil', 'Meus perfis', 'Analytics']) {
        expect(screen.getByText(texto)).toBeTruthy();
      }
    });
  });

  it('fecha o painel ao escolher um item do menu', async () => {
    const onTabChange = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    const painel = await waitFor(() => {
      const el = document.querySelector('[data-mobile="true"]');
      expect(el).not.toBeNull();
      return el;
    });
    expect(painel).toBeTruthy();
    fireEvent.click(await screen.findByText('Design'));
    expect(onTabChange).toHaveBeenCalledWith('design');
    await waitFor(() => {
      expect(document.querySelector('[data-mobile="true"]')).toBeNull();
    });
  });

  it('no painel, o seletor mostra o perfil atual', async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(await screen.findByRole('button', { name: 'Trocar de perfil (atual: @dna)' })).toBeTruthy();
  });
});
