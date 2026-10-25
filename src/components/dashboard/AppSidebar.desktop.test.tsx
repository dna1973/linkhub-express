// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SidebarProvider } from '@/components/ui/sidebar';
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
  return { supabase: { from: () => chain } };
});
// O link público vem de @/lib/publicProfileUrl, que lê a URL do site daqui
vi.mock('@/lib/siteUrl', () => ({ PUBLIC_SITE_URL: 'https://example.test' }));

const originalInnerWidth = window.innerWidth;
const originalMatchMedia = window.matchMedia;

beforeAll(() => {
  // Janela larga: barra fixa, sem a barra superior da página
  (window as any).innerWidth = 1280;
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as any;
});

afterAll(() => {
  (window as any).innerWidth = originalInnerWidth;
  window.matchMedia = originalMatchMedia;
});

afterEach(() => cleanup());

describe('AppSidebar em janela larga', () => {
  it('tem o próprio botão de recolher, que alterna entre recolhida e aberta', () => {
    // Sem SidebarTrigger externo: o único botão é o da própria sidebar
    const { container } = render(
      <SidebarProvider defaultOpen>
        <AppSidebar activeTab="links" onTabChange={vi.fn()} profile={{ username: 'dna' }} />
      </SidebarProvider>
    );
    const estado = () => container.querySelector('[data-state]')?.getAttribute('data-state');

    expect(estado()).toBe('expanded');
    expect(screen.getByText('Links')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(estado()).toBe('collapsed');
    // Recolhida: rótulos somem, e o botão passa a oferecer expandir
    expect(screen.queryByText('Links')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Expandir menu' }));
    expect(estado()).toBe('expanded');
    expect(screen.getByText('Links')).toBeTruthy();
  });
});

describe('AppSidebar, link público', () => {
  const renderComPerfil = (profile: Record<string, unknown>) =>
    render(
      <SidebarProvider defaultOpen>
        <AppSidebar activeTab="links" onTabChange={vi.fn()} profile={profile} />
      </SidebarProvider>,
    );

  it('domínio padrão: Ver Perfil abre e Copiar copia o endereço do site', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    try {
      renderComPerfil({ username: 'dna' });
      fireEvent.click(screen.getByRole('button', { name: /Ver Perfil/ }));
      expect(open).toHaveBeenCalledWith('https://example.test/dna', '_blank');
      fireEvent.click(screen.getByRole('button', { name: 'Copiar link do perfil' }));
      expect(writeText).toHaveBeenCalledWith('https://example.test/dna');
    } finally {
      open.mockRestore();
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it('domínio personalizado gravado com https:// não duplica o esquema', () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    try {
      renderComPerfil({ username: 'dna', preferred_domain: 'custom', custom_domain: 'https://meusite.com' });
      fireEvent.click(screen.getByRole('button', { name: 'Copiar link do perfil' }));
      // Antes da regra única saía https://https://meusite.com/dna
      expect(writeText).toHaveBeenCalledWith('https://meusite.com/dna');
    } finally {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it('sem username: Ver Perfil desabilitado e sem botão de copiar', () => {
    renderComPerfil({});
    expect((screen.getByRole('button', { name: /Ver Perfil/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Copiar link do perfil' })).toBeNull();
  });
});
