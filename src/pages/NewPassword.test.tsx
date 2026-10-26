// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NewPassword from './NewPassword';
import {
  forgetRecoveryLink,
  forgetRecoveryUser,
  getRecoveryLinkError,
  getRecoveryUserId,
  markRecoveryUser,
  rememberRecoveryLink,
} from '@/lib/passwordRecovery';

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
const ERROR_HASH = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';

function setUrl(hash = '') {
  window.history.replaceState(null, '', `/auth/nova-senha${hash}`);
}

beforeEach(() => {
  setUrl();
  forgetRecoveryLink();
  forgetRecoveryUser();
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

/** Sessão que o supabase-js abriu com o link (PASSWORD_RECOVERY marcou a conta) */
async function renderWithRecoverySession() {
  markRecoveryUser('u1');
  mocks.session = { user: { id: 'u1' } };
  renderPage();
  await screen.findByLabelText('Nova senha');
}

async function expectInvalid() {
  expect(await screen.findByText(INVALID)).toBeTruthy();
  expect(screen.queryByLabelText('Nova senha')).toBeNull();
  expect(screen.queryByText('painel')).toBeNull();
}

function fill(password: string, confirm = password) {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirmar senha'), { target: { value: confirm } });
}

const saveButton = () => screen.getByRole('button', { name: /Salvar senha nova|Salvando/ }) as HTMLButtonElement;

function deferred() {
  let resolve!: (v: unknown) => void;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

describe('NewPassword: só a sessão vinda do link abre o formulário', () => {
  it('sem sessão (aberta direto ou link vencido) mostra o aviso e leva ao login', async () => {
    renderPage();
    await expectInvalid();
    fireEvent.click(screen.getByRole('button', { name: /Ir para o login/ }));
    expect(screen.getByText('tela de login')).toBeTruthy();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('#type=recovery escrito à mão, com uma sessão comum aberta, não abre o formulário', async () => {
    setUrl('#type=recovery');
    mocks.session = { user: { id: 'u1' } };
    renderPage();
    await expectInvalid();
  });

  it('hash de recuperação lembrado, com a sessão antiga de outra conta mantida, não abre o formulário', async () => {
    rememberRecoveryLink({ pathname: '/auth/nova-senha', hash: RECOVERY_HASH });
    setUrl(RECOVERY_HASH);
    mocks.session = { user: { id: 'u1' } };
    renderPage();
    await expectInvalid();
  });

  it('marca de recuperação de outra conta não abre o formulário', async () => {
    markRecoveryUser('u2');
    mocks.session = { user: { id: 'u1' } };
    renderPage();
    await expectInvalid();
  });

  it('com a sessão marcada pelo PASSWORD_RECOVERY mostra o formulário', async () => {
    await renderWithRecoverySession();
    const nova = screen.getByLabelText('Nova senha') as HTMLInputElement;
    const confirmar = screen.getByLabelText('Confirmar senha') as HTMLInputElement;
    expect(nova.getAttribute('autocomplete')).toBe('new-password');
    expect(confirmar.getAttribute('autocomplete')).toBe('new-password');
    expect(screen.queryByText('painel')).toBeNull();
  });

  it('recarregar a página (hash já limpo) continua no formulário', async () => {
    setUrl('');
    await renderWithRecoverySession();
    expect(screen.getByLabelText('Confirmar senha')).toBeTruthy();
  });

  it('o evento PASSWORD_RECOVERY depois de montar abre o formulário', async () => {
    renderPage();
    await screen.findByText(INVALID);
    act(() => {
      markRecoveryUser('u1');
      mocks.listener?.('PASSWORD_RECOVERY', { user: { id: 'u1' } });
    });
    expect(await screen.findByLabelText('Nova senha')).toBeTruthy();
  });

  it('a sessão que sai (SIGNED_OUT) fecha o formulário', async () => {
    await renderWithRecoverySession();
    act(() => mocks.listener?.('SIGNED_OUT', null));
    await expectInvalid();
  });
});

describe('NewPassword: link com erro', () => {
  it('#error junto com type=recovery e sessão marcada mostra o aviso', async () => {
    setUrl(`${ERROR_HASH}&type=recovery`);
    markRecoveryUser('u1');
    mocks.session = { user: { id: 'u1' } };
    renderPage();
    await expectInvalid();
  });

  it('#error não vira formulário nem com o evento PASSWORD_RECOVERY', async () => {
    setUrl(ERROR_HASH);
    renderPage();
    await screen.findByText(INVALID);
    act(() => {
      markRecoveryUser('u1');
      mocks.listener?.('PASSWORD_RECOVERY', { user: { id: 'u1' } });
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
  });

  it('ao ir para o login com uma sessão de recuperação aberta, sai dela neste aparelho', async () => {
    setUrl(ERROR_HASH);
    markRecoveryUser('u1');
    mocks.session = { user: { id: 'u1' } };
    renderPage();
    await expectInvalid();
    fireEvent.click(screen.getByRole('button', { name: /Ir para o login/ }));
    await screen.findByText('tela de login');
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(getRecoveryUserId()).toBeNull();
  });

  it('sessão comum aberta não é encerrada ao ir para o login', async () => {
    mocks.session = { user: { id: 'u1' } };
    renderPage();
    await expectInvalid();
    fireEvent.click(screen.getByRole('button', { name: /Ir para o login/ }));
    await screen.findByText('tela de login');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('esquece o erro lembrado no aviso e ao sair da página', async () => {
    rememberRecoveryLink({ pathname: '/auth/nova-senha', hash: ERROR_HASH });
    const view = renderPage();
    await expectInvalid();
    expect(getRecoveryLinkError()).toBeNull();
    view.unmount();
    expect(getRecoveryLinkError()).toBeNull();
  });

  it('desmontar no formulário também esquece o erro lembrado depois', async () => {
    await renderWithRecoverySession();
    rememberRecoveryLink({ pathname: '/auth/nova-senha', hash: ERROR_HASH });
    cleanup();
    expect(getRecoveryLinkError()).toBeNull();
  });
});

describe('NewPassword: acessibilidade', () => {
  it('"Conferindo o link..." é um status', () => {
    renderPage();
    expect(screen.getByRole('status').textContent).toMatch(/Conferindo o link/);
  });

  it('o foco vai ao título de cada estado; o aviso fixo não é alerta', async () => {
    renderPage();
    await screen.findByText(INVALID);
    expect(document.activeElement?.textContent).toBe('Link inválido');
    expect(screen.queryByRole('alert')).toBeNull();
    cleanup();

    await renderWithRecoverySession();
    expect(document.activeElement?.textContent).toBe('Nova senha');
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

  it('sucesso: grava, sai uma vez do servidor, esquece a marca, avisa e leva ao login', async () => {
    await renderWithRecoverySession();
    fill('senhaboa123');
    expect(saveButton().disabled).toBe(false);
    fireEvent.click(saveButton());
    await screen.findByText('tela de login');
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'senhaboa123' });
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.signOut.mock.calls[0]).toEqual([]);
    expect(mocks.signOut.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.updateUser.mock.invocationCallOrder[0]);
    expect(getRecoveryUserId()).toBeNull();
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

  it('se nem a saída local der certo, fica na página dizendo que a senha foi alterada', async () => {
    mocks.signOut.mockResolvedValue({ error: { message: 'Failed to fetch' } });
    await renderWithRecoverySession();
    fill('senhaboa123');
    fireEvent.click(saveButton());
    expect(await screen.findByText(/A senha foi alterada/)).toBeTruthy();
    expect(screen.queryByText(/Não foi possível alterar a senha/)).toBeNull();
    expect(screen.queryByText('tela de login')).toBeNull();
    expect(screen.queryByLabelText('Nova senha')).toBeNull();
  });

  it('signOut que lança depois da senha gravada também não diz que a senha falhou', async () => {
    mocks.signOut.mockRejectedValue(new TypeError('Failed to fetch'));
    await renderWithRecoverySession();
    fill('senhaboa123');
    fireEvent.click(saveButton());
    expect(await screen.findByText(/A senha foi alterada/)).toBeTruthy();
    expect(screen.queryByText(/Não foi possível alterar a senha/)).toBeNull();
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
    expect(await screen.findByText(/Escolha uma senha mais forte/)).toBeTruthy();
  });

  it('erro desconhecido mostra mensagem genérica', async () => {
    mocks.updateUser.mockRejectedValue(new TypeError('Failed to fetch'));
    await renderWithRecoverySession();
    fill('senhaboa123');
    fireEvent.click(saveButton());
    expect(await screen.findByText(/Não foi possível alterar a senha agora/)).toBeTruthy();
  });

  it('o botão fica desabilitado enquanto grava', async () => {
    const pending = deferred();
    mocks.updateUser.mockReturnValue(pending.promise);
    await renderWithRecoverySession();
    fill('senhaboa123');
    fireEvent.click(saveButton());
    await waitFor(() => expect(saveButton().disabled).toBe(true));
    pending.resolve({ data: { user: { id: 'u1' } }, error: null });
    await screen.findByText('tela de login');
  });

  it('dois envios no mesmo instante gravam uma vez só', async () => {
    const pending = deferred();
    mocks.updateUser.mockReturnValue(pending.promise);
    await renderWithRecoverySession();
    fill('senhaboa123');
    const form = saveButton().closest('form')!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
    pending.resolve({ data: { user: { id: 'u1' } }, error: null });
    await screen.findByText('tela de login');
  });
});
