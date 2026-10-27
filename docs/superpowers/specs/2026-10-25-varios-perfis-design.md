# Vários perfis por conta — especificação

**Data:** 25/10/2026
**Situação:** desenho aprovado pelo Daniel em 25/10/2026. A revisão contra o código e o banco de produção levou à variante **"vínculo escondido"**, também aprovada por ele.

## Objetivo

Uma conta passa a ter mais de um perfil público, por exemplo pessoal, profissional e de setores. Cada perfil tem o próprio @username, foto, tema, links, QR code e estatísticas. No painel, o dono troca de perfil por um seletor na sidebar e gerencia todos numa página "Meus perfis". **Quem está de fora não consegue descobrir, nem pela API, que dois perfis são da mesma conta.**

## Decisões do Daniel

| Pergunta | Escolha |
|---|---|
| Quem edita | Só o dono da conta (sem colaboradores por enquanto) |
| Limite | Até **10 perfis por conta** |
| Troca no painel | **Seletor no topo da sidebar** e página **"Meus perfis"** |
| Estatísticas | Analytics **por perfil**; em "Meus perfis", visitas e cliques de cada perfil nos últimos 30 dias |
| Criar perfil | **@username (obrigatório) e nome**, depois o **onboarding atual** aplicado ao perfil novo |
| Privacidade | **Esconder o vínculo** entre perfis da mesma conta |

## Fora do escopo

- Colaboradores, convites, papéis por perfil e transferência de perfil entre contas.
- Analytics consolidada com gráficos.
- Duplicar perfil.
- Limpeza de arquivos do Storage ao excluir uma conta pelo Admin (não existe hoje; continua igual).

## Modelo de dados

Hoje `profiles.id` é o id da conta, e todos os dados apontam para ele: `links.user_id`, `profile_views.profile_id` e `link_clicks.profile_id`. Conferido em produção: 1 perfil, 8 links, 57 visitas, 12 cliques e nenhum órfão.

**O que fica igual:**
- **`profiles.id`:** continua sendo a chave do perfil. Os perfis existentes **não mudam de id**, e perfis novos ganham id gerado.
- **`links.user_id`:** continua guardando o **id do perfil**, como hoje (o nome é histórico). Os links **não** ganham coluna nova. O `types.ts` e o esquema ganham um comentário explicando isso.
- **`profile_views.profile_id` e `link_clicks.profile_id`:** não mudam.

**O que é novo:**
- **Dono:** fica numa tabela separada, `linkhub.profile_owners`, que **só o próprio dono lê**. A tabela `profiles`, de leitura pública, não ganha nenhuma coluna de dono, e por isso o vínculo fica escondido.
- **Storage por perfil.** Dois caminhos ligariam os perfis à conta:
  - a **pasta** dos arquivos: hoje é `<id da conta>/...`, e aparece no `avatar_url` e no `icon_value`, que são públicos;
  - a **tabela `storage.objects`**: o PostgREST expõe o schema `storage`, e as políticas `*_public_read` deixam qualquer anônimo listar os objetos com a coluna `owner_id`, que é o id de quem enviou.

  Por isso os uploads passam a usar a pasta do **perfil** (`<profile.id>/...`), e as políticas dos dois buckets do LinkHub são refeitas sem leitura pública da tabela (passo 6 da migração). Os arquivos atuais do `dna` já estão em `<uid>/`, que é o id do perfil dele, e continuam válidos. As URLs públicas continuam abrindo, porque o bucket público serve `/object/public/` sem RLS, e o app só usa `getPublicUrl`.

### Migração `deploy/vpsavila/migrations/2026-10-26-varios-perfis.sql`

O arquivo roda numa transação (`BEGIN … COMMIT`), com `SET LOCAL lock_timeout = '5s'`, e é idempotente. Logo depois do `lock_timeout` vem `LOCK TABLE linkhub.profiles, linkhub.links, linkhub.profile_views, linkhub.link_clicks IN SHARE ROW EXCLUSIVE MODE`. A trava fecha duas janelas: entre o preenchimento dos donos e a criação do gatilho, e entre a limpeza de órfãos e a criação das FKs. Todas as funções `SECURITY DEFINER` usam `SET search_path = ''` e nomes qualificados, como as que já existem no repositório.

