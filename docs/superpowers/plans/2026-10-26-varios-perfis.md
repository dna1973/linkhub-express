# Vários perfis por conta — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar tarefa por tarefa. Os passos usam caixas (`- [ ]`).

**Objetivo:** uma conta passa a ter até 10 perfis públicos, cada um com @username, foto, tema, links, QR code e estatísticas próprios. O dono troca de perfil por um seletor na sidebar e gerencia todos na aba "Meus perfis". Quem está de fora não descobre, nem pela API, que dois perfis são da mesma conta.

**Arquitetura:**
- **Banco:** tabela `linkhub.profile_owners` (perfil → conta), que só o dono lê. A `profiles` continua pública e sem coluna de dono. As funções `SECURITY DEFINER` `create_profile`, `list_own_profiles` e `delete_own_profile` fazem o que a RLS não deixa. As políticas passam a perguntar `linkhub.owns_profile(id)`. As FKs apagam em cascata a partir do perfil.
- **Storage:** os arquivos vão para a pasta do **perfil** (`<profile.id>/...`). Os dois buckets perdem a leitura pública da tabela `storage.objects`. As URLs públicas continuam abrindo.
- **Painel:** o `CurrentProfileContext` carrega os perfis pela RPC, guarda o perfil atual no `localStorage` e aplica o tema dele no `useDesignStore`. O `Dashboard` passa o perfil atual às abas, que usam `profile.id` onde hoje usam `user.id`. As abas, a prévia e o onboarding remontam por `key` ao trocar de perfil.
- **Admin:** a edge function agrupa os perfis por conta a partir de `profile_owners`. A lógica pura fica em `group.ts`, testada no Vitest.

**Tecnologias:** React 18, Vite 5, TypeScript (`strict: false`, lib ES2020), shadcn/ui (Radix), Zustand, Supabase self-hosted (schema `linkhub`, PostgREST, Storage), edge function em Deno, Vitest 2 com `@testing-library/react` e jsdom 25, PowerShell 5.1.

**Especificação (fonte da verdade):** `docs/superpowers/specs/2026-10-25-varios-perfis-design.md`. Cada tarefa cita a seção.

---

## Convenções do ambiente (Windows)

- Os comandos rodam no **PowerShell**, na raiz do repositório.
- **Tipos:** o `tsconfig.json` da raiz tem `"files": []` e só referencia os outros, então `npx tsc --noEmit` sozinho não confere nada. Todas as tarefas usam `npx tsc --noEmit -p tsconfig.app.json` (≈ 20 s). Esperado: nenhuma saída, código 0.
- **Testes:** `npx vitest run` (ou o arquivo da tarefa). Hoje: **40 arquivos, 632 testes**, todos passando. Cada tarefa informa os arquivos de teste novos; no fim da tarefa, a contagem tem de ser a anterior somada aos testes novos, sem nenhuma falha.
- O Vitest roda em ambiente **node**. Testes de DOM começam com `// @vitest-environment jsdom`.
- **Não há** `@testing-library/user-event` nem `jest-dom`: use `fireEvent` e asserções simples (`toBeTruthy()`, `toBeNull()`, `getAttribute`).
- **jsdom 25:**
  - cores voltam em `rgb(r, g, b)`;
  - abas do Radix trocam com `fireEvent.mouseDown` no `tab`;
  - não há `Blob.text()`, `File.text()` nem `URL.createObjectURL` (os testes criam e apagam `URL.createObjectURL`);
  - o `DropdownMenu` do Radix abre com `fireEvent.keyDown(gatilho, { key: 'Enter' })` e precisa de `ResizeObserver` (os testes usam uma classe vazia).
- Se o Vitest falhar com `Error: UNKNOWN: unknown error, open '...\ssr\...'` e mostrar menos arquivos que o esperado, é a falha intermitente do cache no Windows: rode de novo e conte só uma execução sem esse erro.
- **URLs do Storage nos testes:** monte com os prefixos importados (`AVATARS_PUBLIC_PREFIX`, `LINK_ICONS_PUBLIC_PREFIX`), nunca com domínio fixo. Eles dependem do `.env`, que pode não existir num worktree.
- A ferramenta Write converte escapes `\uXXXX` em caracteres. Nenhum código deste plano usa esses escapes; se precisar de regex Unicode, use `\u{...}` com a flag `u`.
- **Arquivos `.ps1`:** só ASCII (sem acentos). O Windows PowerShell 5.1 lê `.ps1` sem BOM como Windows-1252, e alguns caracteres acentuados viram aspas tipográficas que quebram o script. Para gravar texto, use `[System.IO.File]::WriteAllText($caminho, $texto, (New-Object System.Text.UTF8Encoding $false))`. O `Set-Content -Encoding UTF8` põe BOM, e o `psql` acusa erro na primeira linha.
- **Servidor:** `avila@192.168.1.24`, como no `DEPLOY.md`. O `ssh` pelo PowerShell perde aspas duplas internas, então o comando remoto vai entre aspas simples e sem aspas duplas dentro. SQL vai sempre por `scp` e redirecionamento remoto (`< /tmp/arq.sql`), nunca por pipe com `Get-Content`.
- **Git:** o índice é compartilhado com outros agentes. **Nunca** use `git add -A`, `git add .` nem `git commit -a`. Cada commit lista os caminhos: `git add -- <arquivos novos>` e depois `git commit -m "<mensagem>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- <todos os arquivos da tarefa>`. Mensagens em português.
- As tarefas 1 a 16 não tocam no servidor. Push não faz parte de nenhuma tarefa.
- **Tarefa 17 (produção):** todo passo que roda no servidor, publica ou grava em produção é **"só com aprovação do Daniel em card"**: antes de executar, peça a aprovação com `AskUserQuestion` (botões), descrevendo o comando, e só siga com o "sim". Nenhum passo digita senha: o Daniel faz login no navegador ele mesmo.

## Decisões tomadas onde o código pediu (conferir na revisão)

1. **Abas recebem o perfil atual por prop.** O `Dashboard` passa `profile={currentProfile}` às abas, como hoje, e elas usam `profile.id`. É o `currentProfile.id` da especificação, sem cada aba ler o contexto. Os testes das abas continuam sem Provider.
2. **`key` das abas:** a especificação pede `key={currentProfile.id}` nos `TabsContent`. Irmãos não podem repetir `key`, então cada aba usa ``key={`links:${id}`}``, ``key={`design:${id}`}`` e assim por diante. Na prévia e no onboarding, a `key` é o próprio id.
3. **Rota de layout carregada sob demanda:** o Provider fica em `src/pages/ProfileLayout.tsx` (`<CurrentProfileProvider><Outlet /></CurrentProfileProvider>`), importado com `lazy` no `App`. Assim a página pública não baixa o contexto do painel, como diz o comentário do `App`.
4. **`UsernameInput` ganha `currentProfileId`.** Ele chama o `useUsernameValidation` por dentro, então sem a prop o aviso "em uso" apareceria no @ do próprio perfil.
5. **Tema na troca:** o tema é aplicado na seleção, na primeira carga e quando o `theme_options` gravado do perfil atual muda numa recarga (por exemplo, ao terminar o onboarding). Uma recarga sem mudança de tema, como o salvamento automático da aba Perfil, não mexe no editor.
6. **`deleteProfile` devolve resultado tipado** (`last`, `not_owner`, `other`), para a aba "Meus perfis" mostrar o erro.
7. **Storage:** as políticas novas de SELECT se chamam `linkhub_avatars_select_own` e `linkhub_link_icons_select_own`, porque hoje não existe política de SELECT própria (só a `*_public_read`, que sai). O `owns_profile_folder` também recusa arquivo solto na raiz do bucket (nome sem `/`).
8. **Lista de @ reservados:** fica no hook, exportada como `RESERVED_USERNAMES`. Ela não tem `exemplo` nem `install`, que são rotas do app. A falha já existe hoje; o plano não muda a lista, porque a especificação manda copiar a do hook.
9. **Conta sem perfil que continua vazia depois do insert** (RLS inesperada): o contexto mostra erro em vez de ficar carregando para sempre.
10. **Ensaio dividido em dois arquivos de teste** (banco e Storage). Os dois rodam juntos no caminho normal, e separados se for preciso usar a alternativa do Storage (`supabase_admin`).

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade | Tarefa |
|---|---|---|---|
| `deploy/vpsavila/migrations/2026-10-26-varios-perfis.sql` | Criar | Migração completa: donos, FKs, funções, gatilhos e políticas | 1 |
| `deploy/vpsavila/linkhub_schema.sql` | Modificar | Estado final do banco para instalação nova | 1 |
| `src/hooks/useUsernameValidation.ts` | Modificar | Exporta `RESERVED_USERNAMES` (T1); aceita `currentProfileId` (T6) | 1, 6 |
| `src/lib/variosPerfisMigration.test.ts` | Criar | Lê a migração e o esquema: lista de @, transação, permissões, políticas | 1, 2 |
| `scripts/ensaio-migracao-perfis.ps1` | Criar | Gera o arquivo local do ensaio (`BEGIN; corpo; corpo; testes; ROLLBACK;`) | 2 |
| `scripts/ensaio-perfis-testes.sql` | Criar | Casos do ensaio no banco (`DO` + `RAISE EXCEPTION`) | 2 |
| `scripts/ensaio-perfis-testes-storage.sql` | Criar | Casos do ensaio no Storage | 2 |
| `scripts/conferencia-perfis.sql` | Criar | Conferência só de leitura, antes e depois da migração | 2 |
| `deploy/vpsavila/DEPLOY.md` | Modificar | Ensaio, conferência e o que mudou no Admin e no primeiro acesso | 2 |
| `src/integrations/supabase/types.ts` | Modificar | `profile_owners`, as 5 funções, `id` opcional no insert, comentário de `links.user_id` | 3 |
| `src/integrations/supabase/types.test.ts` | Criar | Confere os tipos novos no `tsc` | 3 |
| `src/lib/avatarStorage.ts` (+ teste) | Criar | `AVATARS_BUCKET`, prefixo público, `avatarPathFromUrl(url, profileId)` | 4 |
| `src/lib/supabase.ts` | Modificar | Reexporta `AVATARS_BUCKET` de `avatarStorage` | 4 |
| `src/lib/linkIcons/storage.ts`, `storagePrefix.ts` (+ teste) | Modificar | `linkIconPathFromUrl(url, profileId)`; comentários da pasta do perfil | 4 |
| `src/stores/useDesignStore.ts` (+ teste) | Modificar | `DEFAULT_THEME_ID`, `createDefaultCustomTheme()`, `resetDesign()` | 4 |
| `src/contexts/CurrentProfileContext.tsx` (+ teste) | Criar | Perfis da conta, perfil atual, criar e excluir | 5 |
| `src/pages/ProfileLayout.tsx` (+ teste) | Criar | Rota de layout com o Provider | 5 |
| `src/App.tsx` | Modificar | `/dashboard` e `/analytics` dentro da rota de layout | 5 |
| `src/components/ui/username-input.tsx` | Modificar | Prop `currentProfileId` | 6 |
| `src/hooks/useUsernameValidation.test.ts` | Criar | O @ do próprio perfil fica disponível | 6 |
| `src/components/dashboard/SettingsTab.tsx` (+ teste) | Modificar | `profile.id` nos `update` e na pasta; `avatarPathFromUrl`; `resetKey` | 7 |
| `src/components/dashboard/DesignTab.tsx` | Modificar | Estado inicial a partir do perfil; grava em `profile.id` | 8 |
| `src/components/dashboard/DesignTab.test.tsx` | Criar | Não herda o tema na troca | 8 |
| `src/components/dashboard/LinksTab.tsx` (+ teste) | Modificar | Links e pasta do perfil | 9 |
| `src/components/dashboard/links/EditLinkDialog.tsx` (+ teste) | Modificar | Prop `profileId` no lugar de `userId` | 9 |
| `src/components/dashboard/ProfilePreview.tsx` (+ teste) | Modificar | Links por `profile.id` | 9 |
| `src/pages/Analytics.tsx` | Modificar | Dados do perfil atual | 10 |
| `src/pages/Analytics.test.tsx` | Criar | Analytics por perfil | 10 |
| `src/hooks/useAnalyticsData.ts` | Remover | Não é usado | 10 |
| `src/components/dashboard/OnboardingDialog.tsx` | Modificar | Recebe `profile`; grava nele | 11 |
| `src/components/dashboard/OnboardingDialog.test.tsx` | Criar | Nome e foto do perfil, `profile.id` nos dados | 11 |
| `src/components/dashboard/NewProfileDialog.tsx` (+ teste) | Criar | @ e nome do perfil novo | 12 |
| `src/components/dashboard/ProfilesTab.tsx` (+ teste) | Criar | Aba "Meus perfis" | 13 |
| `src/components/dashboard/AppSidebar.tsx` (+ 2 testes) | Modificar | Seletor de perfil; item "Meus perfis" | 14 |
| `src/pages/Dashboard.tsx` | Modificar | Usa o contexto; aba `profiles`; diálogo de perfil novo | 14 |
| `src/pages/Dashboard.test.tsx` | Criar | Onboarding, prévia oculta, troca de perfil | 14 |
| `supabase/functions/linkhub-admin-users/group.ts` | Criar | Agrupamento puro por conta (Deno e Vitest) | 15 |
| `supabase/functions/linkhub-admin-users/index.ts` | Modificar | Lista, estatísticas e exclusão por conta | 15 |
| `src/lib/adminUsers.ts` (+ teste) | Criar | Tipos, busca e contadores do Admin | 15 |
| `src/pages/Admin.tsx` | Modificar | Contas com vários perfis; card "Perfis" | 15 |

---
### Tarefa 1: migração, esquema final e lista de @ reservados

**Especificação:** "Modelo de dados", "Migração" (passos 1 a 7) e "Compatibilidade com o frontend atual".

**Arquivos:**
- Criar: `deploy/vpsavila/migrations/2026-10-26-varios-perfis.sql`
- Modificar: `deploy/vpsavila/linkhub_schema.sql`
- Modificar: `src/hooks/useUsernameValidation.ts` (só exporta a lista)
- Criar: `src/lib/variosPerfisMigration.test.ts`

- [ ] **Passo 1: teste que lê a migração (falha)**

`src/lib/variosPerfisMigration.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

// O hook importa o cliente, que lança erro sem .env: aqui só interessa a lista
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

import { RESERVED_USERNAMES } from '@/hooks/useUsernameValidation';

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
```

As contagens do último teste: INSERT (1) + UPDATE (`USING` e `WITH CHECK`, 2) por bucket dão 6 chamadas de `owns_profile_folder(name)`; SELECT + DELETE por bucket dão 4 `owner_id = auth.uid()::text`.

- [ ] **Passo 2: confirmar a falha**

```powershell
npx vitest run src/lib/variosPerfisMigration.test.ts
```

Esperado: falha ao ler `2026-10-26-varios-perfis.sql` (`ENOENT`).

- [ ] **Passo 3: exportar a lista do hook**

Em `src/hooks/useUsernameValidation.ts`, tire o array de dentro do `validateUsername` e exporte no topo do módulo, logo depois da interface `UsernameValidationResult`:

```ts
// A mesma lista fica no create_profile de deploy/vpsavila/migrations/2026-10-26-varios-perfis.sql
// (conferida em src/lib/variosPerfisMigration.test.ts). Mudou aqui, mude lá e no linkhub_schema.sql.
export const RESERVED_USERNAMES = [
  'admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'dashboard',
  'analytics', 'settings', 'profile', 'user', 'users', 'auth',
  'login', 'register', 'signup', 'signin', 'logout', 'home',
  'about', 'contact', 'help', 'support', 'terms', 'privacy',
  'blog', 'news', 'app', 'mobile', 'web', 'site', 'page',
  'linkhub', 'link', 'links', 'hub', 'tree', 'bio', 'me'
];
```

Dentro do `validateUsername`, apague o bloco `const reservedUsernames = [ … ];` e troque `if (reservedUsernames.includes(usernameToCheck.toLowerCase())) {` por:

```ts
    if (RESERVED_USERNAMES.includes(usernameToCheck.toLowerCase())) {
```

- [ ] **Passo 4: criar a migração**

`deploy/vpsavila/migrations/2026-10-26-varios-perfis.sql`:

```sql
-- Vários perfis por conta, com o vínculo entre os perfis escondido de quem está de fora.
-- Especificação: docs/superpowers/specs/2026-10-25-varios-perfis-design.md
--
-- * O dono de cada perfil fica em linkhub.profile_owners, que só o próprio dono lê.
--   A tabela profiles, de leitura pública, não ganha coluna de dono.
-- * profiles.id continua sendo a chave do perfil. Os perfis existentes não mudam de id.
-- * links.user_id continua guardando o id do PERFIL (o nome é histórico).
-- * Os uploads passam a usar a pasta do perfil, e os dois buckets do LinkHub perdem a leitura
--   pública da tabela storage.objects. As URLs públicas continuam abrindo (/object/public/ não passa por RLS).
--
-- Roda como postgres (-U postgres), dono das tabelas e com BYPASSRLS: as funções ficam com esse dono.
-- Tudo numa transação e idempotente: pode rodar de novo.
-- Antes de aplicar, rode o ensaio (scripts/ensaio-migracao-perfis.ps1, ver DEPLOY.md).
BEGIN;

-- Não espera para sempre por uma consulta longa: falha em 5 s e pode rodar de novo.
SET LOCAL lock_timeout = '5s';

-- Ninguém grava nestas tabelas até o COMMIT. Fecha duas janelas: entre o preenchimento dos donos
-- e a criação do gatilho, e entre a limpeza de órfãos e a criação das FKs.
LOCK TABLE linkhub.profiles, linkhub.links, linkhub.profile_views, linkhub.link_clicks IN SHARE ROW EXCLUSIVE MODE;

-- 1. Donos dos perfis ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS linkhub.profile_owners (
  profile_id uuid PRIMARY KEY REFERENCES linkhub.profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_owners_owner_idx ON linkhub.profile_owners (owner_id);

ALTER TABLE linkhub.profile_owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view their own profile links" ON linkhub.profile_owners;
CREATE POLICY "Owners can view their own profile links" ON linkhub.profile_owners
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- Sem política de insert, update ou delete: só o gatilho e as funções escrevem aqui.
-- O ACL padrão do schema dá ALL a anon e authenticated, inclusive TRUNCATE, que não passa por RLS.
REVOKE ALL ON linkhub.profile_owners FROM PUBLIC, anon, authenticated;
GRANT SELECT ON linkhub.profile_owners TO authenticated;

-- 2. Preenchimento: os perfis atuais têm id igual ao da conta -----------------
INSERT INTO linkhub.profile_owners (profile_id, owner_id)
SELECT id, id FROM linkhub.profiles WHERE id IN (SELECT id FROM auth.users)
ON CONFLICT DO NOTHING;

-- 3. profiles: o id deixa de apontar para auth.users; perfis novos ganham id gerado
ALTER TABLE linkhub.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE linkhub.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. Exclusão em cascata a partir do perfil -----------------------------------
-- Órfãos (em produção, 0) fariam as FKs falharem
DELETE FROM linkhub.links l
WHERE NOT EXISTS (SELECT 1 FROM linkhub.profiles p WHERE p.id = l.user_id);
DELETE FROM linkhub.profile_views v
WHERE NOT EXISTS (SELECT 1 FROM linkhub.profiles p WHERE p.id = v.profile_id);
DELETE FROM linkhub.link_clicks c
WHERE NOT EXISTS (SELECT 1 FROM linkhub.profiles p WHERE p.id = c.profile_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'links_user_id_profile_fkey' AND conrelid = 'linkhub.links'::regclass) THEN
    ALTER TABLE linkhub.links ADD CONSTRAINT links_user_id_profile_fkey
      FOREIGN KEY (user_id) REFERENCES linkhub.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_views_profile_id_fkey' AND conrelid = 'linkhub.profile_views'::regclass) THEN
    ALTER TABLE linkhub.profile_views ADD CONSTRAINT profile_views_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES linkhub.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'link_clicks_profile_id_fkey' AND conrelid = 'linkhub.link_clicks'::regclass) THEN
    ALTER TABLE linkhub.link_clicks ADD CONSTRAINT link_clicks_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES linkhub.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

COMMENT ON COLUMN linkhub.links.user_id IS
  'Id do perfil (linkhub.profiles.id), não da conta. O nome é histórico.';

-- 5. Funções e gatilhos -------------------------------------------------------

-- Usada pelas políticas: não depende de permissão de leitura em profile_owners.
-- Para anon, auth.uid() é nulo e o resultado é falso.
CREATE OR REPLACE FUNCTION linkhub.owns_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM linkhub.profile_owners
    WHERE profile_id = p_profile_id AND owner_id = auth.uid()
  )
$$;
GRANT EXECUTE ON FUNCTION linkhub.owns_profile(uuid) TO anon, authenticated;

-- Registra o dono de um perfil novo: o primeiro (insert direto, inclusive pelo frontend antigo)
-- e os criados pelo create_profile. Perfil criado por service_role (auth.uid() nulo) fica sem dono.
CREATE OR REPLACE FUNCTION linkhub.register_profile_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO linkhub.profile_owners (profile_id, owner_id)
    VALUES (NEW.id, auth.uid())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS register_profile_owner ON linkhub.profiles;
CREATE TRIGGER register_profile_owner AFTER INSERT ON linkhub.profiles
  FOR EACH ROW EXECUTE FUNCTION linkhub.register_profile_owner();

-- Apagar o vínculo apaga o perfil. Excluir a conta em auth.users apaga profile_owners em cascata,
-- que apaga os perfis, que apagam links, visitas e cliques. Quando o perfil é apagado primeiro,
-- o vínculo sai em cascata e este DELETE não acha mais nada: não há laço.
CREATE OR REPLACE FUNCTION linkhub.cleanup_owned_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM linkhub.profiles WHERE id = OLD.profile_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS cleanup_owned_profile ON linkhub.profile_owners;
CREATE TRIGGER cleanup_owned_profile AFTER DELETE ON linkhub.profile_owners
  FOR EACH ROW EXECUTE FUNCTION linkhub.cleanup_owned_profile();

-- O id do perfil é a pasta dos arquivos e a chave de links e estatísticas: não muda.
CREATE OR REPLACE FUNCTION linkhub.protect_profile_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'O id do perfil não pode ser alterado.'
      USING ERRCODE = 'P0001', HINT = 'linkhub_immutable_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_id ON linkhub.profiles;
CREATE TRIGGER protect_profile_id BEFORE UPDATE ON linkhub.profiles
  FOR EACH ROW EXECUTE FUNCTION linkhub.protect_profile_id();

-- Cria um perfil a mais para a conta logada. O @ duplicado cai no unique (23505).
CREATE OR REPLACE FUNCTION linkhub.create_profile(p_username text, p_full_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner uuid := auth.uid();
  -- Mesma lista de src/hooks/useUsernameValidation.ts (conferida no Vitest)
  v_reserved CONSTANT text[] := ARRAY[
    'admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'dashboard',
    'analytics', 'settings', 'profile', 'user', 'users', 'auth',
    'login', 'register', 'signup', 'signin', 'logout', 'home',
    'about', 'contact', 'help', 'support', 'terms', 'privacy',
    'blog', 'news', 'app', 'mobile', 'web', 'site', 'page',
    'linkhub', 'link', 'links', 'hub', 'tree', 'bio', 'me'
  ];
  v_id uuid;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta para criar um perfil.'
      USING ERRCODE = 'P0001', HINT = 'linkhub_not_authenticated';
  END IF;

  -- Uma criação ou exclusão por vez para cada conta: o limite não fura com duas abas
  PERFORM pg_advisory_xact_lock(hashtext('linkhub.profiles'), hashtext(v_owner::text));

  IF (SELECT count(*) FROM linkhub.profile_owners WHERE owner_id = v_owner) >= 10 THEN
    RAISE EXCEPTION 'Você já tem 10 perfis.'
      USING ERRCODE = 'P0001', HINT = 'linkhub_profile_limit';
  END IF;

  IF p_username IS NULL OR p_username !~ '^[a-z0-9_]{3,20}$' OR p_username = ANY (v_reserved) THEN
    RAISE EXCEPTION 'Este @username não pode ser usado.'
      USING ERRCODE = 'P0001', HINT = 'linkhub_invalid_username';
  END IF;

  -- O gatilho register_profile_owner grava o dono
  INSERT INTO linkhub.profiles (username, full_name)
  VALUES (p_username, left(nullif(btrim(coalesce(p_full_name, '')), ''), 100))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION linkhub.list_own_profiles()
RETURNS SETOF linkhub.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.*
  FROM linkhub.profiles p
  JOIN linkhub.profile_owners o ON o.profile_id = p.id
  WHERE o.owner_id = auth.uid()
  ORDER BY p.created_at, p.id
$$;

-- Exclui um perfil da conta logada e devolve os arquivos que o cliente deve apagar do Storage
-- (o gatilho protect_objects_delete do Storage não deixa o SQL apagar).
CREATE OR REPLACE FUNCTION linkhub.delete_own_profile(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_avatar text;
  v_icons jsonb;
BEGIN
  IF v_owner IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('linkhub.profiles'), hashtext(v_owner::text));
  END IF;

  SELECT p.avatar_url INTO v_avatar
  FROM linkhub.profiles p
  JOIN linkhub.profile_owners o ON o.profile_id = p.id
  WHERE p.id = p_profile_id AND o.owner_id = v_owner
  FOR UPDATE OF p;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado.'
      USING ERRCODE = 'P0001', HINT = 'linkhub_not_owner';
  END IF;

  IF (SELECT count(*) FROM linkhub.profile_owners WHERE owner_id = v_owner) <= 1 THEN
    RAISE EXCEPTION 'Você não pode excluir o seu único perfil.'
      USING ERRCODE = 'P0001', HINT = 'linkhub_last_profile';
  END IF;

  SELECT coalesce(jsonb_agg(l.icon_value ORDER BY l.id), '[]'::jsonb) INTO v_icons
  FROM linkhub.links l
  WHERE l.user_id = p_profile_id AND l.icon_type = 'upload' AND l.icon_value IS NOT NULL;

  -- Links, visitas, cliques e o vínculo com o dono saem em cascata
  DELETE FROM linkhub.profiles WHERE id = p_profile_id;

  RETURN jsonb_build_object('avatar_url', v_avatar, 'icon_urls', v_icons);
END;
$$;

-- Usada pelas políticas do Storage. A regex do uuid fica aqui dentro: na política, um AND
-- com conversão não garante a ordem de avaliação e poderia dar erro de conversão.
CREATE OR REPLACE FUNCTION linkhub.owns_profile_folder(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_folder text;
BEGIN
  -- Arquivo solto na raiz do bucket não é de perfil nenhum
  IF p_name IS NULL OR position('/' in p_name) = 0 THEN
    RETURN false;
  END IF;
  v_folder := split_part(p_name, '/', 1);
  IF v_folder !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    RETURN false;
  END IF;
  RETURN linkhub.owns_profile(v_folder::uuid);
END;
$$;
GRANT EXECUTE ON FUNCTION linkhub.owns_profile_folder(text) TO authenticated;

-- O ACL padrão do schema dá EXECUTE a PUBLIC e anon: as três RPCs ficam só com authenticated
REVOKE ALL ON FUNCTION linkhub.create_profile(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION linkhub.create_profile(text, text) TO authenticated;
REVOKE ALL ON FUNCTION linkhub.list_own_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION linkhub.list_own_profiles() TO authenticated;
REVOKE ALL ON FUNCTION linkhub.delete_own_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION linkhub.delete_own_profile(uuid) TO authenticated;

-- 6. Políticas: mesmos nomes de hoje, refeitas para nenhuma antiga sobrar somada por OR

-- profiles: só o PRIMEIRO perfil entra por insert direto, e com o id da conta. Isso impede apropriar
-- o id de outra conta e recriar o perfil de id da conta depois de excluí-lo (o que furaria o limite).
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON linkhub.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON linkhub.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON linkhub.profiles;
CREATE POLICY "Users can insert their own profile" ON linkhub.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    AND NOT EXISTS (SELECT 1 FROM linkhub.profile_owners WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON linkhub.profiles;
CREATE POLICY "Users can update their own profile" ON linkhub.profiles
  FOR UPDATE USING (linkhub.owns_profile(id)) WITH CHECK (linkhub.owns_profile(id));

-- links: a regra vale em USING e WITH CHECK, o que impede mover um link para perfil alheio
DROP POLICY IF EXISTS "Links are viewable by everyone" ON linkhub.links;
CREATE POLICY "Links are viewable by everyone" ON linkhub.links
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own links" ON linkhub.links;
CREATE POLICY "Users can insert their own links" ON linkhub.links
  FOR INSERT WITH CHECK (linkhub.owns_profile(user_id));

DROP POLICY IF EXISTS "Users can update their own links" ON linkhub.links;
CREATE POLICY "Users can update their own links" ON linkhub.links
  FOR UPDATE USING (linkhub.owns_profile(user_id)) WITH CHECK (linkhub.owns_profile(user_id));

DROP POLICY IF EXISTS "Users can delete their own links" ON linkhub.links;
CREATE POLICY "Users can delete their own links" ON linkhub.links
  FOR DELETE USING (linkhub.owns_profile(user_id));

-- Estatísticas: o dono lê as de todos os seus perfis. Os inserts validados ficam como estão.
DROP POLICY IF EXISTS "Users can view their own profile views" ON linkhub.profile_views;
CREATE POLICY "Users can view their own profile views" ON linkhub.profile_views
  FOR SELECT USING (linkhub.owns_profile(profile_id));

DROP POLICY IF EXISTS "Users can view their own link clicks" ON linkhub.link_clicks;
CREATE POLICY "Users can view their own link clicks" ON linkhub.link_clicks
  FOR SELECT USING (linkhub.owns_profile(profile_id));

-- Storage. Gravar: só na pasta de um perfil seu. Ler e apagar: o que você enviou (owner_id),
-- o que mantém a limpeza funcionando depois que a RPC apagou o perfil.
-- Sem leitura pública da tabela: o anônimo não lista objetos nem vê o owner_id.
-- Se o ensaio falhar com "must be owner of table objects", este bloco vai para um arquivo à parte,
-- rodado como supabase_admin (Tarefa 17, passo 2).
DROP POLICY IF EXISTS "linkhub_avatars_public_read" ON storage.objects;

DROP POLICY IF EXISTS "linkhub_avatars_select_own" ON storage.objects;
CREATE POLICY "linkhub_avatars_select_own" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'linkhub-avatars' AND owner_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "linkhub_avatars_insert_own" ON storage.objects;
CREATE POLICY "linkhub_avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'linkhub-avatars' AND linkhub.owns_profile_folder(name)
  );

DROP POLICY IF EXISTS "linkhub_avatars_update_own" ON storage.objects;
CREATE POLICY "linkhub_avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'linkhub-avatars' AND linkhub.owns_profile_folder(name))
  WITH CHECK (bucket_id = 'linkhub-avatars' AND linkhub.owns_profile_folder(name));

DROP POLICY IF EXISTS "linkhub_avatars_delete_own" ON storage.objects;
CREATE POLICY "linkhub_avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'linkhub-avatars' AND owner_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "linkhub_link_icons_public_read" ON storage.objects;

DROP POLICY IF EXISTS "linkhub_link_icons_select_own" ON storage.objects;
CREATE POLICY "linkhub_link_icons_select_own" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'linkhub-link-icons' AND owner_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "linkhub_link_icons_insert_own" ON storage.objects;
CREATE POLICY "linkhub_link_icons_insert_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'linkhub-link-icons' AND linkhub.owns_profile_folder(name)
  );

DROP POLICY IF EXISTS "linkhub_link_icons_update_own" ON storage.objects;
CREATE POLICY "linkhub_link_icons_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'linkhub-link-icons' AND linkhub.owns_profile_folder(name))
  WITH CHECK (bucket_id = 'linkhub-link-icons' AND linkhub.owns_profile_folder(name));

DROP POLICY IF EXISTS "linkhub_link_icons_delete_own" ON storage.objects;
CREATE POLICY "linkhub_link_icons_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'linkhub-link-icons' AND owner_id = auth.uid()::text
  );

-- 7. PostgREST passa a enxergar a tabela e as funções sem reiniciar (o aviso só sai no COMMIT)
NOTIFY pgrst, 'reload schema';

COMMIT;
```

- [ ] **Passo 5: esquema final**

Substitua o conteúdo inteiro de `deploy/vpsavila/linkhub_schema.sql` por:

