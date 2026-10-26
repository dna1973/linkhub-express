import { describe, expect, it } from 'vitest';
import {
  isValidEmail,
  newPasswordErrorMessage,
  parseRecoveryHash,
  resetRequestErrorMessage,
} from './passwordRecovery';

describe('parseRecoveryHash', () => {
  it('lê o type do link de recuperação', () => {
    expect(parseRecoveryHash('#access_token=a&refresh_token=r&type=recovery')).toEqual({ type: 'recovery', error: null });
  });
  it('lê o erro do link vencido', () => {
    const link = parseRecoveryHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
    expect(link.error).toBe('Email link is invalid or has expired');
  });
  it('hash vazio não é link nenhum', () => {
    expect(parseRecoveryHash('')).toEqual({ type: null, error: null });
  });
});

describe('isValidEmail', () => {
  it('aceita e-mail comum e recusa incompletos', () => {
    expect(isValidEmail(' ana@exemplo.com ')).toBe(true);
    for (const email of ['', 'ana', 'ana@', 'ana@exemplo', 'a na@exemplo.com']) expect(isValidEmail(email)).toBe(false);
  });
});

describe('resetRequestErrorMessage', () => {
  it('sucesso e conta inexistente não viram erro', () => {
    expect(resetRequestErrorMessage(null)).toBeNull();
    expect(resetRequestErrorMessage({ message: 'User not found', status: 404, code: 'user_not_found' })).toBeNull();
  });
  it('limite e falha de rede viram erro curto', () => {
    expect(resetRequestErrorMessage({ status: 429, message: 'email rate limit exceeded' })).toMatch(/Muitas tentativas/);
    expect(resetRequestErrorMessage({ status: 0, message: 'Failed to fetch' })).toMatch(/Não foi possível enviar/);
  });
});

describe('newPasswordErrorMessage', () => {
  it('traduz os casos comuns e cai no genérico no resto', () => {
    expect(newPasswordErrorMessage({ code: 'same_password' })).toMatch(/diferente da antiga/);
    expect(newPasswordErrorMessage({ code: 'weak_password' })).toMatch(/Senha fraca/);
    expect(newPasswordErrorMessage({ message: 'Auth session missing!' })).toMatch(/expirou/);
    expect(newPasswordErrorMessage({ message: 'boom' })).toMatch(/Não foi possível alterar/);
  });
});