A migração roda como `postgres` (`-U postgres`), que é dono das tabelas e tem `BYPASSRLS`. As funções ficam com esse dono, e é isso que permite ao `create_profile` inserir um id gerado sem passar pela política `auth.uid() = id`. O ensaio confere o `proowner`. Ordem:

1. **Tabela `linkhub.profile_owners`** (`CREATE TABLE IF NOT EXISTS`):
   - colunas:
     - `profile_id uuid PRIMARY KEY REFERENCES linkhub.profiles(id) ON DELETE CASCADE`;
     - `owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`;
     - `created_at timestamptz NOT NULL DEFAULT now()`;
   - `CREATE INDEX IF NOT EXISTS profile_owners_owner_idx ON linkhub.profile_owners (owner_id)`;
   - RLS ligada; política `"Owners can view their own profile links"` (`DROP POLICY IF EXISTS` + `CREATE POLICY`) com `FOR SELECT TO authenticated USING (owner_id = auth.uid())`;
   - **nenhuma** política de insert, update ou delete: a tabela só é escrita por gatilho e funções;
   - permissões: `REVOKE ALL … FROM PUBLIC, anon, authenticated` e `GRANT SELECT … TO authenticated`. O ACL padrão do schema dá `ALL` aos dois papéis, inclusive `TRUNCATE`, que não passa por RLS.
2. **Preenchimento:** `INSERT INTO linkhub.profile_owners (profile_id, owner_id) SELECT id, id FROM linkhub.profiles WHERE id IN (SELECT id FROM auth.users) ON CONFLICT DO NOTHING`. Os perfis atuais têm `id` igual ao da conta.
3. **`profiles`:**
   - `ALTER TABLE linkhub.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey`;
   - `ALTER COLUMN id SET DEFAULT gen_random_uuid()`.
4. **FKs com exclusão em cascata a partir do perfil:**
   - antes, `DELETE` dos órfãos em `links`, `profile_views` e `link_clicks` (hoje são 0, mas a FK falharia);
   - depois, cada FK num bloco `DO` que testa `pg_constraint` com `conrelid`, como em `2026-10-25-link-icons.sql`:
     - `links_user_id_profile_fkey`: `links.user_id → profiles(id) ON DELETE CASCADE`;
     - `profile_views_profile_id_fkey`;
     - `link_clicks_profile_id_fkey`.