```sql
-- ============================================================================
-- LinkHub Express: schema consolidado para Supabase self-hosted (vpsavila)
-- Substitui as migrations de supabase/migrations (que não rodam em sequência).
-- Rodar UMA vez, como postgres:
--   docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < linkhub_schema.sql
--
-- Decisões:
-- * Schema dedicado "linkhub" (não usa public).
-- * SEM trigger em auth.users: auth.users é compartilhado com os outros apps da VPS.
--   O painel cria o primeiro perfil da conta no primeiro acesso.
-- * Até 10 perfis por conta. O dono de cada perfil fica em linkhub.profile_owners, que só o próprio
--   dono lê: quem está de fora não descobre que dois perfis são da mesma conta.
-- * Buckets "linkhub-avatars" e "linkhub-link-icons" e policies com prefixo linkhub_ pra não colidir com outros apps.
--   Os arquivos ficam na pasta do perfil (<profile_id>/...), e a tabela storage.objects não é lida por anônimos.
-- * Estado igual ao de aplicar as migrações de deploy/vpsavila/migrations/ até 2026-10-26-varios-perfis.sql.
-- ============================================================================

BEGIN;

-- 1. Schema + permissões ------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS linkhub;

GRANT USAGE ON SCHEMA linkhub TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA linkhub GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA linkhub GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA linkhub GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- 2. Tipos ------------------------------------------------------------------
CREATE TYPE linkhub.app_role AS ENUM ('admin', 'user');

-- 3. Tabelas ------------------------------------------------------------------
CREATE TABLE linkhub.profiles (
  -- Chave do perfil. O primeiro perfil de cada conta tem o id da conta; os outros, id gerado.
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  custom_domain TEXT,
  preferred_domain TEXT DEFAULT 'default',
  theme_options JSONB DEFAULT '{}',
  show_username BOOLEAN NOT NULL DEFAULT true,
  show_qr_code BOOLEAN NOT NULL DEFAULT true,
  user_type TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bio_max_length CHECK (length(bio) <= 500),
  CONSTRAINT full_name_max_length CHECK (length(full_name) <= 100),
  CONSTRAINT username_max_length CHECK (length(username) <= 30),
  CONSTRAINT profiles_user_type_check CHECK (user_type IN ('creator', 'business', 'personal') OR user_type IS NULL)
);

-- Dono de cada perfil. Só o próprio dono lê; a tabela profiles, pública, não tem coluna de dono.
CREATE TABLE linkhub.profile_owners (
  profile_id UUID PRIMARY KEY REFERENCES linkhub.profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profile_owners_owner_idx ON linkhub.profile_owners (owner_id);

CREATE TABLE linkhub.links (
  id BIGSERIAL PRIMARY KEY,
  -- Id do PERFIL (linkhub.profiles.id), não da conta: o nome é histórico.
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  clicks INTEGER NOT NULL DEFAULT 0,
  icon_type TEXT NOT NULL DEFAULT 'auto',
  icon_value TEXT,
  accent_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT links_user_id_profile_fkey FOREIGN KEY (user_id) REFERENCES linkhub.profiles(id) ON DELETE CASCADE,
  CONSTRAINT link_title_max_length CHECK (length(title) <= 200),
  CONSTRAINT link_url_max_length CHECK (length(url) <= 2000),
  CONSTRAINT links_icon_type_check CHECK (icon_type IN ('auto', 'lucide', 'brand', 'emoji', 'favicon', 'upload')),
  CONSTRAINT links_icon_value_length CHECK (icon_value IS NULL OR length(icon_value) <= 2048),
  CONSTRAINT links_accent_color_check CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9a-fA-F]{6}$')
);
CREATE INDEX links_user_id_idx ON linkhub.links (user_id, position);
COMMENT ON COLUMN linkhub.links.user_id IS
  'Id do perfil (linkhub.profiles.id), não da conta. O nome é histórico.';

CREATE TABLE linkhub.profile_views (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  country_code TEXT,
  city TEXT,
  session_id TEXT,
  device_type TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profile_views_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES linkhub.profiles(id) ON DELETE CASCADE
);
CREATE INDEX profile_views_profile_idx ON linkhub.profile_views (profile_id, viewed_at);

CREATE TABLE linkhub.link_clicks (
  id BIGSERIAL PRIMARY KEY,
  link_id BIGINT NOT NULL REFERENCES linkhub.links(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  country_code TEXT,
  city TEXT,
  session_id TEXT,
  device_type TEXT,
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT link_clicks_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES linkhub.profiles(id) ON DELETE CASCADE
);
CREATE INDEX link_clicks_profile_idx ON linkhub.link_clicks (profile_id, clicked_at);
CREATE INDEX link_clicks_link_idx ON linkhub.link_clicks (link_id);

CREATE TABLE linkhub.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role linkhub.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 4. Funções e triggers ------------------------------------------------------
CREATE OR REPLACE FUNCTION linkhub.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON linkhub.profiles
  FOR EACH ROW EXECUTE FUNCTION linkhub.update_updated_at_column();
CREATE TRIGGER update_links_updated_at BEFORE UPDATE ON linkhub.links
  FOR EACH ROW EXECUTE FUNCTION linkhub.update_updated_at_column();

CREATE OR REPLACE FUNCTION linkhub.increment_link_clicks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE linkhub.links SET clicks = clicks + 1 WHERE id = NEW.link_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_link_click_inserted AFTER INSERT ON linkhub.link_clicks
  FOR EACH ROW EXECUTE FUNCTION linkhub.increment_link_clicks();

CREATE OR REPLACE FUNCTION linkhub.has_role(_user_id UUID, _role linkhub.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM linkhub.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

Depois do `has_role`, ainda na seção 4, copie **da migração do passo 4, sem mudar nada**, o trecho que começa em `-- Usada pelas políticas: não depende de permissão de leitura em profile_owners.` e termina na linha `GRANT EXECUTE ON FUNCTION linkhub.owns_profile_folder(text) TO authenticated;`. São as funções `owns_profile`, `register_profile_owner`, `cleanup_owned_profile`, `protect_profile_id`, `create_profile`, `list_own_profiles`, `delete_own_profile` e `owns_profile_folder`, os três `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` e os dois `GRANT EXECUTE`. **Não** copie ainda os `REVOKE`/`GRANT` das três RPCs: eles vão depois da seção 6. Em seguida, o resto do arquivo:

```sql
-- 5. RLS ----------------------------------------------------------------------
ALTER TABLE linkhub.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkhub.profile_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkhub.links          ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkhub.profile_views  ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkhub.link_clicks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkhub.user_roles     ENABLE ROW LEVEL SECURITY;

-- profiles: só o PRIMEIRO perfil entra por insert direto, com o id da conta; os outros, pelo create_profile
CREATE POLICY "Public profiles are viewable by everyone" ON linkhub.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON linkhub.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    AND NOT EXISTS (SELECT 1 FROM linkhub.profile_owners WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can update their own profile" ON linkhub.profiles
  FOR UPDATE USING (linkhub.owns_profile(id)) WITH CHECK (linkhub.owns_profile(id));

-- profile_owners: só leitura dos próprios vínculos; quem escreve são o gatilho e as funções
CREATE POLICY "Owners can view their own profile links" ON linkhub.profile_owners
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- links
CREATE POLICY "Links are viewable by everyone" ON linkhub.links
  FOR SELECT USING (true);
CREATE POLICY "Users can insert their own links" ON linkhub.links
  FOR INSERT WITH CHECK (linkhub.owns_profile(user_id));
CREATE POLICY "Users can update their own links" ON linkhub.links
  FOR UPDATE USING (linkhub.owns_profile(user_id)) WITH CHECK (linkhub.owns_profile(user_id));
CREATE POLICY "Users can delete their own links" ON linkhub.links
  FOR DELETE USING (linkhub.owns_profile(user_id));

-- profile_views
CREATE POLICY "Validated profile view inserts only" ON linkhub.profile_views
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM linkhub.profiles WHERE profiles.id = profile_id)
  );
CREATE POLICY "Users can view their own profile views" ON linkhub.profile_views
  FOR SELECT USING (linkhub.owns_profile(profile_id));

-- link_clicks
CREATE POLICY "Validated link click inserts only" ON linkhub.link_clicks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM linkhub.links
      WHERE links.id = link_id
        AND links.user_id = profile_id
        AND links.is_visible = true
    )
  );
CREATE POLICY "Users can view their own link clicks" ON linkhub.link_clicks
  FOR SELECT USING (linkhub.owns_profile(profile_id));

