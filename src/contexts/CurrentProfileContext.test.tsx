// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { AVATARS_PUBLIC_PREFIX } from '@/lib/avatarStorage';
import { LINK_ICONS_PUBLIC_PREFIX } from '@/lib/linkIcons/storagePrefix';
import { ONBOARDING_TEMPLATES } from '@/components/dashboard/onboardingTemplates';
import { createDefaultCustomTheme, useDesignStore } from '@/stores/useDesignStore';
import {
  CurrentProfileProvider,
  currentProfileStorageKey,
  useCurrentProfile,
  type CurrentProfileContextValue,
  type Profile,
} from './CurrentProfileContext';

const mocks = vi.hoisted(() => {
  const storage = { remove: vi.fn() };
  return {
    rpc: vi.fn(),
    insert: vi.fn(),
    storage,
    storageFrom: vi.fn(() => storage),
    user: {
      id: 'u1',
      email: 'dna@example.com',
      user_metadata: { full_name: 'Daniel Ávila', avatar_url: 'https://lh3.googleusercontent.com/a/foto' },
    } as { id: string; email: string; user_metadata: Record<string, string> },
  };
});

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: vi.fn(() => ({ insert: mocks.insert })),
    storage: { from: mocks.storageFrom },
  },
}));

const PEACH = ONBOARDING_TEMPLATES.find((t) => t.id === 'warm-peach')!;

