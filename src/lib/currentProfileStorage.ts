// Perfil atual escolhido por conta, no localStorage. Fica fora dos contextos: o AuthContext
// apaga a chave ao sair e o CurrentProfileContext lê e grava (este importa aquele).

export const currentProfileStorageKey = (userId: string) => `linkhub:currentProfile:${userId}`;

export function readStoredProfileId(userId: string): string | null {
  try {
    return window.localStorage.getItem(currentProfileStorageKey(userId));
  } catch {
    return null;
  }
}

export function writeStoredProfileId(userId: string, profileId: string) {
  try {
    window.localStorage.setItem(currentProfileStorageKey(userId), profileId);
  } catch {
    // Sem localStorage (janela privada, site bloqueado): a escolha vale até recarregar a página
  }
}

/** A conta saiu: a escolha dela não fica no navegador. */
export function forgetStoredProfileId(userId: string) {
  try {
    window.localStorage.removeItem(currentProfileStorageKey(userId));
  } catch {
    // Sem localStorage: não há o que apagar
  }
}