-- user_roles (o papel é da conta, não do perfil)
CREATE POLICY "Users can view their own role" ON linkhub.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON linkhub.user_roles
  FOR SELECT TO authenticated USING (linkhub.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON linkhub.user_roles
  FOR INSERT TO authenticated WITH CHECK (linkhub.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON linkhub.user_roles
  FOR DELETE TO authenticated USING (linkhub.has_role(auth.uid(), 'admin'));

-- 6. Grants nos objetos já criados --------------------------------------------
GRANT ALL ON ALL TABLES    IN SCHEMA linkhub TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA linkhub TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA linkhub TO anon, authenticated, service_role;

-- 6b. O que a seção 6 não pode dar. Vem depois dela, senão os GRANT ALL devolveriam o acesso.
-- profile_owners: sem TRUNCATE nem escrita para ninguém do app; leitura (com RLS) só para authenticated
REVOKE ALL ON linkhub.profile_owners FROM PUBLIC, anon, authenticated;
GRANT SELECT ON linkhub.profile_owners TO authenticated;
-- As três RPCs ficam só com authenticated
REVOKE ALL ON FUNCTION linkhub.create_profile(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION linkhub.create_profile(text, text) TO authenticated;
REVOKE ALL ON FUNCTION linkhub.list_own_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION linkhub.list_own_profiles() TO authenticated;
REVOKE ALL ON FUNCTION linkhub.delete_own_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION linkhub.delete_own_profile(uuid) TO authenticated;

-- 7. Storage ------------------------------------------------------------------
-- Gravar: só na pasta de um perfil seu. Ler e apagar: o que você enviou (owner_id).
-- Sem política de leitura para anon: as URLs /object/public/ abrem sem RLS.

-- Bucket de avatares (público, 2 MB, só imagem)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('linkhub-avatars', 'linkhub-avatars', true, 2097152,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "linkhub_avatars_select_own" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'linkhub-avatars' AND owner_id = auth.uid()::text
  );
CREATE POLICY "linkhub_avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'linkhub-avatars' AND linkhub.owns_profile_folder(name)
  );
CREATE POLICY "linkhub_avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'linkhub-avatars' AND linkhub.owns_profile_folder(name))
  WITH CHECK (bucket_id = 'linkhub-avatars' AND linkhub.owns_profile_folder(name));
CREATE POLICY "linkhub_avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'linkhub-avatars' AND owner_id = auth.uid()::text
  );

-- Bucket de ícones dos links (público, 512 KB, PNG e WebP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('linkhub-link-icons', 'linkhub-link-icons', true, 524288,
        ARRAY['image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "linkhub_link_icons_select_own" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'linkhub-link-icons' AND owner_id = auth.uid()::text
  );
CREATE POLICY "linkhub_link_icons_insert_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'linkhub-link-icons' AND linkhub.owns_profile_folder(name)
  );
CREATE POLICY "linkhub_link_icons_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'linkhub-link-icons' AND linkhub.owns_profile_folder(name))
  WITH CHECK (bucket_id = 'linkhub-link-icons' AND linkhub.owns_profile_folder(name));
CREATE POLICY "linkhub_link_icons_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'linkhub-link-icons' AND owner_id = auth.uid()::text
  );

COMMIT;

-- ============================================================================
-- DEPOIS do primeiro login no app, promover a conta admin (ajuste o email):
--
-- INSERT INTO linkhub.user_roles (user_id, role)
-- SELECT id, 'admin'::linkhub.app_role FROM auth.users WHERE email = 'daniel.avila@prf.gov.br';
-- ============================================================================
```

- [ ] **Passo 6: rodar e ver passar**

```powershell
npx vitest run src/lib/variosPerfisMigration.test.ts
```

Esperado: 10 testes passando.

- [ ] **Passo 7: revisão do SQL**

Leia a migração e confira, item por item:
- **Idempotência:** todo comando aguenta rodar duas vezes (`IF NOT EXISTS`, `ON CONFLICT`, `DROP … IF EXISTS` antes de `CREATE POLICY`/`CREATE TRIGGER`, blocos `DO` com `conrelid`, `CREATE OR REPLACE`).
- **Concorrência:** `create_profile` e `delete_own_profile` pegam a mesma trava (`pg_advisory_xact_lock(hashtext('linkhub.profiles'), hashtext(<dono>))`) antes de contar. Duas abas não passam de 10 nem deixam a conta sem perfil. O `FOR UPDATE OF p` segura o perfil até o `DELETE`. O primeiro perfil por insert direto não precisa da trava, porque a política só aceita conta sem nenhum perfil.
- **Sem laço:** apagar o perfil → o vínculo sai em cascata → o gatilho tenta apagar o perfil, que já não existe. Apagar o vínculo (Admin) → o gatilho apaga o perfil → o vínculo já não existe.
- **Ordem:** as funções vêm antes das políticas que as usam. O `owns_profile_folder` vem antes das políticas do Storage.

O SQL roda de verdade na Tarefa 2 (passo 8, opcional, num PostgreSQL local) e no ensaio em produção (Tarefa 17). Durante o planejamento, este SQL foi conferido assim: ensaio verde, mutações da migração pegas pelos testes, migração idempotente e banco migrado igual à instalação nova pelo `linkhub_schema.sql` (`pg_dump -s` e `pg_policies` idênticos).

- [ ] **Passo 8: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
git add -- deploy/vpsavila/migrations/2026-10-26-varios-perfis.sql src/lib/variosPerfisMigration.test.ts
git commit -m "Migração dos vários perfis e esquema final" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- deploy/vpsavila/migrations/2026-10-26-varios-perfis.sql deploy/vpsavila/linkhub_schema.sql src/hooks/useUsernameValidation.ts src/lib/variosPerfisMigration.test.ts
```

Esperado: tsc sem saída; 41 arquivos e 642 testes passando.

---

### Tarefa 2: ensaio da migração (gerado localmente) e conferência

**Especificação:** "Testes", item "Banco, em produção, sem efeito".

O script só **gera** o arquivo. O envio ao servidor é da Tarefa 17, com aprovação.

**Arquivos:**
- Criar: `scripts/ensaio-migracao-perfis.ps1`
- Criar: `scripts/ensaio-perfis-testes.sql`
- Criar: `scripts/ensaio-perfis-testes-storage.sql`
- Criar: `scripts/conferencia-perfis.sql`
- Modificar: `src/lib/variosPerfisMigration.test.ts`
- Modificar: `deploy/vpsavila/DEPLOY.md`

- [ ] **Passo 1: testes dos arquivos do ensaio (falham)**

No fim de `src/lib/variosPerfisMigration.test.ts`, acrescente:

```ts
describe('arquivos do ensaio', () => {
  const TESTS = read('scripts', 'ensaio-perfis-testes.sql');
  const STORAGE_TESTS = read('scripts', 'ensaio-perfis-testes-storage.sql');
  const SCRIPT = read('scripts', 'ensaio-migracao-perfis.ps1');

  it('os testes não abrem nem fecham transação (o script monta BEGIN … ROLLBACK)', () => {
    for (const sql of [TESTS, STORAGE_TESTS]) {
      for (const line of ['BEGIN;', 'COMMIT;', 'ROLLBACK;']) expect(countLines(sql, line)).toBe(0);
    }
  });

  it('toda falha do ensaio é um RAISE EXCEPTION marcado', () => {
    for (const sql of [TESTS, STORAGE_TESTS]) {
      const raises = sql.match(/RAISE EXCEPTION '([^']*)/g) ?? [];
      expect(raises.length).toBeGreaterThan(10);
      for (const raise of raises) expect(raise).toContain('ENSAIO FALHOU');
    }
  });

  it('cobre os casos da especificação', () => {
    for (const marker of [
      'linkhub_profile_limit',
      'linkhub_immutable_id',
      'linkhub_last_profile',
      'linkhub_invalid_username',
      'linkhub_not_owner',
      'DELETE FROM auth.users',
      'DELETE FROM linkhub.profile_owners',
      'proowner',
    ]) {
      expect(TESTS).toContain(marker);
    }
    expect(STORAGE_TESTS).toContain('SET LOCAL role anon');
    expect(STORAGE_TESTS).toContain('linkhub-link-icons');
  });

  it('o script é só ASCII e grava sem BOM', () => {
    expect(/^[\x00-\x7F]*$/.test(SCRIPT)).toBe(true);
    expect(SCRIPT).toContain('New-Object System.Text.UTF8Encoding $false');
    expect(SCRIPT).not.toContain('Set-Content');
  });
});
```

Rode `npx vitest run src/lib/variosPerfisMigration.test.ts`. Esperado: o arquivo falha ao carregar (`ENOENT` em `scripts/ensaio-perfis-testes.sql`), porque os testes novos leem os arquivos que ainda não existem.

- [ ] **Passo 2: testes do banco**

`scripts/ensaio-perfis-testes.sql`:

```sql
-- Testes do ensaio da migração dos vários perfis: banco.
-- O scripts/ensaio-migracao-perfis.ps1 junta este arquivo depois do corpo da migração (rodado duas vezes),
-- dentro de uma transação que termina em ROLLBACK. Cada caso é um bloco DO que dá
-- RAISE EXCEPTION 'ENSAIO FALHOU …' quando o resultado não é o esperado. Com -v ON_ERROR_STOP=1,
-- o psql para no primeiro, e nada fica gravado.
--
-- Contas de teste, inseridas em auth.users como postgres (somem no ROLLBACK):
--   A e0000000-0000-4000-8000-00000000000a  chega a 10 perfis; excluída por auth.users no fim
--   B e0000000-0000-4000-8000-00000000000b  um perfil só
--   C e0000000-0000-4000-8000-00000000000c  dois perfis; excluída como no Admin
-- Cada caso troca de papel com SET LOCAL request.jwt.claims e SET LOCAL role, e volta com RESET role.
-- Este arquivo não tem linhas soltas de abrir, confirmar ou desfazer transação.

-- 0. Estado depois da migração (como postgres) -------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM linkhub.profiles p
    WHERE p.id IN (SELECT id FROM auth.users)
      AND NOT EXISTS (
        SELECT 1 FROM linkhub.profile_owners o WHERE o.profile_id = p.id AND o.owner_id = p.id
      )
  ) THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (0): perfil existente ficou sem dono no preenchimento';
  END IF;
  IF (SELECT column_default FROM information_schema.columns
      WHERE table_schema = 'linkhub' AND table_name = 'profiles' AND column_name = 'id')
     IS DISTINCT FROM 'gen_random_uuid()' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (0): profiles.id sem default gen_random_uuid()';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey' AND conrelid = 'linkhub.profiles'::regclass) THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (0): profiles_id_fkey ainda existe';
  END IF;
  IF (SELECT count(*) FROM pg_constraint
      WHERE conname IN ('links_user_id_profile_fkey', 'profile_views_profile_id_fkey', 'link_clicks_profile_id_fkey')) <> 3 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (0): faltam as FKs para profiles';
  END IF;
END $$;

-- 1. As funções novas têm dono postgres (é o que deixa o create_profile passar pela RLS)
DO $$
DECLARE
  v_total int;
  v_outros text;
BEGIN
  SELECT count(*),
         string_agg(p.proname || '=' || p.proowner::regrole::text, ', ')
           FILTER (WHERE p.proowner::regrole::text <> 'postgres')
    INTO v_total, v_outros
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'linkhub'
    AND p.proname IN ('owns_profile', 'owns_profile_folder', 'register_profile_owner', 'cleanup_owned_profile',
                      'protect_profile_id', 'create_profile', 'list_own_profiles', 'delete_own_profile');
  IF v_total <> 8 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (1): esperava 8 funções novas, achei %', v_total;
  END IF;
  IF v_outros IS NOT NULL THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (1): funções com dono diferente de postgres: %', v_outros;
  END IF;
END $$;

-- Contas de teste
INSERT INTO auth.users (id, email) VALUES
  ('e0000000-0000-4000-8000-00000000000a', 'ensaio-a@linkhub.invalid'),
  ('e0000000-0000-4000-8000-00000000000b', 'ensaio-b@linkhub.invalid'),
  ('e0000000-0000-4000-8000-00000000000c', 'ensaio-c@linkhub.invalid');

-- 2. Primeiro perfil por insert direto, com o id da conta; o gatilho registra o dono
SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-4000-8000-00000000000a","role":"authenticated"}';
SET LOCAL role authenticated;
DO $$
BEGIN
  INSERT INTO linkhub.profiles (id, full_name) VALUES ('e0000000-0000-4000-8000-00000000000a', 'Ensaio A');
  IF NOT EXISTS (
    SELECT 1 FROM linkhub.profile_owners
    WHERE profile_id = 'e0000000-0000-4000-8000-00000000000a' AND owner_id = 'e0000000-0000-4000-8000-00000000000a'
  ) THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (2): o gatilho não registrou o dono do primeiro perfil de A';
  END IF;
END $$;
RESET role;

SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-4000-8000-00000000000b","role":"authenticated"}';
SET LOCAL role authenticated;
DO $$
BEGIN
  INSERT INTO linkhub.profiles (id, full_name) VALUES ('e0000000-0000-4000-8000-00000000000b', 'Ensaio B');
END $$;
RESET role;

SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-4000-8000-00000000000c","role":"authenticated"}';
SET LOCAL role authenticated;
DO $$
DECLARE
  v_link bigint;
BEGIN
  INSERT INTO linkhub.profiles (id, full_name) VALUES ('e0000000-0000-4000-8000-00000000000c', 'Ensaio C');
  PERFORM linkhub.create_profile('ensaio_c2', 'Ensaio C 2');
  INSERT INTO linkhub.links (user_id, title, url)
  VALUES ('e0000000-0000-4000-8000-00000000000c', 'ensaio-link-c', 'https://exemplo.invalid/c')
  RETURNING id INTO v_link;
  INSERT INTO linkhub.profile_views (profile_id, session_id)
  VALUES ('e0000000-0000-4000-8000-00000000000c', 'ensaio-c');
  INSERT INTO linkhub.link_clicks (link_id, profile_id, session_id)
  VALUES (v_link, 'e0000000-0000-4000-8000-00000000000c', 'ensaio-c');
END $$;
RESET role;

-- 3. A chega a 10 perfis; o 11º é recusado. O nome é aparado.
SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-4000-8000-00000000000a","role":"authenticated"}';
SET LOCAL role authenticated;
DO $$
DECLARE
  v_state text;
  v_hint text;
  v_total int;
BEGIN
  FOR i IN 2..10 LOOP
    PERFORM linkhub.create_profile('ensaio_a' || i, '  Ensaio A ' || i || '  ');
  END LOOP;
  SELECT count(*) INTO v_total FROM linkhub.list_own_profiles();
  IF v_total <> 10 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (3): list_own_profiles devolveu % perfis para A (esperado 10)', v_total;
  END IF;
  IF (SELECT full_name FROM linkhub.profiles WHERE username = 'ensaio_a2') IS DISTINCT FROM 'Ensaio A 2' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (3): o create_profile não aparou o nome';
  END IF;

  BEGIN
    PERFORM linkhub.create_profile('ensaio_a11', 'Ensaio A 11');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_hint = PG_EXCEPTION_HINT;
  END;
  IF v_hint IS DISTINCT FROM 'linkhub_profile_limit' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (3): 11º perfil: esperado linkhub_profile_limit, veio % / %',
      coalesce(v_state, 'sem erro'), coalesce(v_hint, '-');
  END IF;
END $$;
RESET role;

-- 4 a 6. Como A: link em perfil alheio, mover link para perfil alheio, trocar o id do perfil
SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-4000-8000-00000000000a","role":"authenticated"}';
SET LOCAL role authenticated;
DO $$
DECLARE
  v_state text;
  v_hint text;
  v_link bigint;
BEGIN
  -- 4. inserir link no perfil de outra conta
  BEGIN
    INSERT INTO linkhub.links (user_id, title, url)
    VALUES ('e0000000-0000-4000-8000-00000000000b', 'ensaio-intruso', 'https://exemplo.invalid');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (4): A inseriu link no perfil de B (estado %)', coalesce(v_state, 'sem erro');
  END IF;

  -- 5. mover um link próprio para o perfil de outra conta
  INSERT INTO linkhub.links (user_id, title, url)
  SELECT id, 'ensaio-link-a2', 'https://exemplo.invalid/a2' FROM linkhub.profiles WHERE username = 'ensaio_a2'
  RETURNING id INTO v_link;
  v_state := NULL;
  BEGIN
    UPDATE linkhub.links SET user_id = 'e0000000-0000-4000-8000-00000000000b' WHERE id = v_link;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (5): A moveu link para o perfil de B (estado %)', coalesce(v_state, 'sem erro');
  END IF;

  -- 6. trocar o id de um perfil
  BEGIN
    UPDATE linkhub.profiles SET id = gen_random_uuid() WHERE username = 'ensaio_a2';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  IF v_hint IS DISTINCT FROM 'linkhub_immutable_id' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (6): trocar o id: esperado linkhub_immutable_id, veio %', coalesce(v_hint, 'sem erro');
  END IF;
END $$;
RESET role;

-- 7 a 10. Como B: último perfil, @ reservado, donos alheios, perfil alheio
SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-4000-8000-00000000000b","role":"authenticated"}';
SET LOCAL role authenticated;
DO $$
DECLARE
  v_hint text;
  v_total int;
BEGIN
  -- 7. excluir o único perfil
  BEGIN
    PERFORM linkhub.delete_own_profile('e0000000-0000-4000-8000-00000000000b');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  IF v_hint IS DISTINCT FROM 'linkhub_last_profile' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (7): excluir o último perfil: esperado linkhub_last_profile, veio %', coalesce(v_hint, 'sem erro');
  END IF;

  -- 8. @ reservado e @ fora do formato
  v_hint := NULL;
  BEGIN
    PERFORM linkhub.create_profile('admin', 'Ensaio reservado');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  IF v_hint IS DISTINCT FROM 'linkhub_invalid_username' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (8): @admin: esperado linkhub_invalid_username, veio %', coalesce(v_hint, 'sem erro');
  END IF;
  v_hint := NULL;
  BEGIN
    PERFORM linkhub.create_profile('Ab', 'Ensaio formato');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  IF v_hint IS DISTINCT FROM 'linkhub_invalid_username' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (8): @Ab: esperado linkhub_invalid_username, veio %', coalesce(v_hint, 'sem erro');
  END IF;

  -- 9. ler profile_owners de outra conta devolve vazio
  SELECT count(*) INTO v_total FROM linkhub.profile_owners WHERE owner_id = 'e0000000-0000-4000-8000-00000000000a';
  IF v_total <> 0 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (9): B viu % vínculos de A', v_total;
  END IF;
  SELECT count(*) INTO v_total FROM linkhub.profile_owners;
  IF v_total <> 1 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (9): B deveria ver só o próprio vínculo, viu %', v_total;
  END IF;
  SELECT count(*) INTO v_total FROM linkhub.list_own_profiles();
  IF v_total <> 1 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (9): list_own_profiles devolveu % perfis para B', v_total;
  END IF;

  -- 10. perfil de outra conta: nem a RPC exclui, nem o update altera
  v_hint := NULL;
  BEGIN
    PERFORM linkhub.delete_own_profile('e0000000-0000-4000-8000-00000000000a');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  END;
  IF v_hint IS DISTINCT FROM 'linkhub_not_owner' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (10): B excluir perfil de A: esperado linkhub_not_owner, veio %', coalesce(v_hint, 'sem erro');
  END IF;
  UPDATE linkhub.profiles SET full_name = 'Invadido' WHERE id = 'e0000000-0000-4000-8000-00000000000a';
  IF FOUND THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (10): B alterou o perfil de A';
  END IF;
END $$;
RESET role;

-- 11 e 12. Como anon: RPCs e tabela de donos recusadas; leitura pública igual
SET LOCAL request.jwt.claims = '{"role":"anon"}';
SET LOCAL role anon;
DO $$
DECLARE
  v_state text;
  v_total int;
BEGIN
  BEGIN
    PERFORM linkhub.create_profile('ensaio_anon', 'Anon');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (11): anon chamou create_profile (estado %)', coalesce(v_state, 'sem erro');
  END IF;

  v_state := NULL;
  BEGIN
    PERFORM 1 FROM linkhub.list_own_profiles();
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (11): anon chamou list_own_profiles (estado %)', coalesce(v_state, 'sem erro');
  END IF;

  v_state := NULL;
  BEGIN
    PERFORM linkhub.delete_own_profile('e0000000-0000-4000-8000-00000000000a');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (11): anon chamou delete_own_profile (estado %)', coalesce(v_state, 'sem erro');
  END IF;

  -- 12. anon lendo profile_owners recebe permissão negada
  v_state := NULL;
  BEGIN
    PERFORM 1 FROM linkhub.profile_owners;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (12): anon leu profile_owners (estado %)', coalesce(v_state, 'sem erro');
  END IF;

  -- A página pública continua lendo perfis e links
  SELECT count(*) INTO v_total FROM linkhub.profiles WHERE username = 'ensaio_a2';
  IF v_total <> 1 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (12): anon deixou de ler os perfis públicos';
  END IF;
  SELECT count(*) INTO v_total FROM linkhub.links WHERE title = 'ensaio-link-a2';
  IF v_total <> 1 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (12): anon deixou de ler os links públicos';
  END IF;
END $$;
RESET role;

-- 13 e 14. Como A: exclusão pela RPC e recriação do perfil de id da conta
SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-4000-8000-00000000000a","role":"authenticated"}';
SET LOCAL role authenticated;
DO $$
DECLARE
  v_a3 uuid;
  v_a4 uuid;
  v_link bigint;
  v_result jsonb;
  v_state text;
BEGIN
  -- Dados de ensaio_a3 (apagado pela RPC) e de ensaio_a4 (apagado com a conta, no caso 16)
  SELECT id INTO v_a3 FROM linkhub.profiles WHERE username = 'ensaio_a3';
  SELECT id INTO v_a4 FROM linkhub.profiles WHERE username = 'ensaio_a4';
  UPDATE linkhub.profiles
  SET avatar_url = 'https://exemplo.invalid/linkhub-avatars/' || v_a3::text || '/1.jpg'
  WHERE id = v_a3;
  INSERT INTO linkhub.links (user_id, title, url, icon_type, icon_value)
  VALUES (v_a3, 'ensaio-link-a3', 'https://exemplo.invalid/a3', 'upload',
          'https://exemplo.invalid/linkhub-link-icons/' || v_a3::text || '/1-1.png')
  RETURNING id INTO v_link;
  INSERT INTO linkhub.profile_views (profile_id, session_id) VALUES (v_a3, 'ensaio-a3');
  INSERT INTO linkhub.link_clicks (link_id, profile_id, session_id) VALUES (v_link, v_a3, 'ensaio-a3');
  INSERT INTO linkhub.links (user_id, title, url)
  VALUES (v_a4, 'ensaio-link-a4', 'https://exemplo.invalid/a4')
  RETURNING id INTO v_link;
  INSERT INTO linkhub.profile_views (profile_id, session_id) VALUES (v_a4, 'ensaio-a4');
  INSERT INTO linkhub.link_clicks (link_id, profile_id, session_id) VALUES (v_link, v_a4, 'ensaio-a4');

  -- 13. a RPC devolve os arquivos para o cliente apagar
  v_result := linkhub.delete_own_profile(v_a3);
  IF v_result->>'avatar_url' IS DISTINCT FROM 'https://exemplo.invalid/linkhub-avatars/' || v_a3::text || '/1.jpg' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (13): delete_own_profile não devolveu o avatar: %', v_result;
  END IF;
  IF NOT (v_result->'icon_urls') ? ('https://exemplo.invalid/linkhub-link-icons/' || v_a3::text || '/1-1.png') THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (13): delete_own_profile não devolveu o ícone enviado: %', v_result;
  END IF;

  -- 14. excluir o perfil de id da conta e tentar recriá-lo por insert direto
  PERFORM linkhub.delete_own_profile('e0000000-0000-4000-8000-00000000000a');
  BEGIN
    INSERT INTO linkhub.profiles (id, full_name) VALUES ('e0000000-0000-4000-8000-00000000000a', 'De novo');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (14): A recriou o perfil de id da conta (estado %)', coalesce(v_state, 'sem erro');
  END IF;
END $$;
RESET role;

-- 13 (conferência como postgres, que vê tudo): nada sobrou de ensaio_a3
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM linkhub.profiles WHERE username = 'ensaio_a3')
     OR EXISTS (SELECT 1 FROM linkhub.links WHERE title = 'ensaio-link-a3')
     OR EXISTS (SELECT 1 FROM linkhub.profile_views WHERE session_id = 'ensaio-a3')
     OR EXISTS (SELECT 1 FROM linkhub.link_clicks WHERE session_id = 'ensaio-a3') THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (13): a exclusão pela RPC deixou perfil, links ou estatísticas';
  END IF;
  IF (SELECT count(*) FROM linkhub.profile_owners WHERE owner_id = 'e0000000-0000-4000-8000-00000000000a') <> 8 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (14): A deveria ter 8 perfis depois das duas exclusões';
  END IF;
END $$;

-- 15. Como no Admin: apagar o vínculo da conta C apaga os perfis, links e estatísticas
DO $$
BEGIN
  DELETE FROM linkhub.profile_owners WHERE owner_id = 'e0000000-0000-4000-8000-00000000000c';
  IF EXISTS (SELECT 1 FROM linkhub.profiles WHERE id = 'e0000000-0000-4000-8000-00000000000c' OR username = 'ensaio_c2')
     OR EXISTS (SELECT 1 FROM linkhub.links WHERE title = 'ensaio-link-c')
     OR EXISTS (SELECT 1 FROM linkhub.profile_views WHERE session_id = 'ensaio-c')
     OR EXISTS (SELECT 1 FROM linkhub.link_clicks WHERE session_id = 'ensaio-c') THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (15): apagar profile_owners deixou dados da conta C';
  END IF;
END $$;

-- 16. Excluir a conta em auth.users apaga os perfis restantes de A em cascata
DO $$
BEGIN
  DELETE FROM auth.users WHERE id = 'e0000000-0000-4000-8000-00000000000a';
  IF EXISTS (SELECT 1 FROM linkhub.profile_owners WHERE owner_id = 'e0000000-0000-4000-8000-00000000000a')
     OR EXISTS (SELECT 1 FROM linkhub.profiles WHERE username LIKE 'ensaio\_a%')
     OR EXISTS (SELECT 1 FROM linkhub.links WHERE title LIKE 'ensaio-link-a%')
     OR EXISTS (SELECT 1 FROM linkhub.profile_views WHERE session_id = 'ensaio-a4')
     OR EXISTS (SELECT 1 FROM linkhub.link_clicks WHERE session_id = 'ensaio-a4') THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (16): excluir a conta em auth.users deixou dados de A';
  END IF;
  -- B não foi afetada
  IF (SELECT count(*) FROM linkhub.profile_owners WHERE owner_id = 'e0000000-0000-4000-8000-00000000000b') <> 1 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (16): a conta B perdeu o perfil';
  END IF;
END $$;
```

- [ ] **Passo 3: testes do Storage**

`scripts/ensaio-perfis-testes-storage.sql`:

```sql
-- Testes do ensaio da migração dos vários perfis: políticas do Storage.
-- Mesmo esquema do ensaio-perfis-testes.sql (BEGIN … ROLLBACK montado pelo script, ON_ERROR_STOP).
-- Fica num arquivo à parte para rodar sozinho se as políticas do Storage forem para um arquivo
-- aplicado como supabase_admin (Tarefa 17, passo 2).
-- Os objetos são inseridos direto em storage.objects: só a linha da tabela, sem arquivo em disco.
--
-- Contas de teste (somem no ROLLBACK):
--   D e0000000-0000-4000-8000-00000000000d  dois perfis (o segundo, ensaio_d2, tem id gerado)
--   E e0000000-0000-4000-8000-00000000000e  um perfil

INSERT INTO auth.users (id, email) VALUES
  ('e0000000-0000-4000-8000-00000000000d', 'ensaio-d@linkhub.invalid'),
  ('e0000000-0000-4000-8000-00000000000e', 'ensaio-e@linkhub.invalid');

-- S1. D envia arquivos para a pasta do segundo perfil e enxerga o que enviou
SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-4000-8000-00000000000d","role":"authenticated"}';
SET LOCAL role authenticated;
DO $$
DECLARE
  v_d2 uuid;
  v_total int;
BEGIN
  INSERT INTO linkhub.profiles (id, full_name) VALUES ('e0000000-0000-4000-8000-00000000000d', 'Ensaio D');
  v_d2 := linkhub.create_profile('ensaio_d2', 'Ensaio D 2');
  INSERT INTO storage.objects (bucket_id, name, owner_id) VALUES
    ('linkhub-avatars', v_d2::text || '/1.jpg', 'e0000000-0000-4000-8000-00000000000d'),
    ('linkhub-link-icons', v_d2::text || '/1-1.png', 'e0000000-0000-4000-8000-00000000000d');
  SELECT count(*) INTO v_total FROM storage.objects
  WHERE bucket_id IN ('linkhub-avatars', 'linkhub-link-icons') AND name LIKE v_d2::text || '/%';
  IF v_total <> 2 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (S1): D não enxerga os arquivos que enviou (viu %)', v_total;
  END IF;
END $$;
RESET role;

-- S2 e S3. E não grava na pasta de perfis alheios nem fora de pasta de perfil, e não vê os arquivos de D
SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-4000-8000-00000000000e","role":"authenticated"}';
SET LOCAL role authenticated;
DO $$
DECLARE
  v_d2 uuid;
  v_state text;
BEGIN
  INSERT INTO linkhub.profiles (id, full_name) VALUES ('e0000000-0000-4000-8000-00000000000e', 'Ensaio E');
  SELECT id INTO v_d2 FROM linkhub.profiles WHERE username = 'ensaio_d2';

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id)
    VALUES ('linkhub-avatars', v_d2::text || '/intruso.jpg', 'e0000000-0000-4000-8000-00000000000e');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (S2): E gravou avatar na pasta de ensaio_d2 (estado %)', coalesce(v_state, 'sem erro');
  END IF;

  v_state := NULL;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id)
    VALUES ('linkhub-link-icons', 'e0000000-0000-4000-8000-00000000000d/1-1.png', 'e0000000-0000-4000-8000-00000000000e');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (S2): E gravou ícone na pasta do perfil de D (estado %)', coalesce(v_state, 'sem erro');
  END IF;

  v_state := NULL;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id)
    VALUES ('linkhub-avatars', 'pasta-qualquer/1.jpg', 'e0000000-0000-4000-8000-00000000000e');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (S2): E gravou fora de pasta de perfil (estado %)', coalesce(v_state, 'sem erro');
  END IF;

  v_state := NULL;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id)
    VALUES ('linkhub-avatars', 'e0000000-0000-4000-8000-00000000000e', 'e0000000-0000-4000-8000-00000000000e');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS DISTINCT FROM '42501' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (S2): E gravou arquivo solto na raiz do bucket (estado %)', coalesce(v_state, 'sem erro');
  END IF;

  -- S3. E não vê os arquivos de D
  IF EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id IN ('linkhub-avatars', 'linkhub-link-icons') AND name LIKE v_d2::text || '/%'
  ) THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (S3): E enxergou os arquivos de D';
  END IF;
END $$;
RESET role;

-- S4. Depois de a RPC apagar o perfil, quem enviou ainda enxerga os arquivos (o remove() do app depende disso)
SET LOCAL request.jwt.claims = '{"sub":"e0000000-0000-4000-8000-00000000000d","role":"authenticated"}';
SET LOCAL role authenticated;
DO $$
DECLARE
  v_d2 uuid;
  v_total int;
BEGIN
  SELECT id INTO v_d2 FROM linkhub.profiles WHERE username = 'ensaio_d2';
  PERFORM linkhub.delete_own_profile(v_d2);
  SELECT count(*) INTO v_total FROM storage.objects
  WHERE bucket_id IN ('linkhub-avatars', 'linkhub-link-icons') AND name LIKE v_d2::text || '/%';
  IF v_total <> 2 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (S4): depois de excluir o perfil, D vê % dos 2 arquivos', v_total;
  END IF;
END $$;
RESET role;

-- S5. anon não lista objetos dos buckets do LinkHub (0 linhas ou permissão negada)
SET LOCAL request.jwt.claims = '{"role":"anon"}';
SET LOCAL role anon;
DO $$
DECLARE
  v_total int;
  v_state text;
BEGIN
  BEGIN
    SELECT count(*) INTO v_total FROM storage.objects
    WHERE bucket_id IN ('linkhub-avatars', 'linkhub-link-icons');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
  END;
  IF v_state IS NULL AND v_total <> 0 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (S5): anon listou % objetos dos buckets do LinkHub', v_total;
  END IF;
  IF v_state IS NOT NULL AND v_state <> '42501' THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (S5): erro inesperado ao anon ler storage.objects: %', v_state;
  END IF;
END $$;
RESET role;

-- S6. As políticas ficaram como esperado (como postgres)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN ('linkhub_avatars_public_read', 'linkhub_link_icons_public_read')
  ) THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (S6): a leitura pública de um bucket do LinkHub continua lá';
  END IF;
  IF (SELECT count(*) FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND policyname IN ('linkhub_avatars_select_own', 'linkhub_avatars_insert_own', 'linkhub_avatars_update_own',
                           'linkhub_avatars_delete_own', 'linkhub_link_icons_select_own', 'linkhub_link_icons_insert_own',
                           'linkhub_link_icons_update_own', 'linkhub_link_icons_delete_own')) <> 8 THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (S6): faltam políticas do Storage';
  END IF;
END $$;
```

- [ ] **Passo 4: o script que gera o ensaio**

`scripts/ensaio-migracao-perfis.ps1` (só ASCII):

```powershell
# Gera o arquivo do ensaio da migracao dos varios perfis. NAO envia nada ao servidor.
#
# O arquivo gerado tem: BEGIN; <corpo da migracao>; <corpo de novo>; <testes>; ROLLBACK;
# - o corpo e a migracao sem as linhas BEGIN; e COMMIT; (o script falha se nao achar exatamente uma de cada);
# - o corpo duas vezes prova que a migracao e idempotente;
# - os testes dao RAISE EXCEPTION quando algo nao sai como esperado, e o psql (-v ON_ERROR_STOP=1) para ali.
# Como tudo termina em ROLLBACK, nada fica gravado. O envio ao servidor esta no DEPLOY.md.
#
# Uso (na raiz do repositorio):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ensaio-migracao-perfis.ps1
# Parametros opcionais: -Migracao <arquivo.sql> -Testes <a.sql>,<b.sql> -Saida <arquivo gerado>
param(
  [string]$Migracao = 'deploy\vpsavila\migrations\2026-10-26-varios-perfis.sql',
  [string[]]$Testes = @('scripts\ensaio-perfis-testes.sql', 'scripts\ensaio-perfis-testes-storage.sql'),
  [string]$Saida = (Join-Path $env:TEMP 'linkhub-ensaio-varios-perfis.sql')
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
# UTF-8 sem BOM: com BOM, o psql acusa erro de sintaxe na primeira linha
$utf8 = New-Object System.Text.UTF8Encoding $false

function Resolve-NoRepositorio([string]$caminho) {
  if ([System.IO.Path]::IsPathRooted($caminho)) { return $caminho }
  return (Join-Path $raiz $caminho)
}

$linhas = [System.IO.File]::ReadAllLines((Resolve-NoRepositorio $Migracao), $utf8)
$qtdBegin = @($linhas | Where-Object { $_.Trim() -eq 'BEGIN;' }).Count
$qtdCommit = @($linhas | Where-Object { $_.Trim() -eq 'COMMIT;' }).Count
if ($qtdBegin -ne 1) { throw "A migracao precisa ter exatamente uma linha 'BEGIN;' (achei $qtdBegin)." }
if ($qtdCommit -ne 1) { throw "A migracao precisa ter exatamente uma linha 'COMMIT;' (achei $qtdCommit)." }
$corpo = ($linhas | Where-Object { $_.Trim() -ne 'BEGIN;' -and $_.Trim() -ne 'COMMIT;' }) -join "`n"

$partes = New-Object System.Collections.Generic.List[string]
$partes.Add('-- Gerado por scripts/ensaio-migracao-perfis.ps1. Termina em ROLLBACK: nada fica gravado.')
$partes.Add('BEGIN;')
$partes.Add('-- ===== Corpo da migracao, 1a vez =====')
$partes.Add($corpo)
$partes.Add('-- ===== Corpo da migracao, 2a vez (idempotencia) =====')
$partes.Add($corpo)
foreach ($arquivo in $Testes) {
  $texto = [System.IO.File]::ReadAllText((Resolve-NoRepositorio $arquivo), $utf8)
  if ($texto -match '(?m)^\s*(BEGIN|COMMIT|ROLLBACK);\s*$') {
    throw "O arquivo de testes $arquivo nao pode ter linhas BEGIN;, COMMIT; ou ROLLBACK;."
  }
  $partes.Add("-- ===== Testes: $arquivo =====")
  $partes.Add($texto)
}
$partes.Add('ROLLBACK;')

[System.IO.File]::WriteAllText($Saida, (($partes -join "`n") + "`n"), $utf8)
Write-Host "Ensaio gerado em $Saida"
```

- [ ] **Passo 5: conferência só de leitura**

`scripts/conferencia-perfis.sql`, usado antes e depois de aplicar a migração e depois dos testes em produção:

```sql
-- Conferência só de leitura do LinkHub (vários perfis). Roda antes e depois da migração:
-- as consultas das tabelas novas só rodam quando elas existem (\if do psql).
\pset pager off

\echo '== Perfil dna (id, avatar e tipo nao podem mudar) =='
SELECT id, username, avatar_url, user_type, created_at FROM linkhub.profiles WHERE username = 'dna';

\echo '== Totais =='
SELECT
  (SELECT count(*) FROM linkhub.profiles) AS perfis,
  (SELECT count(*) FROM linkhub.links l JOIN linkhub.profiles p ON p.id = l.user_id WHERE p.username = 'dna') AS links_dna,
  (SELECT count(*) FROM linkhub.profile_views v JOIN linkhub.profiles p ON p.id = v.profile_id WHERE p.username = 'dna') AS visitas_dna,
  (SELECT count(*) FROM linkhub.link_clicks c JOIN linkhub.profiles p ON p.id = c.profile_id WHERE p.username = 'dna') AS cliques_dna;

\echo '== Politicas do LinkHub no Storage =='
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'linkhub%'
ORDER BY policyname;

\echo '== Arquivos por pasta nos buckets do LinkHub =='
SELECT bucket_id, split_part(name, '/', 1) AS pasta, count(*) AS arquivos
FROM storage.objects
WHERE bucket_id IN ('linkhub-avatars', 'linkhub-link-icons')
GROUP BY 1, 2
ORDER BY 1, 2;

SELECT to_regclass('linkhub.profile_owners') IS NOT NULL AS tem_donos \gset
\if :tem_donos
\echo '== Donos =='
SELECT o.owner_id = p.id AS dono_igual_ao_id FROM linkhub.profile_owners o
JOIN linkhub.profiles p ON p.id = o.profile_id WHERE p.username = 'dna';
SELECT count(*) AS vinculos, count(DISTINCT owner_id) AS contas FROM linkhub.profile_owners;

\echo '== Perfis da conta do dna =='
SELECT p.id, p.username, p.full_name, p.created_at
FROM linkhub.profiles p
JOIN linkhub.profile_owners o ON o.profile_id = p.id
WHERE o.owner_id = (
  SELECT o2.owner_id FROM linkhub.profile_owners o2
  JOIN linkhub.profiles p2 ON p2.id = o2.profile_id WHERE p2.username = 'dna'
)
ORDER BY p.created_at, p.id;

\echo '== Funcoes novas e dono =='
SELECT proname, proowner::regrole AS dono FROM pg_proc
WHERE pronamespace = 'linkhub'::regnamespace
  AND proname IN ('owns_profile', 'owns_profile_folder', 'register_profile_owner', 'cleanup_owned_profile',
                  'protect_profile_id', 'create_profile', 'list_own_profiles', 'delete_own_profile')
ORDER BY proname;
\endif
```

- [ ] **Passo 6: `DEPLOY.md`**

Em `deploy/vpsavila/DEPLOY.md`, na lista "O que já foi adaptado no código", troque as duas linhas:

```
- Nenhum trigger em `auth.users` (que é compartilhado com os outros apps). O Dashboard cria o perfil no primeiro acesso.
- Admin lista só quem tem perfil no LinkHub, e "excluir" apaga só os dados do LinkHub, mantendo a conta de login.
```

por:

```
- Nenhum trigger em `auth.users` (que é compartilhado com os outros apps). O painel cria o primeiro perfil da conta no primeiro acesso.
- Uma conta tem até 10 perfis. O dono de cada perfil fica em `linkhub.profile_owners`, que só o próprio dono lê.
- Admin lista as contas que têm perfil no LinkHub, com os perfis de cada uma. "Excluir" apaga todos os perfis da conta (links e estatísticas juntos) e mantém a conta de login. Os arquivos do Storage ficam.
```

Depois do parágrafo "Escreva as migrações de forma idempotente…", acrescente:

````markdown
### Ensaio de uma migração (vários perfis)

A `2026-10-26-varios-perfis.sql` mexe em chaves e políticas. Antes de aplicá-la, rode o ensaio: o script junta o corpo da migração duas vezes e os testes num arquivo que termina em `ROLLBACK`, então nada fica gravado. Os testes ficam em `scripts/ensaio-perfis-testes.sql` (banco) e `scripts/ensaio-perfis-testes-storage.sql` (Storage).

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ensaio-migracao-perfis.ps1
scp "$env:TEMP\linkhub-ensaio-varios-perfis.sql" avila@192.168.1.24:/tmp/
ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/linkhub-ensaio-varios-perfis.sql; s=$?; rm -f /tmp/linkhub-ensaio-varios-perfis.sql; exit $s'
```

Esperado: as linhas dos comandos (`BEGIN`, `LOCK TABLE`, `CREATE TABLE`, vários `DO`, `CREATE POLICY`…), nenhum `ERROR` e `ROLLBACK` no fim. Um `ERROR: ENSAIO FALHOU (n): …` diz qual caso falhou; nada foi gravado. O `s=$?` devolve o código do `psql`, mesmo com o `rm` depois.

Para conferir o banco antes e depois de aplicar (só leitura):

```powershell
scp scripts/conferencia-perfis.sql avila@192.168.1.24:/tmp/
ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/conferencia-perfis.sql; s=$?; rm -f /tmp/conferencia-perfis.sql; exit $s'
```
````

No exemplo de "Esperado" da seção "Migrações do banco", acrescente no fim do parágrafo: "A dos vários perfis (`2026-10-26-varios-perfis.sql`) imprime `BEGIN`, `SET`, `LOCK TABLE`, `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE`, pares `DROP POLICY`/`CREATE POLICY`, `REVOKE`/`GRANT`, `INSERT 0 n`, três `DELETE 0`, três `DO`, `COMMENT`, `CREATE FUNCTION`, pares `DROP TRIGGER`/`CREATE TRIGGER`, `NOTIFY` e `COMMIT`. Na primeira vez, também aparecem avisos `NOTICE: … does not exist, skipping` dos `DROP … IF EXISTS` de políticas e gatilhos novos; são esperados."

- [ ] **Passo 7: gerar o ensaio localmente e conferir**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ensaio-migracao-perfis.ps1
$f = Join-Path $env:TEMP 'linkhub-ensaio-varios-perfis.sql'
(Select-String -Path $f -Pattern '^BEGIN;$').Count
(Select-String -Path $f -Pattern '^COMMIT;$').Count
(Select-String -Path $f -Pattern '^ROLLBACK;$').Count
(Select-String -Path $f -Pattern 'CREATE TABLE IF NOT EXISTS linkhub.profile_owners' -SimpleMatch).Count
(Select-String -Path $f -Pattern 'ENSAIO FALHOU (S6)' -SimpleMatch).Count -gt 0
[System.IO.File]::ReadAllBytes($f)[0..2] -join ','
```

Esperado: `Ensaio gerado em …\linkhub-ensaio-varios-perfis.sql`, depois `1`, `0`, `1`, `2`, `True` e um começo diferente de `239,187,191` (sem BOM; o arquivo começa com `--`, ou seja `45,45,32`).

Prova de que o script recusa uma migração mal formada:

```powershell
$ruim = Join-Path $env:TEMP 'migracao-dois-begin.sql'
[System.IO.File]::WriteAllText($ruim, "BEGIN;`nBEGIN;`nCOMMIT;`n", (New-Object System.Text.UTF8Encoding $false))
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ensaio-migracao-perfis.ps1 -Migracao $ruim -Saida (Join-Path $env:TEMP 'ensaio-ruim.sql')
$LASTEXITCODE
Remove-Item $ruim
```

Esperado: a mensagem `A migracao precisa ter exatamente uma linha 'BEGIN;' (achei 2).` e `1`.

- [ ] **Passo 8 (opcional, recomendado se o SQL mudar): ensaio num PostgreSQL local**

A máquina tem o PostgreSQL 18 do scoop (`%USERPROFILE%\scoop\apps\postgresql\current\bin`). Um cluster descartável em `$env:TEMP`, com uma imitação mínima do Supabase, roda a migração e o ensaio de verdade. Ele não prova as permissões de produção (lá o `postgres` não é superusuário; isso fica para a Tarefa 17), mas pega erro de sintaxe, de ordem e de lógica. Nada disso é commitado.

Com a ferramenta Write (UTF-8 sem BOM), crie `%TEMP%\linkhub-pg-ensaio\supabase-mock.sql`:

```sql
-- Imitação mínima do Supabase para testar a migração localmente
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text,
  created_at timestamptz DEFAULT now()
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (
  id text PRIMARY KEY, name text NOT NULL, public boolean DEFAULT false,
  file_size_limit bigint, allowed_mime_types text[]
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  owner_id text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE plpgsql AS $$
DECLARE _parts text[];
BEGIN
  SELECT string_to_array(name, '/') INTO _parts;
  RETURN _parts[1:array_length(_parts, 1) - 1];
END $$;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON storage.objects, storage.buckets TO anon, authenticated, service_role;
-- Política de outro app no mesmo Storage: não pode interferir
INSERT INTO storage.buckets (id, name, public) VALUES ('outro-app', 'outro-app', true);
CREATE POLICY outro_app_public_read ON storage.objects FOR SELECT USING (bucket_id = 'outro-app');
```

e `%TEMP%\linkhub-pg-ensaio\seed-producao.sql` (parecido com produção: 1 perfil, 8 links, 57 visitas, 12 cliques e a foto):

```sql
INSERT INTO auth.users (id, email) VALUES ('11111111-1111-4111-8111-111111111111', 'dna@example.com');
INSERT INTO linkhub.profiles (id, username, full_name, avatar_url, user_type, theme_options)
VALUES ('11111111-1111-4111-8111-111111111111', 'dna', 'Daniel',
        'https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-avatars/11111111-1111-4111-8111-111111111111/1700.jpg',
        'personal', '{"themeId":"warm-peach"}');
INSERT INTO linkhub.links (user_id, title, url, position)
SELECT '11111111-1111-4111-8111-111111111111', 'Link ' || i, 'https://exemplo.com/' || i, i FROM generate_series(1, 8) i;
INSERT INTO linkhub.profile_views (profile_id, session_id)
SELECT '11111111-1111-4111-8111-111111111111', 'v' || i FROM generate_series(1, 57) i;
INSERT INTO linkhub.link_clicks (link_id, profile_id, session_id)
SELECT (SELECT min(id) FROM linkhub.links), '11111111-1111-4111-8111-111111111111', 'c' || i FROM generate_series(1, 12) i;
INSERT INTO storage.objects (bucket_id, name, owner, owner_id) VALUES
  ('linkhub-avatars', '11111111-1111-4111-8111-111111111111/1700.jpg',
   '11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111');
```

Depois, no PowerShell (o esquema **antigo** sai do commit `b1bd05c`, o de antes da Tarefa 1; o `git archive` evita o pipe do PowerShell, que estragaria a codificação):

```powershell
$pg = "$env:USERPROFILE\scoop\apps\postgresql\current\bin"
$dir = Join-Path $env:TEMP 'linkhub-pg-ensaio'
git archive --output="$dir\antigo.tar" b1bd05c deploy/vpsavila/linkhub_schema.sql
tar.exe -xf "$dir\antigo.tar" -C $dir
& "$pg\initdb.exe" -D "$dir\data" -U postgres -A trust -E UTF8 --locale=C | Out-Null
& "$pg\pg_ctl.exe" -D "$dir\data" -o "-p 55432" -l "$dir\server.log" start
& "$pg\createdb.exe" -p 55432 -U postgres prod
$psql = "$pg\psql.exe"
& $psql -p 55432 -U postgres -d prod -v ON_ERROR_STOP=1 -q -f "$dir\supabase-mock.sql"
& $psql -p 55432 -U postgres -d prod -v ON_ERROR_STOP=1 -q -f "$dir\deploy\vpsavila\linkhub_schema.sql"
& $psql -p 55432 -U postgres -d prod -v ON_ERROR_STOP=1 -q -f "$dir\seed-producao.sql"
& $psql -p 55432 -U postgres -d prod -v ON_ERROR_STOP=1 -q -f "$env:TEMP\linkhub-ensaio-varios-perfis.sql"
"ensaio: $LASTEXITCODE"
& $psql -p 55432 -U postgres -d prod -v ON_ERROR_STOP=1 -q -f deploy\vpsavila\migrations\2026-10-26-varios-perfis.sql
& $psql -p 55432 -U postgres -d prod -v ON_ERROR_STOP=1 -q -f deploy\vpsavila\migrations\2026-10-26-varios-perfis.sql
"migracao duas vezes: $LASTEXITCODE"
& $psql -p 55432 -U postgres -d prod -v ON_ERROR_STOP=1 -f scripts\conferencia-perfis.sql
& "$pg\pg_ctl.exe" -D "$dir\data" stop
Remove-Item -Recurse -Force $dir
```

Esperado: `ensaio: 0` (antes dele, só avisos `NOTICE`), `migracao duas vezes: 0` e, na conferência, o `dna` com o mesmo id, 8 links, 57 visitas e 12 cliques, `dono_igual_ao_id = t`, as 8 políticas novas do Storage e as 8 funções com dono `postgres`. Se o ensaio falhar, a linha `ERROR: ENSAIO FALHOU (n): …` diz o caso.

- [ ] **Passo 9: verificação e commit**

```powershell
npx vitest run src/lib/variosPerfisMigration.test.ts
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
git add -- scripts/ensaio-migracao-perfis.ps1 scripts/ensaio-perfis-testes.sql scripts/ensaio-perfis-testes-storage.sql scripts/conferencia-perfis.sql
git commit -m "Ensaio da migração dos vários perfis e conferência do banco" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- scripts/ensaio-migracao-perfis.ps1 scripts/ensaio-perfis-testes.sql scripts/ensaio-perfis-testes-storage.sql scripts/conferencia-perfis.sql src/lib/variosPerfisMigration.test.ts deploy/vpsavila/DEPLOY.md
```

Esperado: 14 testes no arquivo; 41 arquivos e 646 testes no total.

---
### Tarefa 3: tipos do Supabase

**Especificação:** fim da seção "Migração" (o que o `types.ts` recebe).

**Arquivos:**
- Modificar: `src/integrations/supabase/types.ts`
- Criar: `src/integrations/supabase/types.test.ts`

- [ ] **Passo 1: teste de tipos (falha no `tsc`)**

`src/integrations/supabase/types.test.ts`:

```ts
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
```

- [ ] **Passo 2: confirmar a falha**

```powershell
npx tsc --noEmit -p tsconfig.app.json
```

Esperado: erros em `types.test.ts` (`Property 'profile_owners' does not exist`, `Property 'create_profile' does not exist`, `Property 'id' is missing`).

- [ ] **Passo 3: implementar**

Em `src/integrations/supabase/types.ts`:

1. Em `links.Row`, troque a linha `          user_id: string` por:

```ts
          /** Id do perfil (profiles.id), não da conta: o nome é histórico. */
          user_id: string
```

(só no `Row`; `Insert` e `Update` ficam como estão).

2. Entre o fechamento de `links` (`        Relationships: []` + `      }`) e `      profile_views: {`, acrescente:

```ts
      profile_owners: {
        Row: {
          created_at: string
          owner_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          owner_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          owner_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_owners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
```

3. Em `profiles.Insert`, troque `          id: string` por `          id?: string` (o banco gera o id dos perfis novos).

4. Troque o bloco `Functions` inteiro por (ordem alfabética, como o resto do arquivo):

```ts
    Functions: {
      create_profile: {
        Args: { p_full_name: string; p_username: string }
        Returns: string
      }
      delete_own_profile: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_own_profiles: {
        Args: never
        Returns: Database["public"]["Tables"]["profiles"]["Row"][]
      }
      owns_profile: {
        Args: { p_profile_id: string }
        Returns: boolean
      }
      owns_profile_folder: {
        Args: { p_name: string }
        Returns: boolean
      }
    }
```

Esse formato foi conferido contra o `@supabase/postgrest-js` 2.95.3 instalado: `supabase.rpc('list_own_profiles')` devolve `data` como `Row[]`, `rpc('create_profile', {…})` devolve `string`, e `insert({ id, full_name, avatar_url })` em `profiles` compila.

- [ ] **Passo 4: rodar e ver passar**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run src/integrations/supabase/types.test.ts
```

Esperado: tsc sem saída; 1 teste passando.

- [ ] **Passo 5: verificação e commit**

```powershell
npx vitest run
git add -- src/integrations/supabase/types.test.ts
git commit -m "Tipos do Supabase para os vários perfis" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/integrations/supabase/types.ts src/integrations/supabase/types.test.ts
```

Esperado: 42 arquivos e 647 testes.

---

### Tarefa 4: Storage por perfil e `resetDesign()`

**Especificação:** "Perfil atual" (helper `avatarPathFromUrl`, `resetDesign()`) e "A pasta do Storage passa a ser a do perfil".

**Arquivos:**
- Criar: `src/lib/avatarStorage.ts`, `src/lib/avatarStorage.test.ts`
- Modificar: `src/lib/supabase.ts`
- Modificar: `src/lib/linkIcons/storage.ts`, `src/lib/linkIcons/storage.test.ts`, `src/lib/linkIcons/storagePrefix.ts`
- Modificar: `src/stores/useDesignStore.ts`
- Criar: `src/stores/useDesignStore.test.ts`

- [ ] **Passo 1: testes (falham)**

`src/lib/avatarStorage.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { AVATARS_BUCKET, AVATARS_PUBLIC_PREFIX, avatarPathFromUrl, getAvatarsPublicPrefix } from './avatarStorage';

const PREFIXO = 'https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-avatars/';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('prefixo público dos avatares', () => {
  it('é o bucket linkhub-avatars', () => {
    expect(AVATARS_BUCKET).toBe('linkhub-avatars');
  });

  it('monta o prefixo a partir do VITE_SUPABASE_URL, com ou sem barra no fim', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase-api.avila.ia.br');
    expect(getAvatarsPublicPrefix()).toBe(PREFIXO);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase-api.avila.ia.br/');
    expect(getAvatarsPublicPrefix()).toBe(PREFIXO);
  });

  it('bate com o getPublicUrl do cliente Supabase', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://supabase-api.avila.ia.br');
    const cliente = createClient('https://supabase-api.avila.ia.br', 'chave-falsa', {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const url = cliente.storage.from(AVATARS_BUCKET).getPublicUrl('p1/1.jpg').data.publicUrl;
    expect(url.startsWith(getAvatarsPublicPrefix())).toBe(true);
  });
});

describe('avatarPathFromUrl', () => {
  const url = (rest: string) => `${AVATARS_PUBLIC_PREFIX}${rest}`;

  it('devolve o caminho de uma foto na pasta do perfil', () => {
    expect(avatarPathFromUrl(url('p1/1700000000000.jpg'), 'p1')).toBe('p1/1700000000000.jpg');
    expect(avatarPathFromUrl(url('p1/avatar-1700000000000.jpg'), 'p1')).toBe('p1/avatar-1700000000000.jpg');
    const uuid = '3f0c8a4e-2b1d-4c5e-9a7b-1c2d3e4f5a6b';
    expect(avatarPathFromUrl(url(`${uuid}/1.png`), uuid)).toBe(`${uuid}/1.png`);
  });

  it('ignora foto do provedor, de outro perfil e de outro bucket', () => {
    expect(avatarPathFromUrl('https://lh3.googleusercontent.com/a/foto=s96-c', 'p1')).toBeNull();
    expect(avatarPathFromUrl(url('p2/1.jpg'), 'p1')).toBeNull();
    // Prefixo do id não basta: "p10/" não é "p1/"
    expect(avatarPathFromUrl(url('p10/1.jpg'), 'p1')).toBeNull();
    const outroBucket = AVATARS_PUBLIC_PREFIX.replace('linkhub-avatars', 'avatars');
    expect(avatarPathFromUrl(`${outroBucket}p1/1.jpg`, 'p1')).toBeNull();
  });

  it('recusa caminho fora do formato', () => {
    expect(avatarPathFromUrl(url('p1/../p2/1.jpg'), 'p1')).toBeNull();
    expect(avatarPathFromUrl(url('p1/sub/1.jpg'), 'p1')).toBeNull();
    expect(avatarPathFromUrl(url('p1/1.jpg?t=1'), 'p1')).toBeNull();
    expect(avatarPathFromUrl(url('p1/'), 'p1')).toBeNull();
    expect(avatarPathFromUrl(url('p1/%2e%2e.jpg'), 'p1')).toBeNull();
  });

  it('sem URL ou sem perfil, devolve null', () => {
    expect(avatarPathFromUrl(null, 'p1')).toBeNull();
    expect(avatarPathFromUrl('', 'p1')).toBeNull();
    expect(avatarPathFromUrl(url('p1/1.jpg'), '')).toBeNull();
    expect(avatarPathFromUrl(url('p1/1.jpg'), undefined)).toBeNull();
  });
});
```

No `describe('linkIconPathFromUrl', …)` de `src/lib/linkIcons/storage.test.ts`, acrescente:

```ts
  it('aceita a pasta de um perfil com id gerado (uuid)', () => {
    const uuid = '3f0c8a4e-2b1d-4c5e-9a7b-1c2d3e4f5a6b';
    expect(path(`${uuid}/7-123.png`, uuid)).toBe(`${uuid}/7-123.png`);
    expect(path(`${uuid}/7-123.png`, 'u1')).toBeNull();
  });
```

`src/stores/useDesignStore.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultCustomTheme, DEFAULT_THEME_ID, useDesignStore } from './useDesignStore';

afterEach(() => {
  useDesignStore.getState().resetDesign();
  useDesignStore.getState().setPreviewMode(false);
});

describe('useDesignStore.resetDesign', () => {
  it('volta ao tema inicial (pebble-blue e o customTheme inicial)', () => {
    const store = useDesignStore.getState();
    store.setCurrentTheme('warm-peach');
    store.setCustomTheme({ ...createDefaultCustomTheme(), colors: { text: '#000000' } });

    useDesignStore.getState().resetDesign();

    expect(DEFAULT_THEME_ID).toBe('pebble-blue');
    expect(useDesignStore.getState().currentTheme).toBe('pebble-blue');
    expect(useDesignStore.getState().customTheme).toEqual(createDefaultCustomTheme());
  });

  it('não mexe no modo de prévia', () => {
    useDesignStore.getState().setPreviewMode(true);
    useDesignStore.getState().resetDesign();
    expect(useDesignStore.getState().isPreviewMode).toBe(true);
  });

  it('cada reinício entrega um objeto novo: alterar um não contamina o próximo', () => {
    useDesignStore.getState().resetDesign();
    useDesignStore.getState().customTheme.colors.text = '#123456';
    useDesignStore.getState().resetDesign();
    expect(useDesignStore.getState().customTheme.colors.text).toBe('#ffffff');
  });
});
```

- [ ] **Passo 2: confirmar a falha**

```powershell
npx vitest run src/lib/avatarStorage.test.ts src/stores/useDesignStore.test.ts src/lib/linkIcons/storage.test.ts
```

Esperado: `avatarStorage.test.ts` falha no import; o do store falha com `resetDesign is not a function`. O teste novo do `linkIconPathFromUrl` já passa (a função já aceita qualquer id); ele documenta o uso com o id do perfil.

- [ ] **Passo 3: implementar**

`src/lib/avatarStorage.ts`:

```ts
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
```

Em `src/lib/supabase.ts`, troque:

```ts
// Bucket com prefixo próprio pra não colidir com outros apps no mesmo Supabase.
export const AVATARS_BUCKET = 'linkhub-avatars';
```

por:

```ts
// Bucket com prefixo próprio pra não colidir com outros apps no mesmo Supabase.
// Mora em avatarStorage.ts (sem o cliente); reexportado para os imports existentes.
export { AVATARS_BUCKET } from './avatarStorage';
```

Em `src/lib/linkIcons/storage.ts`, no `linkIconPathFromUrl`:
- no comentário acima da função, troque "Devolve null para outro usuário" por "Devolve null para outro perfil";
- troque o parâmetro `userId: string,` por `profileId: string,` e, no corpo, `!userId` por `!profileId` e `` `${userId}/` `` por `` `${profileId}/` ``.

Em `src/lib/linkIcons/storagePrefix.ts`, troque o comentário `// Caminho que o app grava no bucket: <user_id>/<link_id>-<timestamp>.<png|webp>.` por `// Caminho que o app grava no bucket: <profile_id>/<link_id>-<timestamp>.<png|webp> (pasta do perfil).`.

Substitua `src/stores/useDesignStore.ts` inteiro por:

```ts
import { create } from 'zustand';

export interface ThemeConfig {
  background: {
    /** 'pattern' é valor legado do editor: é lido como sólido, com o padrão desenhado por cima */
    type: 'solid' | 'gradient' | 'pattern';
    color?: string;
    colors?: string[];
    /** Camada desenhada sobre qualquer tipo de fundo. Ausente ou 'none': sem padrão */
    pattern?: 'none' | 'dots' | 'grid' | 'waves' | 'stripes';
    /** Só vale para gradiente */
    animated?: boolean;
  };
  buttonStyle: {
    type: 'solid' | 'outline' | 'glass' | 'modern' | 'rounded';
    color?: string;
    /** 'auto' (padrão quando ausente) ou uma cor hex */
    textColor?: string;
    borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    size?: 'sm' | 'md' | 'lg';
    /** Ausente ou 'none': sem sombra */
    shadow?: 'none' | 'soft' | 'hard' | 'glow';
    /** Hex. Usado pelos modelos; o editor não tem controle e preserva o valor */
    shadowColor?: string;
  };
  font: {
    family: 'inter' | 'playfair' | 'poppins' | 'roboto-mono' | 'dancing-script' | 'montserrat' | 'lora' | 'source-code-pro';
    size: 'sm' | 'md' | 'lg';
    weight: 'light' | 'normal' | 'medium' | 'bold';
  };
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    text?: string;
    avatarBorder?: string;
  };
  /** Ausente: círculo */
  avatar?: {
    shape?: 'circle' | 'rounded' | 'hexagon';
  };
}

export const DEFAULT_THEME_ID = 'pebble-blue';

/** Tema inicial do editor. É função para cada chamada devolver um objeto novo. */
export function createDefaultCustomTheme(): ThemeConfig {
  return {
    background: { type: 'gradient', colors: ['#1e3a8a', '#3730a3'] },
    buttonStyle: { type: 'solid', color: '#ffffff', borderRadius: 'lg' },
    font: { family: 'inter', size: 'md', weight: 'medium' },
    colors: {
      primary: '#ffffff',
      secondary: '#cbd5e1',
      accent: '#60a5fa',
      text: '#ffffff'
    },
  };
}

interface DesignState {
  currentTheme: string;
  customTheme: ThemeConfig;
  isPreviewMode: boolean;
  setCurrentTheme: (theme: string) => void;
  setCustomTheme: (theme: ThemeConfig) => void;
  setPreviewMode: (enabled: boolean) => void;
  /** Volta ao tema inicial. Usado ao trocar para um perfil sem tema salvo. */
  resetDesign: () => void;
}

export const useDesignStore = create<DesignState>((set) => ({
  currentTheme: DEFAULT_THEME_ID,
  customTheme: createDefaultCustomTheme(),
  isPreviewMode: false,
  setCurrentTheme: (theme) => set({ currentTheme: theme }),
  setCustomTheme: (theme) => set({ customTheme: theme }),
  setPreviewMode: (enabled) => set({ isPreviewMode: enabled }),
  resetDesign: () => set({ currentTheme: DEFAULT_THEME_ID, customTheme: createDefaultCustomTheme() }),
}));
```

- [ ] **Passo 4: rodar e ver passar**

```powershell
npx vitest run src/lib/avatarStorage.test.ts src/stores/useDesignStore.test.ts src/lib/linkIcons/storage.test.ts
```

Esperado: tudo passando (7 em `avatarStorage`, 3 no store, mais 1 no `storage.test.ts`).

- [ ] **Passo 5: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
git add -- src/lib/avatarStorage.ts src/lib/avatarStorage.test.ts src/stores/useDesignStore.test.ts
git commit -m "Storage na pasta do perfil e resetDesign no store" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/lib/avatarStorage.ts src/lib/avatarStorage.test.ts src/lib/supabase.ts src/lib/linkIcons/storage.ts src/lib/linkIcons/storage.test.ts src/lib/linkIcons/storagePrefix.ts src/stores/useDesignStore.ts src/stores/useDesignStore.test.ts
```

Esperado: 44 arquivos e 658 testes.

---

### Tarefa 5: `CurrentProfileContext` e a rota de layout

**Especificação:** "Perfil atual: `src/contexts/CurrentProfileContext.tsx`" e "Testes > Vitest > `CurrentProfileContext.test.tsx`".

**Arquivos:**
- Criar: `src/contexts/CurrentProfileContext.tsx`, `src/contexts/CurrentProfileContext.test.tsx`
- Criar: `src/pages/ProfileLayout.tsx`, `src/pages/ProfileLayout.test.tsx`
- Modificar: `src/App.tsx`

- [ ] **Passo 1: testes do contexto (falham)**

`src/contexts/CurrentProfileContext.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { AVATARS_PUBLIC_PREFIX } from '@/lib/avatarStorage';
import { LINK_ICONS_PUBLIC_PREFIX } from '@/lib/linkIcons/storagePrefix';
import { ONBOARDING_TEMPLATES } from '@/components/dashboard/onboardingTemplates';
import { createDefaultCustomTheme, useDesignStore } from '@/stores/useDesignStore';
import {
  CurrentProfileProvider,
  currentProfileStorageKey,
  useCurrentProfile,
  type CurrentProfileContextValue,
  type Profile,
} from './CurrentProfileContext';

const mocks = vi.hoisted(() => {
  const storage = { remove: vi.fn() };
  return {
    rpc: vi.fn(),
    insert: vi.fn(),
    storage,
    storageFrom: vi.fn(() => storage),
    user: {
      id: 'u1',
      email: 'dna@example.com',
      user_metadata: { full_name: 'Daniel Ávila', avatar_url: 'https://lh3.googleusercontent.com/a/foto' },
    } as { id: string; email: string; user_metadata: Record<string, string> },
  };
});

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mocks.rpc,
    from: vi.fn(() => ({ insert: mocks.insert })),
    storage: { from: mocks.storageFrom },
  },
}));

