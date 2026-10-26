import { describe, expect, it } from 'vitest';
import {
  accountIdsByNewestProfile,
  buildAccounts,
  countAccounts,
  normalizeUserId,
  pageOf,
  profilesByOwner,
  rowsFromOwnerEmbed,
  safePage,
  type OwnerEmbedRow,
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
  profileRow('u1', '2026-01-01T00:00:00+00:00', { links_count: 2 }),
  profileRow('p2', '2026-10-26T00:00:00+00:00', { links_count: 1 }),
  profileRow('u3', '2026-05-01T00:00:00+00:00', { links_count: 1 }),
  // Perfil sem dono (criado por service_role): não aparece
  profileRow('orfao', '2026-10-27T00:00:00+00:00'),
];

describe('agrupamento do Admin (edge function)', () => {
  it('ordena as contas pelo perfil mais novo de cada uma e ignora perfis sem dono', () => {
    expect(accountIdsByNewestProfile(OWNERS, PROFILES)).toEqual(['u1', 'u3']);
    // Vínculo cujo perfil não veio na leitura também fica de fora
    expect(accountIdsByNewestProfile([...OWNERS, { profile_id: 'sumiu', owner_id: 'u9' }], PROFILES)).toEqual(['u1', 'u3']);
  });

  it('desempata pelo id da conta quando o perfil mais novo de duas contas tem a mesma data', () => {
    const at = '2026-03-01T00:00:00+00:00';
    const profiles = [profileRow('pb', at), profileRow('pa', at), profileRow('pc', '2026-04-01T00:00:00+00:00')];
    const owners: OwnerRow[] = [
      { profile_id: 'pb', owner_id: 'b' },
      { profile_id: 'pa', owner_id: 'a' },
      { profile_id: 'pc', owner_id: 'c' },
    ];
    expect(accountIdsByNewestProfile(owners, profiles)).toEqual(['c', 'a', 'b']);
    expect(accountIdsByNewestProfile([...owners].reverse(), profiles)).toEqual(['c', 'a', 'b']);
  });

  it('pagina por conta, 50 por página', () => {
    const ids = Array.from({ length: 120 }, (_, i) => `c${i}`);
    expect(pageOf(ids, 1, 50)).toEqual(ids.slice(0, 50));
    expect(pageOf(ids, 2, 50)).toEqual(ids.slice(50, 100));
    expect(pageOf(ids, 3, 50)).toHaveLength(20);
    expect(pageOf(ids, Number.NaN, 50)).toEqual(ids.slice(0, 50));
    expect(pageOf(ids, 0, 50)).toEqual(ids.slice(0, 50));
  });

  it('a página ecoada é a mesma que pageOf usou', () => {
    expect(safePage(1)).toBe(1);
    expect(safePage(3)).toBe(3);
    expect(safePage(2.7)).toBe(2);
    expect(safePage(0)).toBe(1);
    expect(safePage(-4)).toBe(1);
    expect(safePage(Number.NaN)).toBe(1);
    expect(safePage(Number.POSITIVE_INFINITY)).toBe(1);
  });

  it('agrupa os perfis por conta, do mais antigo para o mais novo, com a contagem de links', () => {
    const grouped = profilesByOwner(OWNERS, PROFILES);
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

  it('perfil sem links_count fica com 0 links', () => {
    const grouped = profilesByOwner([{ profile_id: 'x', owner_id: 'o' }], [profileRow('x', '2026-01-01T00:00:00+00:00')]);
    expect(grouped.get('o')?.[0].links_count).toBe(0);
  });

  it('monta vínculos, perfis e contagem de links a partir da leitura com embed', () => {
    const at = '2026-01-01T00:00:00+00:00';
    const base = { username: 'a', full_name: 'A', avatar_url: null, user_type: null, created_at: at };
    const rows: OwnerEmbedRow[] = [
      // Perfil como objeto (relação muitos-para-um), com links(count)
      { profile_id: 'p1', owner_id: 'o1', profile: { id: 'p1', ...base, links: [{ count: 3 }] } },
      // Perfil vindo como lista de um item, sem links
      { profile_id: 'p2', owner_id: 'o1', profile: [{ id: 'p2', ...base, links: [] }] },
      // links nulo
      { profile_id: 'p3', owner_id: 'o2', profile: { id: 'p3', ...base, links: null } },
      // Vínculo sem perfil: fica só nos vínculos
      { profile_id: 'p4', owner_id: 'o3', profile: null },
    ];
    const { owners, profiles } = rowsFromOwnerEmbed(rows);
    expect(owners).toEqual([
      { profile_id: 'p1', owner_id: 'o1' },
      { profile_id: 'p2', owner_id: 'o1' },
      { profile_id: 'p3', owner_id: 'o2' },
      { profile_id: 'p4', owner_id: 'o3' },
    ]);
    expect(profiles).toEqual([
      { id: 'p1', ...base, links_count: 3 },
      { id: 'p2', ...base, links_count: 0 },
      { id: 'p3', ...base, links_count: 0 },
    ]);
    expect(rowsFromOwnerEmbed([])).toEqual({ owners: [], profiles: [] });
    // A conta o3 não aparece, porque o vínculo dela não tem perfil
    expect(accountIdsByNewestProfile(owners, profiles)).toEqual(['o1', 'o2']);
  });
});

describe('validação do userId (excluir e inativar)', () => {
  const ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

  it('aceita o UUID canônico e passa maiúsculas para minúsculas', () => {
    expect(normalizeUserId(ID)).toBe(ID);
    // O mesmo UUID em maiúsculas é a mesma conta: não pode passar pela trava "a si mesmo"
    expect(normalizeUserId(ID.toUpperCase())).toBe(ID);
  });

  it('recusa as outras grafias que o Postgres aceitaria (chaves, sem hífens, espaços)', () => {
    expect(normalizeUserId(`{${ID}}`)).toBeNull();
    expect(normalizeUserId(ID.replace(/-/g, ''))).toBeNull();
    expect(normalizeUserId(` ${ID}`)).toBeNull();
    expect(normalizeUserId(`${ID} `)).toBeNull();
  });

  it('recusa vazio, ausente e o que não é texto', () => {
    expect(normalizeUserId('')).toBeNull();
    expect(normalizeUserId(null)).toBeNull();
    expect(normalizeUserId(undefined)).toBeNull();
    expect(normalizeUserId(123)).toBeNull();
    expect(normalizeUserId('nao-e-uuid')).toBeNull();
    expect(normalizeUserId(`${ID}0`)).toBeNull();
  });
});

describe('contas da página (edge function)', () => {
  const profile = (id: string) => ({ id, username: id, full_name: null, avatar_url: null, user_type: null, links_count: 0 });

  it('segue a ordem da página, junta papel e perfis, e mantém a conta cujo e-mail não veio', () => {
    const grouped = new Map([
      ['a', [profile('pa')]],
      ['b', [profile('pb')]],
    ]);
    const accounts = buildAccounts(
      ['b', 'a', 'c'],
      [
        { id: 'b', email: 'b@example.com', created_at: '2026-01-01', last_sign_in_at: '2026-02-01', banned_until: null },
        null,
        { id: 'c', email: 'c@example.com' },
      ],
      [
        { user_id: 'b', role: 'admin' },
        { user_id: 'b', role: 'user' },
        { user_id: 'c', role: 'user' },
      ],
      grouped,
    );
    expect(accounts).toEqual([
      {
        id: 'b',
        email: 'b@example.com',
        created_at: '2026-01-01',
        last_sign_in_at: '2026-02-01',
        banned_until: null,
        role: 'admin',
        profiles: [profile('pb')],
      },
      // getUserById falhou: a conta continua na lista, sem e-mail
      { id: 'a', email: null, created_at: null, last_sign_in_at: null, banned_until: null, role: 'user', profiles: [profile('pa')] },
      { id: 'c', email: 'c@example.com', created_at: null, last_sign_in_at: null, banned_until: null, role: 'user', profiles: [] },
    ]);
  });

  it('admin vale mesmo se a linha "user" vier depois', () => {
    const [account] = buildAccounts(['x'], [{ id: 'x' }], [{ user_id: 'x', role: 'admin' }, { user_id: 'x', role: 'user' }], new Map());
    expect(account.role).toBe('admin');
    const [other] = buildAccounts(['x'], [{ id: 'x' }], [{ user_id: 'x', role: 'user' }, { user_id: 'x', role: 'admin' }], new Map());
    expect(other.role).toBe('admin');
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

  it('conta sem e-mail (leitura falhou) continua achável pelo @', () => {
    const semEmail: AdminUser = { ...USERS[1], email: null, created_at: null };
    expect(filterAdminUsers([semEmail], 'maria').map((u) => u.id)).toEqual(['u3']);
    expect(filterAdminUsers([semEmail], 'example')).toEqual([]);
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