5. **Funções e gatilhos** (`CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS` / `CREATE TRIGGER`):
   - **`linkhub.owns_profile(p_profile_id uuid) RETURNS boolean`**:
     - `STABLE SECURITY DEFINER`, devolve `EXISTS (SELECT 1 FROM linkhub.profile_owners WHERE profile_id = p_profile_id AND owner_id = auth.uid())`;
     - usada pelas políticas, para elas não dependerem de permissão de leitura na tabela de donos;
     - para `anon`, devolve falso, porque `auth.uid()` é nulo;
     - permissões: `GRANT EXECUTE … TO anon, authenticated`.
   - **`linkhub.register_profile_owner()`**: gatilho `AFTER INSERT ON linkhub.profiles`, `SECURITY DEFINER`. Faz `INSERT INTO linkhub.profile_owners VALUES (NEW.id, auth.uid()) ON CONFLICT DO NOTHING` quando `auth.uid()` não é nulo. Cobre o primeiro perfil criado pelo insert direto, inclusive pelo frontend antigo.
   - **`linkhub.cleanup_owned_profile()`**: gatilho `AFTER DELETE ON linkhub.profile_owners`, `SECURITY DEFINER`. Faz `DELETE FROM linkhub.profiles WHERE id = OLD.profile_id`. Com isso, excluir uma conta em `auth.users` → apaga `profile_owners` em cascata → apaga os perfis → apaga links, visitas e cliques em cascata.
   - **`linkhub.protect_profile_id()`**: gatilho `BEFORE UPDATE ON linkhub.profiles`. Recusa `NEW.id <> OLD.id`, com `HINT = 'linkhub_immutable_id'`.
   - **`linkhub.create_profile(p_username text, p_full_name text) RETURNS uuid`**, `SECURITY DEFINER`:
     1. com `auth.uid()` nulo, recusa com `HINT 'linkhub_not_authenticated'`;
     2. pega a trava `pg_advisory_xact_lock(hashtext('linkhub.profiles'), hashtext(auth.uid()::text))`;
     3. com 10 ou mais perfis do dono, recusa com `HINT 'linkhub_profile_limit'`;
     4. se `p_username` não casar com `^[a-z0-9_]{3,20}$` ou estiver na lista de nomes reservados, recusa com `HINT 'linkhub_invalid_username'`. A lista é a mesma de `src/hooks/useUsernameValidation.ts` (`admin`, `dashboard`, `analytics`, `auth`, …), copiada para um array na função; um teste do Vitest lê a migração e compara as duas listas. A troca de @ pela aba Perfil continua validando os reservados só no cliente, como hoje;
     5. insere o perfil com `id` gerado, `username` e `full_name` (aparado, até 100 caracteres); o gatilho registra o dono;
     6. devolve o `id`. O @ duplicado cai no `unique` do banco (`23505`), e o frontend mostra "Este username já está em uso".
   - **`linkhub.list_own_profiles() RETURNS SETOF linkhub.profiles`**, `STABLE SECURITY DEFINER`: devolve os perfis de `auth.uid()`, `ORDER BY created_at, id`.
   - **`linkhub.delete_own_profile(p_profile_id uuid) RETURNS jsonb`**, `SECURITY DEFINER`:
     1. pega a mesma trava do `create_profile`;
     2. faz `SELECT … FROM linkhub.profiles p JOIN linkhub.profile_owners o ON o.profile_id = p.id WHERE p.id = p_profile_id AND o.owner_id = auth.uid() FOR UPDATE`; sem linha (inclusive para `anon`), recusa com `HINT 'linkhub_not_owner'`;
     3. se for o único perfil do dono, recusa com `HINT 'linkhub_last_profile'`;
     4. guarda `avatar_url` e os `icon_value` dos links com `icon_type = 'upload'`;
     5. apaga o perfil (links, visitas, cliques e dono saem em cascata);
     6. devolve `{ "avatar_url": …, "icon_urls": [ … ] }`.

     Os arquivos não são apagados pelo SQL, porque o gatilho `protect_objects_delete` do Storage bloqueia. O cliente remove depois.
   - **`linkhub.owns_profile_folder(p_name text) RETURNS boolean`**, `STABLE SECURITY DEFINER`, usada pelas políticas do Storage:
     1. pega o primeiro segmento de `p_name`;
     2. testa a regex de uuid **dentro da função**. Na política, um `AND` com conversão não garante a ordem de avaliação e poderia dar erro de conversão;
     3. só então devolve `linkhub.owns_profile(<segmento>::uuid)`; fora do formato, devolve falso;
     4. permissões: `GRANT EXECUTE … TO authenticated`.
   - Todas as recusas usam `RAISE EXCEPTION '<mensagem em português>' USING ERRCODE = 'P0001', HINT = '<código>'`. O PostgREST devolve o `hint`, e o frontend decide pelo `hint`, nunca pela mensagem.
   - Permissões das três funções chamáveis (`create_profile`, `list_own_profiles` e `delete_own_profile`): `REVOKE ALL … FROM PUBLIC, anon` e `GRANT EXECUTE … TO authenticated`. O ACL padrão do schema dá `EXECUTE` a `PUBLIC` e `anon`, e por isso o `REVOKE` explícito é necessário.
