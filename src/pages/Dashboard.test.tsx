// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

const mocks = vi.hoisted(() => ({
  ctx: null as any,
  navigate: vi.fn(),
  sidebar: null as any,
  onboarding: null as any,
  newProfile: null as any,
  // Quantas vezes cada componente montou (useEffect com []): a key nova remonta
  mounts: { links: 0, design: 0, settings: 0, preview: 0, onboarding: 0 },
}));

vi.mock('@/contexts/AuthContext', () => {
  const user = { id: 'u1', email: 'dna@example.com' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/contexts/CurrentProfileContext', () => ({ useCurrentProfile: () => mocks.ctx }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
// As abas e diálogos têm testes próprios: aqui só interessa o que o Dashboard passa a eles
vi.mock('@/components/dashboard/AppSidebar', () => ({
  AppSidebar: (props: any) => {
    mocks.sidebar = props;
    return <nav data-testid="sidebar" />;
  },
}));
vi.mock('@/components/dashboard/LinksTab', async () => {
  const { useEffect } = await import('react');
  return {
    LinksTab: (props: any) => {
      useEffect(() => {
        mocks.mounts.links += 1;
      }, []);
      return <div data-testid="links-tab">{props.profile.id}</div>;
    },
  };
});
vi.mock('@/components/dashboard/DesignTab', async () => {
  const { useEffect } = await import('react');
  return {
    DesignTab: (props: any) => {
      useEffect(() => {
        mocks.mounts.design += 1;
      }, []);
      return <div data-testid="design-tab">{props.profile.id}</div>;
    },
  };
});
vi.mock('@/components/dashboard/SettingsTab', async () => {
  const { useEffect } = await import('react');
  return {
    SettingsTab: (props: any) => {
      useEffect(() => {
        mocks.mounts.settings += 1;
      }, []);
      return <div data-testid="settings-tab">{props.profile.id}</div>;
    },
  };
});
vi.mock('@/components/dashboard/AnalyticsTab', () => ({ AnalyticsTab: () => <div data-testid="analytics-tab" /> }));
vi.mock('@/components/dashboard/ProfilesTab', () => ({ ProfilesTab: () => <div data-testid="profiles-tab" /> }));
vi.mock('@/components/dashboard/ProfilePreview', async () => {
  const { useEffect } = await import('react');
  return {
    ProfilePreview: (props: any) => {
      useEffect(() => {
        mocks.mounts.preview += 1;
      }, []);
      return <div data-testid="preview">{props.profile.id}</div>;
    },
  };
});
vi.mock('@/components/dashboard/OnboardingDialog', async () => {
  const { useEffect } = await import('react');
  return {
    OnboardingDialog: (props: any) => {
      // Monta sempre (fechado, não desenha nada): é a key que decide se remonta
      useEffect(() => {
        mocks.mounts.onboarding += 1;
      }, []);
      mocks.onboarding = props;
      return props.open ? <div data-testid="onboarding">{props.profile.id}</div> : null;
    },
  };
});
vi.mock('@/components/dashboard/NewProfileDialog', () => ({
  NewProfileDialog: (props: any) => {
    mocks.newProfile = props;
    return props.open ? <div data-testid="new-profile" /> : null;
  },
}));

const originalMatchMedia = window.matchMedia;
beforeAll(() => {
  // O SidebarProvider real pergunta se é celular
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
  window.matchMedia = originalMatchMedia;
});

function context(profile: Record<string, unknown> | null, extra: Record<string, unknown> = {}) {
  return { currentProfile: profile, profiles: profile ? [profile] : [], loading: false, error: null, reloadProfiles: vi.fn(async () => {}), ...extra };
}

beforeEach(() => {
  mocks.ctx = context({ id: 'p1', user_type: 'personal' });
  mocks.mounts = { links: 0, design: 0, settings: 0, preview: 0, onboarding: 0 };
  mocks.sidebar = null;
  mocks.onboarding = null;
  mocks.newProfile = null;
});
afterEach(() => cleanup());

describe('Dashboard', () => {
  it('passa o perfil atual às abas e à prévia', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('links-tab').textContent).toBe('p1');
    expect(screen.getByTestId('preview').textContent).toBe('p1');
    expect(screen.queryByTestId('onboarding')).toBeNull();
  });

  it('trocar de perfil remonta abas, prévia e onboarding (key), sem reaproveitar estado', () => {
    const { rerender } = render(<Dashboard />);
    expect(mocks.mounts).toEqual({ links: 1, design: 0, settings: 0, preview: 1, onboarding: 1 });

    mocks.ctx = context({ id: 'p3', user_type: 'business' });
    rerender(<Dashboard />);
    expect(screen.getByTestId('links-tab').textContent).toBe('p3');
    expect(screen.getByTestId('preview').textContent).toBe('p3');
    expect(mocks.mounts).toEqual({ links: 2, design: 0, settings: 0, preview: 2, onboarding: 2 });

    // Trocar de aba não remonta a prévia; trocar de perfil na aba Perfil remonta a aba
    act(() => mocks.sidebar.onTabChange('settings'));
    expect(mocks.mounts.settings).toBe(1);
    expect(mocks.mounts.preview).toBe(2);
    mocks.ctx = context({ id: 'p4', user_type: 'business' });
    rerender(<Dashboard />);
    expect(screen.getByTestId('settings-tab').textContent).toBe('p4');
    expect(mocks.mounts).toEqual({ links: 2, design: 0, settings: 2, preview: 3, onboarding: 3 });
  });

  it('abre o onboarding para o perfil sem tipo e recarrega a lista ao terminar', () => {
    mocks.ctx = context({ id: 'p2', user_type: null });
    render(<Dashboard />);
    expect(screen.getByTestId('onboarding').textContent).toBe('p2');

    act(() => mocks.onboarding.onComplete('personal'));
    expect(screen.queryByTestId('onboarding')).toBeNull();
    expect(mocks.ctx.reloadProfiles).toHaveBeenCalled();
  });

  it('na aba Meus perfis, some a prévia e o botão Prévia, e o cabeçalho diz o nome da aba', () => {
    render(<Dashboard />);
    expect(screen.getByRole('button', { name: /Prévia/ })).toBeTruthy();

    act(() => mocks.sidebar.onTabChange('profiles'));
    expect(screen.getByTestId('profiles-tab')).toBeTruthy();
    expect(screen.queryByTestId('preview')).toBeNull();
    expect(screen.queryByRole('button', { name: /Prévia/ })).toBeNull();
    expect(screen.getByText('Meus perfis')).toBeTruthy();
  });

  it('"Criar novo perfil" abre o diálogo, e o perfil criado leva para Links', () => {
    render(<Dashboard />);
    act(() => mocks.sidebar.onTabChange('profiles'));
    act(() => mocks.sidebar.onCreateProfile());
    expect(screen.getByTestId('new-profile')).toBeTruthy();

    act(() => mocks.newProfile.onCreated('p9'));
    expect(screen.getByTestId('links-tab')).toBeTruthy();
  });

  it('sem perfil (carregando), não monta abas, prévia nem onboarding', () => {
    // As abas e o onboarding leem o perfil só ao montar: com perfil nulo ficariam vazios
    mocks.ctx = context(null, { loading: true });
    render(<Dashboard />);
    expect(screen.getByRole('status', { name: 'Carregando seus perfis' })).toBeTruthy();
    expect(mocks.mounts).toEqual({ links: 0, design: 0, settings: 0, preview: 0, onboarding: 0 });
    expect(mocks.onboarding).toBeNull();
    expect(mocks.sidebar).toBeNull();
  });

  it('com a aba Design aberta, o fim do onboarding remonta o editor com o tema do modelo', () => {
    // A DesignTab lê o tema só ao montar; o onboarding grava user_type e theme_options juntos
    mocks.ctx = context({ id: 'p2', user_type: null, theme_options: null });
    const { rerender } = render(<Dashboard />);
    act(() => mocks.sidebar.onTabChange('design'));
    expect(mocks.mounts.design).toBe(1);

    act(() => mocks.onboarding.onComplete('personal'));
    expect(mocks.mounts.design).toBe(1);
    mocks.ctx = context({ id: 'p2', user_type: 'personal', theme_options: { themeId: 'neon' } });
    rerender(<Dashboard />);
    expect(mocks.mounts.design).toBe(2);

    // Salvar na própria aba Design muda só o tema: o editor não remonta (nem perde a subaba aberta)
    mocks.ctx = context({ id: 'p2', user_type: 'personal', theme_options: { themeId: 'custom' } });
    rerender(<Dashboard />);
    expect(mocks.mounts.design).toBe(2);
  });

  it('sem perfil e com erro na carga, mostra o erro e tenta de novo', () => {
    mocks.ctx = context(null, { error: 'Não foi possível carregar seus perfis.' });
    render(<Dashboard />);
    expect(screen.getByText('Não foi possível carregar seus perfis.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(mocks.ctx.reloadProfiles).toHaveBeenCalled();
  });
});
