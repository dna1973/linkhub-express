-- Testes do ensaio da migração dos vários perfis: políticas do Storage.
-- Mesmo esquema do ensaio-perfis-testes.sql (BEGIN … ROLLBACK montado pelo script, ON_ERROR_STOP).
-- Fica num arquivo à parte para rodar sozinho se as políticas do Storage forem para um arquivo
-- aplicado como supabase_admin (Tarefa 17, passo 2).
-- Os objetos são inseridos direto em storage.objects: só a linha da tabela, sem arquivo em disco.
--
-- Contas de teste (somem no ROLLBACK):
--   D e0000000-0000-4000-8000-00000000000d  dois perfis (o segundo, ensaio_d2, tem id gerado)
--   E e0000000-0000-4000-8000-00000000000e  um perfil
-- Atenção: em produção, auth.users tem o gatilho on_auth_user_created (expert_ink.handle_new_user).
-- O INSERT das contas de teste grava em expert_ink.profiles, e o DELETE de conta cascateia em expert_ink.*.
-- O ROLLBACK desfaz tudo. Um erro vindo de expert_ink.* para o ensaio: não mexa no outro app.

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

-- S7. Nenhuma política de leitura de storage.objects, de qualquer app da VPS, vale para anon ou public
-- sem filtrar bucket_id, nem cita um bucket do LinkHub. As políticas se somam por OR: uma assim
-- devolveria ao anônimo os objetos do LinkHub (nomes de pasta = ids de perfil, e o owner_id).
-- "Filtrar bucket_id" aqui é ter bucket_id = '<bucket>' ou bucket_id = ANY (...) no USING.
DO $$
DECLARE
  v_abertas text;
BEGIN
  SELECT string_agg(policyname || ' [' || cmd || ' ' || array_to_string(roles, ',') || ']: ' || coalesce(qual, '(sem USING)'),
                    '; ' ORDER BY policyname)
    INTO v_abertas
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND cmd IN ('SELECT', 'ALL')
    AND roles && ARRAY['anon', 'public']::name[]
    AND (qual IS NULL OR qual !~ 'bucket_id\s*=\s*(''|ANY)' OR qual LIKE '%linkhub-%');
  IF v_abertas IS NOT NULL THEN
    RAISE EXCEPTION 'ENSAIO FALHOU (S7): política de leitura de storage.objects aberta ao anônimo sem filtrar bucket_id (ou com bucket do LinkHub): %', v_abertas;
  END IF;
END $$;