6. **Políticas.** Mesmos nomes de hoje, com `DROP POLICY IF EXISTS` + `CREATE POLICY`, para nenhuma política antiga sobrar somada por OR:
   - **`profiles`**:
     - `"Users can insert their own profile"`: `WITH CHECK (auth.uid() = id AND NOT EXISTS (SELECT 1 FROM linkhub.profile_owners WHERE owner_id = auth.uid()))`. Só o **primeiro** perfil entra por insert direto, e com `id` igual ao da conta. Isso impede apropriar o id de outra conta e impede recriar o perfil de id da conta depois de excluí-lo, o que furaria o limite. Os outros perfis entram pelo `create_profile`;
     - `"Users can update their own profile"`: `USING (linkhub.owns_profile(id)) WITH CHECK (linkhub.owns_profile(id))`;
     - leitura pública como hoje;
     - sem política de delete.
   - **`links`**: `"Users can insert their own links"`, `"… update …"` e `"… delete …"` usam `linkhub.owns_profile(user_id)`. No update, a regra vale em `USING` e em `WITH CHECK`, o que impede mover um link para o perfil de outra pessoa. A leitura pública fica como hoje.
   - **`profile_views` e `link_clicks`**:
     - `"Users can view their own profile views"` e `"Users can view their own link clicks"`: `USING (linkhub.owns_profile(profile_id))`;
     - os inserts validados (`"Validated profile view inserts only"` e `"Validated link click inserts only"`) **ficam iguais**, porque `links.user_id` continua sendo o id do perfil.
   - **`storage.objects`**, buckets `linkhub-avatars` e `linkhub-link-icons`, com os nomes de hoje:
     - INSERT e UPDATE `TO authenticated`: `bucket_id = '<bucket>' AND linkhub.owns_profile_folder(name)`;
     - SELECT e DELETE `TO authenticated`: `bucket_id = '<bucket>' AND owner_id = auth.uid()::text`. O `remove()` precisa das duas. Pelo `owner_id`, que é quem enviou, a limpeza continua funcionando **depois** que a RPC apagou o perfil. Em produção, nenhum objeto desses buckets tem `owner_id` nulo;
     - **`linkhub_avatars_public_read` e `linkhub_link_icons_public_read` são removidas** (`DROP POLICY IF EXISTS`), para o anônimo não listar `storage.objects` nem ver o `owner_id`.
     - `storage.objects` pertence a `supabase_storage_admin`. Se o ensaio falhar com "must be owner of table objects", as políticas do Storage passam para um arquivo à parte, rodado como `supabase_admin`, e as funções continuam com dono `postgres`.
7. `NOTIFY pgrst, 'reload schema'` e `COMMIT`.

O `deploy/vpsavila/linkhub_schema.sql` recebe o estado final. Os `REVOKE`/`GRANT` das funções e da tabela `profile_owners` vêm **depois** da seção 6 do arquivo, porque os `GRANT ALL ON ALL FUNCTIONS/TABLES … TO anon` dela devolveriam o acesso. O `src/integrations/supabase/types.ts` recebe:
- a tabela `profile_owners`;
- as funções `create_profile`, `list_own_profiles`, `delete_own_profile`, `owns_profile` e `owns_profile_folder`;
- o comentário sobre `links.user_id`.

### Compatibilidade com o frontend atual (entre a migração e o deploy)

- **Primeiro perfil:** ainda entra por insert direto com `id = user.id`. O gatilho registra o dono, e a política continua aceitando.
- **Links:** continuam com `user_id` igual ao id do perfil e passam pela política nova.
- **Leituras:** iguais.
- **Uploads:** o frontend antigo grava em `<user.id>/`, que é a pasta do primeiro perfil, e passa na política nova.
- **Perfil criado por `service_role`** (só por manutenção manual) fica sem dono, porque `auth.uid()` é nulo no gatilho. É o comportamento esperado: não aparece no painel nem no Admin.

O deploy do frontend e da edge function `linkhub-admin-users` acontece na **mesma janela**, logo depois da migração. Com perfis novos, a versão antiga do Admin agrupa errado.

## Painel

### Perfil atual: `src/contexts/CurrentProfileContext.tsx` (novo)

O Provider fica no `App` como **rota de layout**: `<Route element={<CurrentProfileProvider><Outlet /></CurrentProfileProvider>}>`, com `/dashboard` e `/analytics` dentro (hoje as rotas são planas). Ele reinicia quando o `user` muda e expõe:
- `profiles`, `currentProfile`, `loading` e `error`;
- `selectProfile(id)` e `reloadProfiles()`;
- `createProfile({ username, full_name })`, que devolve o `id` ou um erro tipado (`limit`, `taken`, `invalid`, `other`) a partir do `hint` ou do `23505`;
- `deleteProfile(id)`.

