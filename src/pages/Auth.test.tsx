// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Auth from './Auth';
import { forgetRecoveryUser, markRecoveryUser } from '@/lib/passwordRecovery';

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  toast: vi.fn(),
  user: null as { id: string } | null,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { resetPasswordForEmail: mocks.resetPasswordForEmail, signInWithOAuth: vi.fn() } },
  PUBLIC_SITE_URL: 'https://linkhub.avila.ia.br',
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, signIn: vi.fn(), signUp: vi.fn() }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

const NEUTRAL =
  'Se houver uma conta com esse e-mail, enviamos um link para criar uma senha nova. Confira também a caixa de spam.';

beforeEach(() => {
  mocks.resetPasswordForEmail.mockReset().mockResolvedValue({ data: {}, error: null });
  mocks.toast.mockReset();
  mocks.user = null;
  forgetRecoveryUser();
});
afterEach(() => cleanup());

function renderAuth() {
  return render(
    <MemoryRouter initialEntries={['/auth']}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<p>painel</p>} />
        <Route path="/auth/nova-senha" element={<p>página de senha nova</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const forgotLink = () => screen.getByRole('button', { name: 'Esqueci minha senha' });
const forgotEmail = () => screen.getByLabelText('E-mail') as HTMLInputElement;

function openForgot(email = 'ana@exemplo.com') {
  fireEvent.click(forgotLink());
  fireEvent.change(forgotEmail(), { target: { value: email } });
}

const sendButton = () => screen.getByRole('button', { name: /Envia(r|ndo) link/ }) as HTMLButtonElement;
const statusText = () => screen.getByRole('status').textContent;

function deferred() {
  let resolve!: (v: unknown) => void;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

describe('Auth: Esqueci minha senha', () => {
  it('mostra o link na aba Entrar e abre o formulário só com o e-mail', () => {
    renderAuth();
    fireEvent.click(forgotLink());
    expect(forgotEmail()).toBeTruthy();
    expect(screen.queryByLabelText('Senha')).toBeNull();
    expect(screen.getByRole('button', { name: /Voltar para o login/ })).toBeTruthy();
  });

  it('leva o e-mail já digitado no login para o formulário', () => {
    renderAuth();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@exemplo.com' } });
    fireEvent.click(forgotLink());
    expect(forgotEmail().value).toBe('ana@exemplo.com');
  });

  it('envia com o redirectTo da página de senha nova', async () => {
    renderAuth();
    openForgot('  ana@exemplo.com ');
    fireEvent.click(sendButton());
    await screen.findByText(NEUTRAL);
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith('ana@exemplo.com', {
      redirectTo: 'https://linkhub.avila.ia.br/auth/nova-senha',
    });
  });

  it('mostra a mesma mensagem quando a conta não existe', async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'User not found', status: 404, code: 'user_not_found' },
    });
    renderAuth();
    openForgot();
    fireEvent.click(sendButton());
    expect(await screen.findByText(NEUTRAL)).toBeTruthy();
  });

  it('o limite por conta (só existe para conta cadastrada) também mostra a mensagem neutra', async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: {
        message: 'For security purposes, you can only request this after 42 seconds.',
        status: 429,
        code: 'over_email_send_rate_limit',
      },
    });
    renderAuth();
    openForgot();
    fireEvent.click(sendButton());
    expect(await screen.findByText(NEUTRAL)).toBeTruthy();
    expect(screen.queryByText(/Muitas tentativas/)).toBeNull();
  });

  it('em falha de rede mostra erro curto, sem a mensagem de envio', async () => {
    mocks.resetPasswordForEmail.mockRejectedValue(new TypeError('Failed to fetch'));
    renderAuth();
    openForgot();
    fireEvent.click(sendButton());
    expect(await screen.findByText(/Não foi possível enviar o link agora/)).toBeTruthy();
    expect(screen.queryByText(NEUTRAL)).toBeNull();
  });

  it('no limite geral de e-mails do servidor (429) pede para esperar', async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: { message: 'email rate limit exceeded', status: 429, code: 'over_email_send_rate_limit' },
    });
    renderAuth();
    openForgot();
    fireEvent.click(sendButton());
    expect(await screen.findByText(/Muitas tentativas/)).toBeTruthy();
    expect(screen.queryByText(NEUTRAL)).toBeNull();
  });

  it('desabilita o botão enquanto envia', async () => {
    const pending = deferred();
    mocks.resetPasswordForEmail.mockReturnValue(pending.promise);
    renderAuth();
    openForgot();
    fireEvent.click(sendButton());
    await waitFor(() => expect(sendButton().disabled).toBe(true));
    pending.resolve({ data: {}, error: null });
    await screen.findByText(NEUTRAL);
  });

  it('dois envios no mesmo instante chamam o servidor uma vez só', async () => {
    const pending = deferred();
    mocks.resetPasswordForEmail.mockReturnValue(pending.promise);
    renderAuth();
    openForgot();
    const form = sendButton().closest('form')!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    pending.resolve({ data: {}, error: null });
    await screen.findByText(NEUTRAL);
  });

  it('não envia com e-mail fora do formato e liga o aviso ao campo', () => {
    renderAuth();
    openForgot('ana@');
    expect(sendButton().disabled).toBe(true);
    fireEvent.submit(sendButton().closest('form')!);
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
    const hintId = forgotEmail().getAttribute('aria-describedby');
    expect(hintId).toBeTruthy();
    expect(document.getElementById(hintId!)?.textContent).toMatch(/e-mail válido/);
  });

  it('o foco vai ao campo ao abrir e volta ao link ao fechar', () => {
    renderAuth();
    fireEvent.click(forgotLink());
    expect(document.activeElement).toBe(forgotEmail());
    fireEvent.click(screen.getByRole('button', { name: /Voltar para o login/ }));
    expect(document.activeElement).toBe(forgotLink());
    expect(screen.getByLabelText('Senha')).toBeTruthy();
  });

  it('reenviar limpa a mensagem enquanto envia e a mostra de novo (para o leitor de tela anunciar)', async () => {
    renderAuth();
    openForgot();
    fireEvent.click(sendButton());
    await waitFor(() => expect(statusText()).toBe(NEUTRAL));
    const pending = deferred();
    mocks.resetPasswordForEmail.mockReturnValue(pending.promise);
    fireEvent.click(sendButton());
    await waitFor(() => expect(statusText()).toBe(''));
    pending.resolve({ data: {}, error: null });
    await waitFor(() => expect(statusText()).toBe(NEUTRAL));
  });
});

describe('Auth: redirecionamento de quem já entrou', () => {
  it('conta comum vai ao painel', async () => {
    mocks.user = { id: 'u1' };
    renderAuth();
    expect(await screen.findByText('painel')).toBeTruthy();
  });

  it('conta no meio da recuperação de senha volta à página de senha nova, não ao painel', async () => {
    markRecoveryUser('u1');
    mocks.user = { id: 'u1' };
    renderAuth();
    expect(await screen.findByText('página de senha nova')).toBeTruthy();
    expect(screen.queryByText('painel')).toBeNull();
  });
});
