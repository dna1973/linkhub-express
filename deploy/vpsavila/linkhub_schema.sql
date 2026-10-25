-- ============================================================================
-- LinkHub Express: schema consolidado para Supabase self-hosted (vpsavila)
-- Substitui as migrations de supabase/migrations (que não rodam em sequência).
-- Rodar UMA vez, como postgres:
--   docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < linkhub_schema.sql
--
-- Decisões:
-- * Schema dedicado "linkhub" (não usa public).
-- * O LinkHub não cria trigger em auth.users, que é compartilhado com os outros apps da VPS
--   (o expert_ink tem o on_auth_user_created → expert_ink.handle_new_user).
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
-- O insert direto não pega a trava consultiva do create_profile: numa corrida muito improvável entre
-- os dois, a conta poderia passar de 10 perfis. Aceito conscientemente (ver a política de insert).
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
-- Esse insert direto não pega a trava consultiva do create_profile. Numa corrida muito improvável
-- entre os dois, a conta poderia passar de 10 perfis. Risco aceito conscientemente; a regra fica como está.
CREATE POLICY "Users can insert their own profile" ON linkhub.profiles
  FOR INSERT TO authenticated WITH CHECK (
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