const PEACH = ONBOARDING_TEMPLATES.find((t) => t.id === 'warm-peach')!;

function profile(id: string, extra: Partial<Profile> = {}): Profile {
  return {
    id,
    username: id === 'u1' ? 'dna' : id,
    full_name: `Perfil ${id}`,
    avatar_url: null,
    bio: null,
    custom_domain: null,
    preferred_domain: 'default',
    theme_options: {},
    show_username: true,
    show_qr_code: true,
    user_type: 'personal',
    created_at: '2026-10-26T00:00:00Z',
    updated_at: '2026-10-26T00:00:00Z',
    ...extra,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

let ctx: CurrentProfileContextValue;
function Probe() {
  ctx = useCurrentProfile();
  return <p data-testid="atual">{ctx.currentProfile?.id ?? (ctx.loading ? 'carregando' : 'nenhum')}</p>;
}

const renderProvider = () =>
  render(
    <CurrentProfileProvider>
      <Probe />
    </CurrentProfileProvider>,
  );

const atual = () => screen.getByTestId('atual').textContent;

/** rpc por nome de função: cada teste define as respostas */
function rpcHandlers(handlers: Record<string, (args?: unknown) => unknown>) {
  mocks.rpc.mockImplementation(async (fn: string, args?: unknown) => {
    const handler = handlers[fn];
    if (!handler) throw new Error(`rpc inesperada: ${fn}`);
    return handler(args);
  });
}

beforeEach(() => {
  window.localStorage.clear();
  mocks.user = {
    id: 'u1',
    email: 'dna@example.com',
    user_metadata: { full_name: 'Daniel Ávila', avatar_url: 'https://lh3.googleusercontent.com/a/foto' },
  };
  mocks.rpc.mockReset();
  mocks.insert.mockReset().mockResolvedValue({ error: null });
  mocks.storageFrom.mockClear();
  mocks.storage.remove.mockReset().mockResolvedValue({ error: null });
  useDesignStore.getState().resetDesign();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CurrentProfileProvider: carga', () => {
  it('carrega os perfis pela RPC e seleciona o primeiro', async () => {
    rpcHandlers({ list_own_profiles: () => ({ data: [profile('u1'), profile('p2')], error: null }) });
    renderProvider();

    await waitFor(() => expect(atual()).toBe('u1'));
    expect(mocks.rpc).toHaveBeenCalledWith('list_own_profiles');
    expect(ctx.profiles.map((p) => p.id)).toEqual(['u1', 'p2']);
    expect(ctx.loading).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('lista vazia: cria o primeiro perfil com o id, o nome e a foto da conta', async () => {
    const lists = [[], [profile('u1')]];
    rpcHandlers({ list_own_profiles: () => ({ data: lists.shift() ?? [profile('u1')], error: null }) });
    renderProvider();

    await waitFor(() => expect(atual()).toBe('u1'));
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith({
      id: 'u1',
      full_name: 'Daniel Ávila',
      avatar_url: 'https://lh3.googleusercontent.com/a/foto',
    });
  });

  it('duas cargas simultâneas fazem um único insert', async () => {
    const insert = deferred<{ error: null }>();
    mocks.insert.mockReturnValue(insert.promise);
    let calls = 0;
    rpcHandlers({ list_own_profiles: () => ({ data: ++calls <= 2 ? [] : [profile('u1')], error: null }) });
    renderProvider();

    await waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1));
    act(() => {
      void ctx.reloadProfiles();
    });
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(2));
    await act(async () => insert.resolve({ error: null }));

    await waitFor(() => expect(atual()).toBe('u1'));
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it('23505 no insert (outra aba criou antes) recarrega a lista sem erro', async () => {
    mocks.insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    const lists = [[], [profile('u1')]];
    rpcHandlers({ list_own_profiles: () => ({ data: lists.shift() ?? [profile('u1')], error: null }) });
    renderProvider();

    await waitFor(() => expect(atual()).toBe('u1'));
    expect(ctx.error).toBeNull();
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it('erro de rede não cria nada e mostra o erro', async () => {
    rpcHandlers({ list_own_profiles: () => ({ data: null, error: { message: 'Failed to fetch' } }) });
    renderProvider();

    await waitFor(() => expect(ctx.loading).toBe(false));
    expect(atual()).toBe('nenhum');
    expect(ctx.error).toBe('Não foi possível carregar seus perfis.');
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('reinicia quando a conta muda', async () => {
    rpcHandlers({
      list_own_profiles: () => ({ data: mocks.user.id === 'u1' ? [profile('u1')] : [profile('u2')], error: null }),
    });
    const view = renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    mocks.user = { id: 'u2', email: 'outra@example.com', user_metadata: {} };
    view.rerender(
      <CurrentProfileProvider>
        <Probe />
      </CurrentProfileProvider>,
    );

    await waitFor(() => expect(atual()).toBe('u2'));
    expect(ctx.profiles.map((p) => p.id)).toEqual(['u2']);
  });
});

describe('CurrentProfileProvider: seleção', () => {
  it('lê e grava o perfil escolhido no localStorage', async () => {
    window.localStorage.setItem(currentProfileStorageKey('u1'), 'p2');
    rpcHandlers({ list_own_profiles: () => ({ data: [profile('u1'), profile('p2')], error: null }) });
    renderProvider();

    await waitFor(() => expect(atual()).toBe('p2'));
    act(() => ctx.selectProfile('u1'));
    expect(atual()).toBe('u1');
    expect(window.localStorage.getItem('linkhub:currentProfile:u1')).toBe('u1');
  });

  it('funciona sem localStorage (leitura e gravação lançam erro)', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    rpcHandlers({ list_own_profiles: () => ({ data: [profile('u1'), profile('p2')], error: null }) });
    renderProvider();

    await waitFor(() => expect(atual()).toBe('u1'));
    act(() => ctx.selectProfile('p2'));
    expect(atual()).toBe('p2');
  });

  it('perfil guardado que não existe mais cai no primeiro', async () => {
    window.localStorage.setItem(currentProfileStorageKey('u1'), 'p-sumiu');
    rpcHandlers({ list_own_profiles: () => ({ data: [profile('u1'), profile('p2')], error: null }) });
    renderProvider();

    await waitFor(() => expect(atual()).toBe('u1'));
  });

  it('selecionar um id que não é da lista não muda nada', async () => {
    rpcHandlers({ list_own_profiles: () => ({ data: [profile('u1')], error: null }) });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    act(() => ctx.selectProfile('de-outra-conta'));
    expect(atual()).toBe('u1');
  });

  it('a troca aplica o tema do perfil ou volta ao padrão, e avisa linksUpdated', async () => {
    const comTema = profile('p2', { theme_options: { themeId: 'warm-peach', custom: PEACH.config } as never });
    rpcHandlers({ list_own_profiles: () => ({ data: [profile('u1'), comTema], error: null }) });
    const linksUpdated = vi.fn();
    window.addEventListener('linksUpdated', linksUpdated);
    try {
      renderProvider();
      await waitFor(() => expect(atual()).toBe('u1'));
      expect(useDesignStore.getState().currentTheme).toBe('pebble-blue');

      act(() => ctx.selectProfile('p2'));
      expect(useDesignStore.getState().currentTheme).toBe('warm-peach');
      expect(useDesignStore.getState().customTheme).toEqual(PEACH.config);

      act(() => ctx.selectProfile('u1'));
      expect(useDesignStore.getState().currentTheme).toBe('pebble-blue');
      expect(useDesignStore.getState().customTheme).toEqual(createDefaultCustomTheme());
      // Carga inicial + duas trocas
      expect(linksUpdated).toHaveBeenCalledTimes(3);
    } finally {
      window.removeEventListener('linksUpdated', linksUpdated);
    }
  });

  it('recarga sem mudança de tema não mexe no editor; tema novo gravado é aplicado', async () => {
    let atualDoBanco = profile('u1');
    rpcHandlers({ list_own_profiles: () => ({ data: [atualDoBanco], error: null }) });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    // Edição ainda não salva no editor
    act(() => useDesignStore.getState().setCurrentTheme('editando'));
    await act(async () => ctx.reloadProfiles());
    expect(useDesignStore.getState().currentTheme).toBe('editando');

    // O onboarding gravou um modelo: a recarga aplica
    atualDoBanco = profile('u1', { theme_options: { themeId: 'warm-peach', custom: PEACH.config } as never });
    await act(async () => ctx.reloadProfiles());
    expect(useDesignStore.getState().currentTheme).toBe('warm-peach');
  });
});

describe('CurrentProfileProvider: criar e excluir', () => {
  it('createProfile chama a RPC, recarrega e devolve o id', async () => {
    let lista = [profile('u1')];
    rpcHandlers({
      list_own_profiles: () => ({ data: lista, error: null }),
      create_profile: () => {
        lista = [profile('u1'), profile('p9')];
        return { data: 'p9', error: null };
      },
    });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    let result: unknown;
    await act(async () => {
      result = await ctx.createProfile({ username: 'loja', full_name: 'Minha loja' });
    });
    expect(result).toEqual({ ok: true, id: 'p9' });
    expect(mocks.rpc).toHaveBeenCalledWith('create_profile', { p_username: 'loja', p_full_name: 'Minha loja' });
    expect(ctx.profiles.map((p) => p.id)).toEqual(['u1', 'p9']);
    // Criar não troca o perfil atual: quem troca é o diálogo, com selectProfile
    expect(atual()).toBe('u1');
  });

  it('createProfile decide o erro pelo hint e pelo 23505', async () => {
    const respostas = [
      { hint: 'linkhub_profile_limit', code: 'P0001', message: 'Você já tem 10 perfis.' },
      { hint: 'linkhub_invalid_username', code: 'P0001', message: 'x' },
      { hint: null, code: '23505', message: 'duplicate key value violates unique constraint "profiles_username_key"' },
      { hint: null, code: '500', message: 'Failed to fetch' },
    ];
    rpcHandlers({
      list_own_profiles: () => ({ data: [profile('u1')], error: null }),
      create_profile: () => ({ data: null, error: respostas.shift() }),
    });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    const erros: unknown[] = [];
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        erros.push(await ctx.createProfile({ username: 'loja', full_name: '' }));
      });
    }
    expect(erros).toEqual([
      { ok: false, error: 'limit' },
      { ok: false, error: 'invalid' },
      { ok: false, error: 'taken' },
      { ok: false, error: 'other' },
    ]);
  });

  it('deleteProfile chama a RPC, apaga os arquivos da pasta do perfil e seleciona o primeiro', async () => {
    window.localStorage.setItem(currentProfileStorageKey('u1'), 'p2');
    let lista = [profile('u1'), profile('p2')];
    rpcHandlers({
      list_own_profiles: () => ({ data: lista, error: null }),
      delete_own_profile: () => {
        lista = [profile('u1')];
        return {
          data: {
            avatar_url: `${AVATARS_PUBLIC_PREFIX}p2/1700.jpg`,
            icon_urls: [`${LINK_ICONS_PUBLIC_PREFIX}p2/7-1.png`, `${LINK_ICONS_PUBLIC_PREFIX}outra/7-1.png`],
          },
          error: null,
        };
      },
    });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('p2'));

    let result: unknown;
    await act(async () => {
      result = await ctx.deleteProfile('p2');
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith('delete_own_profile', { p_profile_id: 'p2' });
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-avatars');
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-link-icons');
    expect(mocks.storage.remove).toHaveBeenCalledWith(['p2/1700.jpg']);
    // O ícone de outra pasta fica de fora
    expect(mocks.storage.remove).toHaveBeenCalledWith(['p2/7-1.png']);
    expect(atual()).toBe('u1');
  });

  it('falha ao apagar os arquivos vai só para o console', async () => {
    mocks.storage.remove.mockResolvedValue({ error: { message: 'sem permissão' } });
    let lista = [profile('u1'), profile('p2')];
    rpcHandlers({
      list_own_profiles: () => ({ data: lista, error: null }),
      delete_own_profile: () => {
        lista = [profile('u1')];
        return { data: { avatar_url: `${AVATARS_PUBLIC_PREFIX}p2/1.jpg`, icon_urls: [] }, error: null };
      },
    });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    let result: unknown;
    await act(async () => {
      result = await ctx.deleteProfile('p2');
    });
    expect(result).toEqual({ ok: true });
    expect(console.error).toHaveBeenCalledWith('Error removing profile files:', expect.anything());
  });

  it('deleteProfile do último perfil devolve "last" e não mexe no Storage', async () => {
    rpcHandlers({
      list_own_profiles: () => ({ data: [profile('u1')], error: null }),
      delete_own_profile: () => ({ data: null, error: { hint: 'linkhub_last_profile', code: 'P0001', message: 'x' } }),
    });
    renderProvider();
    await waitFor(() => expect(atual()).toBe('u1'));

    let result: unknown;
    await act(async () => {
      result = await ctx.deleteProfile('u1');
    });
    expect(result).toEqual({ ok: false, error: 'last' });
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });
});

describe('useCurrentProfile', () => {
  it('fora do Provider lança erro', () => {
    expect(() => render(<Probe />)).toThrow('useCurrentProfile must be used within a CurrentProfileProvider');
  });
});
```

- [ ] **Passo 2: teste da rota de layout (falha)**

`src/pages/ProfileLayout.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProfileLayout from './ProfileLayout';

vi.mock('@/contexts/CurrentProfileContext', () => ({
  CurrentProfileProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="provedor">{children}</div>,
}));

afterEach(() => cleanup());

describe('ProfileLayout', () => {
  it('desenha a rota filha dentro do Provider do perfil atual', () => {
    render(
      <MemoryRouter initialEntries={['/analytics']}>
        <Routes>
          <Route element={<ProfileLayout />}>
            <Route path="/dashboard" element={<p>painel</p>} />
            <Route path="/analytics" element={<p>relatórios</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('provedor').textContent).toBe('relatórios');
  });
});
```

- [ ] **Passo 3: confirmar a falha**

```powershell
npx vitest run src/contexts/CurrentProfileContext.test.tsx src/pages/ProfileLayout.test.tsx
```

Esperado: os dois falham no import.

- [ ] **Passo 4: implementar o contexto**

`src/contexts/CurrentProfileContext.tsx`:

```tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useDesignStore } from '@/stores/useDesignStore';
import { resolveThemeConfig } from '@/utils/themes';
import { AVATARS_BUCKET, avatarPathFromUrl } from '@/lib/avatarStorage';
import { LINK_ICONS_BUCKET } from '@/lib/linkIcons/storagePrefix';
import { linkIconPathFromUrl } from '@/lib/linkIcons/storage';
import type { Database } from '@/integrations/supabase/types';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/** Limite por conta. O banco confere de novo no create_profile. */
export const MAX_PROFILES = 10;

export type CreateProfileError = 'limit' | 'taken' | 'invalid' | 'other';
export type CreateProfileResult = { ok: true; id: string } | { ok: false; error: CreateProfileError };
export type DeleteProfileError = 'last' | 'not_owner' | 'other';
export type DeleteProfileResult = { ok: true } | { ok: false; error: DeleteProfileError };

export interface CurrentProfileContextValue {
  profiles: Profile[];
  currentProfile: Profile | null;
  /** Só a primeira carga da conta. As recargas depois de salvar não voltam a true. */
  loading: boolean;
  error: string | null;
  selectProfile: (id: string) => void;
  reloadProfiles: () => Promise<void>;
  createProfile: (input: { username: string; full_name: string }) => Promise<CreateProfileResult>;
  deleteProfile: (id: string) => Promise<DeleteProfileResult>;
}

type RpcError = { code?: string; hint?: string | null; message?: string } | null;
type DeletedFiles = { avatar_url?: string | null; icon_urls?: string[] | null };

const LOAD_ERROR = 'Não foi possível carregar seus perfis.';
const FIRST_PROFILE_ERROR = 'Não foi possível criar o seu primeiro perfil.';

const CurrentProfileContext = createContext<CurrentProfileContextValue | undefined>(undefined);

export function useCurrentProfile(): CurrentProfileContextValue {
  const context = useContext(CurrentProfileContext);
  if (context === undefined) {
    throw new Error('useCurrentProfile must be used within a CurrentProfileProvider');
  }
  return context;
}

export const currentProfileStorageKey = (userId: string) => `linkhub:currentProfile:${userId}`;

function readStoredProfileId(userId: string): string | null {
  try {
    return window.localStorage.getItem(currentProfileStorageKey(userId));
  } catch {
    return null;
  }
}

function writeStoredProfileId(userId: string, profileId: string) {
  try {
    window.localStorage.setItem(currentProfileStorageKey(userId), profileId);
  } catch {
    // Sem localStorage (janela privada, site bloqueado): a escolha vale até recarregar a página
  }
}

/** O frontend decide pelo hint (ou pelo 23505 do unique do @), nunca pela mensagem. */
export function createProfileErrorFrom(error: RpcError): CreateProfileError {
  if (error?.hint === 'linkhub_profile_limit') return 'limit';
  if (error?.hint === 'linkhub_invalid_username') return 'invalid';
  if (error?.code === '23505') return 'taken';
  return 'other';
}

export function deleteProfileErrorFrom(error: RpcError): DeleteProfileError {
  if (error?.hint === 'linkhub_last_profile') return 'last';
  if (error?.hint === 'linkhub_not_owner') return 'not_owner';
  return 'other';
}

/** Aplica o tema salvo do perfil no editor e na prévia. Sem tema salvo, volta ao padrão. */
export function applyProfileTheme(profile: Profile | null): void {
  const store = useDesignStore.getState();
  const raw = profile?.theme_options;
  const options = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, any>) : null;
  const resolved = resolveThemeConfig(options);
  if (!resolved) {
    store.resetDesign();
    return;
  }
  store.setCurrentTheme(options.themeId || 'custom');
  store.setCustomTheme(resolved);
}

const themeKeyOf = (profile: Profile) => `${profile.id}:${JSON.stringify(profile.theme_options ?? null)}`;

function pickProfileId(list: Profile[], preferred: string | null): string | null {
  if (preferred && list.some((p) => p.id === preferred)) return preferred;
  return list[0]?.id ?? null;
}

function displayNameOf(user: User): string {
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario';
}

async function fetchOwnProfiles(): Promise<Profile[] | null> {
  try {
    const { data, error } = await supabase.rpc('list_own_profiles');
    if (error) {
      console.error('Error loading profiles:', error);
      return null;
    }
    return (data ?? []) as Profile[];
  } catch (error) {
    console.error('Error loading profiles:', error);
    return null;
  }
}

async function removeFiles(bucket: string, paths: string[]) {
  if (paths.length === 0) return;
  try {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) console.error('Error removing profile files:', error);
  } catch (error) {
    console.error('Error removing profile files:', error);
  }
}

export const CurrentProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const userRef = useRef(user);
  userRef.current = user;

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const profilesRef = useRef<Profile[]>([]);
  const currentIdRef = useRef<string | null>(null);
  // Perfil e tema aplicados por último no useDesignStore
  const themeKeyRef = useRef('');
  // Insert do primeiro perfil em andamento: duas cargas ao mesmo tempo fazem um insert só
  const firstProfileRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);

  /** Torna `id` o perfil atual: grava a escolha, aplica o tema e avisa a prévia. */
  const activate = useCallback((list: Profile[], id: string | null, accountId: string) => {
    const profile = list.find((p) => p.id === id) ?? null;
    const changed = id !== currentIdRef.current;
    currentIdRef.current = id;
    setCurrentId(id);
    if (!profile) return;
    if (changed) writeStoredProfileId(accountId, profile.id);
    const key = themeKeyOf(profile);
    if (key !== themeKeyRef.current) {
      themeKeyRef.current = key;
      applyProfileTheme(profile);
    }
    if (changed) window.dispatchEvent(new CustomEvent('linksUpdated'));
  }, []);

  const ensureFirstProfile = useCallback((account: User): Promise<void> => {
    if (firstProfileRef.current?.userId === account.id) return firstProfileRef.current.promise;
    const promise = (async () => {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: account.id,
        full_name: displayNameOf(account),
        avatar_url: account.user_metadata?.avatar_url || null,
      });
      // 23505: outra carga (outra aba) criou antes; a chave primária garante um perfil só
      if (insertError && insertError.code !== '23505') throw insertError;
    })();
    firstProfileRef.current = { userId: account.id, promise };
    promise.catch(() => {
      if (firstProfileRef.current?.promise === promise) firstProfileRef.current = null;
    });
    return promise;
  }, []);

  const load = useCallback(async (): Promise<void> => {
    const account = userRef.current;
    if (!account) return;

    let list = await fetchOwnProfiles();
    let failure: string | null = list ? null : LOAD_ERROR;
    // Conta sem perfil: só quando a lista veio certa e vazia, nunca em erro de rede
    if (list && list.length === 0) {
      try {
        await ensureFirstProfile(account);
        list = await fetchOwnProfiles();
        failure = !list ? LOAD_ERROR : list.length === 0 ? FIRST_PROFILE_ERROR : null;
      } catch (insertError) {
        console.error('Error creating first profile:', insertError);
        failure = FIRST_PROFILE_ERROR;
      }
    }

    // A conta mudou durante a carga: o resultado é de outra pessoa
    if (userRef.current?.id !== account.id) return;
    if (failure) {
      setError(failure);
      setLoading(false);
      return;
    }

    profilesRef.current = list;
    setProfiles(list);
    setError(null);
    activate(list, pickProfileId(list, currentIdRef.current ?? readStoredProfileId(account.id)), account.id);
    setLoading(false);
  }, [activate, ensureFirstProfile]);

  // Reinicia quando a conta muda (o objeto user muda a cada renovação do token; o id, não)
  useEffect(() => {
    profilesRef.current = [];
    currentIdRef.current = null;
    themeKeyRef.current = '';
    setProfiles([]);
    setCurrentId(null);
    setError(null);
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void load();
  }, [userId, load]);

  const selectProfile = useCallback((id: string) => {
    const account = userRef.current;
    if (!account || !profilesRef.current.some((p) => p.id === id)) return;
    activate(profilesRef.current, id, account.id);
  }, [activate]);

  const createProfile = useCallback(async (input: { username: string; full_name: string }): Promise<CreateProfileResult> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('create_profile', {
        p_username: input.username,
        p_full_name: input.full_name,
      });
      if (rpcError || !data) return { ok: false, error: createProfileErrorFrom(rpcError) };
      await load();
      return { ok: true, id: data };
    } catch (rpcError) {
      console.error('Error creating profile:', rpcError);
      return { ok: false, error: 'other' };
    }
  }, [load]);

  const deleteProfile = useCallback(async (id: string): Promise<DeleteProfileResult> => {
    let files: DeletedFiles;
    try {
      const { data, error: rpcError } = await supabase.rpc('delete_own_profile', { p_profile_id: id });
      if (rpcError) return { ok: false, error: deleteProfileErrorFrom(rpcError) };
      files = (data ?? {}) as unknown as DeletedFiles;
    } catch (rpcError) {
      console.error('Error deleting profile:', rpcError);
      return { ok: false, error: 'other' };
    }

    // Melhor esforço: o perfil já saiu, então a falha só vai para o console. As políticas de
    // SELECT e DELETE do Storage olham o owner_id (quem enviou), por isso a remoção funciona agora.
    const avatarPath = avatarPathFromUrl(files.avatar_url, id);
    const iconPaths = (files.icon_urls ?? [])
      .map((url) => linkIconPathFromUrl(url, id))
      .filter((path): path is string => !!path);
    await removeFiles(AVATARS_BUCKET, avatarPath ? [avatarPath] : []);
    await removeFiles(LINK_ICONS_BUCKET, iconPaths);

    // O perfil atual saiu da lista: a recarga seleciona o primeiro que restou
    await load();
    return { ok: true };
  }, [load]);

  const currentProfile = useMemo(() => profiles.find((p) => p.id === currentId) ?? null, [profiles, currentId]);

  const value = useMemo<CurrentProfileContextValue>(
    () => ({
      profiles,
      currentProfile,
      loading,
      error,
      selectProfile,
      reloadProfiles: load,
      createProfile,
      deleteProfile,
    }),
    [profiles, currentProfile, loading, error, selectProfile, load, createProfile, deleteProfile],
  );

  return <CurrentProfileContext.Provider value={value}>{children}</CurrentProfileContext.Provider>;
};
```

- [ ] **Passo 5: rota de layout e `App`**

`src/pages/ProfileLayout.tsx`:

```tsx
import { Outlet } from 'react-router-dom';
import { CurrentProfileProvider } from '@/contexts/CurrentProfileContext';

