// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AVATARS_PUBLIC_PREFIX } from '@/lib/avatarStorage';
import { OnboardingDialog } from './OnboardingDialog';

const mocks = vi.hoisted(() => {
  const storage = { upload: vi.fn(), getPublicUrl: vi.fn() };
  return {
    update: vi.fn(),
    insert: vi.fn(),
    toast: vi.fn(),
    storage,
    storageFrom: vi.fn(() => storage),
  };
});

// Dados do Google na conta: o onboarding não pode usá-los no lugar dos do perfil
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', user_metadata: { full_name: 'Nome do Google', avatar_url: 'https://lh3.googleusercontent.com/a/foto' } },
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/supabase', () => ({
  AVATARS_BUCKET: 'linkhub-avatars',
  supabase: {
    from: vi.fn((table: string) => ({
      update: (values: unknown) => ({
        eq: async (column: string, value: unknown) => mocks.update(table, values, column, value),
      }),
      insert: async (rows: unknown) => mocks.insert(table, rows),
    })),
    storage: { from: mocks.storageFrom },
  },
}));

const PROFILE = { id: 'p2', full_name: 'Minha loja', avatar_url: 'https://exemplo.com/foto.png' };

beforeEach(() => {
  mocks.update.mockReset().mockReturnValue({ error: null });
  mocks.insert.mockReset().mockReturnValue({ error: null });
  mocks.toast.mockReset();
  mocks.storageFrom.mockClear();
  mocks.storage.upload.mockReset().mockResolvedValue({ error: null });
  mocks.storage.getPublicUrl.mockReset().mockImplementation((path: string) => ({
    data: { publicUrl: `${AVATARS_PUBLIC_PREFIX}${path}` },
  }));
  URL.createObjectURL = vi.fn(() => 'blob:1');
});
afterEach(() => {
  cleanup();
  delete (URL as { createObjectURL?: unknown }).createObjectURL;
});

function renderDialog() {
  const onComplete = vi.fn();
  render(<OnboardingDialog open profile={PROFILE} onComplete={onComplete} />);
  return onComplete;
}

/** Passo 1 (tipo) → passo 2 (dados) → passo 3 (modelo, pulado) → passo 4 (plataformas). */
function goToPlatforms(beforeLeavingDetails?: () => void) {
  fireEvent.click(screen.getByRole('button', { name: /Pessoal/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
  beforeLeavingDetails?.();
  fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Pular' }));
}

describe('OnboardingDialog', () => {
  it('usa o nome e a foto do perfil, grava em profile.id e cria os links nele', async () => {
    const onComplete = renderDialog();
    goToPlatforms(() => {
      expect((screen.getByPlaceholderText('Título do perfil') as HTMLInputElement).value).toBe('Minha loja');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Site' }));
    fireEvent.change(screen.getByPlaceholderText('https://seusite.com'), { target: { value: 'https://minhaloja.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Finalizar/ }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('personal'));
    expect(mocks.update).toHaveBeenCalledWith(
      'profiles',
      { user_type: 'personal', full_name: 'Minha loja', avatar_url: 'https://exemplo.com/foto.png' },
      'id',
      'p2',
    );
    expect(mocks.insert).toHaveBeenCalledWith('links', [
      { user_id: 'p2', title: 'Site', url: 'https://minhaloja.com', position: 0, is_visible: true },
    ]);
  });

  it('a foto enviada vai para a pasta do perfil', async () => {
    const onComplete = renderDialog();
    goToPlatforms(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })] } });
    });
    fireEvent.click(screen.getByRole('button', { name: /Começar sem links/ }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-avatars');
    const [path] = mocks.storage.upload.mock.calls[0] as [string];
    expect(path).toMatch(/^p2\/avatar-\d+\.jpg$/);
    expect(mocks.update).toHaveBeenCalledWith(
      'profiles',
      expect.objectContaining({ avatar_url: `${AVATARS_PUBLIC_PREFIX}${path}` }),
      'id',
      'p2',
    );
  });

  it('"Pular" no último passo também grava no perfil recebido', async () => {
    const onComplete = renderDialog();
    goToPlatforms();
    fireEvent.click(screen.getByRole('button', { name: 'Pular' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('personal'));
    expect(mocks.update).toHaveBeenCalledWith('profiles', expect.objectContaining({ user_type: 'personal' }), 'id', 'p2');
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
