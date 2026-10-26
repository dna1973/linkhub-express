// Recuperação de senha: o que o e-mail e a página /auth/nova-senha precisam saber, sem o cliente do Supabase.

/** Página para onde o link do e-mail de recuperação leva. */
export const NEW_PASSWORD_PATH = '/auth/nova-senha';

export const NEW_PASSWORD_MIN_LENGTH = 8;

/** Mesma resposta exista ou não a conta: não revela quem tem cadastro. */
export const RESET_EMAIL_SENT_MESSAGE =
  'Se houver uma conta com esse e-mail, enviamos um link para criar uma senha nova. Confira também a caixa de spam.';

export const RESET_LINK_INVALID_MESSAGE = 'Este link expirou ou já foi usado. Peça um novo em Esqueci minha senha.';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

type AuthErrorLike = { message?: string; status?: number; code?: string; name?: string } | null | undefined;

/**
 * Resultado do pedido de link. "Conta não existe" conta como enviado (o GoTrue já responde 200
 * nesse caso; se um dia responder erro, a tela continua sem revelar nada). Limite e falha de rede
 * mostram erro curto, igual para qualquer e-mail.
 */
export function resetRequestErrorMessage(error: AuthErrorLike): string | null {
  if (!error) return null;
  const message = error.message ?? '';
  if (error.code === 'user_not_found' || error.status === 404 || /user not found/i.test(message)) return null;
  if (error.status === 429 || /rate limit/i.test(message) || error.code?.includes('rate_limit')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  }
  return 'Não foi possível enviar o link agora. Confira sua conexão e tente de novo.';
}

/** Erro do updateUser({ password }) em português. */
export function newPasswordErrorMessage(error: AuthErrorLike): string {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  if (code === 'same_password' || /different from the old password/i.test(message)) {
    return 'A senha nova precisa ser diferente da antiga.';
  }
  if (code === 'weak_password' || /password should|weak password/i.test(message)) {
    return 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.';
  }
  if (code === 'session_not_found' || code === 'session_expired' || /session missing|auth session/i.test(message)) {
    return RESET_LINK_INVALID_MESSAGE;
  }
  if (code === 'reauthentication_needed') {
    return 'O servidor pediu uma confirmação extra para trocar a senha. Peça um novo link em Esqueci minha senha.';
  }
  return 'Não foi possível alterar a senha agora. Tente de novo em alguns instantes.';
}

export interface RecoveryLink {
  /** "recovery" quando o link do e-mail trouxe a sessão de recuperação */
  type: string | null;
  /** Link vencido ou já usado: o GoTrue devolve error/error_code/error_description no hash */
  error: string | null;
}

const EMPTY_LINK: RecoveryLink = { type: null, error: null };

export function parseRecoveryHash(hash: string): RecoveryLink {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const error = params.get('error_description') || params.get('error_code') || params.get('error');
  return { type: params.get('type'), error: error || null };
}

let rememberedLink: RecoveryLink = EMPTY_LINK;

/**
 * Guarda o hash da chegada antes de o supabase-js apagá-lo (ele troca o token por sessão e limpa
 * a URL enquanto a página, carregada sob demanda, ainda baixa). Chamado antes do createClient.
 */
export function rememberRecoveryLink(hash: string = typeof window !== 'undefined' ? window.location.hash : ''): void {
  const link = parseRecoveryHash(hash);
  if (link.type || link.error) rememberedLink = link;
}

/** O hash atual, se ainda houver; senão, o guardado na chegada. */
export function getRecoveryLink(): RecoveryLink {
  const current = parseRecoveryHash(typeof window !== 'undefined' ? window.location.hash : '');
  if (current.type || current.error) return current;
  return rememberedLink;
}

export function forgetRecoveryLink(): void {
  rememberedLink = EMPTY_LINK;
}
