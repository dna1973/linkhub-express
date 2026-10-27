-- Ícones dos links com customização total: tipo e valor do ícone, cor de destaque e bucket dos ícones enviados
-- Os links existentes ficam com icon_type = 'auto' (o ícone sai da URL)
-- Tudo numa transação: com erro no meio (e o ON_ERROR_STOP do psql), nada fica aplicado pela metade.
-- Cada comando é idempotente, então a migração pode rodar de novo.
BEGIN;

-- Não espera para sempre por uma consulta longa: falha em 5 s e pode rodar de novo.
-- SET LOCAL vale só até o fim desta transação.
SET LOCAL lock_timeout = '5s';

ALTER TABLE linkhub.links ADD COLUMN IF NOT EXISTS icon_type TEXT NOT NULL DEFAULT 'auto';
ALTER TABLE linkhub.links ADD COLUMN IF NOT EXISTS icon_value TEXT;
ALTER TABLE linkhub.links ADD COLUMN IF NOT EXISTS accent_color TEXT;

-- Constraints só se ainda não existirem (ADD CONSTRAINT não tem IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'links_icon_type_check' AND conrelid = 'linkhub.links'::regclass) THEN
    ALTER TABLE linkhub.links ADD CONSTRAINT links_icon_type_check
      CHECK (icon_type IN ('auto', 'lucide', 'brand', 'emoji', 'favicon', 'upload'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'links_icon_value_length' AND conrelid = 'linkhub.links'::regclass) THEN
    ALTER TABLE linkhub.links ADD CONSTRAINT links_icon_value_length
      CHECK (icon_value IS NULL OR length(icon_value) <= 2048);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'links_accent_color_check' AND conrelid = 'linkhub.links'::regclass) THEN
    ALTER TABLE linkhub.links ADD CONSTRAINT links_accent_color_check
      CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9a-fA-F]{6}$');
  END IF;
END $$;

-- Bucket dos ícones enviados (público, 512 KB, PNG e WebP: o SVG é convertido para PNG no navegador)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('linkhub-link-icons', 'linkhub-link-icons', true, 524288,
        ARRAY['image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Políticas iguais às de linkhub-avatars: leitura pública; escrita só na pasta do próprio usuário
DROP POLICY IF EXISTS "linkhub_link_icons_public_read" ON storage.objects;
CREATE POLICY "linkhub_link_icons_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'linkhub-link-icons');

DROP POLICY IF EXISTS "linkhub_link_icons_insert_own" ON storage.objects;
CREATE POLICY "linkhub_link_icons_insert_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'linkhub-link-icons' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "linkhub_link_icons_update_own" ON storage.objects;
CREATE POLICY "linkhub_link_icons_update_own" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'linkhub-link-icons' AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "linkhub_link_icons_delete_own" ON storage.objects;
CREATE POLICY "linkhub_link_icons_delete_own" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'linkhub-link-icons' AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- PostgREST passa a enxergar as colunas sem reiniciar (dentro da transação, o aviso só sai no COMMIT)
NOTIFY pgrst, 'reload schema';

COMMIT;