// Rota de layout do painel (/dashboard e /analytics): as duas páginas usam o mesmo perfil atual.
// Arquivo próprio, carregado sob demanda: quem abre /:username não baixa o contexto do painel.
const ProfileLayout = () => (
  <CurrentProfileProvider>
    <Outlet />
  </CurrentProfileProvider>
);

export default ProfileLayout;
```

Em `src/App.tsx`:
- depois de `const Dashboard = lazy(() => import("./pages/Dashboard"));`, acrescente `const ProfileLayout = lazy(() => import("./pages/ProfileLayout"));`;
- troque as duas rotas:

```tsx
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/analytics" element={<Analytics />} />
```

por:

```tsx
                  {/* Painel e relatórios compartilham o perfil atual (CurrentProfileProvider) */}
                  <Route element={<ProfileLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/analytics" element={<Analytics />} />
                  </Route>
                  <Route path="/admin" element={<Admin />} />
```

As rotas continuam as mesmas, então `APP_ROUTE_SEGMENTS` (`src/lib/serviceWorkerRoutes.ts`) não muda.

- [ ] **Passo 6: rodar e ver passar**

```powershell
npx vitest run src/contexts/CurrentProfileContext.test.tsx src/pages/ProfileLayout.test.tsx
```

Esperado: 18 testes no contexto e 1 no layout, todos passando.

- [ ] **Passo 7: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
npm run build
git add -- src/contexts/CurrentProfileContext.tsx src/contexts/CurrentProfileContext.test.tsx src/pages/ProfileLayout.tsx src/pages/ProfileLayout.test.tsx
git commit -m "Contexto do perfil atual e rota de layout do painel" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/contexts/CurrentProfileContext.tsx src/contexts/CurrentProfileContext.test.tsx src/pages/ProfileLayout.tsx src/pages/ProfileLayout.test.tsx src/App.tsx
```

Esperado: 46 arquivos e 677 testes; build verde. Até a Tarefa 14, o `Dashboard` antigo ainda carrega o perfil por conta própria, agora dentro do Provider. Isso só existe entre tarefas e não vai para produção.

---
### Tarefa 6: `useUsernameValidation` pelo perfil atual

**Especificação:** tabela "Onde o perfil atual substitui `user.id`", linha `useUsernameValidation.ts`.

**Arquivos:**
- Modificar: `src/hooks/useUsernameValidation.ts`
- Modificar: `src/components/ui/username-input.tsx`
- Criar: `src/hooks/useUsernameValidation.test.ts`

- [ ] **Passo 1: teste (falha)**

`src/hooks/useUsernameValidation.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ rows: [] as { id: string }[], eq: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: async (column: string, value: string) => {
          mocks.eq(column, value);
          return { data: mocks.rows, error: null };
        },
      }),
    }),
  },
}));
// O hook não depende mais da conta: se ainda chamar useAuth, este mock devolve outra pessoa
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'p1' } }) }));

import { useUsernameValidation } from './useUsernameValidation';

beforeEach(() => {
  mocks.rows = [{ id: 'p1' }];
  mocks.eq.mockClear();
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useUsernameValidation', () => {
  it('o @ do próprio perfil fica disponível', async () => {
    const { result } = renderHook(() => useUsernameValidation('dna', 0, 'p1'));
    await waitFor(() => expect(result.current.isValid).toBe(true));
    expect(result.current.isAvailable).toBe(true);
    expect(result.current.error).toBeNull();
    expect(mocks.eq).toHaveBeenCalledWith('username', 'dna');
  });

  it('o @ de outro perfil, mesmo da mesma conta, está em uso', async () => {
    const { result } = renderHook(() => useUsernameValidation('dna', 0, 'p2'));
    await waitFor(() => expect(result.current.isValid).toBe(true));
    expect(result.current.isAvailable).toBe(false);
    expect(result.current.error).toBe('Este username já está em uso');
  });

  it('sem perfil atual (perfil novo), um @ já gravado está em uso', async () => {
    const { result } = renderHook(() => useUsernameValidation('dna', 0));
    await waitFor(() => expect(result.current.isValid).toBe(true));
    expect(result.current.isAvailable).toBe(false);
  });

  it('@ livre fica disponível sem perfil atual', async () => {
    mocks.rows = [];
    const { result } = renderHook(() => useUsernameValidation('loja_nova', 0));
    await waitFor(() => expect(result.current.isValid).toBe(true));
    expect(result.current.isAvailable).toBe(true);
  });

  it('@ reservado é recusado sem consultar o banco', async () => {
    const { result } = renderHook(() => useUsernameValidation('admin', 0, 'p1'));
    await waitFor(() => expect(result.current.error).toBe('Este username é reservado pelo sistema'));
    expect(result.current.isAvailable).toBe(false);
    expect(mocks.eq).not.toHaveBeenCalled();
  });
});
```

- [ ] **Passo 2: confirmar a falha**

```powershell
npx vitest run src/hooks/useUsernameValidation.test.ts
```

Esperado: os testes "outro perfil" e "sem perfil atual" falham (hoje o hook compara com o `user.id` do mock, `'p1'`, e não com o terceiro argumento).

- [ ] **Passo 3: implementar**

Substitua `src/hooks/useUsernameValidation.ts` inteiro por:

```ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UsernameValidationResult {
  isValid: boolean;
  isAvailable: boolean;
  isChecking: boolean;
  error: string | null;
  suggestions: string[];
}

// A mesma lista fica no create_profile de deploy/vpsavila/migrations/2026-10-26-varios-perfis.sql
// (conferida em src/lib/variosPerfisMigration.test.ts). Mudou aqui, mude lá e no linkhub_schema.sql.
export const RESERVED_USERNAMES = [
  'admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'dashboard',
  'analytics', 'settings', 'profile', 'user', 'users', 'auth',
  'login', 'register', 'signup', 'signin', 'logout', 'home',
  'about', 'contact', 'help', 'support', 'terms', 'privacy',
  'blog', 'news', 'app', 'mobile', 'web', 'site', 'page',
  'linkhub', 'link', 'links', 'hub', 'tree', 'bio', 'me'
];

/**
 * Valida o formato, os nomes reservados e a disponibilidade de um @username.
 * `currentProfileId`: o @ que já é desse perfil conta como disponível. Sem ele (perfil novo),
 * um @ gravado em qualquer perfil, inclusive outro da mesma conta, está em uso.
 */
export const useUsernameValidation = (
  username: string,
  debounceMs: number = 500,
  currentProfileId?: string | null,
) => {
  const [result, setResult] = useState<UsernameValidationResult>({
    isValid: false,
    isAvailable: false,
    isChecking: false,
    error: null,
    suggestions: []
  });

  const validateUsername = useCallback(async (usernameToCheck: string) => {
    // Reset state
    setResult(prev => ({ ...prev, isChecking: true, error: null, suggestions: [] }));

    // Basic validation
    if (!usernameToCheck) {
      setResult({
        isValid: false,
        isAvailable: false,
        isChecking: false,
        error: null,
        suggestions: []
      });
      return;
    }

    // Username format validation
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(usernameToCheck)) {
      setResult({
        isValid: false,
        isAvailable: false,
        isChecking: false,
        error: 'Username deve ter 3-20 caracteres (apenas letras minúsculas, números e underscore)',
        suggestions: []
      });
      return;
    }

    if (RESERVED_USERNAMES.includes(usernameToCheck.toLowerCase())) {
      const suggestions = generateSuggestions(usernameToCheck);
      setResult({
        isValid: false,
        isAvailable: false,
        isChecking: false,
        error: 'Este username é reservado pelo sistema',
        suggestions
      });
      return;
    }

    try {
      // Check if username exists in database
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', usernameToCheck);

      if (error) {
        console.error('Error checking username:', error);
        setResult({
          isValid: false,
          isAvailable: false,
          isChecking: false,
          error: 'Erro ao verificar disponibilidade do username',
          suggestions: []
        });
        return;
      }

      // Disponível se ninguém usa, ou se quem usa é o próprio perfil
      const existingProfile = data && data.length > 0 ? data[0] : null;
      const isAvailable = !existingProfile || (!!currentProfileId && existingProfile.id === currentProfileId);
      const suggestions = isAvailable ? [] : generateSuggestions(usernameToCheck);

      setResult({
        isValid: true,
        isAvailable,
        isChecking: false,
        error: isAvailable ? null : 'Este username já está em uso',
        suggestions
      });

    } catch (error) {
      console.error('Username validation error:', error);
      setResult({
        isValid: false,
        isAvailable: false,
        isChecking: false,
        error: 'Erro ao verificar username',
        suggestions: []
      });
    }
  }, [currentProfileId]);

  const generateSuggestions = (baseUsername: string): string[] => {
    const suggestions: string[] = [];
    const base = baseUsername.toLowerCase();

    // Add numbers
    for (let i = 1; i <= 99; i++) {
      suggestions.push(`${base}${i}`);
      if (suggestions.length >= 3) break;
    }

    // Add underscores
    suggestions.push(`${base}_`);
    suggestions.push(`_${base}`);

    // Add common suffixes
    const suffixes = ['official', 'real', 'pro', 'dev', 'hub'];
    suffixes.forEach(suffix => {
      if (suggestions.length < 5) {
        suggestions.push(`${base}_${suffix}`);
      }
    });

    return suggestions.slice(0, 5);
  };

  // Debounced validation
  useEffect(() => {
    if (!username) {
      setResult({
        isValid: false,
        isAvailable: false,
        isChecking: false,
        error: null,
        suggestions: []
      });
      return;
    }

    const timeoutId = setTimeout(() => {
      validateUsername(username);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [username, debounceMs, validateUsername]);

  return result;
};
```

(Saíram o `useAuth` e o `console.log` que mostrava o `currentUserId`.)

Em `src/components/ui/username-input.tsx`:
- na interface `UsernameInputProps`, depois de `disabled?: boolean;`, acrescente:

```ts
  /** Perfil que está sendo editado: o @ dele conta como disponível. Sem ele, é um perfil novo. */
  currentProfileId?: string | null;
```

- troque `  disabled = false\n}) => {` por `  disabled = false,\n  currentProfileId,\n}) => {`;
- troque `  const validation = useUsernameValidation(value);` por `  const validation = useUsernameValidation(value, 500, currentProfileId);`.

- [ ] **Passo 4: rodar e ver passar**

```powershell
npx vitest run src/hooks/useUsernameValidation.test.ts src/lib/variosPerfisMigration.test.ts
```

Esperado: 5 + 14 passando.

- [ ] **Passo 5: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
git add -- src/hooks/useUsernameValidation.test.ts
git commit -m "Validação do @ pelo perfil atual" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/hooks/useUsernameValidation.ts src/hooks/useUsernameValidation.test.ts src/components/ui/username-input.tsx
```

Esperado: 47 arquivos e 682 testes. Os chamadores atuais (`SettingsTab`) continuam compilando, porque o parâmetro é opcional; a Tarefa 7 passa o id.

---

### Tarefa 7: aba Perfil (`SettingsTab`) no perfil atual

**Especificação:** "Nada vaza entre perfis" (`resetKey`), tabela "Onde o perfil atual substitui `user.id`" (linha `SettingsTab`) e "A pasta do Storage passa a ser a do perfil".

O `profile` recebido por prop é o perfil atual (o `Dashboard` passa o `currentProfile`).

**Arquivos:**
- Modificar: `src/components/dashboard/SettingsTab.tsx`
- Modificar: `src/components/dashboard/SettingsTab.test.tsx`

- [ ] **Passo 1: ajustar o teste para o perfil `p1` e acrescentar os casos novos (falham)**

Em `src/components/dashboard/SettingsTab.test.tsx`:

1. Depois de `import { SettingsTab } from './SettingsTab';`, acrescente `import { AVATARS_PUBLIC_PREFIX } from '@/lib/avatarStorage';`.
2. No `vi.hoisted`, troque a linha do `autosave` por:

```ts
    autosave: null as null | { data: unknown; save: (data: unknown) => Promise<void>; resetKey: unknown },
    // Coluna e valor do .eq() de cada update de profiles
    profileEq: vi.fn(),
    // Argumentos de cada chamada ao useUsernameValidation (da aba e do UsernameInput)
    usernameArgs: [] as unknown[][],
```

3. Troque o mock do `useUsernameValidation` por:

```ts
vi.mock('@/hooks/useUsernameValidation', () => ({
  useUsernameValidation: (...args: unknown[]) => {
    mocks.usernameArgs.push(args);
    return { isValid: true, isAvailable: true, isChecking: false, error: null, suggestions: [] };
  },
}));
```

4. Troque o mock do `useAutosave` por:

```ts
vi.mock('@/hooks/useAutosave', () => ({
  useAutosave: (data: unknown, save: (data: unknown) => Promise<void>, _delay: number, _enabled: boolean, resetKey: unknown) => {
    mocks.autosave = { data, save, resetKey };
    return 'idle';
  },
}));
```

5. No mock de `@/lib/supabase`, troque `    from: vi.fn(() => ({ update: (values: unknown) => ({ eq: async () => mocks.profileUpdate(values) }) })),` por:

```ts
    from: vi.fn(() => ({
      update: (values: unknown) => ({
        eq: async (column: string, value: unknown) => {
          mocks.profileEq(column, value);
          return mocks.profileUpdate(values);
        },
      }),
    })),
```

6. Troque `const AVATAR_URL = 'https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-avatars/u1/123.jpg';` por `` const AVATAR_URL = `${AVATARS_PUBLIC_PREFIX}p1/123.jpg`; ``.
7. No `beforeEach`, troque o `getPublicUrl` por:

```ts
  mocks.storage.getPublicUrl.mockReset().mockImplementation((path: string) => ({
    data: { publicUrl: `${AVATARS_PUBLIC_PREFIX}${path}` },
  }));
```

e, logo depois de `  mocks.profileUpdate.mockReset().mockReturnValue({ error: null });`, acrescente:

```ts
  mocks.profileEq.mockReset();
  mocks.usernameArgs = [];
```

8. No `renderTab`, troque `profile={{ username: 'dna', full_name: 'Daniel', avatar_url: avatarUrl }}` por `profile={{ id: 'p1', username: 'dna', full_name: 'Daniel', avatar_url: avatarUrl }}`.
9. Troque (todas as ocorrências): `/^u1\/\d+\.png$/` por `/^p1\/\d+\.png$/`, `/^u1\/\d+\.jpg$/` por `/^p1\/\d+\.jpg$/` e `['u1/123.jpg']` por `['p1/123.jpg']` (três vezes).
10. No teste "PNG do recorte…", troque `` avatar_url: `https://supabase-api.avila.ia.br/storage/v1/object/public/linkhub-avatars/${path}`, `` por `` avatar_url: `${AVATARS_PUBLIC_PREFIX}${path}`, ``.
11. No `describe('SettingsTab, QR code e link público', …)`, acrescente `id: 'p1', ` no começo de cada objeto `profile` (`const base = { id: 'p1', username: 'dna', … }` e os dois `render` com `profile={{ … }}`).
12. No fim do `describe('SettingsTab, foto de perfil', …)`, acrescente:

```tsx
  it('foto do Google não é apagada do bucket', async () => {
    renderTab('https://lh3.googleusercontent.com/a/foto=s96-c');
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Imagem removida' })));
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });

  it('foto da pasta de outro perfil não é apagada do bucket', async () => {
    renderTab(`${AVATARS_PUBLIC_PREFIX}p2/123.jpg`);
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Imagem removida' })));
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });
```

13. No fim do arquivo, acrescente:

```tsx
describe('SettingsTab, perfil atual', () => {
  it('o salvamento automático grava no perfil recebido e usa o id dele como resetKey', async () => {
    renderTab();
    expect(mocks.autosave!.resetKey).toBe('p1');

    fireEvent.click(screen.getByRole('switch', { name: 'Exibir QR code no perfil público' }));
    await act(async () => {
      await mocks.autosave!.save(mocks.autosave!.data);
    });

    expect(mocks.profileEq).toHaveBeenCalledWith('id', 'p1');
    expect(mocks.profileEq).not.toHaveBeenCalledWith('id', 'u1');
  });

  it('a foto nova vai para a pasta do perfil e é gravada nele', async () => {
    await applyPngFromCurrentAvatar();

    await waitFor(() => expect(mocks.profileEq).toHaveBeenCalledWith('id', 'p1'));
    const [path] = mocks.storage.upload.mock.calls[0] as [string];
    expect(path.startsWith('p1/')).toBe(true);
  });

  it('valida o @ com o id do perfil atual', () => {
    renderTab();
    expect(mocks.usernameArgs.length).toBeGreaterThan(0);
    for (const args of mocks.usernameArgs) {
      expect(args[0]).toBe('dna');
      expect(args[2]).toBe('p1');
    }
  });
});
```

- [ ] **Passo 2: confirmar a falha**

```powershell
npx vitest run src/components/dashboard/SettingsTab.test.tsx
```

Esperado: falham os caminhos `p1/…`, o `resetKey`, o `.eq('id', 'p1')`, o `currentProfileId` e as duas fotos que não podem ser apagadas.

- [ ] **Passo 3: implementar**

Em `src/components/dashboard/SettingsTab.tsx`:

1. Depois de `import { supabase, AVATARS_BUCKET } from '@/lib/supabase';`, acrescente `import { avatarPathFromUrl } from '@/lib/avatarStorage';`.
2. Troque:

```ts
  // Username validation
  const usernameValidation = useUsernameValidation(formData.username);
```

por:

```ts
  // O @ que já é deste perfil conta como disponível
  const usernameValidation = useUsernameValidation(formData.username, 500, profile?.id);
```

3. Troque `    if (!user) return false;` por `    if (!profile?.id) return false;` e `  }, [user, formData.username, usernameValidation.isValid, usernameValidation.isAvailable]);` por `  }, [profile?.id, formData.username, usernameValidation.isValid, usernameValidation.isAvailable]);`.
4. Troque:

```ts
  const handleAutosave = useCallback(async (data: typeof formData) => {
    if (!user) return;
```

por:

```ts
  const handleAutosave = useCallback(async (data: typeof formData) => {
    if (!profile?.id) return;
```

5. Troque:

```ts
        user_type: data.user_type || null,
      })
      .eq('id', user.id);
```

por:

```ts
        user_type: data.user_type || null,
      })
      .eq('id', profile.id);
```

6. Troque `  }, [user, toast, onProfileUpdate]);` por `  }, [profile?.id, toast, onProfileUpdate]);`.
7. Troque `  const autosaveStatus = useAutosave(formData, handleAutosave, 1500, canAutosave);` por:

```ts
  // resetKey: os dados de outro perfil nunca são salvos neste (a aba também remonta pela key)
  const autosaveStatus = useAutosave(formData, handleAutosave, 1500, canAutosave, profile?.id);
```

8. Troque `    if (!file || !user) return;` por `    if (!file || !profile?.id) return;`.
9. Troque:

```ts
  // Falha ao apagar a foto antiga não desfaz a troca: só fica registrada no console
  const removeOldAvatar = async (oldAvatarUrl: string) => {
    if (!user || !oldAvatarUrl || !oldAvatarUrl.includes('supabase')) return;
    const oldFileName = oldAvatarUrl.split('/').pop();
    if (!oldFileName) return;
    try {
      const { error } = await supabase.storage.from(AVATARS_BUCKET).remove([`${user.id}/${oldFileName}`]);
```

por:

```ts
  // Falha ao apagar a foto antiga não desfaz a troca: só fica registrada no console.
  // Só sai do bucket a foto da pasta deste perfil; a do Google ou de outro perfil fica como está.
  const removeOldAvatar = async (oldAvatarUrl: string) => {
    const oldPath = avatarPathFromUrl(oldAvatarUrl, profile?.id);
    if (!oldPath) return;
    try {
      const { error } = await supabase.storage.from(AVATARS_BUCKET).remove([oldPath]);
```

10. No `handleCropComplete`, troque:

```ts
    closeCropDialog();
    if (!user) return;
```

por:

```ts
    closeCropDialog();
    const profileId = profile?.id;
    if (!profileId) return;
```

e, mais abaixo, `` const filePath = `${user.id}/${fileName}`; `` por `` const filePath = `${profileId}/${fileName}`; `` e

```ts
        .update({ avatar_url: newAvatarUrl })
        .eq('id', user.id);
```

por:

```ts
        .update({ avatar_url: newAvatarUrl })
        .eq('id', profileId);
```

11. No `handleDeleteImage`, troque `    if (!user || !formData.avatar_url) return;` por `    if (!profile?.id || !formData.avatar_url) return;` e:

```ts
      // Delete from storage if it's a supabase URL
      if (formData.avatar_url.includes('supabase')) {
        const fileName = formData.avatar_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from(AVATARS_BUCKET)
            .remove([`${user.id}/${fileName}`]);
        }
      }
```

por:

```ts
      // Só apaga do bucket a foto que está na pasta deste perfil
      const path = avatarPathFromUrl(formData.avatar_url, profile.id);
      if (path) {
        await supabase.storage.from(AVATARS_BUCKET).remove([path]);
      }
```

12. No `<UsernameInput`, depois de `            placeholder="seuusername"`, acrescente `            currentProfileId={profile?.id}`.

O `useAuth` continua: a aba usa `user?.email` na inicial do avatar.

- [ ] **Passo 4: rodar e ver passar**

```powershell
npx vitest run src/components/dashboard/SettingsTab.test.tsx
```

Esperado: todos passando (5 testes novos).

- [ ] **Passo 5: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
git commit -m "Aba Perfil grava no perfil atual e usa a pasta dele no Storage" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/dashboard/SettingsTab.tsx src/components/dashboard/SettingsTab.test.tsx
```

Esperado: 47 arquivos e 687 testes.

---

### Tarefa 8: aba Design no perfil atual

**Especificação:** "Nada vaza entre perfis" (`DesignTab`) e "Testes > Novos > `DesignTab.test.tsx`".

**Arquivos:**
- Modificar: `src/components/dashboard/DesignTab.tsx`
- Criar: `src/components/dashboard/DesignTab.test.tsx`

- [ ] **Passo 1: teste (falha)**

`src/components/dashboard/DesignTab.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ONBOARDING_TEMPLATES } from './onboardingTemplates';
import { createDefaultCustomTheme, useDesignStore } from '@/stores/useDesignStore';
import { getBackgroundEditorColors } from '@/utils/profileAppearance';
import { DesignTab } from './DesignTab';

const mocks = vi.hoisted(() => ({ update: vi.fn(), toast: vi.fn() }));

// Se a aba ainda usar a conta, grava em 'u1' e o teste de gravação acusa
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      update: (values: unknown) => ({
        eq: async (column: string, value: unknown) => mocks.update(table, values, column, value),
      }),
    })),
  },
}));

const PEACH = ONBOARDING_TEMPLATES.find((t) => t.id === 'warm-peach')!;
const COM_TEMA = { id: 'p1', theme_options: { themeId: 'warm-peach', custom: PEACH.config } };
const SEM_TEMA = { id: 'p2', theme_options: {} };

const peach = () => screen.getByRole('button', { name: 'Modelo Peach' });
const corPrincipal = () => (screen.getByPlaceholderText('#111827') as HTMLInputElement).value;

beforeEach(() => {
  mocks.update.mockReset().mockReturnValue({ error: null });
  mocks.toast.mockReset();
  useDesignStore.getState().resetDesign();
});
afterEach(() => cleanup());

describe('DesignTab', () => {
  it('começa pelo tema salvo do perfil', () => {
    render(<DesignTab key={COM_TEMA.id} profile={COM_TEMA} onProfileUpdate={vi.fn()} />);
    expect(peach().getAttribute('aria-pressed')).toBe('true');

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Personalizado/ }));
    expect(corPrincipal()).toBe(getBackgroundEditorColors(PEACH.config.background).primary);
  });

  it('na troca, o perfil sem tema começa no padrão, sem herdar o tema do anterior', () => {
    const { rerender } = render(<DesignTab key={COM_TEMA.id} profile={COM_TEMA} onProfileUpdate={vi.fn()} />);
    expect(peach().getAttribute('aria-pressed')).toBe('true');

    // O store ainda tem o tema do perfil anterior, como no painel antes do contexto aplicar o novo
    useDesignStore.getState().setCustomTheme(PEACH.config);
    rerender(<DesignTab key={SEM_TEMA.id} profile={SEM_TEMA} onProfileUpdate={vi.fn()} />);

    for (const button of screen.getAllByRole('button', { name: /^Modelo / })) {
      expect(button.getAttribute('aria-pressed')).toBe('false');
    }
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Personalizado/ }));
    expect(corPrincipal()).toBe(getBackgroundEditorColors(createDefaultCustomTheme().background).primary);
  });

  it('"Salvar Modelo" grava no perfil recebido', async () => {
    const onProfileUpdate = vi.fn();
    render(<DesignTab key={SEM_TEMA.id} profile={SEM_TEMA} onProfileUpdate={onProfileUpdate} />);
    fireEvent.click(peach());
    fireEvent.click(screen.getByRole('button', { name: /Salvar Modelo/ }));

    await waitFor(() => expect(onProfileUpdate).toHaveBeenCalled());
    expect(mocks.update).toHaveBeenCalledWith(
      'profiles',
      expect.objectContaining({ theme_options: expect.objectContaining({ themeId: 'warm-peach' }) }),
      'id',
      'p2',
    );
  });
});
```

- [ ] **Passo 2: confirmar a falha**

```powershell
npx vitest run src/components/dashboard/DesignTab.test.tsx
```

Esperado: "na troca…" falha (a cor vem do store, que ainda tem o Peach) e "Salvar Modelo" falha (grava em `'u1'`).

- [ ] **Passo 3: implementar**

Em `src/components/dashboard/DesignTab.tsx`:

1. Troque `import React, { useState, useEffect } from 'react';` por `import React, { useState } from 'react';`.
2. Apague a linha `import { useAuth } from '@/contexts/AuthContext';`.
3. Troque `import { useDesignStore, ThemeConfig } from '@/stores/useDesignStore';` por `import { createDefaultCustomTheme, DEFAULT_THEME_ID, useDesignStore, ThemeConfig } from '@/stores/useDesignStore';` e `import { PREDEFINED_THEMES } from '@/utils/themes';` por `import { PREDEFINED_THEMES, resolveThemeConfig } from '@/utils/themes';`.
4. Logo antes de `export const DesignTab: React.FC<DesignTabProps> = ({ profile, onProfileUpdate }) => {`, acrescente:

```ts
/** Tema salvo do perfil para iniciar o editor. Sem tema salvo, o padrão (nada vem do perfil anterior). */
function initialDesignOf(profile: any): { themeId: string; config: ThemeConfig } {
  const raw = profile?.theme_options;
  const options = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, any>) : null;
  const config = resolveThemeConfig(options);
  if (!config) return { themeId: DEFAULT_THEME_ID, config: createDefaultCustomTheme() };
  return { themeId: options.themeId || 'custom', config };
}
```

5. Troque:

```ts
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentTheme, customTheme, setCurrentTheme, setCustomTheme } = useDesignStore();
  const [selectedTheme, setSelectedTheme] = useState('pebble-blue');
  const [customConfig, setCustomConfig] = useState<ThemeConfig>(customTheme);
```

por:

```ts
  const { toast } = useToast();
  const { setCurrentTheme, setCustomTheme } = useDesignStore();
  // Começa pelo tema salvo deste perfil. O Dashboard remonta a aba ao trocar de perfil (key),
  // e o CurrentProfileContext aplica o tema no store; nada do perfil anterior fica aqui.
  const [initialDesign] = useState(() => initialDesignOf(profile));
  const [selectedTheme, setSelectedTheme] = useState(initialDesign.themeId);
  const [customConfig, setCustomConfig] = useState<ThemeConfig>(initialDesign.config);
```

6. Apague o efeito inteiro (e a linha em branco depois dele):

```ts
  useEffect(() => {
    if (profile?.theme_options) {
      const themeOptions = profile.theme_options;
      if (themeOptions.themeId) {
        setSelectedTheme(themeOptions.themeId);
        setCurrentTheme(themeOptions.themeId);
      }
      if (themeOptions.custom) {
        setCustomTheme(themeOptions.custom);
        setCustomConfig(themeOptions.custom);
      }
    }
  }, [profile, setCurrentTheme, setCustomTheme]);
```

7. No `handleSaveTheme`, troque `    if (!user) return;` por `    if (!profile?.id) return;` e `      .eq('id', user.id);` por `      .eq('id', profile.id);`.

- [ ] **Passo 4: rodar e ver passar**

```powershell
npx vitest run src/components/dashboard/DesignTab.test.tsx
```

Esperado: 3 passando.

- [ ] **Passo 5: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
git add -- src/components/dashboard/DesignTab.test.tsx
git commit -m "Aba Design começa pelo tema do perfil atual e grava nele" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/dashboard/DesignTab.tsx src/components/dashboard/DesignTab.test.tsx
```

Esperado: 48 arquivos e 690 testes.

---

### Tarefa 9: links, edição de link e prévia no perfil atual

**Especificação:** tabela "Onde o perfil atual substitui `user.id`" (`LinksTab`, `EditLinkDialog`, `ProfilePreview`) e "A pasta do Storage passa a ser a do perfil".

**Arquivos:**
- Modificar: `src/components/dashboard/LinksTab.tsx`, `src/components/dashboard/LinksTab.test.tsx`
- Modificar: `src/components/dashboard/links/EditLinkDialog.tsx`, `src/components/dashboard/links/EditLinkDialog.test.tsx`
- Modificar: `src/components/dashboard/ProfilePreview.tsx`, `src/components/dashboard/ProfilePreview.test.tsx`

- [ ] **Passo 1: ajustar os testes (falham)**

`src/components/dashboard/links/EditLinkDialog.test.tsx`: troque **todas** as ocorrências de `userId` por `profileId` e de `u1` por `p1` (as de `u1` são só ids e caminhos: `OLD_UPLOAD_PATH`, `profileId="p1"`, as regex `p1\/5-…` e `B_UPLOAD_URL`). O teste "userId vazio no upload rejeita cedo" passa a se chamar "profileId vazio no upload rejeita cedo" e usa `{ profileId: '' }`.

`src/components/dashboard/LinksTab.test.tsx`:
1. Troque `` const UPLOAD_URL = `${LINK_ICONS_PUBLIC_PREFIX}u1/7-123.png`; `` por `` const UPLOAD_URL = `${LINK_ICONS_PUBLIC_PREFIX}p1/7-123.png`; ``.
2. No `vi.hoisted`, depois de `    select: vi.fn(),`, acrescente `    selectEq: vi.fn(),`.
3. Apague o mock de `@/contexts/AuthContext` (a aba não usa mais a conta).
4. Troque o `select` do mock do Supabase por:

```ts
      select: () => ({
        eq: (column: string, value: unknown) => {
          mocks.selectEq(column, value);
          return {
            order: async () => {
              mocks.select();
              return { data: mocks.links, error: null };
            },
          };
        },
      }),
```

5. No `beforeEach`, depois de `  mocks.select.mockReset();`, acrescente `  mocks.selectEq.mockReset();`.
6. No `renderTab`, troque `profile={{ username: 'dna' }}` por `profile={{ id: 'p1', username: 'dna' }}`.
7. Troque `['u1/7-123.png']` por `['p1/7-123.png']` e `user_id: 'u1',` por `user_id: 'p1',`.
8. Troque o teste `'upload de outro usuário não é apagado'` por:

