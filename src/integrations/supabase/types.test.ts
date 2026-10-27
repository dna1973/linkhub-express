import { describe, expect, it } from 'vitest';
import type { Database } from './types';

type Tables = Database['public']['Tables'];
type Functions = Database['public']['Functions'];

// O que vale aqui é o tsc: se um tipo sumir ou mudar, o arquivo deixa de compilar
describe('tipos do Supabase para os vários perfis', () => {
  it('descrevem a tabela de donos, as RPCs e o id opcional no insert do perfil', () => {
    const owner: Tables['profile_owners']['Row'] = { profile_id: 'p1', owner_id: 'u1', created_at: '2026-10-26' };
    const newProfile: Tables['profiles']['Insert'] = { username: 'loja' };
    const create: Functions['create_profile']['Args'] = { p_username: 'loja', p_full_name: 'Loja' };
    const createdId: Functions['create_profile']['Returns'] = 'p2';
    const listed: Functions['list_own_profiles']['Returns'] = [];
    const remove: Functions['delete_own_profile']['Args'] = { p_profile_id: 'p2' };
    const owns: Functions['owns_profile']['Args'] = { p_profile_id: 'p2' };
    const folder: Functions['owns_profile_folder']['Args'] = { p_name: 'p2/1.jpg' };
    expect([owner, newProfile, create, createdId, listed, remove, owns, folder]).toHaveLength(8);
  });
});
