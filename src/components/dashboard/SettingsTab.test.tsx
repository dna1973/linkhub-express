// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useDesignStore, type ThemeConfig } from '@/stores/useDesignStore';
import { SettingsTab } from './SettingsTab';
import { AVATARS_PUBLIC_PREFIX } from '@/lib/avatarStorage';

const mocks = vi.hoisted(() => {
  const storage = {
    remove: vi.fn(),
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
  };
  return {
    toast: vi.fn(),
    storage,
    storageFrom: vi.fn(() => storage),
    profileUpdate: vi.fn(),
    // Último formData e callback que a aba passou ao useAutosave (o teste chama o salvamento na mão)
    autosave: null as null | { data: unknown; save: (data: unknown) => Promise<void>; resetKey: unknown },
    // Coluna e valor do .eq() de cada update de profiles
    profileEq: vi.fn(),
    // Argumentos de cada chamada ao useUsernameValidation (da aba e do UsernameInput)
    usernameArgs: [] as unknown[][],
  };
});

vi.mock('@/contexts/AuthContext', () => {
  const user = { id: 'u1', email: 'dna@example.com', app_metadata: {} };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useUsernameValidation', () => ({
  useUsernameValidation: (...args: unknown[]) => {
    mocks.usernameArgs.push(args);
    return { isValid: true, isAvailable: true, isChecking: false, error: null, suggestions: [] };
  },
}));
vi.mock('@/hooks/useAutosave', () => ({
  useAutosave: (data: unknown, save: (data: unknown) => Promise<void>, _delay: number, _enabled: boolean, resetKey: unknown) => {
    mocks.autosave = { data, save, resetKey };
    return 'idle';
  },
}));
vi.mock('./AuthProviderInfo', () => ({ AuthProviderInfo: () => null }));
vi.mock('@/lib/supabase', () => ({
  AVATARS_BUCKET: 'linkhub-avatars',
  supabase: {
    storage: { from: mocks.storageFrom },
    from: vi.fn(() => ({
      update: (values: unknown) => ({
        eq: async (column: string, value: unknown) => {
          mocks.profileEq(column, value);
          return mocks.profileUpdate(values);
        },
      }),
    })),
  },
}));
// URL do site para o link público e o rótulo "Padrão (…)"
vi.mock('@/lib/siteUrl', () => ({ PUBLIC_SITE_URL: 'https://linkhub.avila.ia.br' }));
// A janela de recorte real tem testes próprios: aqui só interessam as props e o blob devolvido
vi.mock('./ImageCropDialog', async () => {
  const { useState } = await import('react');
  return {
    ImageCropDialog: function FakeImageCropDialog(props: {
      imageSrc: string;
      initialRemoveBackground?: boolean;
      themeColors?: { background: string; button: string };
      onClose: () => void;
      onCropComplete: (blob: Blob) => void;
    }) {
      // Como a janela real, só lê initialRemoveBackground ao montar
      const [initialRemoveBackground] = useState(props.initialRemoveBackground);
      return (
        <div data-testid="crop-dialog">
          <span data-testid="crop-src">{props.imageSrc}</span>
          <span data-testid="crop-remove-bg">{String(initialRemoveBackground)}</span>
          <span data-testid="crop-theme">{JSON.stringify(props.themeColors)}</span>
          <button onClick={props.onClose}>fechar recorte</button>
          <button onClick={() => props.onCropComplete(new Blob(['png'], { type: 'image/png' }))}>aplicar png</button>
          <button onClick={() => props.onCropComplete(new Blob(['jpg'], { type: 'image/jpeg' }))}>aplicar jpeg</button>
        </div>
      );
    },
  };
});

const AVATAR_URL = `${AVATARS_PUBLIC_PREFIX}p1/123.jpg`;
const OPEN_ERROR = 'Não foi possível abrir a foto atual. Envie a foto de novo para remover o fundo.';

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let urlCount = 0;
let consoleError: { mockRestore: () => void };
const originalTheme = useDesignStore.getState().customTheme;

