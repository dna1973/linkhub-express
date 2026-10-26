// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Auth from './Auth';

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { resetPasswordForEmail: mocks.resetPasswordForEmail, signInWithOAuth: vi.fn() } },
  PUBLIC_SITE_URL: 'https://linkhub.avila.ia.br',
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, signIn: vi.fn(), signUp: vi.fn() }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

const NEUTRAL =
  'Se houver uma conta com esse e-mail, enviamos um link para criar uma senha nova. Confira também a caixa de spam.';

beforeEach(() => {
  mocks.resetPasswordForEmail.mockReset().mockResolvedValue({ data: {}, error: null });
  mocks.toast.mockReset();
});
afterEach(() => cleanup());

function renderAuth() {
  return render(
    <MemoryRouter>
      <Auth />
    </MemoryRouter>,
  );
}

function openForgot(email = 'ana@exemplo.com') {
  fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
}

const sendButton = () => screen.getByRole('button', { name: /Envia(r|ndo) link/ }) as HTMLButtonElement;

describe('Auth: Esqueci minha senha', () => {
  it('mostra o link na aba Entrar e abre o formulário só com o e-mail', () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.queryByLabelText('Senha')).toBeNull();
    expect(screen.getByRole('button', { name: /Voltar para o login/ })).toBeTruthy();
  });

  it('leva o e-mail já digitado no login para o formulário', () => {
    renderAuth();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@exemplo.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Esqueci minha senha' }));
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('ana@exemplo.com');
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

  it('em falha de rede mostra erro curto, sem a mensagem de envio', async () => {
    mocks.resetPasswordForEmail.mockRejectedValue(new TypeError('Failed to fetch'));
    renderAuth();
    openForgot();
    fireEvent.click(sendButton());
    expect(await screen.findByText(/Não foi possível enviar o link agora/)).toBeTruthy();
    expect(screen.queryByText(NEUTRAL)).toBeNull();
    expect(screen.queryByText(/não existe|não encontrad/i)).toBeNull();
  });

  it('no limite de envios (429) pede para esperar', async () => {
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

  it('desabilita o botão enquanto envia e só chama uma vez', async () => {
    let resolve!: (v: unknown) => void;
    mocks.resetPasswordForEmail.mockReturnValue(new Promise((r) => (resolve = r)));
    renderAuth();
    openForgot();
    fireEvent.click(sendButton());
    await waitFor(() => expect(sendButton().disabled).toBe(true));
    fireEvent.click(sendButton());
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    resolve({ data: {}, error: null });
    await screen.findByText(NEUTRAL);
  });

  it('não envia com e-mail fora do formato', () => {
    renderAuth();
    openForgot('ana@');
    expect(sendButton().disabled).toBe(true);
    fireEvent.submit(sendButton().closest('form')!);
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('"Voltar para o login" mostra de novo o formulário de entrar', () => {
    renderAuth();
    openForgot();
    fireEvent.click(screen.getByRole('button', { name: /Voltar para o login/ }));
    expect(screen.getByLabelText('Senha')).toBeTruthy();
  });
});
