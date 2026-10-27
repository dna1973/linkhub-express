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