Regras:
- **Carga:** `supabase.rpc('list_own_profiles')`.
- **Conta sem perfil:** só quando a RPC **deu certo e veio vazia**, nunca em erro de rede. Nesse caso:
  - cria o primeiro perfil com `insert({ id: user.id, full_name, avatar_url })`, usando nome e foto do provedor, como o `Dashboard` faz hoje;
  - se der `23505`, recarrega a lista: outra carga simultânea já criou o perfil, e a chave primária garante a idempotência;
  - o onboarding abre porque o `user_type` é nulo.
- **Perfil selecionado:**
  - fica em `localStorage` na chave `linkhub:currentProfile:<userId>`, lido e gravado dentro de `try/catch`;
  - se ele não existir mais, cai no primeiro;
  - depois de excluir o perfil atual, seleciona o primeiro restante.
- **Trocar de perfil:**
  - aplica o tema do perfil novo no `useDesignStore`;
  - **sem tema salvo, chama `resetDesign()`**, ação nova no store que volta ao estado inicial (`pebble-blue` e o `customTheme` inicial);
  - dispara `linksUpdated`.
- **`deleteProfile`:**
  1. chama a RPC;
  2. remove do Storage, em **melhor esforço**, o avatar e os ícones devolvidos. A falha só vai para o console, sem toast, porque o perfil já saiu;
  3. recarrega a lista.

  O avatar usa o helper novo `avatarPathFromUrl(url, profileId)`, no molde do `linkIconPathFromUrl(url, profileId)`, os dois com a pasta do perfil apagado. Ele ignora URLs do provedor ou de outra pasta, e passa a ser usado também pela aba Perfil no lugar da regra `includes('supabase')`. A remoção funciona depois de o perfil sair porque as políticas de SELECT e DELETE do Storage olham o `owner_id`, não a pasta.

### Nada vaza entre perfis

- As abas (`TabsContent`), a `ProfilePreview` e o `OnboardingDialog` recebem `key={currentProfile.id}`, e por isso remontam ao trocar de perfil.
- O `OnboardingDialog` recebe o `profile` (id, `full_name`, `avatar_url`) e inicializa nome e foto **a partir do perfil**, não do `user.user_metadata`. Assim, o nome digitado no "Novo perfil" não é sobrescrito pelos dados do Google.
- A `SettingsTab` usa `resetKey = currentProfile.id` no `useAutosave`.
- A `DesignTab` inicializa `selectedTheme` e `customConfig` a partir do perfil atual, com reserva no tema padrão, e não guarda estado entre perfis, por causa do `key`.

### Onde o perfil atual substitui `user.id`

| Arquivo | Passa a |
|---|---|
| `src/pages/Dashboard.tsx` | usa o contexto, sem carregar nem criar o perfil por conta própria; acrescenta a aba `profiles` ao rótulo do cabeçalho do celular; oculta a coluna de prévia **e** o botão "Prévia" nas abas `analytics` e `profiles` |
| `src/components/dashboard/SettingsTab.tsx` | `eq('id', currentProfile.id)` nos 2 `update`; usa `avatarPathFromUrl` |
| `src/components/dashboard/DesignTab.tsx` | `eq('id', currentProfile.id)` |
| `src/components/dashboard/LinksTab.tsx` | lista por `user_id = currentProfile.id`; insert com `user_id: currentProfile.id`; `profileId={currentProfile.id}` no `SortableLink` |
| `src/components/dashboard/links/EditLinkDialog.tsx` | sem mudança no `update` (por `id` do link) |
| `src/components/dashboard/ProfilePreview.tsx` | links por `user_id = profile.id`, o perfil recebido; efeito depende de `profile.id` |
| `src/components/dashboard/OnboardingDialog.tsx` | recebe `profile`; `update eq('id', profile.id)`; links com `user_id: profile.id` |
| `src/pages/Analytics.tsx` | `profile_id` e links pelo perfil atual; efeito depende de `currentProfile.id` |
| `src/hooks/useAnalyticsData.ts` | **removido**, porque não é usado em lugar nenhum |
| `src/hooks/useUsernameValidation.ts` | aceita `currentProfileId` (nas dependências do `useCallback`); o @ fica disponível se for **desse perfil** |
| `src/pages/PublicProfile.tsx` | **sem mudança**: já busca links por `user_id = profile.id` |
| `src/components/dashboard/AppSidebar.tsx` | seletor (abaixo); "Ver Perfil" e "Copiar link" pelo perfil atual |