beforeEach(() => {
  urlCount = 0;
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  URL.createObjectURL = vi.fn(() => `blob:${++urlCount}`);
  URL.revokeObjectURL = vi.fn();
  mocks.toast.mockReset();
  mocks.storageFrom.mockClear();
  mocks.storage.remove.mockReset().mockResolvedValue({ error: null });
  mocks.storage.upload.mockReset().mockResolvedValue({ error: null });
  mocks.storage.getPublicUrl.mockReset().mockImplementation((path: string) => ({
    data: { publicUrl: `${AVATARS_PUBLIC_PREFIX}${path}` },
  }));
  mocks.profileUpdate.mockReset().mockReturnValue({ error: null });
  mocks.profileEq.mockReset();
  mocks.usernameArgs = [];
  useDesignStore.getState().setCustomTheme({
    ...originalTheme,
    background: { type: 'gradient', colors: ['#0F172A', '#1e293b'] },
    buttonStyle: { type: 'solid', color: '#F59E0B' },
  } as ThemeConfig);
});

afterEach(() => {
  cleanup();
  consoleError.mockRestore();
  vi.unstubAllGlobals();
  delete (URL as { createObjectURL?: unknown }).createObjectURL;
  delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
  useDesignStore.getState().setCustomTheme(originalTheme);
});

function renderTab(avatarUrl = AVATAR_URL) {
  const onProfileUpdate = vi.fn();
  const view = render(
    <SettingsTab profile={{ id: 'p1', username: 'dna', full_name: 'Daniel', avatar_url: avatarUrl }} onProfileUpdate={onProfileUpdate} />,
  );
  return { ...view, onProfileUpdate };
}

// O Content-Type vem do cabeçalho: o Response do Node não reconhece o Blob do jsdom como corpo
const imageResponse = () => new Response('foto', { status: 200, headers: { 'content-type': 'image/jpeg' } });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

const removeBgButton = () => screen.getByRole('button', { name: 'Remover fundo' });