```tsx
  it('ícone na pasta de outro perfil não é apagado', async () => {
    (mocks.links[2] as { icon_value: string }).icon_value = `${LINK_ICONS_PUBLIC_PREFIX}p2/7-123.png`;
    await renderTab();
    fireEvent.click(screen.getAllByRole('button', { name: 'Excluir link' })[2]);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Link removido' })));
    expect(mocks.deleteEq).toHaveBeenCalledWith('id', 7);
    expect(mocks.storage.remove).not.toHaveBeenCalled();
  });
```

9. No começo do `describe('LinksTab', …)`, acrescente:

```tsx
  it('lista os links do perfil recebido', async () => {
    await renderTab();
    expect(mocks.selectEq).toHaveBeenCalledWith('user_id', 'p1');
  });
```

`src/components/dashboard/ProfilePreview.test.tsx`:
1. Depois dos imports, acrescente `const mocks = vi.hoisted(() => ({ eq: vi.fn() }));`.
2. No mock de `@/lib/supabase`, troque `  chain.eq = () => chain;` por:

```ts
  chain.eq = (...args: unknown[]) => {
    mocks.eq(...args);
    return chain;
  };
```

3. No `beforeEach`, acrescente `  mocks.eq.mockClear();`.
4. Troque todas as ocorrências de `profile={{ full_name: 'Daniel', username: 'dna'` por `profile={{ id: 'p1', full_name: 'Daniel', username: 'dna'`; `profile={{ username: 'dna' }}` por `profile={{ id: 'p1', username: 'dna' }}`; e `profile={{ full_name: 'Daniel' }} headerEnd` por `profile={{ id: 'p1', full_name: 'Daniel' }} headerEnd`.
5. No fim do `describe('ProfilePreview', …)`, acrescente:

```tsx
  it('busca os links do perfil recebido, não da conta', async () => {
    render(<ProfilePreview profile={{ id: 'p1', full_name: 'Daniel', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'p1');
    expect(mocks.eq).not.toHaveBeenCalledWith('user_id', 'u1');
  });

  it('outro perfil recebido busca os links dele', async () => {
    const { rerender } = render(<ProfilePreview profile={{ id: 'p1', username: 'dna' }} />);
    await screen.findByRole('button', { name: /Meu site/ });
    rerender(<ProfilePreview profile={{ id: 'p2', username: 'loja' }} />);

    await waitFor(() => expect(mocks.eq).toHaveBeenCalledWith('user_id', 'p2'));
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it('sem id de perfil não busca links', () => {
    render(<ProfilePreview profile={{ full_name: 'Daniel' }} />);
    expect(supabase.from).not.toHaveBeenCalled();
  });
```

- [ ] **Passo 2: confirmar a falha**

```powershell
npx vitest run src/components/dashboard/LinksTab.test.tsx src/components/dashboard/links/EditLinkDialog.test.tsx src/components/dashboard/ProfilePreview.test.tsx
```

Esperado: `LinksTab` falha (sem `useAuth` mockado, e caminhos `p1`); `EditLinkDialog` falha nos caminhos `p1/…` (a prop `profileId` ainda não existe); `ProfilePreview` falha nos três testes novos.

- [ ] **Passo 3: implementar**

`src/components/dashboard/links/EditLinkDialog.tsx`: troque **todas** as ocorrências de `userId` por `profileId` (isso troca também `userIdRef` por `profileIdRef`). Depois, na interface, troque a linha `  profileId: string;` por:

```ts
  /** Pasta do perfil no bucket dos ícones: <profileId>/<link_id>-<ts>.<ext>. */
  profileId: string;
```

`src/components/dashboard/LinksTab.tsx`:
1. Apague `import { useAuth } from '@/contexts/AuthContext';`.
2. Troque:

```ts
export const LinksTab: React.FC<LinksTabProps> = ({ profile, onProfileUpdate }) => {
  const { user } = useAuth();
```

por:

```ts
export const LinksTab: React.FC<LinksTabProps> = ({ profile, onProfileUpdate }) => {
  // Perfil atual: os links e a pasta dos ícones são dele (links.user_id guarda o id do perfil)
  const profileId: string | undefined = profile?.id;
```

3. Troque:

```ts
  useEffect(() => {
    if (user) {
      loadLinks();
    }
  }, [user]);

  const loadLinks = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', user.id)
      .order('position');
```

por:

```ts
  useEffect(() => {
    if (profileId) {
      loadLinks();
    }
  }, [profileId]);

  const loadLinks = async () => {
    if (!profileId) return;

    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', profileId)
      .order('position');
```

4. Troque `    if (!user) return false;` por `    if (!profileId) return false;` e `        user_id: user.id,` por `        user_id: profileId,`.
5. Troque:

```ts
      if (link.icon_type === 'upload' && user) {
        const path = linkIconPathFromUrl(link.icon_value, user.id, LINK_ICONS_PUBLIC_PREFIX);
```

por:

```ts
      if (link.icon_type === 'upload' && profileId) {
        const path = linkIconPathFromUrl(link.icon_value, profileId, LINK_ICONS_PUBLIC_PREFIX);
```

6. Troque `        userId={user?.id ?? ''}` por `        profileId={profileId ?? ''}` e `profileId={user!.id}` por `profileId={profileId ?? ''}`.

`src/components/dashboard/ProfilePreview.tsx`:
1. Troque:

```ts
  const { user } = useAuth();
  const userId = user?.id;
```

por:

```ts
  const { user } = useAuth();
  // Links do perfil recebido (o atual), não da conta. A conta só dá o nome reserva (e-mail).
  const profileId: string | undefined = profile?.id;
```

2. Troque:

```ts
  // Links: ao montar, quando o usuário muda e no evento linksUpdated. Mudar o tema não busca de novo.
  useEffect(() => {
    if (!userId) return;
```

por:

```ts
  // Links: ao montar, quando o perfil muda e no evento linksUpdated. Mudar o tema não busca de novo.
  useEffect(() => {
    if (!profileId) return;
```

3. Troque `        .eq('user_id', userId)` por `        .eq('user_id', profileId)` e `  }, [userId]);` por `  }, [profileId]);`.

- [ ] **Passo 4: rodar e ver passar**

```powershell
npx vitest run src/components/dashboard/LinksTab.test.tsx src/components/dashboard/links/EditLinkDialog.test.tsx src/components/dashboard/ProfilePreview.test.tsx
```

Esperado: tudo passando (1 teste novo no `LinksTab`, 3 no `ProfilePreview`).

- [ ] **Passo 5: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
npm run build
git commit -m "Links, edição e prévia no perfil atual, com ícones na pasta do perfil" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/dashboard/LinksTab.tsx src/components/dashboard/LinksTab.test.tsx src/components/dashboard/links/EditLinkDialog.tsx src/components/dashboard/links/EditLinkDialog.test.tsx src/components/dashboard/ProfilePreview.tsx src/components/dashboard/ProfilePreview.test.tsx
```

Esperado: 48 arquivos e 694 testes; build verde.

---

### Tarefa 10: Analytics por perfil e remoção do `useAnalyticsData`

**Especificação:** tabela "Onde o perfil atual substitui `user.id`" (`Analytics.tsx`, `useAnalyticsData.ts`).

**Arquivos:**
- Modificar: `src/pages/Analytics.tsx`
- Criar: `src/pages/Analytics.test.tsx`
- Remover: `src/hooks/useAnalyticsData.ts`

- [ ] **Passo 1: teste (falha)**

`src/pages/Analytics.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import Analytics from './Analytics';

const mocks = vi.hoisted(() => ({
  calls: [] as unknown[][],
  current: { id: 'p2' } as { id: string } | null,
  navigate: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => {
  const user = { id: 'u1' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/contexts/CurrentProfileContext', () => ({
  useCurrentProfile: () => ({ currentProfile: mocks.current }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
// Gráficos e mapas não interessam aqui: só as consultas
vi.mock('recharts', () => {
  const Nada = () => null;
  return {
    LineChart: Nada, Line: Nada, AreaChart: Nada, Area: Nada, XAxis: Nada, YAxis: Nada, CartesianGrid: Nada,
    Tooltip: Nada, ResponsiveContainer: Nada, BarChart: Nada, Bar: Nada, PieChart: Nada, Pie: Nada, Cell: Nada,
  };
});
vi.mock('@/components/analytics/WorldHeatmap', () => ({ default: () => null }));
vi.mock('@/components/analytics/SimpleWorldMap', () => ({ SimpleWorldMap: () => null }));
vi.mock('@/components/analytics/ActivityHeatmap', () => ({ ActivityHeatmap: () => null }));
vi.mock('@/components/analytics/InsightsPanel', () => ({ InsightsPanel: () => null, useAnalyticsInsights: () => [] }));
vi.mock('@/lib/supabase', () => {
  // Cada encadeamento registra [tabela, método, ...argumentos] e resolve com lista vazia
  const query = (table: string) => {
    const q: any = {};
    for (const method of ['select', 'eq', 'gte', 'lte', 'order']) {
      q[method] = (...args: unknown[]) => {
        mocks.calls.push([table, method, ...args]);
        return q;
      };
    }
    q.then = (resolve: (value: unknown) => void) => resolve({ data: [], error: null });
    return q;
  };
  return { supabase: { from: (table: string) => query(table) } };
});

const eqCalls = () => mocks.calls.filter((call) => call[1] === 'eq');

beforeEach(() => {
  mocks.calls = [];
  mocks.current = { id: 'p2' };
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Analytics por perfil', () => {
  it('busca visitas, cliques e links do perfil atual', async () => {
    render(<Analytics />);
    expect(await screen.findByText('Analytics')).toBeTruthy();

    expect(eqCalls()).toContainEqual(['profile_views', 'eq', 'profile_id', 'p2']);
    expect(eqCalls()).toContainEqual(['link_clicks', 'eq', 'profile_id', 'p2']);
    expect(eqCalls()).toContainEqual(['links', 'eq', 'user_id', 'p2']);
    expect(eqCalls().some((call) => call[3] === 'u1')).toBe(false);
  });

  it('trocar de perfil busca de novo com o id novo', async () => {
    const { rerender } = render(<Analytics />);
    await screen.findByText('Analytics');

    mocks.current = { id: 'p3' };
    rerender(<Analytics />);

    await waitFor(() => expect(eqCalls()).toContainEqual(['profile_views', 'eq', 'profile_id', 'p3']));
    expect(eqCalls()).toContainEqual(['links', 'eq', 'user_id', 'p3']);
  });

  it('sem perfil atual, não busca nada', async () => {
    mocks.current = null;
    render(<Analytics />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.calls).toHaveLength(0);
  });
});
```

- [ ] **Passo 2: confirmar a falha**

```powershell
npx vitest run src/pages/Analytics.test.tsx
```

Esperado: os dois primeiros falham (a página consulta com `'u1'`); o terceiro falha porque a página busca mesmo sem perfil.

- [ ] **Passo 3: implementar**

Em `src/pages/Analytics.tsx`:

1. Troque `import React, { useState, useEffect } from 'react';` por `import React, { useState, useEffect, useRef } from 'react';` e, depois de `import { useAuth } from '@/contexts/AuthContext';`, acrescente `import { useCurrentProfile } from '@/contexts/CurrentProfileContext';`.
2. Troque:

```ts
const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
```

por:

```ts
const Analytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Estatísticas do perfil atual (o seletor da sidebar troca)
  const { currentProfile } = useCurrentProfile();
  const profileId = currentProfile?.id ?? null;
  // Só a carga mais recente mexe na tela: trocar de perfil ou de período descarta a anterior
  const requestRef = useRef(0);
```

3. Troque:

```ts
    loadAnalytics();
  }, [user, navigate, timeRange]);
```

por:

```ts
    if (!profileId) return;
    loadAnalytics(profileId);
  }, [user, navigate, timeRange, profileId]);
```

4. Troque:

```ts
  const loadAnalytics = async () => {
    if (!user) return;
    setLoading(true);
```

por:

```ts
  const loadAnalytics = async (id: string) => {
    const request = ++requestRef.current;
    setLoading(true);
```

5. Troque **todas** as ocorrências de `, user.id)` por `, id)` (são cinco: quatro `.eq('profile_id', …)` e um `.eq('user_id', …)`).
6. Troque `      // Calcular total de cliques somando os cliques de cada link` por:

```ts
      // Outra carga começou (troca de perfil ou de período): esta não mexe mais na tela
      if (request !== requestRef.current) return;

      // Calcular total de cliques somando os cliques de cada link
```

7. Troque:

```ts
    } finally {
      setLoading(false);
    }
```

por:

```ts
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
```

Remova o hook sem uso:

```powershell
git rm src/hooks/useAnalyticsData.ts
```

- [ ] **Passo 4: rodar e ver passar**

```powershell
npx vitest run src/pages/Analytics.test.tsx
git grep -n "useAnalyticsData" -- src
```

Esperado: 3 passando; o `git grep` não acha nada (e sai com código 1).

- [ ] **Passo 5: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
git add -- src/pages/Analytics.test.tsx
git commit -m "Analytics do perfil atual e remoção do useAnalyticsData sem uso" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/pages/Analytics.tsx src/pages/Analytics.test.tsx src/hooks/useAnalyticsData.ts
```

Esperado: 49 arquivos e 697 testes.

---

### Tarefa 11: onboarding aplicado ao perfil recebido

**Especificação:** "Nada vaza entre perfis" (`OnboardingDialog`), tabela (linha `OnboardingDialog`) e "Testes > Novos > `OnboardingDialog.test.tsx`".

**Arquivos:**
- Modificar: `src/components/dashboard/OnboardingDialog.tsx`
- Criar: `src/components/dashboard/OnboardingDialog.test.tsx`
- Modificar: `src/pages/Dashboard.tsx` (só passa a prop nova; a reescrita é da Tarefa 14)

- [ ] **Passo 1: teste (falha)**

`src/components/dashboard/OnboardingDialog.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AVATARS_PUBLIC_PREFIX } from '@/lib/avatarStorage';
import { OnboardingDialog } from './OnboardingDialog';

const mocks = vi.hoisted(() => {
  const storage = { upload: vi.fn(), getPublicUrl: vi.fn() };
  return {
    update: vi.fn(),
    insert: vi.fn(),
    toast: vi.fn(),
    storage,
    storageFrom: vi.fn(() => storage),
  };
});

// Dados do Google na conta: o onboarding não pode usá-los no lugar dos do perfil
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', user_metadata: { full_name: 'Nome do Google', avatar_url: 'https://lh3.googleusercontent.com/a/foto' } },
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/supabase', () => ({
  AVATARS_BUCKET: 'linkhub-avatars',
  supabase: {
    from: vi.fn((table: string) => ({
      update: (values: unknown) => ({
        eq: async (column: string, value: unknown) => mocks.update(table, values, column, value),
      }),
      insert: async (rows: unknown) => mocks.insert(table, rows),
    })),
    storage: { from: mocks.storageFrom },
  },
}));

const PROFILE = { id: 'p2', full_name: 'Minha loja', avatar_url: 'https://exemplo.com/foto.png' };

beforeEach(() => {
  mocks.update.mockReset().mockReturnValue({ error: null });
  mocks.insert.mockReset().mockReturnValue({ error: null });
  mocks.toast.mockReset();
  mocks.storageFrom.mockClear();
  mocks.storage.upload.mockReset().mockResolvedValue({ error: null });
  mocks.storage.getPublicUrl.mockReset().mockImplementation((path: string) => ({
    data: { publicUrl: `${AVATARS_PUBLIC_PREFIX}${path}` },
  }));
  URL.createObjectURL = vi.fn(() => 'blob:1');
});
afterEach(() => {
  cleanup();
  delete (URL as { createObjectURL?: unknown }).createObjectURL;
});

function renderDialog() {
  const onComplete = vi.fn();
  render(<OnboardingDialog open profile={PROFILE} onComplete={onComplete} />);
  return onComplete;
}