**A pasta do Storage passa a ser a do perfil** (`<profile.id>/...`), por causa da privacidade:
- uploads e remoções em `SettingsTab`, `OnboardingDialog`, `EditLinkDialog` e na remoção de ícone do `LinksTab`;
- no `EditLinkDialog`, o caminho fica `<profile.id>/<link_id>-<ts>.<ext>`. O `LINK_ICON_UPLOAD_PATH_RE` não muda, só o significado do primeiro segmento;
- `linkIconPathFromUrl` e `avatarPathFromUrl` recebem o id do perfil.

**Continua com `user.id`, e está certo:** `user_roles.user_id`, usado no `AppSidebar` e no `Admin`, porque o papel é da conta.

### Seletor na sidebar (`AppSidebar.tsx`)

- O bloco "LinkHub @dna" vira um `DropdownMenu`.
- Um item por perfil, com avatar de 24 px, nome e @; o atual aparece marcado (`DropdownMenuRadioItem`).
- "Criar novo perfil" fica desabilitado, com a dica "Limite de 10 perfis", quando houver 10.
- "Meus perfis" abre a aba nova.
- Com a sidebar recolhida, o gatilho é só o avatar do perfil atual, com `aria-label` "Trocar de perfil (atual: @x)".

### Aba "Meus perfis" (`src/components/dashboard/ProfilesTab.tsx`, nova)

- No menu, em "Painel de Controle", com o ícone `Users`.
- **Um card por perfil:**
  - avatar, nome, @ e link público;
  - visitas e cliques dos últimos 30 dias, por contagem `head` em `profile_views`/`link_clicks` com `profile_id`; com até 10 perfis, são 2 consultas por perfil;
  - botão "Abrir", que seleciona o perfil e vai para Links;
  - botão "Excluir".
- **Excluir:**
  - pede para digitar o @ (perfil sem @, como um primeiro perfil que nunca o configurou: pede o nome);
  - explica o que será apagado;
  - fica bloqueado, com explicação, quando é o único perfil.
- **Criar:** card "Criar novo perfil", desabilitado com explicação quando houver 10.

### Criar perfil (`src/components/dashboard/NewProfileDialog.tsx`, novo)

- **Campos:** @username (obrigatório, `UsernameInput` + `useUsernameValidation` sem perfil atual) e nome.
- **"Continuar":**
  1. chama `createProfile`;
  2. seleciona o perfil novo;
  3. o Dashboard abre o `OnboardingDialog` para ele.
- **Erros:**
  - `taken`/`invalid`: aviso no campo;
  - `limit`: "Você já tem 10 perfis";
  - `other`: toast.

## Admin (`supabase/functions/linkhub-admin-users/index.ts` e `src/pages/Admin.tsx`)

- **Lista:**
  - a resposta passa a ser `users[]` com `profiles[]` (`id`, `username`, `full_name`, `avatar_url`, `user_type`, `links_count`), mais papel e e-mail;
  - a edge function, com `service_role`, tira as contas dos `owner_id` distintos de `profile_owners`, busca o e-mail com `auth.admin.getUserById`, lê `profiles` e `links` e agrupa por conta. Perfis sem dono não aparecem;
  - a busca procura no e-mail e nos @ de todos os perfis da conta;
  - a paginação é por **conta**, 50 por página.
- **Estatísticas:**
  - "Usuários" conta as contas distintas de `profile_owners`, pelo `Set` na edge function, que serve para a escala atual;
  - o card novo "Perfis" conta todos os perfis.
- **Excluir conta:**
  - apaga `profile_owners` do dono; o gatilho apaga os perfis, e links, visitas e cliques saem em cascata;
  - depois apaga `user_roles`;
  - confere o `error` de cada passo;
  - os arquivos do Storage ficam, como hoje.
  - No `Admin.tsx`, a confirmação avisa que **todos os perfis** da conta serão apagados, e os contadores locais diminuem.

## Página pública, QR code e prévia para redes sociais

Não mudam. Continuam funcionando por @username e por `links.user_id = profile.id`, que já é o id do perfil.

