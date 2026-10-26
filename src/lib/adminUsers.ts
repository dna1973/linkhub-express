// Tipos e regras da tela do Admin. A resposta vem da edge function linkhub-admin-users (group.ts).

export interface AdminProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  links_count: number;
}

/** Uma conta com os perfis dela (do mais antigo para o mais novo). O e-mail é nulo se a edge function não conseguiu lê-lo. */
export interface AdminUser {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  banned_until: string | null;
  role: string;
  profiles: AdminProfile[];
}

export interface AdminStats {
  totalUsers: number;
  totalProfiles: number;
  totalLinks: number;
  totalViews: number;
  totalClicks: number;
}

/** Busca no e-mail e nos @ e nomes de todos os perfis da conta. */
export function filterAdminUsers(users: AdminUser[], search: string): AdminUser[] {
  const query = search.trim().toLowerCase();
  if (!query) return users;
  return users.filter(
    (user) =>
      (user.email || '').toLowerCase().includes(query) ||
      user.profiles.some(
        (profile) =>
          (profile.username || '').toLowerCase().includes(query) ||
          (profile.full_name || '').toLowerCase().includes(query),
      ),
  );
}

/** Contadores depois de excluir a conta: menos 1 usuário, os perfis e os links dela. */
export function statsAfterDeletingUser(stats: AdminStats, user: AdminUser): AdminStats {
  const links = user.profiles.reduce((sum, profile) => sum + profile.links_count, 0);
  return {
    ...stats,
    totalUsers: Math.max(0, stats.totalUsers - 1),
    totalProfiles: Math.max(0, stats.totalProfiles - user.profiles.length),
    totalLinks: Math.max(0, stats.totalLinks - links),
  };
}
