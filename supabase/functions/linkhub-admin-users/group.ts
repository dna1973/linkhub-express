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
  /** Links do perfil (de links(count) na leitura com embed); ausente vale 0. */
  links_count?: number;
}

export interface AdminProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  links_count: number;
}

/** Perfil embutido na leitura de profile_owners: profile:profiles(..., links(count)). */
export interface EmbeddedProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  created_at: string;
  links?: { count: number }[] | null;
}

export interface OwnerEmbedRow {
  profile_id: string;
  owner_id: string;
  /** Objeto na relação muitos-para-um; aceita também lista de um item. */
  profile: EmbeddedProfile | EmbeddedProfile[] | null;
}

/** Conta como a edge function devolve. O e-mail é nulo quando auth.admin.getUserById falhou. */
export interface AdminAccount {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
  role: string;
  profiles: AdminProfile[];
}

export interface AuthUserLike {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  banned_until?: string | null;
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** UUID na forma canônica (8-4-4-4-12), em minúsculas. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * userId recebido para excluir ou inativar: só a forma canônica com hífens, em qualquer caixa,
 * devolvida em minúsculas. As outras grafias que o Postgres aceita (chaves, sem hífens, espaços)
 * viram null: assim a comparação com o id de quem chama não tem como ser contornada.
 */
export function normalizeUserId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.toLowerCase();
  return UUID_RE.test(id) ? id : null;
}

/**
 * Vínculos e perfis a partir de uma leitura só de profile_owners com o perfil embutido.
 * Vínculo sem perfil fica nos vínculos, e accountIdsByNewestProfile o ignora.
 */
export function rowsFromOwnerEmbed(rows: OwnerEmbedRow[]): { owners: OwnerRow[]; profiles: ProfileRow[] } {
  const owners: OwnerRow[] = [];
  const profiles: ProfileRow[] = [];
  for (const row of rows) {
    owners.push({ profile_id: row.profile_id, owner_id: row.owner_id });
    const embedded = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    if (!embedded) continue;
    profiles.push({
      id: embedded.id,
      username: embedded.username,
      full_name: embedded.full_name,
      avatar_url: embedded.avatar_url,
      user_type: embedded.user_type,
      created_at: embedded.created_at,
      links_count: embedded.links?.[0]?.count ?? 0,
    });
  }
  return { owners, profiles };
}

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

/** Número de página saneado (começa em 1; valor inválido vira 1). É o que a resposta ecoa. */
export function safePage(page: number): number {
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

/** Página `page` (começa em 1; valor inválido vira 1). */
export function pageOf<T>(items: T[], page: number, perPage: number): T[] {
  const start = (safePage(page) - 1) * perPage;
  return items.slice(start, start + perPage);
}

/** Perfis de cada conta, do mais antigo para o mais novo (a ordem do seletor do painel), com a contagem de links. */
export function profilesByOwner(owners: OwnerRow[], profiles: ProfileRow[]): Map<string, AdminProfile[]> {
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
      links_count: profile.links_count ?? 0,
    });
    result.set(owner.owner_id, list);
  }
  for (const list of result.values()) {
    list.sort((a, b) => compareText(byId.get(a.id)!.created_at, byId.get(b.id)!.created_at) || compareText(a.id, b.id));
  }
  return result;
}

/**
 * Contas da página, na ordem de pageIds. authUsers[i] é o resultado de getUserById(pageIds[i]);
 * se veio nulo, a conta continua na lista com e-mail nulo. Uma linha "admin" em user_roles prevalece.
 */
export function buildAccounts(
  pageIds: string[],
  authUsers: (AuthUserLike | null | undefined)[],
  roles: { user_id: string; role: string }[],
  grouped: Map<string, AdminProfile[]>,
): AdminAccount[] {
  const roleMap = new Map<string, string>();
  for (const r of roles) {
    if (roleMap.get(r.user_id) !== 'admin') roleMap.set(r.user_id, r.role);
  }
  return pageIds.map((id, i) => {
    const authUser = authUsers[i];
    return {
      id,
      email: authUser?.email ?? null,
      created_at: authUser?.created_at ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
      banned_until: authUser?.banned_until ?? null,
      role: roleMap.get(id) || 'user',
      profiles: grouped.get(id) || [],
    };
  });
}

/** "Usuários" do Admin: contas distintas com perfil. Um Set basta para a escala atual. */
export function countAccounts(owners: { owner_id: string }[]): number {
  return new Set(owners.map((o) => o.owner_id)).size;
}
