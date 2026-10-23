-- ============================================================================
-- LinkHub Express: schema consolidado para Supabase self-hosted (vpsavila)
-- Substitui as migrations de supabase/migrations (que não rodam em sequência).
-- Rodar UMA vez, como postgres:
--   docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < linkhub_schema.sql
--
-- Decisões:
-- * Schema dedicado "linkhub" (não usa public).
-- * SEM trigger em auth.users: auth.users é compartilhado com os outros apps da VPS.
--   O próprio Dashboard cria o perfil no primeiro acesso.
-- * Bucket "linkhub-avatars" e policies com prefixo linkhub_ pra não colidir com outros apps.
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
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  custom_domain TEXT,
  preferred_domain TEXT DEFAULT 'default',
  theme_options JSONB DEFAULT '{}',
  show_username BOOLEAN NOT NULL DEFAULT true,
  user_type TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bio_max_length CHECK (length(bio) <= 500),
  CONSTRAINT full_name_max_length CHECK (length(full_name) <= 100),
  CONSTRAINT username_max_length CHECK (length(username) <= 30),
  CONSTRAINT profiles_user_type_check CHECK (user_type IN ('creator', 'business', 'personal') OR user_type IS NULL)
);

CREATE TABLE linkhub.links (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT link_title_max_length CHECK (length(title) <= 200),
  CONSTRAINT link_url_max_length CHECK (length(url) <= 2000)
);
CREATE INDEX links_user_id_idx ON linkhub.links (user_id, position);

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
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

-- 5. RLS ----------------------------------------------------------------------
ALTER TABLE linkhub.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkhub.links         ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkhub.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkhub.link_clicks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkhub.user_roles    ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Public profiles are viewable by everyone" ON linkhub.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON linkhub.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON linkhub.profiles
  FOR UPDATE USING (auth.uid() = id);

-- links
CREATE POLICY "Links are viewable by everyone" ON linkhub.links
  FOR SELECT USING (true);
CREATE POLICY "Users can insert their own links" ON linkhub.links
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own links" ON linkhub.links
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own links" ON linkhub.links
  FOR DELETE USING (auth.uid() = user_id);

-- profile_views
CREATE POLICY "Validated profile view inserts only" ON linkhub.profile_views
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM linkhub.profiles WHERE profiles.id = profile_id)
  );
CREATE POLICY "Users can view their own profile views" ON linkhub.profile_views
  FOR SELECT USING (profile_id = auth.uid());

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
  FOR SELECT USING (profile_id = auth.uid());

-- user_roles
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

-- 7. Storage: bucket de avatares (público, 2 MB, só imagem) -------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('linkhub-avatars', 'linkhub-avatars', true, 2097152,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "linkhub_avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'linkhub-avatars');
CREATE POLICY "linkhub_avatars_insert_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'linkhub-avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "linkhub_avatars_update_own" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'linkhub-avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "linkhub_avatars_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'linkhub-avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;

-- ============================================================================
-- DEPOIS do primeiro login no app, promover a conta admin (ajuste o email):
--
-- INSERT INTO linkhub.user_roles (user_id, role)
-- SELECT id, 'admin'::linkhub.app_role FROM auth.users WHERE email = 'daniel.avila@prf.gov.br';
-- ============================================================================
