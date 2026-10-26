// Funções puras do Admin. Sem imports: rodam no Deno (edge function) e no Vitest (src/lib/adminUsers.test.ts).

export interface OwnerRow {
  profile_id: string;
  owner_id: string;
}

export interface ProfileRow {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  created_at: string;
}

export interface AdminProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  links_count: number;
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Contas com perfil, da que tem o perfil mais novo para a mais antiga (empate: pelo id).
 * Perfis sem dono e vínculos sem perfil ficam de fora.
 */
export function accountIdsByNewestProfile(owners: OwnerRow[], profiles: ProfileRow[]): string[] {
  const createdAt = new Map(profiles.map((p) => [p.id, p.created_at]));
  const newest = new Map<string, string>();
  for (const owner of owners) {
    const at = createdAt.get(owner.profile_id);
    if (at === undefined) continue;
    const previous = newest.get(owner.owner_id);
    if (previous === undefined || at > previous) newest.set(owner.owner_id, at);
  }
  return [...newest.entries()]
    .sort((a, b) => compareText(b[1], a[1]) || compareText(a[0], b[0]))
    .map(([id]) => id);
}

/** Página `page` (começa em 1; valor inválido vira 1). */
export function pageOf<T>(items: T[], page: number, perPage: number): T[] {
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const start = (safePage - 1) * perPage;
  return items.slice(start, start + perPage);
}

/** Perfis de cada conta, do mais antigo para o mais novo (a ordem do seletor do painel), com a contagem de links. */
export function profilesByOwner(owners: OwnerRow[], profiles: ProfileRow[], linkUserIds: string[]): Map<string, AdminProfile[]> {
  const linksCount = new Map<string, number>();
  for (const id of linkUserIds) linksCount.set(id, (linksCount.get(id) ?? 0) + 1);
  const byId = new Map(profiles.map((p) => [p.id, p]));

  const result = new Map<string, AdminProfile[]>();
  for (const owner of owners) {
    const profile = byId.get(owner.profile_id);
    if (!profile) continue;
    const list = result.get(owner.owner_id) ?? [];
    list.push({
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      user_type: profile.user_type,
      links_count: linksCount.get(profile.id) ?? 0,
    });
    result.set(owner.owner_id, list);
  }
  for (const list of result.values()) {
    list.sort((a, b) => compareText(byId.get(a.id)!.created_at, byId.get(b.id)!.created_at) || compareText(a.id, b.id));
  }
  return result;
}

/** "Usuários" do Admin: contas distintas com perfil. Um Set basta para a escala atual. */
export function countAccounts(owners: { owner_id: string }[]): number {
  return new Set(owners.map((o) => o.owner_id)).size;
}
