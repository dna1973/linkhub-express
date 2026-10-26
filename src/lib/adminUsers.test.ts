import { describe, expect, it } from 'vitest';
import {
  accountIdsByNewestProfile,
  countAccounts,
  pageOf,
  profilesByOwner,
  type OwnerRow,
  type ProfileRow,
} from '../../supabase/functions/linkhub-admin-users/group.ts';
import { filterAdminUsers, statsAfterDeletingUser, type AdminStats, type AdminUser } from './adminUsers';

const profileRow = (id: string, created_at: string, extra: Partial<ProfileRow> = {}): ProfileRow => ({
  id,
  username: id,
  full_name: `Perfil ${id}`,
  avatar_url: null,
  user_type: null,
  created_at,
  ...extra,
});

const OWNERS: OwnerRow[] = [
  { profile_id: 'u1', owner_id: 'u1' },
  { profile_id: 'p2', owner_id: 'u1' },
  { profile_id: 'u3', owner_id: 'u3' },
];
const PROFILES: ProfileRow[] = [
  profileRow('u1', '2026-01-01T00:00:00+00:00'),
  profileRow('p2', '2026-10-26T00:00:00+00:00'),
  profileRow('u3', '2026-05-01T00:00:00+00:00'),
  // Perfil sem dono (criado por service_role): não aparece
  profileRow('orfao', '2026-10-27T00:00:00+00:00'),
];

describe('agrupamento do Admin (edge function)', () => {
  it('ordena as contas pelo perfil mais novo de cada uma e ignora perfis sem dono', () => {
    expect(accountIdsByNewestProfile(OWNERS, PROFILES)).toEqual(['u1', 'u3']);
    // Vínculo cujo perfil não veio na leitura também fica de fora
    expect(accountIdsByNewestProfile([...OWNERS, { profile_id: 'sumiu', owner_id: 'u9' }], PROFILES)).toEqual(['u1', 'u3']);
  });

  it('pagina por conta, 50 por página', () => {
    const ids = Array.from({ length: 120 }, (_, i) => `c${i}`);
    expect(pageOf(ids, 1, 50)).toEqual(ids.slice(0, 50));
    expect(pageOf(ids, 2, 50)).toEqual(ids.slice(50, 100));
    expect(pageOf(ids, 3, 50)).toHaveLength(20);
    expect(pageOf(ids, Number.NaN, 50)).toEqual(ids.slice(0, 50));
    expect(pageOf(ids, 0, 50)).toEqual(ids.slice(0, 50));
  });

  it('agrupa os perfis por conta, do mais antigo para o mais novo, com a contagem de links', () => {
    const grouped = profilesByOwner(OWNERS, PROFILES, ['u1', 'u1', 'p2', 'u3']);
    expect(grouped.get('u1')).toEqual([
      { id: 'u1', username: 'u1', full_name: 'Perfil u1', avatar_url: null, user_type: null, links_count: 2 },
      { id: 'p2', username: 'p2', full_name: 'Perfil p2', avatar_url: null, user_type: null, links_count: 1 },
    ]);
    expect(grouped.get('u3')?.map((p) => p.links_count)).toEqual([1]);
    expect(grouped.has('orfao')).toBe(false);
  });

  it('"Usuários" conta as contas distintas', () => {
    expect(countAccounts(OWNERS)).toBe(2);
    expect(countAccounts([])).toBe(0);
  });
});

const USERS: AdminUser[] = [
  {
    id: 'u1',
    email: 'dna@example.com',
    created_at: '',
    last_sign_in_at: null,
    banned_until: null,
    role: 'admin',
    profiles: [
      { id: 'u1', username: 'dna', full_name: 'Daniel', avatar_url: null, user_type: 'personal', links_count: 8 },
      { id: 'p2', username: 'consultoria', full_name: 'Daniel Consultoria', avatar_url: null, user_type: 'business', links_count: 3 },
    ],
  },
  {
    id: 'u3',
    email: 'maria@example.com',
    created_at: '',
    last_sign_in_at: null,
    banned_until: null,
    role: 'user',
    profiles: [{ id: 'u3', username: 'maria', full_name: 'Maria', avatar_url: null, user_type: null, links_count: 1 }],
  },
];

describe('Admin.tsx: busca e contadores', () => {
  it('a busca procura no e-mail e nos @ e nomes de todos os perfis da conta', () => {
    expect(filterAdminUsers(USERS, '').map((u) => u.id)).toEqual(['u1', 'u3']);
    expect(filterAdminUsers(USERS, 'MARIA@').map((u) => u.id)).toEqual(['u3']);
    // O @ do segundo perfil acha a conta
    expect(filterAdminUsers(USERS, 'consult').map((u) => u.id)).toEqual(['u1']);
    expect(filterAdminUsers(USERS, '  maria ').map((u) => u.id)).toEqual(['u3']);
    expect(filterAdminUsers(USERS, 'ninguem')).toEqual([]);
  });

  it('excluir uma conta tira 1 usuário, os perfis e os links dela dos contadores', () => {
    const stats: AdminStats = { totalUsers: 2, totalProfiles: 3, totalLinks: 12, totalViews: 57, totalClicks: 12 };
    expect(statsAfterDeletingUser(stats, USERS[0])).toEqual({
      totalUsers: 1,
      totalProfiles: 1,
      totalLinks: 1,
      totalViews: 57,
      totalClicks: 12,
    });
  });
});
