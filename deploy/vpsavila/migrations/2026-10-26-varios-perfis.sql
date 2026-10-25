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
-- Atenção: o DROP CONSTRAINT abaixo pega AccessExclusiveLock em auth.users, e a FK de profile_owners
-- (CREATE TABLE, acima) pega ShareRowExclusiveLock, os dois até o COMMIT. Enquanto a transação durar,
-- login e renovação de sessão de TODOS os apps da VPS (expert_ink e outros) esperam. Rode em horário calmo.
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
    'linkhub', 'link', 'links', 'hub', 'tree', 'bio', 'me',
    'exemplo', 'install'
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
