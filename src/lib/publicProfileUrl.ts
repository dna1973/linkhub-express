import { PUBLIC_SITE_URL } from './siteUrl';

export interface PublicProfileUrlSource {
  username?: string | null;
  preferred_domain?: string | null;
  custom_domain?: string | null;
}

/**
 * Endereço público do perfil. Regra única para o QR code, a aba Perfil e a sidebar:
 * domínio personalizado (se for o preferido e estiver preenchido) ou o do site, seguido do username.
 * Sem username, null.
 */
export function getPublicProfileUrl(
  profile: PublicProfileUrlSource | null | undefined,
  siteUrl: string = PUBLIC_SITE_URL,
): string | null {
  const username = profile?.username?.trim();
  if (!username) return null;

  const custom = profile?.custom_domain?.trim();
  let domain = siteUrl;
  if (profile?.preferred_domain === 'custom' && custom) {
    domain = /^https?:\/\//i.test(custom) ? custom : `https://${custom}`;
  }
  return `${domain.replace(/\/+$/, '')}/${username}`;
}
