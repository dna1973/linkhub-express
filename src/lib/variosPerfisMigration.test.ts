import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// O hook importa o cliente, que lança erro sem .env: aqui só interessa a lista
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

import { RESERVED_USERNAMES } from '@/hooks/useUsernameValidation';
import { APP_ROUTE_SEGMENTS } from '@/lib/serviceWorkerRoutes';

const root = path.resolve(__dirname, '..', '..');
const read = (...parts: string[]) => readFileSync(path.join(root, ...parts), 'utf8');

const MIGRATION = read('deploy', 'vpsavila', 'migrations', '2026-10-26-varios-perfis.sql');
const SCHEMA = read('deploy', 'vpsavila', 'linkhub_schema.sql');

/** Os @ do array v_reserved do create_profile. */
function reservedFromSql(sql: string): string[] {
  const match = /v_reserved\s+CONSTANT\s+text\[\]\s*:=\s*ARRAY\[([\s\S]*?)\]/i.exec(sql);
  if (!match) throw new Error('array v_reserved não encontrado');
  return Array.from(match[1].matchAll(/'([^']*)'/g), (m) => m[1]);
}

const countLines = (sql: string, line: string) => sql.split(/\r?\n/).filter((l) => l.trim() === line).length;

/** Cabeçalho de cada CREATE OR REPLACE FUNCTION (até o corpo). */
const functionHeaders = (sql: string) =>
  sql.split('CREATE OR REPLACE FUNCTION').slice(1).map((part) => part.split('AS $$')[0]);

describe('migração dos vários perfis', () => {
  it('o create_profile reserva os mesmos @ que o useUsernameValidation', () => {
    expect([...reservedFromSql(MIGRATION)].sort()).toEqual([...RESERVED_USERNAMES].sort());
  });

  it('o linkhub_schema.sql usa a mesma lista', () => {
    expect([...reservedFromSql(SCHEMA)].sort()).toEqual([...RESERVED_USERNAMES].sort());
  });

  it('toda rota do app é @ reservado (um perfil com esse @ ficaria atrás da rota)', () => {
    for (const segment of APP_ROUTE_SEGMENTS) expect(RESERVED_USERNAMES).toContain(segment);
  });

  it('tem exatamente um BEGIN; e um COMMIT; (o ensaio tira os dois)', () => {
    expect(countLines(MIGRATION, 'BEGIN;')).toBe(1);
    expect(countLines(MIGRATION, 'COMMIT;')).toBe(1);
    expect(countLines(MIGRATION, 'ROLLBACK;')).toBe(0);
  });

  it('trava as quatro tabelas logo depois do lock_timeout', () => {
    const lockTimeout = MIGRATION.indexOf("SET LOCAL lock_timeout = '5s';");
    const lock = MIGRATION.indexOf(
      'LOCK TABLE linkhub.profiles, linkhub.links, linkhub.profile_views, linkhub.link_clicks IN SHARE ROW EXCLUSIVE MODE;',
    );
    expect(lockTimeout).toBeGreaterThan(-1);
    expect(lock).toBeGreaterThan(lockTimeout);
    expect(lock).toBeLessThan(MIGRATION.indexOf('CREATE TABLE IF NOT EXISTS linkhub.profile_owners'));
  });

  it('toda função SECURITY DEFINER fixa search_path vazio', () => {
    for (const sql of [MIGRATION, SCHEMA]) {
      const headers = functionHeaders(sql).filter((h) => h.includes('SECURITY DEFINER'));
      expect(headers.length).toBeGreaterThanOrEqual(7);
      for (const header of headers) expect(header).toContain("SET search_path = ''");
    }
  });

  it('as RPCs chamáveis ficam só com authenticated', () => {
    for (const fn of ['create_profile(text, text)', 'list_own_profiles()', 'delete_own_profile(uuid)']) {
      for (const sql of [MIGRATION, SCHEMA]) {
        expect(sql).toContain(`REVOKE ALL ON FUNCTION linkhub.${fn} FROM PUBLIC, anon;`);
        expect(sql).toContain(`GRANT EXECUTE ON FUNCTION linkhub.${fn} TO authenticated;`);
      }
    }
  });

  it('a tabela de donos só pode ser lida por authenticated', () => {
    for (const sql of [MIGRATION, SCHEMA]) {
      expect(sql).toContain('REVOKE ALL ON linkhub.profile_owners FROM PUBLIC, anon, authenticated;');
      expect(sql).toContain('GRANT SELECT ON linkhub.profile_owners TO authenticated;');
    }
  });

  it('no esquema, os REVOKE vêm depois dos GRANT ALL da seção 6', () => {
    const grantAll = SCHEMA.indexOf('GRANT ALL ON ALL FUNCTIONS IN SCHEMA linkhub');
    expect(grantAll).toBeGreaterThan(-1);
    expect(SCHEMA.indexOf('REVOKE ALL ON FUNCTION linkhub.create_profile')).toBeGreaterThan(grantAll);
    expect(SCHEMA.indexOf('REVOKE ALL ON linkhub.profile_owners')).toBeGreaterThan(grantAll);
  });

  it('remove a leitura pública dos dois buckets e não a recria', () => {
    for (const name of ['linkhub_avatars_public_read', 'linkhub_link_icons_public_read']) {
      expect(MIGRATION).toContain(`DROP POLICY IF EXISTS "${name}" ON storage.objects;`);
      expect(MIGRATION).not.toContain(`CREATE POLICY "${name}"`);
      expect(SCHEMA).not.toContain(name);
    }
  });

  it('cria as políticas do Storage pela pasta do perfil e pelo owner_id', () => {
    for (const sql of [MIGRATION, SCHEMA]) {
      for (const bucket of ['avatars', 'link_icons']) {
        for (const op of ['select', 'insert', 'update', 'delete']) {
          expect(sql).toContain(`CREATE POLICY "linkhub_${bucket}_${op}_own" ON storage.objects`);
        }
      }
      expect(sql.match(/linkhub\.owns_profile_folder\(name\)/g)?.length).toBe(6);
      expect(sql.match(/owner_id = auth\.uid\(\)::text/g)?.length).toBe(4);
    }
  });
});
