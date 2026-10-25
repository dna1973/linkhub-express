// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CurrentProfileProvider } from '@/contexts/CurrentProfileContext';
import { AppSidebar } from './AppSidebar';

type P = Record<string, unknown> & { id: string };

const mocks = vi.hoisted(() => ({ profiles: [] as P[] }));

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
// O link público vem de @/lib/publicProfileUrl, que lê a URL do site daqui
vi.mock('@/lib/siteUrl', () => ({ PUBLIC_SITE_URL: 'https://example.test' }));

const DNA: P = { id: 'u1', username: 'dna', full_name: 'Daniel', avatar_url: null, theme_options: {} };
const PRO: P = { id: 'p2', username: 'pro', full_name: 'Daniel Profissional', avatar_url: null, theme_options: {} };

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

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
  // O DropdownMenu do Radix mede o conteúdo com ResizeObserver, que o jsdom não tem
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
});

afterAll(() => {
  (window as any).innerWidth = originalInnerWidth;
  window.matchMedia = originalMatchMedia;
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.localStorage.clear();
  mocks.profiles = [DNA, PRO];
});
afterEach(() => cleanup());

function renderSidebar() {
  const onTabChange = vi.fn();
  const onCreateProfile = vi.fn();
  const view = render(
    <SidebarProvider defaultOpen>
      <CurrentProfileProvider>
        <AppSidebar activeTab="links" onTabChange={onTabChange} onCreateProfile={onCreateProfile} />
      </CurrentProfileProvider>
    </SidebarProvider>,
  );
  return { ...view, onTabChange, onCreateProfile };
}

async function openSelector(atual = '@dna') {
  fireEvent.keyDown(await screen.findByRole('button', { name: `Trocar de perfil (atual: ${atual})` }), { key: 'Enter' });
  return screen.findByRole('menu');
}

describe('AppSidebar em janela larga', () => {
  it('tem o próprio botão de recolher, que alterna entre recolhida e aberta', () => {
    // Sem SidebarTrigger externo: o único botão é o da própria sidebar
    const { container } = renderSidebar();
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

  it('recolhida, o seletor é só o avatar, com o perfil atual no nome', async () => {
    renderSidebar();
    await screen.findByRole('button', { name: 'Trocar de perfil (atual: @dna)' });
    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));

    expect(screen.getByRole('button', { name: 'Trocar de perfil (atual: @dna)' })).toBeTruthy();
    expect(screen.queryByText('LinkHub')).toBeNull();
  });
});

describe('AppSidebar, seletor de perfil', () => {
  it('lista os perfis e marca o atual', async () => {
    renderSidebar();
    await openSelector();

    const itens = screen.getAllByRole('menuitemradio');
    expect(itens).toHaveLength(2);
    expect(screen.getByRole('menuitemradio', { name: /@dna/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('menuitemradio', { name: /@pro/ }).getAttribute('aria-checked')).toBe('false');
  });

  it('escolher outro perfil troca o perfil atual', async () => {
    renderSidebar();
    await openSelector();
    fireEvent.click(screen.getByRole('menuitemradio', { name: /@pro/ }));

    expect(await screen.findByRole('button', { name: 'Trocar de perfil (atual: @pro)' })).toBeTruthy();
    expect(window.localStorage.getItem('linkhub:currentProfile:u1')).toBe('p2');
  });

  it('perfil sem @ e sem nome aparece como "Perfil sem nome", no gatilho e na lista', async () => {
    mocks.profiles = [{ ...DNA, username: null, full_name: null }, PRO];
    renderSidebar();
    await openSelector('Perfil sem nome');

    const item = screen.getByRole('menuitemradio', { name: /Perfil sem nome/ });
    expect(item.getAttribute('aria-checked')).toBe('true');
  });

  it('com 10 perfis, "Criar novo perfil" fica desabilitado com a dica', async () => {
    mocks.profiles = Array.from({ length: 10 }, (_, i) => ({ ...PRO, id: i === 0 ? 'u1' : `p${i}`, username: i === 0 ? 'dna' : `perfil${i}` }));
    renderSidebar();
    await openSelector();

    expect(screen.getByRole('menuitem', { name: /Criar novo perfil/ }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Limite de 10 perfis')).toBeTruthy();
  });

  it('"Criar novo perfil" chama o Dashboard', async () => {
    const { onCreateProfile } = renderSidebar();
    await openSelector();
    fireEvent.click(screen.getByRole('menuitem', { name: /Criar novo perfil/ }));
    expect(onCreateProfile).toHaveBeenCalled();
  });

  it('"Meus perfis" abre a aba nova, pelo seletor e pelo menu', async () => {
    const { onTabChange } = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Meus perfis' }));
    expect(onTabChange).toHaveBeenCalledWith('profiles');

    onTabChange.mockClear();
    await openSelector();
    fireEvent.click(screen.getByRole('menuitem', { name: /Meus perfis/ }));
    expect(onTabChange).toHaveBeenCalledWith('profiles');
  });
});

describe('AppSidebar, link público', () => {
  it('domínio padrão: Ver Perfil abre e Copiar copia o endereço do site', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    try {
      renderSidebar();
      const verPerfil = screen.getByRole('button', { name: /Ver Perfil/ }) as HTMLButtonElement;
      await waitFor(() => expect(verPerfil.disabled).toBe(false));
      fireEvent.click(verPerfil);
      expect(open).toHaveBeenCalledWith('https://example.test/dna', '_blank');
      fireEvent.click(screen.getByRole('button', { name: 'Copiar link do perfil' }));
      expect(writeText).toHaveBeenCalledWith('https://example.test/dna');
    } finally {
      open.mockRestore();
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it('domínio personalizado gravado com https:// não duplica o esquema', async () => {
    mocks.profiles = [{ ...DNA, preferred_domain: 'custom', custom_domain: 'https://meusite.com' }];
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    try {
      renderSidebar();
      fireEvent.click(await screen.findByRole('button', { name: 'Copiar link do perfil' }));
      // Antes da regra única saía https://https://meusite.com/dna
      expect(writeText).toHaveBeenCalledWith('https://meusite.com/dna');
    } finally {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it('sem username: Ver Perfil desabilitado e sem botão de copiar', async () => {
    mocks.profiles = [{ ...DNA, username: null }];
    renderSidebar();
    await screen.findByRole('button', { name: 'Trocar de perfil (atual: Daniel)' });
    expect((screen.getByRole('button', { name: /Ver Perfil/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Copiar link do perfil' })).toBeNull();
  });

  it('Ver Perfil usa o perfil atual depois da troca', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    try {
      renderSidebar();
      await openSelector();
      fireEvent.click(screen.getByRole('menuitemradio', { name: /@pro/ }));
      await screen.findByRole('button', { name: 'Trocar de perfil (atual: @pro)' });
      fireEvent.click(screen.getByRole('button', { name: /Ver Perfil/ }));
      expect(open).toHaveBeenCalledWith('https://example.test/pro', '_blank');
    } finally {
      open.mockRestore();
    }
  });
});
