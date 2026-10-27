// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  forgetRecoveryLink,
  forgetRecoveryUser,
  getRecoveryLinkError,
  getRecoveryUserId,
  isValidEmail,
  markRecoveryUser,
  newPasswordErrorMessage,
  parseLinkError,
  RECOVERY_MARK_TTL_MS,
  rememberRecoveryLink,
  resetRequestErrorMessage,
} from './passwordRecovery';

const ERROR_HASH = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  forgetRecoveryLink();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

describe('parseLinkError', () => {
  it('lê o erro do link vencido', () => {
    expect(parseLinkError(ERROR_HASH)).toBe('Email link is invalid or has expired');
  });
  it('type=recovery e hash vazio não são erro', () => {
    expect(parseLinkError('#access_token=a&refresh_token=r&type=recovery')).toBeNull();
    expect(parseLinkError('')).toBeNull();
  });
});

describe('rememberRecoveryLink', () => {
  it('lembra o #error só na página de senha nova', () => {
    rememberRecoveryLink({ pathname: '/dashboard', hash: ERROR_HASH });
    expect(getRecoveryLinkError()).toBeNull();
    rememberRecoveryLink({ pathname: '/auth/nova-senha', hash: ERROR_HASH });
    expect(getRecoveryLinkError()).toBe('Email link is invalid or has expired');
  });
  it('não guarda nada de um hash sem erro', () => {
    rememberRecoveryLink({ pathname: '/auth/nova-senha', hash: '#access_token=a&type=recovery' });
    expect(getRecoveryLinkError()).toBeNull();
  });
});

describe('marca da conta em recuperação', () => {
  it('guarda só o id e a hora, no localStorage (o mesmo alcance da sessão), lê e esquece', () => {
    markRecoveryUser('u1');
    expect(getRecoveryUserId()).toBe('u1');
    expect(window.sessionStorage.length).toBe(0);
    const stored = Object.values({ ...window.localStorage });
    expect(stored).toHaveLength(1);
    expect(Object.keys(JSON.parse(stored[0] as string)).sort()).toEqual(['em', 'id']);
    forgetRecoveryUser();
    expect(getRecoveryUserId()).toBeNull();
  });

  it('marca com mais de 1 h é ignorada e apagada', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    markRecoveryUser('u1');
    vi.spyOn(Date, 'now').mockReturnValue(now + RECOVERY_MARK_TTL_MS - 1000);
    expect(getRecoveryUserId()).toBe('u1');
    vi.spyOn(Date, 'now').mockReturnValue(now + RECOVERY_MARK_TTL_MS + 1000);
    expect(getRecoveryUserId()).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it('marca ilegível (formato antigo, lixo) é ignorada e apagada', () => {
    window.localStorage.setItem('linkhub:passwordRecoveryUser', 'u1');
    expect(getRecoveryUserId()).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });
  it('sessionStorage indisponível não quebra nada', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => markRecoveryUser('u1')).not.toThrow();
    expect(getRecoveryUserId()).toBeNull();
    expect(() => forgetRecoveryUser()).not.toThrow();
  });
});

describe('isValidEmail', () => {
  it('aceita e-mail comum e recusa incompletos', () => {
    expect(isValidEmail(' ana@exemplo.com ')).toBe(true);
    for (const email of ['', 'ana', 'ana@', 'ana@exemplo', 'a na@exemplo.com']) expect(isValidEmail(email)).toBe(false);
  });
});

describe('resetRequestErrorMessage', () => {
  it('sucesso, conta inexistente e limite por conta não viram erro', () => {
    expect(resetRequestErrorMessage(null)).toBeNull();
    expect(resetRequestErrorMessage({ message: 'User not found', status: 404, code: 'user_not_found' })).toBeNull();
    expect(
      resetRequestErrorMessage({
        message: 'For security purposes, you can only request this after 42 seconds.',
        status: 429,
        code: 'over_email_send_rate_limit',
      }),
    ).toBeNull();
  });
  it('limite geral e falha de rede viram erro curto', () => {
    expect(
      resetRequestErrorMessage({ status: 429, message: 'email rate limit exceeded', code: 'over_email_send_rate_limit' }),
    ).toMatch(/Muitas tentativas/);
    expect(resetRequestErrorMessage({ status: 0, message: 'Failed to fetch' })).toMatch(/Não foi possível enviar/);
  });
});

describe('newPasswordErrorMessage', () => {
  it('traduz os casos comuns e cai no genérico no resto', () => {
    expect(newPasswordErrorMessage({ code: 'same_password' })).toMatch(/diferente da antiga/);
    expect(newPasswordErrorMessage({ message: 'Auth session missing!' })).toMatch(/expirou/);
    expect(newPasswordErrorMessage({ message: 'boom' })).toMatch(/Não foi possível alterar/);
  });
  it('weak_password tem texto neutro e usa os reasons quando vierem', () => {
    expect(newPasswordErrorMessage({ code: 'weak_password' })).toBe('Escolha uma senha mais forte.');
    expect(newPasswordErrorMessage({ code: 'weak_password', reasons: ['pwned'] })).toMatch(/vazamentos/);
    expect(newPasswordErrorMessage({ code: 'weak_password', reasons: ['length'] })).toMatch(/caracteres/);
    expect(newPasswordErrorMessage({ code: 'weak_password', reasons: ['characters'] })).toMatch(/números/);
  });
});
