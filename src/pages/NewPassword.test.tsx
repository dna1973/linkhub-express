// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NewPassword from './NewPassword';
import { forgetRecoveryLink, rememberRecoveryLink } from '@/lib/passwordRecovery';

type Session = { user: { id: string } } | null;
type Listener = (event: string, session: Session) => void;

const mocks = vi.hoisted(() => ({
  listener: null as Listener | null,
  session: null as Session,
  updateUser: vi.fn(),
  signOut: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (listener: Listener) => {
        mocks.listener = listener;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession: async () => ({ data: { session: mocks.session }, error: null }),
      updateUser: mocks.updateUser,
      signOut: mocks.signOut,
    },
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

const INVALID = 'Este link expirou ou já foi usado. Peça um novo em Esqueci minha senha.';
const RECOVERY_HASH = '#access_token=abc&expires_in=3600&refresh_token=r1&token_type=bearer&type=recovery';

beforeEach(() => {
  window.location.hash = '';
  forgetRecoveryLink();
  mocks.listener = null;
  mocks.session = null;
  mocks.updateUser.mockReset().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  mocks.signOut.mockReset().mockResolvedValue({ error: null });
  mocks.toast.mockReset();
});
afterEach(() => cleanup());

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/auth/nova-senha']}>
      <Routes>
        <Route path="/auth/nova-senha" element={<NewPassword />} />
        <Route path="/auth" element={<p>tela de login</p>} />
        <Route path="/dashboard" element={<p>painel</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function renderWithRecoverySession() {
  window.location.hash = RECOVERY_HASH;
  mocks.session = { user: { id: 'u1' } };
  renderPage();
  await screen.findByLabelText('Nova senha');
}

function fill(password: string, confirm = password) {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: confirm } });
}

const saveButton = () => screen.getByRole('button', { name: /Salvar senha nova|Salvando/ }) as HTMLButtonElement;

describe('NewPassword: chegada pelo link', () => {
  it('sem sessão (aberta direto ou link vencido) mostra o aviso e leva ao login', async () => {
    renderPage();
    expect(await screen.findByText(INVALID)).toBeTruthy();
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Ir para o login/ }));
    expect(screen.getByText('tela de login')).toBeTruthy();
  });

  it('hash com error (link expirado) mostra o mesmo aviso, mesmo com uma sessão antiga aberta', async () => {
    window.location.hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    mocks.session = { user: { id: 'u1' } };
    renderPage();
    expect(await screen.findByText(INVALID)).toBeTruthy();
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
  });

  it('sessão comum, sem link de recuperação, não mostra o formulário nem vai ao painel', async () => {
    mocks.session = { user: { id: 'u1' } };
    renderPage();
    expect(await screen.findByText(INVALID)).toBeTruthy();
    expect(screen.queryByText('painel')).toBeNull();
  });

  it('com a sessão do link de recuperação mostra o formulário', async () => {
    await renderWithRecoverySession();
    const nova = screen.getByLabelText('Nova senha') as HTMLInputElement;
    const confirmar = screen.getByLabelText('Confirmar senha') as HTMLInputElement;
    expect(nova.getAttribute('autocomplete')).toBe('new-password');
    expect(confirmar.getAttribute('autocomplete')).toBe('new-password');
    expect(screen.queryByText('painel')).toBeNull();
  });

  it('reconhece o link pelo hash guardado na chegada, depois que o supabase-js limpou a URL', async () => {
    rememberRecoveryLink(RECOVERY_HASH);
    mocks.session = { user: { id: 'u1' } };
    renderPage();
    expect(await screen.findByLabelText('Nova senha')).toBeTruthy();
  });

  it('o evento PASSWORD_RECOVERY também abre o formulário', async () => {
    renderPage();
    await screen.findByText(INVALID);
    act(() => mocks.listener?.('PASSWORD_RECOVERY', { user: { id: 'u1' } }));
    expect(await screen.findByLabelText('Nova senha')).toBeTruthy();
  });

  it('mostrar/ocultar senha troca o tipo dos campos', async () => {
    await renderWithRecoverySession();
    const nova = screen.getByLabelText('Nova senha') as HTMLInputElement;
    expect(nova.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(nova.type).toBe('text');
    expect((screen.getByLabelText('Confirmar senha') as HTMLInputElement).type).toBe('text');
  });
});

describe('NewPassword: gravação', () => {
  it('senha curta bloqueia o botão e avisa', async () => {
    await renderWithRecoverySession();
    expect(saveButton().disabled).toBe(true);
    fill('abc123');
    expect(saveButton().disabled).toBe(true);
    expect(screen.getByText(/pelo menos 8 caracteres/)).toBeTruthy();
  });

  it('senhas diferentes bloqueiam o botão e avisam', async () => {
    await renderWithRecoverySession();
    fill('senhaboa123', 'senhaboa124');
    expect(saveButton().disabled).toBe(true);
    expect(screen.getByText('As senhas não são iguais.')).toBeTruthy();
    fireEvent.submit(saveButton().closest('form')!);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it('sucesso: grava, sai da conta, avisa e leva ao login', async () => {
    await renderWithRecoverySession();
    fill('senhaboa123');
    expect(saveButton().disabled).toBe(false);
    fireEvent.click(saveButton());
    await screen.findByText('tela de login');
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'senhaboa123' });
    expect(mocks.signOut).toHaveBeenCalled();
    expect(mocks.signOut.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.updateUser.mock.invocationCallOrder[0]);
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Senha alterada. Entre com a senha nova.' }));
  });

  it('se o signOut do servidor falhar, sai ao menos neste aparelho', async () => {
    mocks.signOut.mockResolvedValueOnce({ error: { message: 'Failed to fetch' } }).mockResolvedValue({ error: null });
    await renderWithRecoverySession();
    fill('senhaboa123');
    fireEvent.click(saveButton());
    await screen.findByText('tela de login');
    expect(mocks.signOut).toHaveBeenLastCalledWith({ scope: 'local' });
  });

  it('same_password vira mensagem em português e fica na página', async () => {
    mocks.updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'New password should be different from the old password.', status: 422, code: 'same_password' },
    });
    await renderWithRecoverySession();
    fill('senhaboa123');
    fireEvent.click(saveButton());
    expect(await screen.findByText('A senha nova precisa ser diferente da antiga.')).toBeTruthy();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(saveButton().disabled).toBe(false);
  });

  it('weak_password vira mensagem em português', async () => {
    mocks.updateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Password is known to be weak and easy to guess', status: 422, code: 'weak_password' },
    });
    await renderWithRecoverySession();
    fill('senhaboa123');
    fireEvent.click(saveButton());
    expect(await screen.findByText(/Senha fraca/)).toBeTruthy();
  });

  it('erro desconhecido mostra mensagem genérica', async () => {
    mocks.updateUser.mockRejectedValue(new TypeError('Failed to fetch'));
    await renderWithRecoverySession();
    fill('senhaboa123');
    fireEvent.click(saveButton());
    expect(await screen.findByText(/Não foi possível alterar a senha agora/)).toBeTruthy();
  });

  it('dois cliques gravam uma vez só e o botão fica desabilitado enquanto grava', async () => {
    let resolve!: (v: unknown) => void;
    mocks.updateUser.mockReturnValue(new Promise((r) => (resolve = r)));
    await renderWithRecoverySession();
    fill('senhaboa123');
    fireEvent.click(saveButton());
    fireEvent.click(saveButton());
    await waitFor(() => expect(saveButton().disabled).toBe(true));
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
    resolve({ data: { user: { id: 'u1' } }, error: null });
    await screen.findByText('tela de login');
  });
});
