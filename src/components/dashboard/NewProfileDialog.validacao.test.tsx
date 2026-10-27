// @vitest-environment jsdom
// Diálogo com o useUsernameValidation e o UsernameInput reais: só o banco e o contexto são falsos
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UsernameInput } from '@/components/ui/username-input';
import { NewProfileDialog } from './NewProfileDialog';

const mocks = vi.hoisted(() => ({
  createProfile: vi.fn(),
  selectProfile: vi.fn(),
  // @ consultado em cada select de profiles
  checked: [] as string[],
}));

vi.mock('@/contexts/CurrentProfileContext', () => ({
  MAX_PROFILES: 10,
  useCurrentProfile: () => ({ createProfile: mocks.createProfile, selectProfile: mocks.selectProfile }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: async (_column: string, value: string) => {
          mocks.checked.push(value);
          return { data: [], error: null };
        },
      }),
    }),
  },
}));

beforeEach(() => {
  mocks.createProfile.mockReset().mockResolvedValue({ ok: true, id: 'p9' });
  mocks.selectProfile.mockReset();
  mocks.checked = [];
});
afterEach(() => cleanup());

// Resultado do hook da aba Configurações, que roda lá e chega por prop
const CONFERIDO_DNA = { isValid: true, isAvailable: true, isChecking: false, error: null, suggestions: [], checkedUsername: 'dna' };

const continuar = () => screen.getByRole('button', { name: /Continuar/ }) as HTMLButtonElement;
const usernameField = () => screen.getByLabelText('@username') as HTMLInputElement;

function renderDialog() {
  render(<NewProfileDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />);
}

describe('NewProfileDialog com a validação real', () => {
  it('trocar o @ já conferido por outro bloqueia "Continuar" na hora', async () => {
    renderDialog();
    fireEvent.change(usernameField(), { target: { value: 'loja' } });
    await waitFor(() => expect(continuar().disabled).toBe(false), { timeout: 2000 });

    fireEvent.change(usernameField(), { target: { value: 'admin' } });
    expect(continuar().disabled).toBe(true);
    fireEvent.click(continuar());
    expect(mocks.createProfile).not.toHaveBeenCalled();
  });

  it('confere cada @ uma vez só', async () => {
    renderDialog();
    fireEvent.change(usernameField(), { target: { value: 'loja' } });
    await waitFor(() => expect(continuar().disabled).toBe(false), { timeout: 2000 });
    expect(mocks.checked).toEqual(['loja']);
  });

  it('com outro UsernameInput na página (o da aba Configurações), cada rótulo aponta para o seu campo', () => {
    render(
      <>
        <UsernameInput value="dna" onChange={vi.fn()} label="Username (slug único)" validation={CONFERIDO_DNA} />
        <NewProfileDialog open onOpenChange={vi.fn()} onCreated={vi.fn()} />
      </>,
    );
    const daAba = screen.getByLabelText('Username (slug único)') as HTMLInputElement;
    expect(daAba.value).toBe('dna');
    expect(usernameField()).not.toBe(daAba);
    expect(usernameField().value).toBe('');
    expect(daAba.id).not.toBe(usernameField().id);
  });
});