function profile(id: string, extra: Partial<Profile> = {}): Profile {
  return {
    id,
    username: id === 'u1' ? 'dna' : id,
    full_name: `Perfil ${id}`,
    avatar_url: null,
    bio: null,
    custom_domain: null,
    preferred_domain: 'default',
    theme_options: {},
    show_username: true,
    show_qr_code: true,
    user_type: 'personal',
    created_at: '2026-10-26T00:00:00Z',
    updated_at: '2026-10-26T00:00:00Z',
    ...extra,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

let ctx: CurrentProfileContextValue;
function Probe() {
  ctx = useCurrentProfile();
  return <p data-testid="atual">{ctx.currentProfile?.id ?? (ctx.loading ? 'carregando' : 'nenhum')}</p>;
}

const renderProvider = () =>
  render(
    <CurrentProfileProvider>
      <Probe />
    </CurrentProfileProvider>,
  );

const atual = () => screen.getByTestId('atual').textContent;

/** rpc por nome de função: cada teste define as respostas */
function rpcHandlers(handlers: Record<string, (args?: unknown) => unknown>) {
  mocks.rpc.mockImplementation(async (fn: string, args?: unknown) => {
    const handler = handlers[fn];
    if (!handler) throw new Error(`rpc inesperada: ${fn}`);
    return handler(args);
  });
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.user = {
    id: 'u1',
    email: 'dna@example.com',
    user_metadata: { full_name: 'Daniel Ávila', avatar_url: 'https://lh3.googleusercontent.com/a/foto' },
  };
  mocks.rpc.mockReset();
  mocks.insert.mockReset().mockResolvedValue({ error: null });
  mocks.storageFrom.mockClear();
  mocks.storage.remove.mockReset().mockResolvedValue({ error: null });
  useDesignStore.getState().resetDesign();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CurrentProfileProvider: carga', () => {
  it('carrega os perfis pela RPC e seleciona o primeiro', async () => {
    rpcHandlers({ list_own_profiles: () => ({ data: [profile('u1'), profile('p2')], error: null }) });
    renderProvider();

    await waitFor(() => expect(atual()).toBe('u1'));
    expect(mocks.rpc).toHaveBeenCalledWith('list_own_profiles');
    expect(ctx.profiles.map((p) => p.id)).toEqual(['u1', 'p2']);
    expect(ctx.loading).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('lista vazia: cria o primeiro perfil com o id, o nome e a foto da conta', async () => {
    const lists = [[], [profile('u1')]];
    rpcHandlers({ list_own_profiles: () => ({ data: lists.shift() ?? [profile('u1')], error: null }) });
    renderProvider();

    await waitFor(() => expect(atual()).toBe('u1'));
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith({
      id: 'u1',
      full_name: 'Daniel Ávila',
      avatar_url: 'https://lh3.googleusercontent.com/a/foto',
    });
  });

  it('duas cargas simultâneas fazem um único insert', async () => {
    const insert = deferred<{ error: null }>();
    mocks.insert.mockReturnValue(insert.promise);
    let calls = 0;
    rpcHandlers({ list_own_profiles: () => ({ data: ++calls <= 2 ? [] : [profile('u1')], error: null }) });
    renderProvider();

    await waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1));
    act(() => {
      void ctx.reloadProfiles();
    });
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(2));
    await act(async () => insert.resolve({ error: null }));

    await waitFor(() => expect(atual()).toBe('u1'));
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it('uma carga antiga que termina depois da nova não sobrescreve a lista', async () => {
    const primeira = deferred<unknown>();
    let calls = 0;
    mocks.rpc.mockImplementation(async (fn: string) => {
      if (fn !== 'list_own_profiles') throw new Error(`rpc inesperada: ${fn}`);
      calls += 1;
      // A primeira carga (a da montagem) fica pendurada; a segunda responde na hora
      if (calls === 1) return primeira.promise;
      return { data: [profile('u1'), profile('p2')], error: null };
    });
    renderProvider();
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));

    await act(async () => {
      await ctx.reloadProfiles();
    });
    expect(ctx.profiles.map((p) => p.id)).toEqual(['u1', 'p2']);

    // A resposta antiga chega por último, com a lista velha: é descartada
    await act(async () => {
      primeira.resolve({ data: [profile('u1')], error: null });
    });
    expect(ctx.profiles.map((p) => p.id)).toEqual(['u1', 'p2']);
    expect(ctx.loading).toBe(false);
  });

  it('23505 no insert (outra aba criou antes) recarrega a lista sem erro', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    const lists = [[], [profile('u1')]];
    rpcHandlers({ list_own_profiles: () => ({ data: lists.shift() ?? [profile('u1')], error: null }) });
    renderProvider();

    await waitFor(() => expect(atual()).toBe('u1'));
    expect(ctx.error).toBeNull();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it('erro de rede não cria nada e mostra o erro', async () => {
    rpcHandlers({ list_own_profiles: () => ({ data: null, error: { message: 'Failed to fetch' } }) });
    renderProvider();

    await waitFor(() => expect(ctx.loading).toBe(false));
    expect(atual()).toBe('nenhum');
    expect(ctx.error).toBe('Não foi possível carregar seus perfis.');
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('reinicia quando a conta muda', async () => {
    rpcHandlers({
      list_own_profiles: () => ({ data: mocks.user.id === 'u1' ? [profile('u1')] : [profile('u2')], error: null }),
    });
    const view = renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    mocks.user = { id: 'u2', email: 'outra@example.com', user_metadata: {} };
    view.rerender(
      <CurrentProfileProvider>
        <Probe />
      </CurrentProfileProvider>,
    );

    await waitFor(() => expect(atual()).toBe('u2'));
    expect(ctx.profiles.map((p) => p.id)).toEqual(['u2']);
  });
});

describe('CurrentProfileProvider: seleção', () => {
  it('lê e grava o perfil escolhido no localStorage', async () => {
    window.localStorage.setItem(currentProfileStorageKey('u1'), 'p2');
    rpcHandlers({ list_own_profiles: () => ({ data: [profile('u1'), profile('p2')], error: null }) });
    renderProvider();

    await waitFor(() => expect(atual()).toBe('p2'));
    act(() => ctx.selectProfile('u1'));
    expect(atual()).toBe('u1');
    expect(window.localStorage.getItem('linkhub:currentProfile:u1')).toBe('u1');
  });

  it('funciona sem localStorage (leitura e gravação lançam erro)', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    rpcHandlers({ list_own_profiles: () => ({ data: [profile('u1'), profile('p2')], error: null }) });
    renderProvider();

    await waitFor(() => expect(atual()).toBe('u1'));
    act(() => ctx.selectProfile('p2'));
    expect(atual()).toBe('p2');
  });

  it('perfil guardado que não existe mais cai no primeiro', async () => {
    window.localStorage.setItem(currentProfileStorageKey('u1'), 'p-sumiu');
    rpcHandlers({ list_own_profiles: () => ({ data: [profile('u1'), profile('p2')], error: null }) });
    renderProvider();

    await waitFor(() => expect(atual()).toBe('u1'));
  });

  it('selecionar um id que não é da lista não muda nada', async () => {
    rpcHandlers({ list_own_profiles: () => ({ data: [profile('u1')], error: null }) });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    act(() => ctx.selectProfile('de-outra-conta'));
    expect(atual()).toBe('u1');
  });

  it('a troca aplica o tema do perfil ou volta ao padrão, e avisa linksUpdated', async () => {
    const comTema = profile('p2', { theme_options: { themeId: 'warm-peach', custom: PEACH.config } as never });
    rpcHandlers({ list_own_profiles: () => ({ data: [profile('u1'), comTema], error: null }) });
    const linksUpdated = vi.fn();
    window.addEventListener('linksUpdated', linksUpdated);
    try {
      renderProvider();
      await waitFor(() => expect(atual()).toBe('u1'));
      expect(useDesignStore.getState().currentTheme).toBe('pebble-blue');

      act(() => ctx.selectProfile('p2'));
      expect(useDesignStore.getState().currentTheme).toBe('warm-peach');
      expect(useDesignStore.getState().customTheme).toEqual(PEACH.config);

      act(() => ctx.selectProfile('u1'));
      expect(useDesignStore.getState().currentTheme).toBe('pebble-blue');
      expect(useDesignStore.getState().customTheme).toEqual(createDefaultCustomTheme());
      // Carga inicial + duas trocas
      expect(linksUpdated).toHaveBeenCalledTimes(3);
    } finally {
      window.removeEventListener('linksUpdated', linksUpdated);
    }
  });

  it('recarga sem mudança de tema não mexe no editor; tema novo gravado é aplicado', async () => {
    let atualDoBanco = profile('u1');
    rpcHandlers({ list_own_profiles: () => ({ data: [atualDoBanco], error: null }) });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    // Edição ainda não salva no editor
    act(() => useDesignStore.getState().setCurrentTheme('editando'));
    await act(async () => ctx.reloadProfiles());
    expect(useDesignStore.getState().currentTheme).toBe('editando');

    // O onboarding gravou um modelo: a recarga aplica
    atualDoBanco = profile('u1', { theme_options: { themeId: 'warm-peach', custom: PEACH.config } as never });
    await act(async () => ctx.reloadProfiles());
    expect(useDesignStore.getState().currentTheme).toBe('warm-peach');
  });
});

describe('CurrentProfileProvider: criar e excluir', () => {
  it('createProfile chama a RPC, recarrega e devolve o id', async () => {
    let lista = [profile('u1')];
    rpcHandlers({
      list_own_profiles: () => ({ data: lista, error: null }),
      create_profile: () => {
        lista = [profile('u1'), profile('p9')];
        return { data: 'p9', error: null };
      },
    });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    let result: unknown;
    await act(async () => {
      result = await ctx.createProfile({ username: 'loja', full_name: 'Minha loja' });
    });
    expect(result).toEqual({ ok: true, id: 'p9' });
    expect(mocks.rpc).toHaveBeenCalledWith('create_profile', { p_username: 'loja', p_full_name: 'Minha loja' });
    expect(ctx.profiles.map((p) => p.id)).toEqual(['u1', 'p9']);
    // Criar não troca o perfil atual: quem troca é o diálogo, com selectProfile
    expect(atual()).toBe('u1');
  });

  it('createProfile decide o erro pelo hint e pelo 23505', async () => {
    const respostas = [
      { hint: 'linkhub_profile_limit', code: 'P0001', message: 'Você já tem 10 perfis.' },
      { hint: 'linkhub_invalid_username', code: 'P0001', message: 'x' },
      { hint: null, code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key"' },
      { hint: null, code: '500', message: 'Failed to fetch' },
    ];
    rpcHandlers({
      list_own_profiles: () => ({ data: [profile('u1')], error: null }),
      create_profile: () => ({ data: null, error: respostas.shift() }),
    });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    const erros: unknown[] = [];
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        erros.push(await ctx.createProfile({ username: 'loja', full_name: '' }));
      });
    }
    expect(erros).toEqual([
      { ok: false, error: 'limit' },
      { ok: false, error: 'invalid' },
      { ok: false, error: 'taken' },
      { ok: false, error: 'other' },
    ]);
  });

  it('deleteProfile chama a RPC, apaga os arquivos da pasta do perfil e seleciona o primeiro', async () => {
    window.localStorage.setItem(currentProfileStorageKey('u1'), 'p2');
    let lista = [profile('u1'), profile('p2')];
    rpcHandlers({
      list_own_profiles: () => ({ data: lista, error: null }),
      delete_own_profile: () => {
        lista = [profile('u1')];
        return {
          data: {
            avatar_url: `${AVATARS_PUBLIC_PREFIX}p2/1700.jpg`,
            icon_urls: [`${LINK_ICONS_PUBLIC_PREFIX}p2/7-1.png`, `${LINK_ICONS_PUBLIC_PREFIX}outra/7-1.png`],
          },
          error: null,
        };
      },
    });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('p2'));

    let result: unknown;
    await act(async () => {
      result = await ctx.deleteProfile('p2');
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith('delete_own_profile', { p_profile_id: 'p2' });
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-avatars');
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-link-icons');
    expect(mocks.storage.remove).toHaveBeenCalledWith(['p2/1700.jpg']);
    // O ícone de outra pasta fica de fora
    expect(mocks.storage.remove).toHaveBeenCalledWith(['p2/7-1.png']);
    expect(atual()).toBe('u1');
  });

  it('falha ao apagar os arquivos vai só para o console', async () => {
    mocks.storage.remove.mockResolvedValue({ error: { message: 'sem permissão' } });
    let lista = [profile('u1'), profile('p2')];
    rpcHandlers({
      list_own_profiles: () => ({ data: lista, error: null }),
      delete_own_profile: () => {
        lista = [profile('u1')];
        return { data: { avatar_url: `${AVATARS_PUBLIC_PREFIX}p2/1.jpg`, icon_urls: [] }, error: null };
      },
    });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    let result: unknown;
    await act(async () => {
      result = await ctx.deleteProfile('p2');
    });
    expect(result).toEqual({ ok: true });
    expect(console.error).toHaveBeenCalledWith('Error removing profile files:', expect.anything());
  });

  it('deleteProfile do último perfil devolve "last" e não mexe no Storage', async () => {
    rpcHandlers({
      list_own_profiles: () => ({ data: [profile('u1')], error: null }),
      delete_own_profile: () => ({ data: null, error: { hint: 'linkhub_last_profile', code: 'P0001', message: 'x' } }),
    });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    let result: unknown;
    await act(async () => {
      result = await ctx.deleteProfile('u1');
    });
    expect(result).toEqual({ ok: false, error: 'last' });
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });
});

describe('useCurrentProfile', () => {
  it('fora do Provider lança erro', () => {
    expect(() => render(<Probe />)).toThrow('useCurrentProfile must be used within a CurrentProfileProvider');
  });
});
