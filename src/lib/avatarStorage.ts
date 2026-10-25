// Bucket e prefixo público das fotos de perfil. Fica fora de supabase.ts (como linkIcons/storagePrefix.ts):
// o contexto do perfil e os testes usam o helper sem carregar o cliente.
export const AVATARS_BUCKET = 'linkhub-avatars';

// Lê o env na chamada (e não na carga do módulo) para os testes poderem trocar o VITE_SUPABASE_URL.
export function getAvatarsPublicPrefix(): string {
  const base = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${AVATARS_BUCKET}/`;
}

export const AVATARS_PUBLIC_PREFIX = getAvatarsPublicPrefix();

// <id do perfil>/<arquivo>: um nível só, nome sem ponto no meio e extensão opcional.
// Recusa %, .., ?, #, \, espaço e controles sem precisar listá-los.
const AVATAR_PATH_RE = /^[A-Za-z0-9-]+\/[A-Za-z0-9_-]+(\.[A-Za-z0-9]+)?$/;

/**
 * Caminho no bucket de uma foto gravada na pasta do perfil `profileId`, para apagar do Storage.
 * Devolve null para foto do provedor (Google), de outro perfil, de outro bucket ou fora do formato.
 */
export function avatarPathFromUrl(
  url: string | null | undefined,
  profileId: string | null | undefined,
  publicPrefix: string = AVATARS_PUBLIC_PREFIX,
): string | null {
  if (!url || !profileId || !publicPrefix || !url.startsWith(publicPrefix)) return null;
  const path = url.slice(publicPrefix.length);
  if (!AVATAR_PATH_RE.test(path) || !path.startsWith(`${profileId}/`)) return null;
  return path;
}
