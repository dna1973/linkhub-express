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

type AuthErrorLike =
  | { message?: string; status?: number; code?: string; name?: string; reasons?: string[] }
  | null
  | undefined;

/**
 * Resultado do pedido de link; null = mostrar a mensagem neutra.
 * - "Conta não existe" conta como enviado (o GoTrue já responde 200; se um dia responder erro,
 *   a tela continua sem revelar nada).
 * - O limite por conta ("you can only request this after N seconds") só acontece para conta
 *   cadastrada: mostrar erro ali revelaria a conta. O limite geral do servidor ("email rate limit
 *   exceeded") vale para qualquer e-mail. Os dois usam o mesmo code (over_email_send_rate_limit),
 *   então a diferença vem do texto.
 */
export function resetRequestErrorMessage(error: AuthErrorLike): string | null {
  if (!error) return null;
  const message = error.message ?? '';
  if (error.code === 'user_not_found' || error.status === 404 || /user not found/i.test(message)) return null;
  if (/only request this after/i.test(message)) return null;
  if (error.status === 429 || /rate limit/i.test(message) || error.code?.includes('rate_limit')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  }
  return 'Não foi possível enviar o link agora. Confira sua conexão e tente de novo.';
}

const WEAK_PASSWORD_REASONS: Record<string, string> = {
  length: `Use pelo menos ${NEW_PASSWORD_MIN_LENGTH} caracteres.`,
  characters: 'Misture letras maiúsculas, minúsculas, números e símbolos.',
  pwned: 'Essa senha aparece em vazamentos conhecidos; escolha outra.',
};

/** Erro do updateUser({ password }) em português. */
export function newPasswordErrorMessage(error: AuthErrorLike): string {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  if (code === 'same_password' || /different from the old password/i.test(message)) {
    return 'A senha nova precisa ser diferente da antiga.';
  }
  if (code === 'weak_password' || /weak/i.test(message)) {
    const details = (error?.reasons ?? []).map((reason) => WEAK_PASSWORD_REASONS[reason]).filter(Boolean);
    return ['Escolha uma senha mais forte.', ...details].join(' ');
  }
  if (code === 'session_not_found' || code === 'session_expired' || /session missing|auth session/i.test(message)) {
    return RESET_LINK_INVALID_MESSAGE;
  }
  if (code === 'reauthentication_needed') {
    return 'O servidor pediu uma confirmação extra para trocar a senha. Peça um novo link em Esqueci minha senha.';
  }
  return 'Não foi possível alterar a senha agora. Tente de novo em alguns instantes.';
}

// --- Conta em recuperação --------------------------------------------------------------------
// Só o evento PASSWORD_RECOVERY do supabase-js prova que a sessão veio do link (o hash qualquer um
// escreve, e um link que falha mantém a sessão antiga de outra conta). O cliente marca a conta
// nesse evento; a página só abre o formulário para a sessão dessa conta, e o /auth manda essa
// conta de volta à página em vez do painel (que criaria um perfil para ela).
// Fica no localStorage, o mesmo alcance da sessão do supabase-js: vale no F5, numa aba nova e nas
// outras abas. Guarda só o id e a hora (nunca token). O SIGNED_OUT, que chega a todas as abas,
// apaga; o prazo cobre a sessão abandonada sem sair.

const RECOVERY_USER_KEY = 'linkhub:passwordRecoveryUser';

/**
 * Prazo da marca: 1 h, o padrão do GOTRUE_JWT_EXP (3600 s), que é o que o access token do link
 * dura antes do primeiro refresh. O valor configurado no servidor compartilhado não é conhecido
 * aqui; depois do prazo a conta volta a ser tratada como sessão comum.
 */
export const RECOVERY_MARK_TTL_MS = 60 * 60 * 1000;

export function markRecoveryUser(userId: string): void {
  try {
    window.localStorage.setItem(RECOVERY_USER_KEY, JSON.stringify({ id: userId, em: Date.now() }));
  } catch {
    // localStorage bloqueado: a página mostra "link expirou"
  }
}

export function getRecoveryUserId(): string | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(RECOVERY_USER_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    const mark = JSON.parse(raw) as { id?: unknown; em?: unknown };
    const age = Date.now() - Number(mark?.em);
    if (typeof mark?.id === 'string' && mark.id && age >= 0 && age <= RECOVERY_MARK_TTL_MS) return mark.id;
  } catch {
    // ilegível: apaga abaixo
  }
  forgetRecoveryUser();
  return null;
}

export function forgetRecoveryUser(): void {
  try {
    window.localStorage.removeItem(RECOVERY_USER_KEY);
  } catch {
    // nada a apagar
  }
}

// --- Link com erro ---------------------------------------------------------------------------

/** Link vencido ou já usado: o GoTrue devolve error/error_code/error_description no hash. */
export function parseLinkError(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return params.get('error_description') || params.get('error_code') || params.get('error') || null;
}

let rememberedError: string | null = null;

/**
 * Guarda o #error= da chegada à página de senha nova, antes de o cliente do Supabase ler a URL.
 * Chamado antes do createClient; fora dessa página não guarda nada.
 */
export function rememberRecoveryLink(
  location: { pathname: string; hash: string } = typeof window !== 'undefined'
    ? window.location
    : { pathname: '', hash: '' },
): void {
  if (location.pathname !== NEW_PASSWORD_PATH) return;
  const error = parseLinkError(location.hash);
  if (error) rememberedError = error;
}

/** O erro do hash atual, se houver; senão, o guardado na chegada. */
export function getRecoveryLinkError(): string | null {
  return parseLinkError(typeof window !== 'undefined' ? window.location.hash : '') ?? rememberedError;
}

export function forgetRecoveryLink(): void {
  rememberedError = null;
}
