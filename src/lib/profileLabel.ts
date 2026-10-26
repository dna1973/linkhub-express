/** Rótulos de um perfil no painel (seletor da sidebar, aba "Meus perfis"). */

type Named = { username?: string | null; full_name?: string | null };

/** Perfil sem nome, quando não há nome para mostrar. */
export const UNNAMED_PROFILE = 'Perfil sem nome';

/** O nome do perfil, ou "Perfil sem nome". */
export function profileName(profile: Named): string {
  return profile.full_name?.trim() || UNNAMED_PROFILE;
}

/** "@dna" ou, para perfil sem @, o nome. */
export function profileLabel(profile: Named): string {
  return profile.username ? `@${profile.username}` : profileName(profile);
}