function selectFile(container: HTMLElement) {
  const input = container.querySelector('input[type=file]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] } });
}

async function applyPngFromCurrentAvatar() {
  vi.stubGlobal('fetch', vi.fn(async () => imageResponse()));
  const view = renderTab();
  fireEvent.click(removeBgButton());
  fireEvent.click(await screen.findByRole('button', { name: 'aplicar png' }));
  return view;
}

describe('SettingsTab, foto de perfil', () => {
  it('sem foto, não mostra "Remover fundo"', () => {
    renderTab('');
    expect(screen.queryByRole('button', { name: 'Remover fundo' })).toBeNull();
  });

  it('upload comum abre o recorte sem a remoção e revoga o objectURL ao fechar', () => {
    const { container } = renderTab();
    selectFile(container);

    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(screen.getByTestId('crop-src').textContent).toBe('blob:1');
    expect(screen.getByTestId('crop-remove-bg').textContent).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'fechar recorte' }));
    expect(screen.queryByTestId('crop-dialog')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('"Remover fundo" busca a foto atual sem cache e abre o recorte já com a remoção ligada', async () => {
    const fetchMock = vi.fn(async () => imageResponse());
    vi.stubGlobal('fetch', fetchMock);
    renderTab();

    fireEvent.click(removeBgButton());

    await screen.findByTestId('crop-dialog');
    expect(fetchMock).toHaveBeenCalledWith(AVATAR_URL, { cache: 'no-store' });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(screen.getByTestId('crop-src').textContent).toBe('blob:1');
    expect(screen.getByTestId('crop-remove-bg').textContent).toBe('true');
    // Cores do tema do store: fundo = primeira cor do gradiente, botão = cor normalizada do botão
    expect(JSON.parse(screen.getByTestId('crop-theme').textContent!)).toEqual({ background: '#0F172A', button: '#f59e0b' });

    fireEvent.click(screen.getByRole('button', { name: 'fechar recorte' }));
    expect(screen.queryByTestId('crop-dialog')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('enquanto a foto atual carrega, "Remover fundo" fica aria-disabled e ocupado, e Upload e Remover ficam desabilitados', async () => {
    const pending = deferred<Response>();
    const fetchMock = vi.fn(() => pending.promise);
    vi.stubGlobal('fetch', fetchMock);
    renderTab();
    const button = removeBgButton();
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

    fireEvent.click(button);

    // aria-disabled em vez de disabled, para o foco do teclado não cair no body
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Upload' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Remover' }).hasAttribute('disabled')).toBe(true);

    await act(async () => pending.resolve(imageResponse()));
    await screen.findByTestId('crop-dialog');
    expect(button.getAttribute('aria-disabled')).toBeNull();
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(screen.getByRole('button', { name: 'Upload' }).hasAttribute('disabled')).toBe(false);
  });

  it('se um upload abrir o recorte enquanto a foto atual carrega, a foto atual remonta a janela e o objectURL anterior é revogado', async () => {
    const pending = deferred<Response>();
    vi.stubGlobal('fetch', vi.fn(() => pending.promise));
    const { container } = renderTab();
    fireEvent.click(removeBgButton());
    // O botão Upload fica desabilitado, mas o input continua lá: simula a corrida direto nele
    selectFile(container);
    expect(screen.getByTestId('crop-src').textContent).toBe('blob:1');
    expect(screen.getByTestId('crop-remove-bg').textContent).toBe('false');

    await act(async () => pending.resolve(imageResponse()));

    await waitFor(() => expect(screen.getByTestId('crop-src').textContent).toBe('blob:2'));
    expect(screen.getByTestId('crop-remove-bg').textContent).toBe('true');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:2');
  });

  it('se a foto atual não abrir, mostra o toast e não abre o recorte', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    renderTab();

    fireEvent.click(removeBgButton());

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: OPEN_ERROR, variant: 'destructive' })),
    );
    expect(screen.queryByTestId('crop-dialog')).toBeNull();
    expect(removeBgButton().getAttribute('aria-disabled')).toBeNull();
  });

  it('resposta sem sucesso (ex.: 404) também mostra o toast', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('não achou', { status: 404 })));
    renderTab();

    fireEvent.click(removeBgButton());

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: OPEN_ERROR })));
    expect(screen.queryByTestId('crop-dialog')).toBeNull();
  });

  it('resposta 200 que não é imagem (fallback da SPA) também mostra o toast', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })),
    );
    renderTab();

    fireEvent.click(removeBgButton());

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: OPEN_ERROR })));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(screen.queryByTestId('crop-dialog')).toBeNull();
  });

  it('se a aba sair antes de a foto atual chegar, não cria objectURL nem mostra toast', async () => {
    const pending = deferred<unknown>();
    vi.stubGlobal('fetch', vi.fn(() => pending.promise));
    const { unmount } = renderTab();
    fireEvent.click(removeBgButton());

    unmount();
    await act(async () => {
      pending.resolve({ ok: true, status: 200, blob: async () => new Blob(['foto'], { type: 'image/jpeg' }) });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('PNG do recorte sobe como .png com image/png, grava o perfil e só depois apaga a foto antiga', async () => {
    const { onProfileUpdate } = await applyPngFromCurrentAvatar();

    await waitFor(() => expect(onProfileUpdate).toHaveBeenCalled());
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-avatars');
    expect(mocks.storageFrom).not.toHaveBeenCalledWith('avatars');
    const [path, file] = mocks.storage.upload.mock.calls[0] as [string, File];
    expect(path).toMatch(/^p1\/\d+\.png$/);
    expect(file.name).toMatch(/^\d+\.png$/);
    expect(file.type).toBe('image/png');
    expect(mocks.profileUpdate).toHaveBeenCalledWith({
      avatar_url: `${AVATARS_PUBLIC_PREFIX}${path}`,
    });
    expect(mocks.storage.remove).toHaveBeenCalledWith(['p1/123.jpg']);
    // Ordem: sobe o novo, grava o perfil, e só então apaga o antigo
    const removeOrder = mocks.storage.remove.mock.invocationCallOrder[0];
    expect(removeOrder).toBeGreaterThan(mocks.storage.upload.mock.invocationCallOrder[0]);
    expect(removeOrder).toBeGreaterThan(mocks.profileUpdate.mock.invocationCallOrder[0]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:1');
  });

  it('se o upload falhar, a foto antiga não é apagada, e "Remover" fica desabilitado durante o upload', async () => {
    const upload = deferred<{ error: unknown }>();
    mocks.storage.upload.mockReturnValue(upload.promise);
    const { onProfileUpdate } = await applyPngFromCurrentAvatar();

    await waitFor(() => expect(mocks.storage.upload).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Remover' }).hasAttribute('disabled')).toBe(true);
    await act(async () => upload.resolve({ error: new Error('sem espaço') }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Não foi possível carregar a imagem.', variant: 'destructive' }),
      ),
    );
    expect(mocks.storage.remove).not.toHaveBeenCalled();
    expect(mocks.profileUpdate).not.toHaveBeenCalled();
    expect(onProfileUpdate).not.toHaveBeenCalled();
  });

  it('se gravar o perfil falhar, a foto antiga não é apagada', async () => {
    mocks.profileUpdate.mockReturnValue({ error: { message: 'falhou' } });
    await applyPngFromCurrentAvatar();

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Não foi possível carregar a imagem.' })),
    );
    expect(mocks.storage.upload).toHaveBeenCalled();
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });

  it('erro ao apagar a foto antiga vai só para o console: a troca continua com sucesso', async () => {
    mocks.storage.remove.mockResolvedValue({ error: new Error('sem permissão') });
    const { onProfileUpdate } = await applyPngFromCurrentAvatar();

    await waitFor(() => expect(onProfileUpdate).toHaveBeenCalled());
    expect(mocks.storage.remove).toHaveBeenCalledWith(['p1/123.jpg']);
    expect(console.error).toHaveBeenCalledWith('Error removing old avatar:', expect.anything());
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sucesso!' }));
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('JPEG do recorte continua subindo como .jpg com image/jpeg', async () => {
    const { container } = renderTab('');
    selectFile(container);
    fireEvent.click(await screen.findByRole('button', { name: 'aplicar jpeg' }));

    await waitFor(() => expect(mocks.storage.upload).toHaveBeenCalled());
    const [path, file] = mocks.storage.upload.mock.calls[0] as [string, File];
    expect(path).toMatch(/^p1\/\d+\.jpg$/);
    expect(file.type).toBe('image/jpeg');
  });

  it('"Remover" apaga o arquivo no bucket do LinkHub', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(mocks.storage.remove).toHaveBeenCalledWith(['p1/123.jpg']));
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-avatars');
    expect(mocks.storageFrom).not.toHaveBeenCalledWith('avatars');
  });

  it('foto do Google não é apagada do bucket', async () => {
    renderTab('https://lh3.googleusercontent.com/a/foto=s96-c');
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Imagem removida' })));
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });

  it('foto da pasta de outro perfil não é apagada do bucket', async () => {
    renderTab(`${AVATARS_PUBLIC_PREFIX}p2/123.jpg`);
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Imagem removida' })));
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });

  it('"Remover" grava avatar_url null no perfil e só depois apaga o arquivo', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(mocks.storage.remove).toHaveBeenCalledWith(['p1/123.jpg']));
    expect(mocks.profileUpdate).toHaveBeenCalledWith({ avatar_url: null });
    expect(mocks.profileEq).toHaveBeenCalledWith('id', 'p1');
    expect(mocks.storage.remove.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.profileUpdate.mock.invocationCallOrder[0]);
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Imagem removida' }));
  });

  it('"Remover": se a gravação no perfil falhar, o arquivo não é apagado e a foto continua', async () => {
    mocks.profileUpdate.mockReturnValue({ error: { message: 'falhou' } });
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(mocks.storage.remove).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Imagem removida' }));
    expect(screen.getByRole('button', { name: 'Remover' })).toBeTruthy();
  });

  it('"Remover": falha ao apagar o arquivo vai só para o console', async () => {
    mocks.storage.remove.mockResolvedValue({ error: new Error('sem permissão') });
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Imagem removida' })));
    expect(console.error).toHaveBeenCalledWith('Error removing old avatar:', expect.anything());
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
  });

  it('trocar a foto quando a antiga é do Google não apaga nada do bucket', async () => {
    const { container } = renderTab('https://lh3.googleusercontent.com/a/foto=s96-c');
    selectFile(container);
    fireEvent.click(await screen.findByRole('button', { name: 'aplicar png' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Sucesso!' })));
    expect(mocks.storage.upload).toHaveBeenCalled();
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });
});

describe('SettingsTab, QR code e link público', () => {
  it('interruptor do QR code começa ligado e grava show_qr_code false', async () => {
    renderTab();
    const toggle = screen.getByRole('switch', { name: 'Exibir QR code no perfil público' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    await act(async () => {
      await mocks.autosave!.save(mocks.autosave!.data);
    });
    expect(mocks.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({ show_qr_code: false, show_username: true }));
  });

  it('segue o valor gravado: começa desligado com false e liga quando o perfil recarrega com true', () => {
    const base = { id: 'p1', username: 'dna', full_name: 'Daniel', avatar_url: '' };
    const { rerender } = render(<SettingsTab profile={{ ...base, show_qr_code: false }} onProfileUpdate={vi.fn()} />);
    const toggle = () => screen.getByRole('switch', { name: 'Exibir QR code no perfil público' });
    expect(toggle().getAttribute('aria-checked')).toBe('false');

    rerender(<SettingsTab profile={{ ...base, show_qr_code: true }} onProfileUpdate={vi.fn()} />);
    expect(toggle().getAttribute('aria-checked')).toBe('true');
  });

  it('o link para compartilhar usa a regra única (barra no fim do domínio personalizado)', () => {
    render(
      <SettingsTab
        profile={{ id: 'p1', username: 'dna', full_name: 'Daniel', avatar_url: '', preferred_domain: 'custom', custom_domain: 'https://meusite.com/' }}
        onProfileUpdate={vi.fn()}
      />,
    );
    // O cálculo antigo dava https://meusite.com//dna
    expect(screen.getByDisplayValue('https://meusite.com/dna')).toBeTruthy();
  });

  it('sem username, mostra o aviso no lugar do link', () => {
    render(<SettingsTab profile={{ id: 'p1', username: '', full_name: 'Daniel', avatar_url: '' }} onProfileUpdate={vi.fn()} />);
    expect(screen.getByDisplayValue('Configure seu @username primeiro')).toBeTruthy();
  });
});

describe('SettingsTab, perfil atual', () => {
  it('@ já usado: o aviso fala em outro perfil', async () => {
    mocks.profileUpdate.mockReturnValue({ error: { code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key" (username)' } });
    renderTab();
    fireEvent.click(screen.getByRole('switch', { name: 'Exibir QR code no perfil público' }));
    await act(async () => {
      await mocks.autosave!.save(mocks.autosave!.data).catch(() => {});
    });

    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Este username já está sendo usado por outro perfil.' }),
    );
  });

  it('o salvamento automático grava no perfil recebido e usa o id dele como resetKey', async () => {
    renderTab();
    expect(mocks.autosave!.resetKey).toBe('p1');

    fireEvent.click(screen.getByRole('switch', { name: 'Exibir QR code no perfil público' }));
    await act(async () => {
      await mocks.autosave!.save(mocks.autosave!.data);
    });

    expect(mocks.profileEq).toHaveBeenCalledWith('id', 'p1');
    expect(mocks.profileEq).not.toHaveBeenCalledWith('id', 'u1');
  });

  it('a foto nova vai para a pasta do perfil e é gravada nele', async () => {
    await applyPngFromCurrentAvatar();

    await waitFor(() => expect(mocks.profileEq).toHaveBeenCalledWith('id', 'p1'));
    const [path] = mocks.storage.upload.mock.calls[0] as [string];
    expect(path.startsWith('p1/')).toBe(true);
  });

  it('valida o @ com o id do perfil atual', () => {
    renderTab();
    expect(mocks.usernameArgs.length).toBeGreaterThan(0);
    for (const args of mocks.usernameArgs) {
      expect(args[0]).toBe('dna');
      expect(args[2]).toBe('p1');
    }
  });
});