/** Passo 1 (tipo) → passo 2 (dados) → passo 3 (modelo, pulado) → passo 4 (plataformas). */
function goToPlatforms(beforeLeavingDetails?: () => void) {
  fireEvent.click(screen.getByRole('button', { name: /Pessoal/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
  beforeLeavingDetails?.();
  fireEvent.click(screen.getByRole('button', { name: /^Continuar/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Pular' }));
}

describe('OnboardingDialog', () => {
  it('usa o nome e a foto do perfil, grava em profile.id e cria os links nele', async () => {
    const onComplete = renderDialog();
    goToPlatforms(() => {
      expect((screen.getByPlaceholderText('Título do perfil') as HTMLInputElement).value).toBe('Minha loja');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Site' }));
    fireEvent.change(screen.getByPlaceholderText('https://seusite.com'), { target: { value: 'https://minhaloja.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Finalizar/ }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('personal'));
    expect(mocks.update).toHaveBeenCalledWith(
      'profiles',
      { user_type: 'personal', full_name: 'Minha loja', avatar_url: 'https://exemplo.com/foto.png' },
      'id',
      'p2',
    );
    expect(mocks.insert).toHaveBeenCalledWith('links', [
      { user_id: 'p2', title: 'Site', url: 'https://minhaloja.com', position: 0, is_visible: true },
    ]);
  });

  it('a foto enviada vai para a pasta do perfil', async () => {
    const onComplete = renderDialog();
    goToPlatforms(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })] } });
    });
    fireEvent.click(screen.getByRole('button', { name: /Começar sem links/ }));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    expect(mocks.storageFrom).toHaveBeenCalledWith('linkhub-avatars');
    const [path] = mocks.storage.upload.mock.calls[0] as [string];
    expect(path).toMatch(/^p2\/avatar-\d+\.jpg$/);
    expect(mocks.update).toHaveBeenCalledWith(
      'profiles',
      expect.objectContaining({ avatar_url: `${AVATARS_PUBLIC_PREFIX}${path}` }),
      'id',
      'p2',
    );
  });

  it('"Pular" no último passo também grava no perfil recebido', async () => {
    const onComplete = renderDialog();
    goToPlatforms();
    fireEvent.click(screen.getByRole('button', { name: 'Pular' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith('personal'));
    expect(mocks.update).toHaveBeenCalledWith('profiles', expect.objectContaining({ user_type: 'personal' }), 'id', 'p2');
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
```

- [ ] **Passo 2: confirmar a falha**

```powershell
npx vitest run src/components/dashboard/OnboardingDialog.test.tsx
```

Esperado: o nome vem "Nome do Google" e as gravações vão para `'u1'`.

- [ ] **Passo 3: implementar**

Em `src/components/dashboard/OnboardingDialog.tsx`:

1. Apague `import { useAuth } from '@/contexts/AuthContext';`.
2. Troque a interface por:

```ts
interface OnboardingDialogProps {
  open: boolean;
  /** Perfil que está sendo montado: nome, foto e gravações vêm dele, não da conta. */
  profile: { id: string; full_name?: string | null; avatar_url?: string | null } | null;
  onComplete: (userType: string) => void;
}
```

3. Troque:

```ts
export const OnboardingDialog: React.FC<OnboardingDialogProps> = ({ open, onComplete }) => {
  const { user } = useAuth();
```

por:

```ts
export const OnboardingDialog: React.FC<OnboardingDialogProps> = ({ open, profile, onComplete }) => {
```

4. Troque:

```ts
  const [profileName, setProfileName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '');
  const [profileBio, setProfileBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.user_metadata?.avatar_url || null);
```

por:

```ts
  // Do perfil, não do Google: o nome digitado em "Novo perfil" não pode ser sobrescrito
  const [profileName, setProfileName] = useState(profile?.full_name || '');
  const [profileBio, setProfileBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
```

5. Troque o `uploadAvatarIfNeeded` inteiro por:

```ts
  const uploadAvatarIfNeeded = async (): Promise<string | null> => {
    if (!profile) return null;

    // Arquivo escolhido: sobe para a pasta do perfil
    if (avatarFile) {
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${profile.id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from(AVATARS_BUCKET).upload(filePath, avatarFile);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath);
      return data.publicUrl;
    }

    // Avatar padrão escolhido, ou a foto que o perfil já tinha
    return avatarPreview;
  };
```

6. No `handleFinish`, troque `    if (!user || !selectedType) return;` por `    if (!profile || !selectedType) return;`, `        .eq('id', user.id);` por `        .eq('id', profile.id);` e `              user_id: user.id,` por `              user_id: profile.id,`.
7. No `handleSkip`, troque `    if (!user || !selectedType) return;` por `    if (!profile || !selectedType) return;` e `      const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);` por `      const { error } = await supabase.from('profiles').update(updateData).eq('id', profile.id);`.

Em `src/pages/Dashboard.tsx`, no `<OnboardingDialog`, depois de `          open={showOnboarding}`, acrescente `          profile={profile}`. É o `profile` que o `Dashboard` antigo ainda carrega; a Tarefa 14 troca pelo do contexto.

- [ ] **Passo 4: rodar e ver passar**

```powershell
npx vitest run src/components/dashboard/OnboardingDialog.test.tsx
```

Esperado: 3 passando.

- [ ] **Passo 5: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
git add -- src/components/dashboard/OnboardingDialog.test.tsx
git commit -m "Onboarding usa e grava o perfil recebido" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/dashboard/OnboardingDialog.tsx src/components/dashboard/OnboardingDialog.test.tsx src/pages/Dashboard.tsx
```

Esperado: 50 arquivos e 700 testes.

---
### Tarefa 12: diálogo "Novo perfil"

**Especificação:** "Criar perfil (`src/components/dashboard/NewProfileDialog.tsx`, novo)".

**Arquivos:**
- Criar: `src/components/dashboard/NewProfileDialog.tsx`, `src/components/dashboard/NewProfileDialog.test.tsx`

- [ ] **Passo 1: teste (falha)**

`src/components/dashboard/NewProfileDialog.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NewProfileDialog } from './NewProfileDialog';

const mocks = vi.hoisted(() => ({
  createProfile: vi.fn(),
  selectProfile: vi.fn(),
  toast: vi.fn(),
  validation: { isValid: true, isAvailable: true, isChecking: false, error: null, suggestions: [] } as {
    isValid: boolean;
    isAvailable: boolean;
    isChecking: boolean;
    error: string | null;
    suggestions: string[];
  },
  validationArgs: [] as unknown[][],
}));

vi.mock('@/contexts/CurrentProfileContext', () => ({
  MAX_PROFILES: 10,
  useCurrentProfile: () => ({ createProfile: mocks.createProfile, selectProfile: mocks.selectProfile }),
}));
vi.mock('@/hooks/useUsernameValidation', () => ({
  useUsernameValidation: (...args: unknown[]) => {
    mocks.validationArgs.push(args);
    return mocks.validation;
  },
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

beforeEach(() => {
  mocks.createProfile.mockReset();
  mocks.selectProfile.mockReset();
  mocks.toast.mockReset();
  mocks.validation = { isValid: true, isAvailable: true, isChecking: false, error: null, suggestions: [] };
  mocks.validationArgs = [];
});
afterEach(() => cleanup());

function renderDialog() {
  const onOpenChange = vi.fn();
  const onCreated = vi.fn();
  render(<NewProfileDialog open onOpenChange={onOpenChange} onCreated={onCreated} />);
  return { onOpenChange, onCreated };
}

function fill(username = 'loja', name = 'Minha loja') {
  fireEvent.change(screen.getByLabelText('@username'), { target: { value: username } });
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: name } });
}

const continuar = () => screen.getByRole('button', { name: /Continuar/ }) as HTMLButtonElement;

describe('NewProfileDialog', () => {
  it('"Continuar" só fica habilitado com o @ válido e disponível', () => {
    mocks.validation = { ...mocks.validation, isAvailable: false, error: 'Este username já está em uso' };
    renderDialog();
    expect(continuar().disabled).toBe(true);
    fill();
    expect(continuar().disabled).toBe(true);
  });

  it('cria o perfil, seleciona o novo e avisa o Dashboard', async () => {
    mocks.createProfile.mockResolvedValue({ ok: true, id: 'p9' });
    const { onOpenChange, onCreated } = renderDialog();
    fill('loja', '  Minha loja  ');
    fireEvent.click(continuar());

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('p9'));
    expect(mocks.createProfile).toHaveBeenCalledWith({ username: 'loja', full_name: 'Minha loja' });
    expect(mocks.selectProfile).toHaveBeenCalledWith('p9');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('valida o @ como perfil novo (sem perfil atual)', () => {
    renderDialog();
    fill();
    expect(mocks.validationArgs.length).toBeGreaterThan(0);
    for (const args of mocks.validationArgs) expect(args[2]).toBeUndefined();
  });

  it('@ em uso: aviso no campo, sem selecionar nada', async () => {
    mocks.createProfile.mockResolvedValue({ ok: false, error: 'taken' });
    renderDialog();
    fill();
    fireEvent.click(continuar());

    expect((await screen.findByRole('alert')).textContent).toBe('Este username já está em uso');
    expect(mocks.selectProfile).not.toHaveBeenCalled();
  });

  it('@ recusado pelo banco: aviso no campo', async () => {
    mocks.createProfile.mockResolvedValue({ ok: false, error: 'invalid' });
    renderDialog();
    fill();
    fireEvent.click(continuar());

    expect((await screen.findByRole('alert')).textContent).toBe('Este @username não pode ser usado');
  });

  it('limite: "Você já tem 10 perfis"', async () => {
    mocks.createProfile.mockResolvedValue({ ok: false, error: 'limit' });
    renderDialog();
    fill();
    fireEvent.click(continuar());

    expect((await screen.findByRole('alert')).textContent).toBe('Você já tem 10 perfis');
  });

  it('erro desconhecido: toast', async () => {
    mocks.createProfile.mockResolvedValue({ ok: false, error: 'other' });
    renderDialog();
    fill();
    fireEvent.click(continuar());

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
```

- [ ] **Passo 2: confirmar a falha**

```powershell
npx vitest run src/components/dashboard/NewProfileDialog.test.tsx
```

Esperado: falha no import.

- [ ] **Passo 3: implementar**

`src/components/dashboard/NewProfileDialog.tsx`:

```tsx
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsernameInput } from '@/components/ui/username-input';
import { useToast } from '@/hooks/use-toast';
import { useUsernameValidation } from '@/hooks/useUsernameValidation';
import { MAX_PROFILES, useCurrentProfile, type CreateProfileError } from '@/contexts/CurrentProfileContext';

interface NewProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Id do perfil criado, já selecionado. O Dashboard abre o onboarding para ele. */
  onCreated: (profileId: string) => void;
}

const FIELD_ERRORS: Partial<Record<CreateProfileError, string>> = {
  taken: 'Este username já está em uso',
  invalid: 'Este @username não pode ser usado',
};

/**
 * @username (obrigatório) e nome do perfil novo. O resto (tipo, foto, modelo, links) vem do onboarding.
 * Sem <form>: os botões de sugestão do UsernameInput não têm type="button" e enviariam o formulário.
 */
export const NewProfileDialog: React.FC<NewProfileDialogProps> = ({ open, onOpenChange, onCreated }) => {
  const { createProfile, selectProfile } = useCurrentProfile();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  // Sem perfil atual: um @ que já é de outro perfil da conta também conta como em uso
  const validation = useUsernameValidation(username);

  const reset = () => {
    setUsername('');
    setFullName('');
    setFieldError(null);
    setLimitReached(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (saving) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const canSubmit = !!username && validation.isValid && validation.isAvailable && !validation.isChecking && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setFieldError(null);
    setLimitReached(false);
    const result = await createProfile({ username, full_name: fullName.trim() });
    setSaving(false);

    if (result.ok === false) {
      if (result.error === 'limit') setLimitReached(true);
      else if (FIELD_ERRORS[result.error]) setFieldError(FIELD_ERRORS[result.error]);
      else toast({ title: 'Erro', description: 'Não foi possível criar o perfil. Tente de novo.', variant: 'destructive' });
      return;
    }

    selectProfile(result.id);
    reset();
    onOpenChange(false);
    onCreated(result.id);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo perfil</DialogTitle>
          <DialogDescription>
            Escolha o @username e o nome. Depois, o assistente ajuda a montar o visual e os links.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <UsernameInput
              value={username}
              onChange={(value) => {
                setUsername(value);
                setFieldError(null);
              }}
              label="@username"
              placeholder="novoperfil"
              disabled={saving}
            />
            {fieldError && (
              <p role="alert" className="text-xs text-red-600">
                {fieldError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-profile-name">Nome</Label>
            <Input
              id="new-profile-name"
              value={fullName}
              maxLength={100}
              placeholder="Como o perfil vai aparecer"
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
            />
          </div>

          {limitReached && (
            <p role="alert" className="text-sm text-destructive">
              Você já tem {MAX_PROFILES} perfis
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden />}
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Passo 4: rodar e ver passar**

```powershell
npx vitest run src/components/dashboard/NewProfileDialog.test.tsx
```

Esperado: 7 passando.

- [ ] **Passo 5: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
git add -- src/components/dashboard/NewProfileDialog.tsx src/components/dashboard/NewProfileDialog.test.tsx
git commit -m "Diálogo de criar perfil" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/dashboard/NewProfileDialog.tsx src/components/dashboard/NewProfileDialog.test.tsx
```

Esperado: 51 arquivos e 707 testes.

---

### Tarefa 13: aba "Meus perfis"

**Especificação:** "Aba 'Meus perfis' (`src/components/dashboard/ProfilesTab.tsx`, nova)".

**Arquivos:**
- Criar: `src/components/dashboard/ProfilesTab.tsx`, `src/components/dashboard/ProfilesTab.test.tsx`

- [ ] **Passo 1: teste (falha)**

`src/components/dashboard/ProfilesTab.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ProfilesTab } from './ProfilesTab';

type P = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };

const mocks = vi.hoisted(() => ({
  profiles: [] as P[],
  current: null as P | null,
  selectProfile: vi.fn(),
  deleteProfile: vi.fn(),
  toast: vi.fn(),
  counts: {} as Record<string, number>,
  countCalls: [] as unknown[][],
}));

vi.mock('@/contexts/CurrentProfileContext', () => ({
  MAX_PROFILES: 10,
  useCurrentProfile: () => ({
    profiles: mocks.profiles,
    currentProfile: mocks.current,
    selectProfile: mocks.selectProfile,
    deleteProfile: mocks.deleteProfile,
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/siteUrl', () => ({ PUBLIC_SITE_URL: 'https://example.test' }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: (columns: string, options: unknown) => ({
        eq: (column: string, value: string) => ({
          gte: async (dateColumn: string, since: string) => {
            mocks.countCalls.push([table, columns, options, column, value, dateColumn, since]);
            return { count: mocks.counts[`${table}:${value}`] ?? 0, error: null };
          },
        }),
      }),
    }),
  },
}));

const DNA: P = { id: 'u1', username: 'dna', full_name: 'Daniel', avatar_url: null };
const PRO: P = { id: 'p2', username: 'pro', full_name: 'Daniel Profissional', avatar_url: null };
const SEM_ARROBA: P = { id: 'p3', username: null, full_name: 'Rascunho', avatar_url: null };

beforeEach(() => {
  mocks.profiles = [DNA, PRO];
  mocks.current = DNA;
  mocks.selectProfile.mockReset();
  mocks.deleteProfile.mockReset().mockResolvedValue({ ok: true });
  mocks.toast.mockReset();
  mocks.counts = { 'profile_views:u1': 57, 'link_clicks:u1': 12, 'profile_views:p2': 3, 'link_clicks:p2': 0 };
  mocks.countCalls = [];
});
afterEach(() => cleanup());

function renderTab() {
  const onOpenLinks = vi.fn();
  const onCreateProfile = vi.fn();
  render(<ProfilesTab onOpenLinks={onOpenLinks} onCreateProfile={onCreateProfile} />);
  return { onOpenLinks, onCreateProfile };
}

const card = (index: number) => screen.getAllByTestId('profile-card')[index];

describe('ProfilesTab', () => {
  it('um card por perfil, com nome, @, link público e visitas e cliques de 30 dias', async () => {
    renderTab();
    expect(screen.getAllByTestId('profile-card')).toHaveLength(2);
    expect(within(card(0)).getByText('@dna')).toBeTruthy();
    expect(within(card(0)).getByText('https://example.test/dna')).toBeTruthy();
    expect(within(card(1)).getByText('Daniel Profissional')).toBeTruthy();

    await waitFor(() => expect(within(card(0)).getByTestId('profile-views').textContent).toBe('57'));
    expect(within(card(0)).getByTestId('profile-clicks').textContent).toBe('12');
    expect(within(card(1)).getByTestId('profile-views').textContent).toBe('3');

    // Contagem head por perfil, desde 30 dias atrás
    const views = mocks.countCalls.find((c) => c[0] === 'profile_views' && c[4] === 'u1')!;
    expect(views[2]).toEqual({ count: 'exact', head: true });
    expect(views[3]).toBe('profile_id');
    expect(views[5]).toBe('viewed_at');
    const desde = Date.parse(views[6] as string);
    const trintaDias = Date.now() - 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(desde - trintaDias)).toBeLessThan(60_000);
    expect(mocks.countCalls.some((c) => c[0] === 'link_clicks' && c[5] === 'clicked_at')).toBe(true);
  });

  it('"Abrir" seleciona o perfil e vai para Links', () => {
    const { onOpenLinks } = renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir @pro' }));
    expect(mocks.selectProfile).toHaveBeenCalledWith('p2');
    expect(onOpenLinks).toHaveBeenCalled();
  });

  it('excluir pede o @, explica o que será apagado e só confirma com ele digitado', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir @pro' }));

    expect(screen.getByText(/apaga o perfil, os links, a foto, os ícones enviados e as estatísticas/)).toBeTruthy();
    const confirmar = screen.getByRole('button', { name: /Excluir perfil/ }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Para confirmar, digite @pro'), { target: { value: 'outro' } });
    expect(confirmar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Para confirmar, digite @pro'), { target: { value: '@pro' } });
    expect(confirmar.disabled).toBe(false);
    fireEvent.click(confirmar);

    await waitFor(() => expect(mocks.deleteProfile).toHaveBeenCalledWith('p2'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Perfil excluído' })));
  });

  it('perfil sem @ pede o nome', () => {
    mocks.profiles = [DNA, SEM_ARROBA];
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Rascunho' }));
    fireEvent.change(screen.getByLabelText('Para confirmar, digite o nome do perfil: Rascunho'), {
      target: { value: 'Rascunho' },
    });
    expect((screen.getByRole('button', { name: /Excluir perfil/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('o único perfil não pode ser excluído, com a explicação', () => {
    mocks.profiles = [DNA];
    renderTab();
    expect((screen.getByRole('button', { name: 'Excluir @dna' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Este é o seu único perfil/)).toBeTruthy();
  });

  it('com 10 perfis, "Criar novo perfil" fica desabilitado com a explicação', () => {
    mocks.profiles = Array.from({ length: 10 }, (_, i) => ({ ...PRO, id: `p${i}`, username: `perfil${i}` }));
    renderTab();
    expect((screen.getByRole('button', { name: /Criar novo perfil/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/limite de 10 perfis/)).toBeTruthy();
  });

  it('"Criar novo perfil" chama o Dashboard', () => {
    const { onCreateProfile } = renderTab();
    fireEvent.click(screen.getByRole('button', { name: /Criar novo perfil/ }));
    expect(onCreateProfile).toHaveBeenCalled();
  });

  it('falha na exclusão mostra o erro e mantém o diálogo', async () => {
    mocks.deleteProfile.mockResolvedValue({ ok: false, error: 'other' });
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir @pro' }));
    fireEvent.change(screen.getByLabelText('Para confirmar, digite @pro'), { target: { value: 'pro' } });
    fireEvent.click(screen.getByRole('button', { name: /Excluir perfil/ }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(screen.getByRole('button', { name: /Excluir perfil/ })).toBeTruthy();
  });
});
```

- [ ] **Passo 2: confirmar a falha**

```powershell
npx vitest run src/components/dashboard/ProfilesTab.test.tsx
```

Esperado: falha no import.

- [ ] **Passo 3: implementar**

`src/components/dashboard/ProfilesTab.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { getPublicProfileUrl } from '@/lib/publicProfileUrl';
import { useToast } from '@/hooks/use-toast';
import { MAX_PROFILES, useCurrentProfile, type Profile } from '@/contexts/CurrentProfileContext';

const DAY_MS = 24 * 60 * 60 * 1000;
const numberFormat = new Intl.NumberFormat('pt-BR');

interface ProfilesTabProps {
  /** Depois de "Abrir": o perfil já está selecionado; o Dashboard vai para a aba Links. */
  onOpenLinks: () => void;
  onCreateProfile: () => void;
}

type Stats = { views: number | null; clicks: number | null };

/** "@dna" ou, para perfil sem @, o nome. */
const labelOf = (profile: Profile) => (profile.username ? `@${profile.username}` : profile.full_name || 'perfil sem nome');

/** O que confirma a exclusão: o @ (com ou sem a arroba) ou, para perfil sem @, o nome. */
export function confirmationMatches(profile: Pick<Profile, 'username' | 'full_name'>, typed: string): boolean {
  const value = typed.trim();
  if (profile.username) return value.replace(/^@/, '') === profile.username;
  const name = (profile.full_name || '').trim();
  return name !== '' && value === name;
}

/** Visitas e cliques dos últimos 30 dias: contagem head, duas consultas por perfil (até 10 perfis). */
function useLast30Days(profileId: string): Stats | null {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    const since = new Date(Date.now() - 30 * DAY_MS).toISOString();
    Promise.all([
      supabase
        .from('profile_views')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gte('viewed_at', since),
      supabase
        .from('link_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .gte('clicked_at', since),
    ])
      .then(([views, clicks]) => {
        if (!active) return;
        if (views.error) console.error('Error counting profile views:', views.error);
        if (clicks.error) console.error('Error counting link clicks:', clicks.error);
        setStats({
          views: views.error ? null : views.count ?? 0,
          clicks: clicks.error ? null : clicks.count ?? 0,
        });
      })
      .catch((error) => {
        console.error('Error loading profile stats:', error);
        if (active) setStats({ views: null, clicks: null });
      });
    return () => {
      active = false;
    };
  }, [profileId]);

  return stats;
}

interface ProfileCardProps {
  profile: Profile;
  isCurrent: boolean;
  isOnly: boolean;
  onOpen: () => void;
  onDelete: () => void;
}

function ProfileCard({ profile, isCurrent, isOnly, onOpen, onDelete }: ProfileCardProps) {
  const stats = useLast30Days(profile.id);
  const publicUrl = getPublicProfileUrl(profile);
  const label = labelOf(profile);
  // Carregando: reticências; erro: travessão
  const show = (value: number | null | undefined) =>
    stats === null ? '…' : value === null || value === undefined ? '—' : numberFormat.format(value);

  return (
    <Card data-testid="profile-card" className={isCurrent ? 'border-primary' : undefined}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
            <AvatarFallback>{(profile.full_name || profile.username || '?').charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {profile.full_name || 'Sem nome'}
              {isCurrent && <span className="ml-2 text-xs font-normal text-primary">atual</span>}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {profile.username ? `@${profile.username}` : 'Sem @username'}
            </p>
            {publicUrl ? (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 text-xs text-primary hover:underline"
              >
                <span className="truncate">{publicUrl}</span>
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">Sem link público até definir o @username</p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md bg-muted/50 p-2">
            <dt className="text-xs text-muted-foreground">Visitas (30 dias)</dt>
            <dd className="font-semibold" data-testid="profile-views">{show(stats?.views)}</dd>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <dt className="text-xs text-muted-foreground">Cliques (30 dias)</dt>
            <dd className="font-semibold" data-testid="profile-clicks">{show(stats?.clicks)}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onOpen} aria-label={`Abrir ${label}`}>
            Abrir
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={isOnly}
            onClick={onDelete}
            aria-label={`Excluir ${label}`}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Excluir
          </Button>
        </div>
        {isOnly && (
          <p className="text-xs text-muted-foreground">Este é o seu único perfil. Para excluí-lo, crie outro antes.</p>
        )}
      </CardContent>
    </Card>
  );
}

export const ProfilesTab: React.FC<ProfilesTabProps> = ({ onOpenLinks, onCreateProfile }) => {
  const { profiles, currentProfile, selectProfile, deleteProfile } = useCurrentProfile();
  const { toast } = useToast();
  const [deleting, setDeleting] = useState<Profile | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const atLimit = profiles.length >= MAX_PROFILES;
  const isOnly = profiles.length <= 1;

  const open = (profile: Profile) => {
    selectProfile(profile.id);
    onOpenLinks();
  };

  const askDelete = (profile: Profile) => {
    setTyped('');
    setDeleting(profile);
  };

  const closeDelete = () => {
    if (!busy) setDeleting(null);
  };

  const confirmDelete = async () => {
    if (!deleting || !confirmationMatches(deleting, typed)) return;
    const label = labelOf(deleting);
    setBusy(true);
    const result = await deleteProfile(deleting.id);
    setBusy(false);
    if (result.ok === false) {
      toast({
        title: 'Erro',
        description:
          result.error === 'last'
            ? 'Este é o seu único perfil: crie outro antes de excluí-lo.'
            : 'Não foi possível excluir o perfil. Tente de novo.',
        variant: 'destructive',
      });
      return;
    }
    setDeleting(null);
    toast({ title: 'Perfil excluído', description: `${label} e os dados dele foram apagados.` });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Meus perfis</h3>
        <p className="text-sm text-muted-foreground">
          Cada perfil tem endereço, visual, links e estatísticas próprios. Quem visita um perfil não vê os outros.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {profiles.map((profile) => (
          <ProfileCard
            key={profile.id}
            profile={profile}
            isCurrent={profile.id === currentProfile?.id}
            isOnly={isOnly}
            onOpen={() => open(profile)}
            onDelete={() => askDelete(profile)}
          />
        ))}

        <Card className="border-dashed">
          <CardContent className="flex h-full flex-col items-start justify-center gap-2 p-4">
            <Button onClick={onCreateProfile} disabled={atLimit}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              Criar novo perfil
            </Button>
            <p className="text-xs text-muted-foreground">
              {atLimit
                ? `Você chegou ao limite de ${MAX_PROFILES} perfis. Exclua um para criar outro.`
                : `Até ${MAX_PROFILES} perfis por conta (${profiles.length} em uso).`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!deleting} onOpenChange={(next) => { if (!next) closeDelete(); }}>
        <DialogContent className="sm:max-w-md">
          {deleting && (
            <>
              <DialogHeader>
                <DialogTitle>Excluir {labelOf(deleting)}?</DialogTitle>
                <DialogDescription>
                  Isso apaga o perfil, os links, a foto, os ícones enviados e as estatísticas dele. O endereço público
                  para de abrir e o @ fica livre. Não dá para desfazer.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delete-profile-confirm">
                  {deleting.username
                    ? `Para confirmar, digite @${deleting.username}`
                    : `Para confirmar, digite o nome do perfil: ${deleting.full_name || ''}`}
                </Label>
                <Input
                  id="delete-profile-confirm"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  disabled={busy}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={closeDelete} disabled={busy}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void confirmDelete()}
                  disabled={busy || !confirmationMatches(deleting, typed)}
                >
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                  Excluir perfil
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
```

- [ ] **Passo 4: rodar e ver passar**

```powershell
npx vitest run src/components/dashboard/ProfilesTab.test.tsx
```

Esperado: 8 passando.

- [ ] **Passo 5: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
git add -- src/components/dashboard/ProfilesTab.tsx src/components/dashboard/ProfilesTab.test.tsx
git commit -m "Aba Meus perfis com estatísticas de 30 dias e exclusão confirmada" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/dashboard/ProfilesTab.tsx src/components/dashboard/ProfilesTab.test.tsx
```

Esperado: 52 arquivos e 715 testes.

---

### Tarefa 14: seletor na sidebar e `Dashboard` pelo contexto

**Especificação:** "Seletor na sidebar (`AppSidebar.tsx`)", tabela (linhas `Dashboard.tsx` e `AppSidebar.tsx`), "Nada vaza entre perfis" e "Testes > Vitest" (`AppSidebar.test.tsx` e `AppSidebar.desktop.test.tsx`).

**Arquivos:**
- Modificar: `src/components/dashboard/AppSidebar.tsx`
- Modificar: `src/components/dashboard/AppSidebar.test.tsx`, `src/components/dashboard/AppSidebar.desktop.test.tsx`
- Modificar: `src/pages/Dashboard.tsx`
- Criar: `src/pages/Dashboard.test.tsx`

- [ ] **Passo 1: testes da sidebar com o Provider (falham)**

Substitua `src/components/dashboard/AppSidebar.test.tsx` inteiro por:

```tsx
// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { CurrentProfileProvider } from '@/contexts/CurrentProfileContext';
import { AppSidebar } from './AppSidebar';

const mocks = vi.hoisted(() => ({
  profiles: [{ id: 'u1', username: 'dna', full_name: 'Daniel', avatar_url: null, theme_options: {} }] as unknown[],
}));

vi.mock('@/contexts/AuthContext', () => {
  const user = { id: 'u1', email: 'x@y.z', user_metadata: {} };
  return { useAuth: () => ({ user, signOut: vi.fn() }) };
});
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/lib/supabase', () => {
  const chain: any = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.maybeSingle = () => Promise.resolve({ data: null });
  return {
    supabase: {
      from: () => chain,
      rpc: async (fn: string) => (fn === 'list_own_profiles' ? { data: mocks.profiles, error: null } : { data: null, error: null }),
    },
  };
});

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalInnerWidth = window.innerWidth;
const originalMatchMedia = window.matchMedia;

beforeAll(() => {
  // Janela estreita: o shadcn usa o painel deslizante (Sheet)
  (window as any).innerWidth = 500;
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as any;
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
});

afterAll(() => {
  (window as any).innerWidth = originalInnerWidth;
  window.matchMedia = originalMatchMedia;
  vi.unstubAllGlobals();
});

beforeEach(() => window.localStorage.clear());
afterEach(() => cleanup());

function renderSidebar(onTabChange = vi.fn()) {
  render(
    // defaultOpen={false}: simula a barra de desktop recolhida antes de estreitar a janela (cenário do defeito)
    <SidebarProvider defaultOpen={false}>
      <CurrentProfileProvider>
        <SidebarTrigger />
        <AppSidebar activeTab="links" onTabChange={onTabChange} onCreateProfile={vi.fn()} />
      </CurrentProfileProvider>
    </SidebarProvider>,
  );
  return onTabChange;
}

describe('AppSidebar em janela estreita', () => {
  it('abre o painel com os rótulos mesmo com a barra de desktop recolhida', async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    await waitFor(() => {
      for (const texto of ['Links', 'Design', 'Perfil', 'Meus perfis', 'Analytics']) {
        expect(screen.getByText(texto)).toBeTruthy();
      }
    });
  });

  it('fecha o painel ao escolher um item do menu', async () => {
    const onTabChange = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    const painel = await waitFor(() => {
      const el = document.querySelector('[data-mobile="true"]');
      expect(el).not.toBeNull();
      return el;
    });
    expect(painel).toBeTruthy();
    fireEvent.click(await screen.findByText('Design'));
    expect(onTabChange).toHaveBeenCalledWith('design');
    await waitFor(() => {
      expect(document.querySelector('[data-mobile="true"]')).toBeNull();
    });
  });

  it('no painel, o seletor mostra o perfil atual', async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(await screen.findByRole('button', { name: 'Trocar de perfil (atual: @dna)' })).toBeTruthy();
  });
});
```

Substitua `src/components/dashboard/AppSidebar.desktop.test.tsx` inteiro por:

```tsx
// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { CurrentProfileProvider } from '@/contexts/CurrentProfileContext';
import { AppSidebar } from './AppSidebar';

type P = Record<string, unknown> & { id: string };

const mocks = vi.hoisted(() => ({ profiles: [] as P[] }));

vi.mock('@/contexts/AuthContext', () => {
  const user = { id: 'u1', email: 'x@y.z', user_metadata: {} };
  return { useAuth: () => ({ user, signOut: vi.fn() }) };
});
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/lib/supabase', () => {
  const chain: any = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.maybeSingle = () => Promise.resolve({ data: null });
  return {
    supabase: {
      from: () => chain,
      rpc: async (fn: string) => (fn === 'list_own_profiles' ? { data: mocks.profiles, error: null } : { data: null, error: null }),
    },
  };
});
// O link público vem de @/lib/publicProfileUrl, que lê a URL do site daqui
vi.mock('@/lib/siteUrl', () => ({ PUBLIC_SITE_URL: 'https://example.test' }));

const DNA: P = { id: 'u1', username: 'dna', full_name: 'Daniel', avatar_url: null, theme_options: {} };
const PRO: P = { id: 'p2', username: 'pro', full_name: 'Daniel Profissional', avatar_url: null, theme_options: {} };

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const originalInnerWidth = window.innerWidth;
const originalMatchMedia = window.matchMedia;

beforeAll(() => {
  // Janela larga: barra fixa, sem a barra superior da página
  (window as any).innerWidth = 1280;
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as any;
  // O DropdownMenu do Radix mede o conteúdo com ResizeObserver, que o jsdom não tem
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
});

afterAll(() => {
  (window as any).innerWidth = originalInnerWidth;
  window.matchMedia = originalMatchMedia;
  vi.unstubAllGlobals();
});

beforeEach(() => {
  window.localStorage.clear();
  mocks.profiles = [DNA, PRO];
});
afterEach(() => cleanup());

function renderSidebar() {
  const onTabChange = vi.fn();
  const onCreateProfile = vi.fn();
  const view = render(
    <SidebarProvider defaultOpen>
      <CurrentProfileProvider>
        <AppSidebar activeTab="links" onTabChange={onTabChange} onCreateProfile={onCreateProfile} />
      </CurrentProfileProvider>
    </SidebarProvider>,
  );
  return { ...view, onTabChange, onCreateProfile };
}

async function openSelector(atual = '@dna') {
  fireEvent.keyDown(await screen.findByRole('button', { name: `Trocar de perfil (atual: ${atual})` }), { key: 'Enter' });
  return screen.findByRole('menu');
}

describe('AppSidebar em janela larga', () => {
  it('tem o próprio botão de recolher, que alterna entre recolhida e aberta', () => {
    // Sem SidebarTrigger externo: o único botão é o da própria sidebar
    const { container } = renderSidebar();
    const estado = () => container.querySelector('[data-state]')?.getAttribute('data-state');

    expect(estado()).toBe('expanded');
    expect(screen.getByText('Links')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(estado()).toBe('collapsed');
    // Recolhida: rótulos somem, e o botão passa a oferecer expandir
    expect(screen.queryByText('Links')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Expandir menu' }));
    expect(estado()).toBe('expanded');
    expect(screen.getByText('Links')).toBeTruthy();
  });

  it('recolhida, o seletor é só o avatar, com o perfil atual no nome', async () => {
    renderSidebar();
    await screen.findByRole('button', { name: 'Trocar de perfil (atual: @dna)' });
    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));

    expect(screen.getByRole('button', { name: 'Trocar de perfil (atual: @dna)' })).toBeTruthy();
    expect(screen.queryByText('LinkHub')).toBeNull();
  });
});

describe('AppSidebar, seletor de perfil', () => {
  it('lista os perfis e marca o atual', async () => {
    renderSidebar();
    await openSelector();

    const itens = screen.getAllByRole('menuitemradio');
    expect(itens).toHaveLength(2);
    expect(screen.getByRole('menuitemradio', { name: /@dna/ }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('menuitemradio', { name: /@pro/ }).getAttribute('aria-checked')).toBe('false');
  });

  it('escolher outro perfil troca o perfil atual', async () => {
    renderSidebar();
    await openSelector();
    fireEvent.click(screen.getByRole('menuitemradio', { name: /@pro/ }));

    expect(await screen.findByRole('button', { name: 'Trocar de perfil (atual: @pro)' })).toBeTruthy();
    expect(window.localStorage.getItem('linkhub:currentProfile:u1')).toBe('p2');
  });

  it('com 10 perfis, "Criar novo perfil" fica desabilitado com a dica', async () => {
    mocks.profiles = Array.from({ length: 10 }, (_, i) => ({ ...PRO, id: i === 0 ? 'u1' : `p${i}`, username: i === 0 ? 'dna' : `perfil${i}` }));
    renderSidebar();
    await openSelector();

    expect(screen.getByRole('menuitem', { name: /Criar novo perfil/ }).getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByText('Limite de 10 perfis')).toBeTruthy();
  });

  it('"Criar novo perfil" chama o Dashboard', async () => {
    const { onCreateProfile } = renderSidebar();
    await openSelector();
    fireEvent.click(screen.getByRole('menuitem', { name: /Criar novo perfil/ }));
    expect(onCreateProfile).toHaveBeenCalled();
  });

  it('"Meus perfis" abre a aba nova, pelo seletor e pelo menu', async () => {
    const { onTabChange } = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'Meus perfis' }));
    expect(onTabChange).toHaveBeenCalledWith('profiles');

    onTabChange.mockClear();
    await openSelector();
    fireEvent.click(screen.getByRole('menuitem', { name: /Meus perfis/ }));
    expect(onTabChange).toHaveBeenCalledWith('profiles');
  });
});

describe('AppSidebar, link público', () => {
  it('domínio padrão: Ver Perfil abre e Copiar copia o endereço do site', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    try {
      renderSidebar();
      const verPerfil = screen.getByRole('button', { name: /Ver Perfil/ }) as HTMLButtonElement;
      await waitFor(() => expect(verPerfil.disabled).toBe(false));
      fireEvent.click(verPerfil);
      expect(open).toHaveBeenCalledWith('https://example.test/dna', '_blank');
      fireEvent.click(screen.getByRole('button', { name: 'Copiar link do perfil' }));
      expect(writeText).toHaveBeenCalledWith('https://example.test/dna');
    } finally {
      open.mockRestore();
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it('domínio personalizado gravado com https:// não duplica o esquema', async () => {
    mocks.profiles = [{ ...DNA, preferred_domain: 'custom', custom_domain: 'https://meusite.com' }];
    const writeText = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    try {
      renderSidebar();
      fireEvent.click(await screen.findByRole('button', { name: 'Copiar link do perfil' }));
      // Antes da regra única saía https://https://meusite.com/dna
      expect(writeText).toHaveBeenCalledWith('https://meusite.com/dna');
    } finally {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it('sem username: Ver Perfil desabilitado e sem botão de copiar', async () => {
    mocks.profiles = [{ ...DNA, username: null }];
    renderSidebar();
    await screen.findByRole('button', { name: 'Trocar de perfil (atual: Daniel)' });
    expect((screen.getByRole('button', { name: /Ver Perfil/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Copiar link do perfil' })).toBeNull();
  });

  it('Ver Perfil usa o perfil atual depois da troca', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    try {
      renderSidebar();
      await openSelector();
      fireEvent.click(screen.getByRole('menuitemradio', { name: /@pro/ }));
      await screen.findByRole('button', { name: 'Trocar de perfil (atual: @pro)' });
      fireEvent.click(screen.getByRole('button', { name: /Ver Perfil/ }));
      expect(open).toHaveBeenCalledWith('https://example.test/pro', '_blank');
    } finally {
      open.mockRestore();
    }
  });
});
```

- [ ] **Passo 2: teste do `Dashboard` (falha)**

`src/pages/Dashboard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Dashboard from './Dashboard';

const mocks = vi.hoisted(() => ({
  ctx: null as any,
  navigate: vi.fn(),
  sidebar: null as any,
  onboarding: null as any,
  newProfile: null as any,
}));

vi.mock('@/contexts/AuthContext', () => {
  const user = { id: 'u1', email: 'dna@example.com' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/contexts/CurrentProfileContext', () => ({ useCurrentProfile: () => mocks.ctx }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => true }));
// As abas e diálogos têm testes próprios: aqui só interessa o que o Dashboard passa a eles
vi.mock('@/components/dashboard/AppSidebar', () => ({
  AppSidebar: (props: any) => {
    mocks.sidebar = props;
    return <nav data-testid="sidebar" />;
  },
}));
vi.mock('@/components/dashboard/LinksTab', () => ({
  LinksTab: (props: any) => <div data-testid="links-tab">{props.profile.id}</div>,
}));
vi.mock('@/components/dashboard/DesignTab', () => ({ DesignTab: () => <div data-testid="design-tab" /> }));
vi.mock('@/components/dashboard/SettingsTab', () => ({ SettingsTab: () => <div data-testid="settings-tab" /> }));
vi.mock('@/components/dashboard/AnalyticsTab', () => ({ AnalyticsTab: () => <div data-testid="analytics-tab" /> }));
vi.mock('@/components/dashboard/ProfilesTab', () => ({ ProfilesTab: () => <div data-testid="profiles-tab" /> }));
vi.mock('@/components/dashboard/ProfilePreview', () => ({
  ProfilePreview: (props: any) => <div data-testid="preview">{props.profile.id}</div>,
}));
vi.mock('@/components/dashboard/OnboardingDialog', () => ({
  OnboardingDialog: (props: any) => {
    mocks.onboarding = props;
    return props.open ? <div data-testid="onboarding">{props.profile.id}</div> : null;
  },
}));
vi.mock('@/components/dashboard/NewProfileDialog', () => ({
  NewProfileDialog: (props: any) => {
    mocks.newProfile = props;
    return props.open ? <div data-testid="new-profile" /> : null;
  },
}));

const originalMatchMedia = window.matchMedia;
beforeAll(() => {
  // O SidebarProvider real pergunta se é celular
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as any;
});
afterAll(() => {
  window.matchMedia = originalMatchMedia;
});

function context(profile: Record<string, unknown> | null, extra: Record<string, unknown> = {}) {
  return { currentProfile: profile, profiles: profile ? [profile] : [], loading: false, error: null, reloadProfiles: vi.fn(async () => {}), ...extra };
}

beforeEach(() => {
  mocks.ctx = context({ id: 'p1', user_type: 'personal' });
});
afterEach(() => cleanup());

describe('Dashboard', () => {
  it('passa o perfil atual às abas e à prévia', () => {
    render(<Dashboard />);
    expect(screen.getByTestId('links-tab').textContent).toBe('p1');
    expect(screen.getByTestId('preview').textContent).toBe('p1');
    expect(screen.queryByTestId('onboarding')).toBeNull();
  });

  it('trocar de perfil remonta tudo com o perfil novo', () => {
    const { rerender } = render(<Dashboard />);
    mocks.ctx = context({ id: 'p3', user_type: 'business' });
    rerender(<Dashboard />);
    expect(screen.getByTestId('links-tab').textContent).toBe('p3');
    expect(screen.getByTestId('preview').textContent).toBe('p3');
  });

  it('abre o onboarding para o perfil sem tipo e recarrega a lista ao terminar', () => {
    mocks.ctx = context({ id: 'p2', user_type: null });
    render(<Dashboard />);
    expect(screen.getByTestId('onboarding').textContent).toBe('p2');

    act(() => mocks.onboarding.onComplete('personal'));
    expect(screen.queryByTestId('onboarding')).toBeNull();
    expect(mocks.ctx.reloadProfiles).toHaveBeenCalled();
  });

  it('na aba Meus perfis, some a prévia e o botão Prévia, e o cabeçalho diz o nome da aba', () => {
    render(<Dashboard />);
    expect(screen.getByRole('button', { name: /Prévia/ })).toBeTruthy();

    act(() => mocks.sidebar.onTabChange('profiles'));
    expect(screen.getByTestId('profiles-tab')).toBeTruthy();
    expect(screen.queryByTestId('preview')).toBeNull();
    expect(screen.queryByRole('button', { name: /Prévia/ })).toBeNull();
    expect(screen.getByText('Meus perfis')).toBeTruthy();
  });

  it('"Criar novo perfil" abre o diálogo, e o perfil criado leva para Links', () => {
    render(<Dashboard />);
    act(() => mocks.sidebar.onTabChange('profiles'));
    act(() => mocks.sidebar.onCreateProfile());
    expect(screen.getByTestId('new-profile')).toBeTruthy();

    act(() => mocks.newProfile.onCreated('p9'));
    expect(screen.getByTestId('links-tab')).toBeTruthy();
  });

  it('sem perfil e com erro na carga, mostra o erro e tenta de novo', () => {
    mocks.ctx = context(null, { error: 'Não foi possível carregar seus perfis.' });
    render(<Dashboard />);
    expect(screen.getByText('Não foi possível carregar seus perfis.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(mocks.ctx.reloadProfiles).toHaveBeenCalled();
  });
});
```

- [ ] **Passo 3: confirmar a falha**

```powershell
npx vitest run src/components/dashboard/AppSidebar.test.tsx src/components/dashboard/AppSidebar.desktop.test.tsx src/pages/Dashboard.test.tsx
```

Esperado: a sidebar não tem o seletor nem "Meus perfis"; o `Dashboard` ainda carrega o perfil por conta própria e não usa o contexto.

- [ ] **Passo 4: implementar a sidebar**

Substitua `src/components/dashboard/AppSidebar.tsx` inteiro por:

```tsx
import { useState, useEffect } from 'react';
import { Link as LinkIcon, Palette, User, Users, Sun, Moon, LogOut, Eye, BarChart3, Shield, Copy, ChevronsUpDown, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/BrandLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import { MAX_PROFILES, useCurrentProfile, type Profile } from '@/contexts/CurrentProfileContext';
import { getPublicProfileUrl } from '@/lib/publicProfileUrl';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  /** "Criar novo perfil" no seletor: o Dashboard abre o diálogo. */
  onCreateProfile: () => void;
}

const menuItems = [
  { id: 'links', title: 'Links', icon: LinkIcon },
  { id: 'design', title: 'Design', icon: Palette },
  { id: 'settings', title: 'Perfil', icon: User },
  { id: 'profiles', title: 'Meus perfis', icon: Users },
];

const analyticsItems = [
  { id: 'analytics', title: 'Analytics', icon: BarChart3 },
];

/** "@dna" ou, para perfil sem @, o nome. */
function profileLabel(profile: Profile | null): string {
  if (!profile) return 'carregando';
  return profile.username ? `@${profile.username}` : profile.full_name || 'perfil sem nome';
}

/** Avatar de 24 px do seletor. */
function ProfileAvatar({ profile }: { profile: Profile | null }) {
  const initial = (profile?.full_name || profile?.username || '?').charAt(0).toUpperCase();
  return (
    <Avatar className="h-6 w-6 shrink-0">
      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
      <AvatarFallback className="text-[10px]">{initial}</AvatarFallback>
    </Avatar>
  );
}

export function AppSidebar({ activeTab, onTabChange, onCreateProfile }: AppSidebarProps) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { profiles, currentProfile, selectProfile } = useCurrentProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  // No painel móvel os rótulos sempre aparecem, mesmo que a barra do desktop esteja recolhida
  const isCollapsed = state === 'collapsed' && !isMobile;
  const [isAdmin, setIsAdmin] = useState(false);
  const atLimit = profiles.length >= MAX_PROFILES;
  const currentLabel = profileLabel(currentProfile);

  // O papel é da conta, não do perfil
  useEffect(() => {
    if (!user) return;
    import('@/lib/supabase').then(({ supabase }) => {
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle()
        .then(({ data }) => setIsAdmin(!!data));
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    if (isMobile) setOpenMobile(false);
  };

  const handleCreateProfile = () => {
    onCreateProfile();
    if (isMobile) setOpenMobile(false);
  };

  // Mesma regra do QR code e da aba Perfil (aceita domínio personalizado gravado com https://)
  const getPublicUrl = () => getPublicProfileUrl(currentProfile);

  const handleViewProfile = () => {
    const url = getPublicUrl();
    if (url) window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    const url = getPublicUrl();
    if (url) {
      navigator.clipboard.writeText(url);
      toast({ title: 'Link copiado!', description: url });
    }
  };

  return (
    <Sidebar collapsible="icon">
      {/* Recolhida, a barra tem 3rem: p-2 deixa o logo de 2rem caber, com o botão de recolher logo abaixo */}
      <SidebarHeader className={isCollapsed ? 'p-2' : 'p-4'}>
        <div className={isCollapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-3'}>
          <BrandLogo size={32} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Trocar de perfil (atual: ${currentLabel})`}
                title="Trocar de perfil"
                className={
                  isCollapsed
                    ? 'rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    : 'flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-0.5 text-left hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                }
              >
                {isCollapsed ? (
                  <ProfileAvatar profile={currentProfile} />
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <h1 className="text-lg font-bold">LinkHub</h1>
                      {currentProfile?.username && (
                        <p className="text-xs text-muted-foreground truncate">@{currentProfile.username}</p>
                      )}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Seus perfis</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={currentProfile?.id ?? ''} onValueChange={(id) => selectProfile(id)}>
                {profiles.map((profile) => (
                  <DropdownMenuRadioItem key={profile.id} value={profile.id} className="gap-2">
                    <ProfileAvatar profile={profile} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{profile.full_name || 'Sem nome'}</span>
                      {profile.username && (
                        <span className="block truncate text-xs text-muted-foreground">@{profile.username}</span>
                      )}
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2" disabled={atLimit} onSelect={handleCreateProfile}>
                <Plus className="h-4 w-4" aria-hidden />
                <span className="flex-1">Criar novo perfil</span>
                {atLimit && <span className="text-xs text-muted-foreground">Limite de {MAX_PROFILES} perfis</span>}
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2" onSelect={() => handleTabChange('profiles')}>
                <Users className="h-4 w-4" aria-hidden />
                Meus perfis
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* No celular a sidebar é um painel deslizante: fecha clicando fora, e quem abre é a barra superior */}
          {!isMobile && (
            <SidebarTrigger
              className="shrink-0 text-muted-foreground hover:text-foreground"
              title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            Painel de Controle
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleTabChange(item.id)}
                    isActive={activeTab === item.id}
                    className="w-full justify-start"
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? 'sr-only' : ''}>
            Relatórios
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleTabChange(item.id)}
                    isActive={activeTab === item.id}
                    className="w-full justify-start"
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {!isCollapsed && user?.email && (
          <p className="text-xs text-muted-foreground truncate px-2 pb-1">{user.email}</p>
        )}
        {isAdmin && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="w-full justify-start text-primary"
          >
            <Shield className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Admin</span>}
          </Button>
        )}
        <div className="flex items-center w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewProfile}
            className="flex-1 justify-start"
            disabled={!currentProfile?.username}
          >
            <Eye className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Ver Perfil</span>}
          </Button>
          {!isCollapsed && currentProfile?.username && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Copiar link do perfil"
              title="Copiar link do perfil"
              onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
            >
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="w-full justify-start"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
          {!isCollapsed && (
            <span className="ml-2">
              {theme === 'dark' ? 'Claro' : 'Escuro'}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
```

- [ ] **Passo 5: implementar o `Dashboard`**

Substitua `src/pages/Dashboard.tsx` inteiro por:

```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { LinksTab } from '@/components/dashboard/LinksTab';
import { DesignTab } from '@/components/dashboard/DesignTab';
import { SettingsTab } from '@/components/dashboard/SettingsTab';
import { AnalyticsTab } from '@/components/dashboard/AnalyticsTab';
import { ProfilesTab } from '@/components/dashboard/ProfilesTab';
import { NewProfileDialog } from '@/components/dashboard/NewProfileDialog';
import { ProfilePreview } from '@/components/dashboard/ProfilePreview';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { OnboardingDialog } from '@/components/dashboard/OnboardingDialog';
import { useCurrentProfile } from '@/contexts/CurrentProfileContext';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const TAB_LABELS: Record<string, string> = {
  links: 'Links',
  design: 'Design',
  settings: 'Perfil',
  analytics: 'Analytics',
  profiles: 'Meus perfis',
};

// Abas sem a prévia do perfil: nem a coluna da direita nem o botão "Prévia"
const TABS_WITHOUT_PREVIEW = ['analytics', 'profiles'];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // O perfil atual vem do CurrentProfileProvider (rota de layout): ele carrega, cria o primeiro e troca
  const { currentProfile, loading, error, reloadProfiles } = useCurrentProfile();
  const [activeTab, setActiveTab] = useState('links');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [newProfileOpen, setNewProfileOpen] = useState(false);
  // Perfil cujo onboarding acabou de terminar: o diálogo some na hora, antes de a lista voltar com o user_type
  const [onboardedId, setOnboardedId] = useState<string | null>(null);
  // Mesmo ponto de corte do lg: a prévia lateral só existe em tela larga, o Dialog só abaixo dela
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Ao alargar a janela com o Dialog aberto, ele fecha e a prévia lateral assume
  useEffect(() => {
    if (isDesktop) setPreviewOpen(false);
  }, [isDesktop]);

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        {error && !loading ? (
          <>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button type="button" onClick={() => void reloadProfiles()}>
              Tentar de novo
            </Button>
          </>
        ) : (
          <div
            role="status"
            aria-label="Carregando seus perfis"
            className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
          />
        )}
      </div>
    );
  }

  // Trocar de perfil remonta abas, prévia e onboarding: nenhum estado passa de um perfil para outro
  const profileKey = currentProfile.id;
  const showPreview = !TABS_WITHOUT_PREVIEW.includes(activeTab);
  const showOnboarding = !currentProfile.user_type && onboardedId !== currentProfile.id;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onCreateProfile={() => setNewProfileOpen(true)}
        />

        <main className="flex-1 flex min-w-0">
          {/* Barra superior só no celular: lá a sidebar é um painel deslizante e precisa deste botão para abrir.
              Em tela larga o botão de recolher fica dentro da própria sidebar, e a página ganha a altura da barra. */}
          <div className="flex-1 min-w-0">
            <header className="h-12 flex items-center border-b bg-card/30 backdrop-blur-sm px-3 md:hidden">
              <SidebarTrigger />
              <span className="ml-3 text-sm font-medium truncate">
                {TAB_LABELS[activeTab] ?? 'Dashboard'}
              </span>
            </header>

            <div className="p-3 pb-20 sm:p-4 sm:pb-20 md:p-6 md:pb-20 lg:pb-6">
              <div className={showPreview ? 'lg:grid lg:grid-cols-2 lg:gap-6' : 'w-full'}>
                {/* Left Panel - Dashboard */}
                <div className={showPreview ? 'space-y-4 md:space-y-6' : 'w-full'}>
                  <Card className="bg-card border-border/60 shadow-sm">
                    <CardContent className={activeTab === 'analytics' ? 'p-0' : 'p-3 sm:p-4 md:p-6'}>
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsContent key={`links:${profileKey}`} value="links" className="mt-0">
                          <LinksTab profile={currentProfile} onProfileUpdate={reloadProfiles} />
                        </TabsContent>

                        <TabsContent key={`design:${profileKey}`} value="design" className="mt-0">
                          <DesignTab profile={currentProfile} onProfileUpdate={reloadProfiles} />
                        </TabsContent>

                        <TabsContent key={`analytics:${profileKey}`} value="analytics" className="mt-0">
                          <AnalyticsTab profile={currentProfile} onProfileUpdate={reloadProfiles} />
                        </TabsContent>

                        <TabsContent key={`settings:${profileKey}`} value="settings" className="mt-0">
                          <SettingsTab profile={currentProfile} onProfileUpdate={reloadProfiles} />
                        </TabsContent>

                        <TabsContent value="profiles" className="mt-0">
                          <ProfilesTab
                            onOpenLinks={() => setActiveTab('links')}
                            onCreateProfile={() => setNewProfileOpen(true)}
                          />
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Panel - Device Preview - Hidden on mobile/tablet */}
                {showPreview && (
                  <div className="hidden lg:block">
                    {/* Altura definida (padding da página + top-6; sem barra superior em tela larga): é ela que limita a escala do aparelho */}
                    <div className="sticky top-6 h-[calc(100dvh-3rem)]">
                      {/* Montada só em tela larga: abaixo de lg a prévia vive no Dialog, sem segunda instância */}
                      {isDesktop && <ProfilePreview key={profileKey} profile={currentProfile} />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Tela estreita: a prévia lateral some e o botão abre a mesma prévia em tela cheia */}
        {showPreview && (
          <Button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setPreviewOpen(true)}
            className="fixed bottom-4 right-4 z-40 h-11 rounded-full px-4 shadow-lg lg:hidden"
          >
            <Eye className="h-4 w-4 mr-2" />
            Prévia
          </Button>
        )}

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent
            aria-describedby={undefined}
            className={cn(
              // Tela cheia: sobrescreve posição, tamanho, raio e espaçamento padrão do DialogContent
              'max-w-none w-screen h-[100dvh] p-0 gap-0 left-0 top-0 translate-x-0 translate-y-0 rounded-none sm:rounded-none border-0 flex flex-col',
              // Sem deslizar nem zoom: só o fade padrão
              '![--tw-enter-scale:1] ![--tw-exit-scale:1] ![--tw-enter-translate-x:0] ![--tw-enter-translate-y:0] ![--tw-exit-translate-x:0] ![--tw-exit-translate-y:0]',
              // Esconde o X padrão (filho direto); o cabeçalho próprio está dentro de um div
              '[&>button]:hidden'
            )}
          >
            <DialogTitle className="sr-only">Prévia do perfil</DialogTitle>
            <ProfilePreview
              key={profileKey}
              profile={currentProfile}
              className="p-3"
              headerEnd={
                <DialogClose asChild>
                  <Button type="button" variant="outline" size="sm">
                    Fechar
                  </Button>
                </DialogClose>
              }
            />
          </DialogContent>
        </Dialog>

        {/* Perfil sem user_type (primeiro acesso ou perfil novo): o onboarding monta este perfil */}
        <OnboardingDialog
          key={profileKey}
          open={showOnboarding}
          profile={currentProfile}
          onComplete={() => {
            setOnboardedId(currentProfile.id);
            void reloadProfiles();
          }}
        />

        <NewProfileDialog
          open={newProfileOpen}
          onOpenChange={setNewProfileOpen}
          onCreated={() => setActiveTab('links')}
        />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
```

O `Dashboard` não importa mais `supabase`, `useDesignStore` nem `resolveThemeConfig`: carregar, criar o primeiro perfil e aplicar o tema são do contexto.

- [ ] **Passo 6: rodar e ver passar**

```powershell
npx vitest run src/components/dashboard/AppSidebar.test.tsx src/components/dashboard/AppSidebar.desktop.test.tsx src/pages/Dashboard.test.tsx
```

Esperado: 3 + 11 + 6 testes passando.

- [ ] **Passo 7: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
npm run build
git add -- src/pages/Dashboard.test.tsx
git commit -m "Seletor de perfil na sidebar e Dashboard pelo perfil atual" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- src/components/dashboard/AppSidebar.tsx src/components/dashboard/AppSidebar.test.tsx src/components/dashboard/AppSidebar.desktop.test.tsx src/pages/Dashboard.tsx src/pages/Dashboard.test.tsx
```

Esperado: 53 arquivos e 729 testes; build verde.

---

### Tarefa 15: Admin por conta

**Especificação:** "Admin (`supabase/functions/linkhub-admin-users/index.ts` e `src/pages/Admin.tsx`)".

**Arquivos:**
- Criar: `supabase/functions/linkhub-admin-users/group.ts`
- Modificar: `supabase/functions/linkhub-admin-users/index.ts`
- Criar: `src/lib/adminUsers.ts`, `src/lib/adminUsers.test.ts`
- Modificar: `src/pages/Admin.tsx`

A edge function roda no Deno e não passa pelo `tsc` do app. A lógica de agrupar fica em `group.ts`, sem imports, para o Vitest testar. O `scp -r` da pasta (DEPLOY.md, seção 4) já leva o arquivo novo.

- [ ] **Passo 1: testes (falham)**

`src/lib/adminUsers.test.ts`:

```ts
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
```

- [ ] **Passo 2: confirmar a falha**

```powershell
npx vitest run src/lib/adminUsers.test.ts
```

Esperado: falha no import de `group.ts`.

- [ ] **Passo 3: implementar o agrupamento e os helpers**

`supabase/functions/linkhub-admin-users/group.ts`:

```ts
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
```

`src/lib/adminUsers.ts`:

```ts
// Tipos e regras da tela do Admin. A resposta vem da edge function linkhub-admin-users (group.ts).

export interface AdminProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  links_count: number;
}

/** Uma conta com os perfis dela (do mais antigo para o mais novo). */
export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
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
```

- [ ] **Passo 4: rodar e ver passar**

```powershell
npx vitest run src/lib/adminUsers.test.ts
```

Esperado: 6 passando.

- [ ] **Passo 5: edge function**

Substitua `supabase/functions/linkhub-admin-users/index.ts` inteiro por:

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  accountIdsByNewestProfile,
  countAccounts,
  pageOf,
  profilesByOwner,
  type OwnerRow,
  type ProfileRow,
} from "./group.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    // Schema dedicado no self-hosted (edge runtime só expõe envs com prefixo SUPABASE_)
    const schema = Deno.env.get("SUPABASE_LINKHUB_SCHEMA") ?? "linkhub";

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Check admin role (o papel é da conta)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { db: { schema } });
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) return json({ error: "Forbidden" }, 403);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // LIST: contas (donos distintos em profile_owners) com os perfis de cada uma, 50 contas por página.
    // auth.users é compartilhado com outros apps: só aparece quem tem perfil no LinkHub.
    if (req.method === "GET" && action === "list") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const perPage = 50;

      const { data: owners, error: ownersError } = await adminClient
        .from("profile_owners")
        .select("profile_id, owner_id");
      if (ownersError) throw ownersError;
      const ownerRows = (owners || []) as OwnerRow[];

      const { data: profiles, error: profilesError } = await adminClient
        .from("profiles")
        .select("id, username, full_name, avatar_url, user_type, created_at")
        .in("id", ownerRows.map((o) => o.profile_id));
      if (profilesError) throw profilesError;
      const profileRows = (profiles || []) as ProfileRow[];

      const accountIds = accountIdsByNewestProfile(ownerRows, profileRows);
      const pageIds = pageOf(accountIds, page, perPage);
      const pageOwners = ownerRows.filter((o) => pageIds.includes(o.owner_id));

      const authResults = await Promise.all(pageIds.map((id) => adminClient.auth.admin.getUserById(id)));

      const { data: roles, error: rolesError } = await adminClient
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", pageIds);
      if (rolesError) throw rolesError;

      // links.user_id é o id do perfil
      const { data: linkRows, error: linksError } = await adminClient
        .from("links")
        .select("user_id")
        .in("user_id", pageOwners.map((o) => o.profile_id));
      if (linksError) throw linksError;

      const grouped = profilesByOwner(pageOwners, profileRows, (linkRows || []).map((l: any) => l.user_id));
      const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

      const users = authResults
        .map((r: any) => r.data?.user)
        .filter((u: any) => !!u)
        .map((u: any) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          banned_until: u.banned_until,
          role: roleMap.get(u.id) || "user",
          profiles: grouped.get(u.id) || [],
        }));

      return json({ users, total_accounts: accountIds.length, page, per_page: perPage });
    }

    // DELETE: apaga os vínculos da conta. O gatilho cleanup_owned_profile apaga os perfis,
    // e links, visitas e cliques saem em cascata. Os arquivos do Storage ficam, como antes.
    if (req.method === "DELETE" && action === "delete") {
      const targetUserId = url.searchParams.get("userId");
      if (!targetUserId) throw new Error("userId required");
      if (targetUserId === user.id) throw new Error("Cannot delete yourself");

      const { error: ownersError } = await adminClient
        .from("profile_owners")
        .delete()
        .eq("owner_id", targetUserId);
      if (ownersError) throw ownersError;

      const { error: rolesError } = await adminClient
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId);
      if (rolesError) throw rolesError;

      // O usuário em auth.users é compartilhado com outros apps do Supabase,
      // então só os dados do linkhub são removidos aqui.
      return json({ success: true });
    }

    // TOGGLE BAN USER
    if (req.method === "POST" && action === "toggle-ban") {
      const body = await req.json();
      const targetUserId = body.userId;
      const ban = body.ban; // true = ban, false = unban
      if (!targetUserId) throw new Error("userId required");
      if (targetUserId === user.id) throw new Error("Cannot ban yourself");

      const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
        // Inativar: ~100 anos (na prática, permanente); reativar: "none"
        ban_duration: ban ? "876000h" : "none",
      });
      if (error) throw error;

      return json({ success: true });
    }

    // STATS: "Usuários" são as contas distintas com perfil; "Perfis", todos os perfis
    if (req.method === "GET" && action === "stats") {
      const { data: owners, error: ownersError } = await adminClient.from("profile_owners").select("owner_id");
      if (ownersError) throw ownersError;
      const { count: profileCount } = await adminClient.from("profiles").select("*", { count: "exact", head: true });
      const { count: linkCount } = await adminClient.from("links").select("*", { count: "exact", head: true });
      const { count: viewCount } = await adminClient.from("profile_views").select("*", { count: "exact", head: true });
      const { count: clickCount } = await adminClient.from("link_clicks").select("*", { count: "exact", head: true });

      return json({
        totalUsers: countAccounts(owners || []),
        totalProfiles: profileCount || 0,
        totalLinks: linkCount || 0,
        totalViews: viewCount || 0,
        totalClicks: clickCount || 0,
      });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
```

- [ ] **Passo 6: tela do Admin**

Em `src/pages/Admin.tsx`:

1. Troque a linha de ícones `import { Users, Link as LinkIcon, Eye, MousePointerClick, Trash2, Search, ArrowLeft, Shield, Ban, CheckCircle } from 'lucide-react';` por `import { Users, UserCircle, Link as LinkIcon, Eye, MousePointerClick, Trash2, Search, ArrowLeft, Shield, Ban, CheckCircle } from 'lucide-react';` e, depois de `import { toast } from '@/hooks/use-toast';`, acrescente `import { filterAdminUsers, statsAfterDeletingUser, type AdminStats, type AdminUser } from '@/lib/adminUsers';`.
2. Apague as interfaces locais `AdminUser` e `Stats` (de `interface AdminUser {` até o `}` de `Stats`).
3. Troque `  const [stats, setStats] = useState<Stats | null>(null);` por `  const [stats, setStats] = useState<AdminStats | null>(null);`.
4. Troque o `handleDeleteUser` inteiro por:

```tsx
  const handleDeleteUser = async (target: AdminUser) => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/linkhub-admin-users?action=delete&userId=${target.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const count = target.profiles.length;
      toast({
        title: 'Conta excluída',
        description: `${target.email}: ${count} ${count === 1 ? 'perfil removido' : 'perfis removidos'}.`,
      });
      setUsers(prev => prev.filter(u => u.id !== target.id));
      setStats(prev => (prev ? statsAfterDeletingUser(prev, target) : prev));
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };
```

5. Troque:

```tsx
  const filteredUsers = users.filter(u =>
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.full_name || '').toLowerCase().includes(search.toLowerCase())
  );
```

por:

```tsx
  // E-mail, @ e nome de todos os perfis da conta
  const filteredUsers = filterAdminUsers(users, search);
```

6. Nos cards de estatística, troque `          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">` por `          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">` e, logo depois de `              { label: 'Usuários', value: stats.totalUsers, icon: Users, color: 'text-blue-500' },`, acrescente `              { label: 'Perfis', value: stats.totalProfiles ?? 0, icon: UserCircle, color: 'text-sky-500' },`.
7. Troque o placeholder `"Buscar por nome, email..."` por `"Buscar por e-mail, @ ou nome..."`.
8. No cabeçalho da tabela, troque `                  <TableHead className="hidden md:table-cell">Links</TableHead>` por:

```tsx
                  <TableHead className="hidden sm:table-cell">Perfis</TableHead>
                  <TableHead className="hidden md:table-cell">Links</TableHead>
```

9. Troque o corpo do `filteredUsers.map(u => { … })` (do `const isBanned` até o `</TableRow>` da linha) por:

```tsx
                {filteredUsers.map(u => {
                  const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
                  // O perfil mais antigo da conta representa a linha; os @ de todos aparecem embaixo
                  const main = u.profiles[0];
                  const handles = u.profiles.filter(p => p.username).map(p => `@${p.username}`);
                  const types = Array.from(new Set(u.profiles.map(p => p.user_type).filter(Boolean)));
                  const linksTotal = u.profiles.reduce((sum, p) => sum + p.links_count, 0);
                  return (
                  <TableRow key={u.id} className={isBanned ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={main?.avatar_url || ''} />
                          <AvatarFallback className="text-xs">
                            {(main?.full_name || u.email)?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{main?.full_name || 'Sem nome'}</p>
                          <p className="text-xs text-muted-foreground truncate md:hidden">{u.email}</p>
                          {handles.length > 0 && <p className="text-xs text-muted-foreground truncate">{handles.join(', ')}</p>}
                        </div>
                        {u.role === 'admin' && <Badge variant="secondary" className="text-[10px] h-5">Admin</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{u.email}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {types.map(type => <Badge key={type} variant="outline" className="text-xs">{type}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{u.profiles.length}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{linksTotal}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {isBanned ? (
                        <Badge variant="destructive" className="text-[10px]">Inativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-green-500 text-green-500">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.role !== 'admin' && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleBan(u.id, u.email, !!isBanned)}
                            title={isBanned ? 'Reativar usuário' : 'Inativar usuário'}
                            className={isBanned ? 'text-green-500 hover:text-green-500' : 'text-orange-500 hover:text-orange-500'}
                          >
                            {isBanned ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`Excluir ${u.email}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir a conta no LinkHub?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Isso apaga <strong>todos os perfis</strong> de <strong>{u.email}</strong> no LinkHub ({u.profiles.length} {u.profiles.length === 1 ? 'perfil' : 'perfis'}{handles.length > 0 ? `: ${handles.join(', ')}` : ''}), com os links e as estatísticas. A conta de login continua existindo, e os arquivos enviados ficam no Storage. Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(u)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
```

10. Na linha "Nenhum usuário encontrado.", troque `colSpan={7}` por `colSpan={8}`.

- [ ] **Passo 7: verificação e commit**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
npm run build
git add -- supabase/functions/linkhub-admin-users/group.ts src/lib/adminUsers.ts src/lib/adminUsers.test.ts
git commit -m "Admin por conta, com os perfis de cada uma e o card Perfis" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -- supabase/functions/linkhub-admin-users/group.ts supabase/functions/linkhub-admin-users/index.ts src/lib/adminUsers.ts src/lib/adminUsers.test.ts src/pages/Admin.tsx
```

Esperado: 54 arquivos e 735 testes; build verde. O `index.ts` não é conferido pelo `tsc` do app (está fora do `include`); revise-o lendo, contra o `group.ts`.

---
### Tarefa 16: verificação final local

Nada aqui toca no servidor.

- [ ] **Passo 1: tipos, testes e build**

```powershell
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
npm run build
```

Esperado: tsc sem saída; **54 arquivos e 735 testes**, todos passando (se aparecer o erro intermitente do cache, rode de novo); build verde.

- [ ] **Passo 2: nada sobrou da conta onde deveria estar o perfil**

```powershell
git grep -nE "user\.id|user\?\.id|user!\.id" -- src/components/dashboard src/pages/Dashboard.tsx src/pages/Analytics.tsx src/hooks
git grep -nE "useAnalyticsData|includes\('supabase'\)|currentUserId" -- src
```

Esperado:
- primeiro: uma linha só, em `src/components/dashboard/AppSidebar.tsx`, na consulta de `user_roles` (o papel é da conta);
- segundo: nada (código 1).

Não há `rg` no PATH desta máquina; por isso os comandos usam `git grep`, que procura nos arquivos versionados.

- [ ] **Passo 3: o ensaio continua gerando**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ensaio-migracao-perfis.ps1
```

Esperado: `Ensaio gerado em …\linkhub-ensaio-varios-perfis.sql`.

- [ ] **Passo 4: conferência visual local (opcional, sem gravar)**

Com `npm run dev` e o `.env` apontando para produção, o painel antigo grava no banco de produção. **Não** faça login nem salve nada no dev local antes da Tarefa 17: o banco ainda não tem `list_own_profiles`, e a RPC falharia. A conferência no navegador fica para a Tarefa 17, passo 6.

- [ ] **Passo 5: commit (só se algo mudou nesta tarefa)**

Se algum ajuste foi preciso, commite por caminho, como nas outras tarefas. Push não faz parte do plano.

---

### Tarefa 17: produção (ensaio, migração, publicação e testes)

**Especificação:** "Compatibilidade com o frontend atual", "Testes > Banco" e "Testes > Em produção".

Ordem obrigatória: ensaio → migração → edge function → frontend, **na mesma janela** (com perfis novos, o Admin antigo agrupa errado). Entre a migração e o deploy, o frontend antigo continua funcionando (ver a seção de compatibilidade da especificação).

**Todo passo abaixo é "só com aprovação do Daniel em card"**: antes de cada um, mostre o comando com `AskUserQuestion` (botões "Executar" / "Agora não") e só rode com o "Executar". Nenhum passo digita senha. Os dados reais do perfil `dna` (id, avatar, links e estatísticas) não podem mudar.

- [ ] **Passo 1: ensaio no banco** — só com aprovação do Daniel em card

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ensaio-migracao-perfis.ps1
scp "$env:TEMP\linkhub-ensaio-varios-perfis.sql" avila@192.168.1.24:/tmp/
ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/linkhub-ensaio-varios-perfis.sql; s=$?; rm -f /tmp/linkhub-ensaio-varios-perfis.sql; exit $s'
$LASTEXITCODE
```

Esperado: as linhas dos comandos, nenhum `ERROR`, `ROLLBACK` na última linha e `0`. Nada fica gravado.

Se falhar:
- `ERROR: ENSAIO FALHOU (n): …`: um caso não deu o esperado. Pare, mostre ao Daniel o caso e a linha, e corrija a migração ou o teste (num commit, por caminho) antes de repetir o passo 1.
- `must be owner of table objects`: vá ao passo 2.
- `permission denied for table users` (no `INSERT INTO auth.users` dos testes) ou `permission denied to set role`: o `postgres` desta instalação não pode simular contas. Pare e pergunte ao Daniel se o ensaio pode rodar com `-U supabase_admin` (troque só o `-U` no comando). Não mexa em permissões do banco.
- `canceling statement due to lock timeout`: alguma tabela estava ocupada; repita o passo 1.
- Erro vindo de um gatilho do Storage (por exemplo, `storage.prefixes`) no caso `S1`: pare e mostre ao Daniel. Não afrouxe as políticas.

- [ ] **Passo 2 (só se o passo 1 deu "must be owner of table objects"): políticas do Storage em arquivo à parte** — só com aprovação do Daniel em card

1. Crie `deploy/vpsavila/migrations/2026-10-26-varios-perfis-storage.sql` com: um cabeçalho de comentário ("Políticas do Storage dos vários perfis. Roda como supabase_admin, depois de 2026-10-26-varios-perfis.sql, porque storage.objects pertence a supabase_storage_admin."), `BEGIN;`, `SET LOCAL lock_timeout = '5s';`, o bloco da migração que vai de `DROP POLICY IF EXISTS "linkhub_avatars_public_read" ON storage.objects;` até o último `CREATE POLICY "linkhub_link_icons_delete_own" …;`, e `COMMIT;`.
2. Tire esse bloco (e o comentário "Storage. Gravar: …" acima dele) da `2026-10-26-varios-perfis.sql`.
3. Em `src/lib/variosPerfisMigration.test.ts`, faça os testes de Storage (`remove a leitura pública…` e `cria as políticas do Storage…`) lerem a migração nova no lugar de `MIGRATION`, e acrescente a ela o teste de "exatamente um BEGIN; e um COMMIT;". Rode `npx vitest run src/lib/variosPerfisMigration.test.ts`.
4. Commit por caminho dos três arquivos: "Políticas do Storage dos vários perfis em arquivo à parte".
5. Ensaio do banco sem o Storage:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ensaio-migracao-perfis.ps1 -Testes scripts\ensaio-perfis-testes.sql
```

e o envio do passo 1. Se passar, aplique a migração principal (passo 3).
6. Depois do passo 3, ensaio do Storage como `supabase_admin`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ensaio-migracao-perfis.ps1 -Migracao deploy\vpsavila\migrations\2026-10-26-varios-perfis-storage.sql -Testes scripts\ensaio-perfis-testes-storage.sql -Saida "$env:TEMP\linkhub-ensaio-storage.sql"
scp "$env:TEMP\linkhub-ensaio-storage.sql" avila@192.168.1.24:/tmp/
ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 < /tmp/linkhub-ensaio-storage.sql; s=$?; rm -f /tmp/linkhub-ensaio-storage.sql; exit $s'
```

7. Com o ensaio verde, aplique o arquivo do Storage com o mesmo envio do passo 3, trocando o nome do arquivo e usando `-U supabase_admin`.
8. As funções continuam com dono `postgres` (a migração principal rodou como `postgres`). A conferência do passo 4 mostra isso.

- [ ] **Passo 3: conferência antes e aplicação da migração** — só com aprovação do Daniel em card

Antes, guarde a conferência (só leitura):

```powershell
scp scripts/conferencia-perfis.sql avila@192.168.1.24:/tmp/
ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/conferencia-perfis.sql; s=$?; rm -f /tmp/conferencia-perfis.sql; exit $s' | Tee-Object -FilePath "$env:TEMP\conferencia-antes.txt"
```

Esperado: o perfil `dna` com id, avatar e tipo; os totais; as 4 políticas antigas por bucket (incluindo `*_public_read`); os arquivos na pasta do id do `dna`. Sem a seção "Donos" (a tabela ainda não existe).

Depois, aplique:

```powershell
scp deploy/vpsavila/migrations/2026-10-26-varios-perfis.sql avila@192.168.1.24:/tmp/
ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/2026-10-26-varios-perfis.sql; s=$?; rm -f /tmp/2026-10-26-varios-perfis.sql; exit $s'
$LASTEXITCODE
```

Esperado: as linhas listadas no `DEPLOY.md` para esta migração (com os avisos `NOTICE … skipping` da primeira vez), `COMMIT` no fim e `0`. Com erro, nada foi aplicado: pare e mostre ao Daniel; o frontend novo **não** pode ser publicado.

- [ ] **Passo 4: conferência depois** — só com aprovação do Daniel em card

```powershell
scp scripts/conferencia-perfis.sql avila@192.168.1.24:/tmp/
ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/conferencia-perfis.sql; s=$?; rm -f /tmp/conferencia-perfis.sql; exit $s' | Tee-Object -FilePath "$env:TEMP\conferencia-depois.txt"
```

Compare com o "antes":
- o perfil `dna` tem o mesmo id, `avatar_url` e `user_type`;
- `perfis`, `links_dna`, `visitas_dna` e `cliques_dna` iguais (ou maiores, se houve visitas entre um e outro; nunca menores);
- as políticas: 4 por bucket (`select_own`, `insert_own`, `update_own`, `delete_own`), sem `public_read`;
- "Donos": `dono_igual_ao_id = t`; `contas` igual ao número de perfis antigos;
- as 8 funções com dono `postgres`.

E a URL pública da foto do `dna` continua abrindo (troque pela `avatar_url` da conferência):

```powershell
curl.exe -s -o NUL -w '%{http_code} %{content_type}\n' '<avatar_url do dna>'
```

Esperado: `200 image/…`. A página pública também: `curl.exe -s -o NUL -w '%{http_code}\n' https://linkhub.avila.ia.br/dna` dá `200`.

- [ ] **Passo 5: publicar a edge function e o frontend** — só com aprovação do Daniel em card

Edge function (DEPLOY.md, seção 4, só a pasta do Admin; o `scp -r` leva o `group.ts`):

```powershell
scp -r supabase/functions/linkhub-admin-users avila@192.168.1.24:~/docker/supabase/docker/volumes/functions/
ssh avila@192.168.1.24 'find ~/docker/supabase/docker/volumes/functions/linkhub-admin-users -type d -exec chmod 755 {} + && find ~/docker/supabase/docker/volumes/functions/linkhub-admin-users -type f -exec chmod 644 {} +'
ssh avila@192.168.1.24 'cd ~/docker/supabase/docker && docker compose up -d --force-recreate functions'
```

Frontend: `npm run build` e o bloco `& { … }` da seção "Publicar" do `DEPLOY.md`, colado inteiro. Esperado: `healthy` no fim, sem `Falhou: …`. Depois, a seção "Conferir" do `DEPLOY.md`.

- [ ] **Passo 6: testes em produção num perfil de teste** — só com aprovação do Daniel em card

O Daniel faz login no navegador (Claude in Chrome ou o navegador dele). Nenhum passo digita senha. Use um @ de teste que ainda não exista (por exemplo `teste_perfis_1026`) e **não** altere o perfil `dna`.

1. No painel, o seletor da sidebar mostra `@dna`, e "Meus perfis" lista o `dna` com as visitas e cliques de 30 dias.
2. "Criar novo perfil" → @ `teste_perfis_1026`, nome "Perfil de teste" → "Continuar". O onboarding abre com o nome "Perfil de teste" (não o do Google). Escolha um tipo, envie uma foto qualquer, escolha um modelo e adicione um link (por exemplo, `https://exemplo.com`).
3. Abra `https://linkhub.avila.ia.br/teste_perfis_1026`: nome, foto, modelo e link do perfil de teste.
4. Troque para `@dna` pelo seletor: tema, links e prévia são os do `dna` (nada do teste). Volte ao teste: nada do `dna`.
5. Na aba Perfil do teste, confira o salvamento automático (por exemplo, a bio) e que o @ dele aparece como disponível.
6. Anote o id do perfil de teste (aparece na conferência, em "Perfis da conta do dna") e rode a conferência: a pasta dele aparece em "Arquivos por pasta".
7. "Meus perfis" → "Excluir" no perfil de teste → digite `@teste_perfis_1026` → "Excluir perfil". O seletor volta ao `dna`.
8. Conferência de novo: o perfil de teste sumiu de "Perfis da conta do dna", e a pasta dele sumiu de "Arquivos por pasta" (os arquivos foram removidos pelo cliente). O `dna` tem os mesmos id, links, visitas e cliques do passo 4.
9. `/admin`: a conta do Daniel aparece uma vez, com o `@dna`; o card "Perfis" bate com o total de perfis.

Se algo sobrar no banco ou no bucket, mostre ao Daniel antes de qualquer limpeza manual.

- [ ] **Passo 7: fechamento**

Relate ao Daniel o que foi aplicado e publicado, as saídas das conferências e qualquer diferença. Commit final só se algo mudou (por caminho). Push só se o Daniel pedir.
