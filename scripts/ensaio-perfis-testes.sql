-- Testes do ensaio da migração dos vários perfis: banco.
-- O scripts/ensaio-migracao-perfis.ps1 junta este arquivo depois do corpo da migração (rodado duas vezes),
-- dentro de uma transação que termina em ROLLBACK. Cada caso é um bloco DO que dá
-- RAISE EXCEPTION 'ENSAIO FALHOU …' quando o resultado não é o esperado. Com -v ON_ERROR_STOP=1,
-- o psql para no primeiro, e nada fica gravado. Só as sequências de id (links_id_seq,
-- profile_views_id_seq, link_clicks_id_seq) avançam alguns números, porque não voltam no ROLLBACK.
--
-- Contas de teste, inseridas em auth.users como postgres (somem no ROLLBACK):
--   A e0000000-0000-4000-8000-00000000000a  chega a 10 perfis; excluída por auth.users no fim
--   B e0000000-0000-4000-8000-00000000000b  um perfil só
--   C e0000000-0000-4000-8000-00000000000c  dois perfis; excluída como no Admin
-- Cada caso troca de papel com SET LOCAL request.jwt.claims e SET LOCAL role, e volta com RESET role.
-- Antes dos blocos que rodam como postgres, SET LOCAL request.jwt.claims = '' limpa as claims:
-- o auth.uid() do Supabase faz nullif(..., '') antes do cast para jsonb, então devolve nulo.
-- Atenção: em produção, auth.users tem o gatilho on_auth_user_created (expert_ink.handle_new_user).
-- O INSERT das contas de teste grava em expert_ink.profiles, e o DELETE de conta cascateia em expert_ink.*.
-- O ROLLBACK desfaz tudo. Um erro vindo de expert_ink.* para o ensaio: não mexa no outro app.
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
      WHERE conname IN ('links_user_id_profile_fkey', 'profile_views_profile_id_fkey', 'link_clicks_profile_id_fkey')
        AND conrelid IN ('linkhub.links'::regclass, 'linkhub.profile_views'::regclass, 'linkhub.link_clicks'::regclass)
        AND confrelid = 'linkhub.profiles'::regclass) <> 3 THEN
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
-- Daqui até o fim, como postgres e sem as claims de A
SET LOCAL request.jwt.claims = '';
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
