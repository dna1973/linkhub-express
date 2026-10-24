// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useDesignStore, type ThemeConfig } from '@/stores/useDesignStore';
import { SettingsTab } from './SettingsTab';

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
  };
});

vi.mock('@/contexts/AuthContext', () => {
  const user = { id: 'u1', email: 'dna@example.com', app_metadata: {} };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useUsernameValidation', () => ({
  useUsernameValidation: () => ({ isValid: true, isAvailable: true, isChecking: false, error: null, suggestions: [] }),
}));
vi.mock('@/hooks/useAutosave', () => ({ useAutosave: () => 'idle' }));
vi.mock('./AuthProviderInfo', () => ({ AuthProviderInfo: () => null }));
vi.mock('@/lib/supabase', () => ({
  AVATARS_BUCKET: 'linkhub-avatars',
  PUBLIC_SITE_URL: 'https://linkhub.avila.ia.br',
  supabase: {
    storage: { from: mocks.storageFrom },
    from: vi.fn(() => ({ update: (values: unknown) => ({ eq: async () => mocks.profileUpdate(values) }) })),
  },
}));
// A janela de recorte real tem testes próprios: aqui só interessam as props e o blob devolvido
vi.mock('./ImageCropDialog', () => ({
  ImageCropDialog: (props: {
    imageSrc: string;
    initialRemoveBackground?: boolean;
    themeColors?: { background: string; button: string };
    onClose: () => void;
    onCropComplete: (blob: Blob) => void;
  }) => (
    <div data-testid="crop-dialog">
      <span data-testid="crop-src">{props.imageSrc}</span>
      <span data-testid="crop-remove-bg">{String(props.initialRemoveBackground)}</span>
      <span data-testid="crop-theme">{JSON.stringify(props.themeColors)}</span>
      <button onClick={props.onClose}>fechar recorte</button>
      <button onClick={() => props.onCropComplete(new Blob(['png'], { type: 'image/png' }))}>aplicar png</button>
      <button onClick={() => props.onCropComplete(new Blob(['jpg'], { type: 'image/jpeg' }))}>aplicar jpeg</button>
    </div>
  ),
}));

const AVATAR_URL = 'https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-avatars/u1/123.jpg';

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let consoleError: { mockRestore: () => void };
const originalTheme = useDesignStore.getState().customTheme;

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  URL.createObjectURL = vi.fn(() => 'blob:foto-atual');
  URL.revokeObjectURL = vi.fn();
  mocks.toast.mockReset();
  mocks.storageFrom.mockClear();
  mocks.storage.remove.mockReset().mockResolvedValue({ error: null });
  mocks.storage.upload.mockReset().mockResolvedValue({ error: null });
  mocks.storage.getPublicUrl.mockReset().mockImplementation((path: string) => ({
    data: { publicUrl: `https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-avatars/${path}` },
  }));
  mocks.profileUpdate.mockReset().mockReturnValue({ error: null });
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
  render(
    <SettingsTab profile={{ username: 'dna', full_name: 'Daniel', avatar_url: avatarUrl }} onProfileUpdate={onProfileUpdate} />,
  );
  return { onProfileUpdate };
}

describe('SettingsTab, foto de perfil', () => {
  it('sem foto, não mostra "Remover fundo"', () => {
    renderTab('');
    expect(screen.queryByRole('button', { name: 'Remover fundo' })).toBeNull();
  });

  it('"Remover fundo" busca a foto atual sem cache e abre o recorte já com a remoção ligada', async () => {
    const blob = new Blob(['foto'], { type: 'image/jpeg' });
    const fetchMock = vi.fn(async () => new Response(blob, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Remover fundo' }));

    await screen.findByTestId('crop-dialog');
    expect(fetchMock).toHaveBeenCalledWith(AVATAR_URL, { cache: 'no-store' });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('crop-src').textContent).toBe('blob:foto-atual');
    expect(screen.getByTestId('crop-remove-bg').textContent).toBe('true');
    // Cores do tema do store: fundo = primeira cor do gradiente, botão = cor normalizada do botão
    expect(JSON.parse(screen.getByTestId('crop-theme').textContent!)).toEqual({ background: '#0F172A', button: '#f59e0b' });

    fireEvent.click(screen.getByRole('button', { name: 'fechar recorte' }));
    expect(screen.queryByTestId('crop-dialog')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto-atual');
  });

  it('se a foto atual não abrir, mostra o toast e não abre o recorte', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Remover fundo' }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Não foi possível abrir a foto atual. Envie a foto de novo para remover o fundo.',
          variant: 'destructive',
        }),
      ),
    );
    expect(screen.queryByTestId('crop-dialog')).toBeNull();
  });

  it('resposta sem sucesso (ex.: 404) também mostra o toast', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('não achou', { status: 404 })));
    renderTab();

    fireEvent.click(screen.getByRole('button', { name: 'Remover fundo' }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Não foi possível abrir a foto atual. Envie a foto de novo para remover o fundo.' }),
      ),
    );
    expect(screen.queryByTestId('crop-dialog')).toBeNull();
  });

  it('PNG do recorte sobe como .png com image/png, e o objectURL é revogado', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new Blob(['foto'], { type: 'image/jpeg' }), { status: 200 })));
    const { onProfileUpdate } = renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Remover fundo' }));
    fireEvent.click(await screen.findByRole('button', { name: 'aplicar png' }));

    await waitFor(() => expect(onProfileUpdate).toHaveBeenCalled());
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-avatars');
    expect(mocks.storageFrom).not.toHaveBeenCalledWith('avatars');
    expect(mocks.storage.remove).toHaveBeenCalledWith(['u1/123.jpg']);
    const [path, file] = mocks.storage.upload.mock.calls[0] as [string, File];
    expect(path).toMatch(/^u1\/\d+\.png$/);
    expect(file.name).toMatch(/^\d+\.png$/);
    expect(file.type).toBe('image/png');
    expect(mocks.profileUpdate).toHaveBeenCalledWith({
      avatar_url: `https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-avatars/${path}`,
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto-atual');
  });

  it('JPEG do recorte continua subindo como .jpg com image/jpeg', async () => {
    const { container } = render(
      <SettingsTab profile={{ username: 'dna', full_name: 'Daniel', avatar_url: '' }} onProfileUpdate={vi.fn()} />,
    );
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['x'], 'foto.png', { type: 'image/png' })] } });
    fireEvent.click(await screen.findByRole('button', { name: 'aplicar jpeg' }));

    await waitFor(() => expect(mocks.storage.upload).toHaveBeenCalled());
    const [path, file] = mocks.storage.upload.mock.calls[0] as [string, File];
    expect(path).toMatch(/^u1\/\d+\.jpg$/);
    expect(file.type).toBe('image/jpeg');
  });

  it('"Remover" apaga o arquivo no bucket do LinkHub', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(mocks.storage.remove).toHaveBeenCalledWith(['u1/123.jpg']));
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-avatars');
    expect(mocks.storageFrom).not.toHaveBeenCalledWith('avatars');
  });
});