## Testes

- **Banco, em produção, sem efeito:**
  - o arquivo da migração tem `BEGIN … COMMIT` próprio. Rodado dentro de outro `BEGIN`, o `COMMIT` interno gravaria de verdade. Por isso o ensaio usa um **arquivo gerado** por `scripts/ensaio-migracao-perfis.ps1`:
    1. tira do corpo da migração as linhas `BEGIN;` e `COMMIT;`, e o script falha se não achar exatamente uma de cada;
    2. monta `BEGIN; <corpo>; <corpo>; <testes>; ROLLBACK;`. O corpo duas vezes prova a idempotência;
    3. roda com `-v ON_ERROR_STOP=1`, pelo mesmo envio por `scp` do `DEPLOY.md`;
  - nos testes, contas mínimas são inseridas em `auth.users` como `postgres` dentro do bloco, e simuladas com `SET LOCAL role authenticated` e `SET LOCAL request.jwt.claims = '{"sub":"<uuid>"}'`, com `RESET role` entre os casos. Casos:
    - criar o 11º perfil é recusado (`linkhub_profile_limit`);
    - inserir link no perfil de outra conta é recusado;
    - mover um link para perfil alheio por update é recusado;
    - trocar o `id` de um perfil é recusado;
    - excluir o último perfil é recusado;
    - chamar as RPCs como `anon` é recusado;
    - ler `profile_owners` de outra conta devolve vazio;
    - `anon` lendo `profile_owners` recebe permissão negada;
    - os três caminhos de exclusão funcionam sem laço e apagam perfis, links e estatísticas: perfil pela RPC, conta em `auth.users` e `profile_owners` apagado como no Admin;
    - recriar por insert direto o perfil de id da conta, depois de excluí-lo, é recusado;
    - criar perfil com @ reservado (`admin`) é recusado;
    - `anon` lendo `storage.objects` dos buckets do LinkHub recebe 0 linhas;
    - upload na pasta de um perfil alheio é recusado;
    - `SELECT proowner::regrole FROM pg_proc` das funções novas devolve `postgres`.
  - Os casos de concorrência são conferidos na revisão do SQL.
  - Depois do ensaio, aplicar de verdade e repetir as conferências de leitura. Conferir também que a URL pública do avatar do `dna` continua abrindo.
- **Vitest:**
  - `CurrentProfileContext.test.tsx`:
    - carga pela RPC;
    - primeiro perfil criado só com a lista vazia;
    - duas cargas simultâneas fazem um único insert, e o `23505` recarrega a lista;
    - erro de rede não cria nada;
    - seleção em `localStorage`, com e sem `localStorage`;
    - perfil guardado que sumiu cai no primeiro;
    - a troca aplica o tema ou chama `resetDesign()`;
    - `createProfile` mapeia `hint` e `23505`;
    - `deleteProfile` chama a RPC, remove os arquivos pelos helpers e seleciona o primeiro.
  - `AppSidebar.test.tsx` e `AppSidebar.desktop.test.tsx`: usar o Provider; o seletor lista, marca e troca o perfil; "Criar" fica desabilitado com 10.
  - `ProfilesTab.test.tsx`, `NewProfileDialog.test.tsx`.
  - **Novos:**
    - `OnboardingDialog.test.tsx`: usa nome e foto do perfil, grava em `profile.id` e cria links com `user_id: profile.id`;
    - `DesignTab.test.tsx`: não herda o tema na troca;
    - `useUsernameValidation.test.ts`: o @ do próprio perfil fica disponível;
    - `Analytics` por perfil.
  - **Ajustes:** `SettingsTab`, `LinksTab`, `ProfilePreview` e `EditLinkDialog` (pasta do perfil), os helpers `avatarPathFromUrl` e `linkIconPathFromUrl`, e o teste que compara a lista de @ reservados com a da migração.
- **Em produção:**
  - criar um perfil de teste;
  - conferir o seletor, o onboarding com o nome certo, um link e a página pública;
  - trocar entre os perfis e conferir que tema, links e prévia não vazam;
  - excluir o perfil de teste e conferir no banco e nos buckets que nada sobrou;
  - conferir que o perfil `dna` ficou intacto (id, links e estatísticas).
