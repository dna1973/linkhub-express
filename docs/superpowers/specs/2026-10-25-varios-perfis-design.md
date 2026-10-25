# Vários perfis por conta — especificação

**Data:** 25/10/2026
**Situação:** desenho aprovado pelo Daniel em 25/10/2026 (abordagem 1).

## Objetivo

Uma conta passa a ter mais de um perfil público, por exemplo pessoal, profissional e de setores. Cada perfil tem o próprio @username, foto, tema, links, QR code e estatísticas. No painel, o dono troca de perfil por um seletor na sidebar e gerencia todos numa página "Meus perfis".

## Decisões do Daniel

| Pergunta | Escolha |
|---|---|
| Quem edita | Só o dono da conta (um dono por perfil; sem colaboradores por enquanto) |
| Limite | Até **10 perfis por conta** |
| Troca no painel | **Seletor no topo da sidebar** e página **"Meus perfis"** |
| Estatísticas | Analytics **por perfil** (como hoje) + visitas e cliques de cada perfil lado a lado em "Meus perfis" (últimos 30 dias) |
| Criar perfil | Um passo com @username e nome, depois o **onboarding atual** aplicado ao perfil novo |
| Abordagem | **1**: o perfil vira entidade própria, **preservando os identificadores atuais** |

## Fora do escopo

- Colaboradores, convites, papéis por perfil e transferência de perfil entre contas.
- Analytics consolidada de todos os perfis com gráficos.
- Duplicar um perfil existente.
- Domínio personalizado diferente por perfil. Hoje o domínio já é campo do perfil e continua assim, sem mudança.

## Princípio da migração

Hoje `profiles.id` **é** o id da conta (`auth.users.id`), e todo o resto aponta para ele. Os dados existentes não mudam de identificador:
- cada perfil atual mantém o seu `id`;
- ele ganha `owner_id`, igual ao próprio `id`;
- os links ganham `profile_id`, igual ao `user_id` atual;
- `profile_views.profile_id` e `link_clicks.profile_id` já guardam o id do perfil e não mudam.

Perfis novos ganham `id` gerado (`gen_random_uuid()`).

Por isso, a ordem **migração → frontend** é segura. O frontend antigo continua funcionando com os perfis existentes, porque para eles `id = owner_id = user_id`.

## Dados

Arquivo `deploy/vpsavila/migrations/2026-10-26-varios-perfis.sql`. Roda numa transação (`BEGIN … COMMIT`), com `SET LOCAL lock_timeout = '5s'`, é idempotente e termina com `NOTIFY pgrst, 'reload schema'`.

### `linkhub.profiles`

- Acrescentar `owner_id uuid`, preenchido com `owner_id = id` onde estiver nulo. Depois:
  - `SET NOT NULL`;
  - FK `profiles_owner_id_fkey` → `auth.users(id) ON DELETE CASCADE`;
  - índice `profiles_owner_id_idx`.
- Remover `profiles_id_fkey`, que liga `id` a `auth.users`, e definir `id DEFAULT gen_random_uuid()`.
- Limite de 10 por conta:
  - função `linkhub.enforce_profile_limit()`, em gatilho `BEFORE INSERT`, que conta os perfis de `NEW.owner_id`;
  - se já houver 10, lança `RAISE EXCEPTION 'Limite de 10 perfis por conta' USING ERRCODE = 'P0001'`;
  - o gatilho é criado só se ainda não existir.
- Coluna nova: `created_at` já existe e serve para a ordem dos perfis.

### `linkhub.links`

- Acrescentar `profile_id uuid`, preenchido com `profile_id = user_id`. Depois:
  - `SET NOT NULL`;
  - FK `links_profile_id_fkey` → `linkhub.profiles(id) ON DELETE CASCADE`;
  - índice `links_profile_id_idx (profile_id, position)`.
- `user_id` continua: passa a significar o **dono** (conta) e segue usado pelas regras de acesso.

### `linkhub.profile_views` e `linkhub.link_clicks`

- Apagar órfãos (registros cujo `profile_id` não existe em `profiles`; hoje são 0 nas visitas).
- Acrescentar FKs `… → linkhub.profiles(id) ON DELETE CASCADE`, para que excluir um perfil apague as estatísticas dele.

### Regras de acesso (RLS)

As políticas são trocadas com `DROP POLICY IF EXISTS` + `CREATE POLICY` e passam de "é a minha conta" para "é um perfil meu".

**Perfis:**
- leitura pública: como hoje;
- insert: `WITH CHECK (owner_id = auth.uid())`;
- update: `USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid())`;
- **sem** política de delete: a exclusão é pela função abaixo.

**Links:**
- leitura pública: como hoje;
- insert, update e delete: `auth.uid() = user_id AND EXISTS (SELECT 1 FROM linkhub.profiles p WHERE p.id = links.profile_id AND p.owner_id = auth.uid())`. O update usa o mesmo par em `USING` e `WITH CHECK`.

**Visitas e cliques:**
- select: `profile_id IN (SELECT id FROM linkhub.profiles WHERE owner_id = auth.uid())`;
- o insert validado dos cliques passa a conferir `links.profile_id = link_clicks.profile_id`, no lugar de `links.user_id = profile_id`.

**Storage:** sem mudança. Os buckets `linkhub-avatars` e `linkhub-link-icons` continuam em pastas por **conta** (`auth.uid()`). O caminho dos ícones já leva o id do link, que é único.

### Exclusão de perfil: `linkhub.delete_own_profile(p_profile_id uuid)`

- `SECURITY DEFINER` com `SET search_path = linkhub, public`.
- Recusa:
  - se o perfil não for de `auth.uid()`;
  - se for o **último** perfil da conta ("Não é possível excluir o único perfil").
- Antes de apagar, coleta e **devolve** os arquivos a remover do Storage:
  - `avatar_url`;
  - os `icon_value` dos links com `icon_type = 'upload'`.
- Depois apaga o perfil. Links, visitas e cliques saem em cascata.
- Retorno: `jsonb` com `{ avatar_url, icon_urls: [] }`.
- Quem chamou remove os arquivos pelos helpers que já existem: `linkIconPathFromUrl`, e a mesma regra do avatar na aba Perfil, sempre na pasta da conta.
- `GRANT EXECUTE` só para `authenticated`.

### Esquema e tipos

- `deploy/vpsavila/linkhub_schema.sql` recebe o estado final:
  - `profiles` com `owner_id` e `id` com padrão gerado;
  - `links.profile_id`, FKs, índices, gatilho, função e políticas novas.
- `src/integrations/supabase/types.ts` recebe:
  - `owner_id` em `profiles` e `profile_id` em `links`;
  - a função `delete_own_profile` em `Functions`.

## Painel

### Perfil atual: `src/contexts/CurrentProfileContext.tsx` (novo)

Provider em volta do Dashboard. Expõe:
- `profiles`, ordenados por `created_at`;
- `currentProfile`;
- `selectProfile(id)`;
- `reloadProfiles()`;
- `createProfile({ username, full_name })`, que devolve o perfil criado;
- `deleteProfile(id)`, que chama a RPC e depois limpa o Storage;
- `loading`.

Regras:
- **Carga:** `select('*').eq('owner_id', user.id).order('created_at')`.
- **Conta sem perfil** (conta nova): cria o primeiro com `owner_id = user.id` e o nome e a foto do provedor, como o `Dashboard` faz hoje, e abre o onboarding.
- **Perfil selecionado:**
  - fica guardado em `localStorage` na chave `linkhub:currentProfile:<userId>`, lida e gravada dentro de `try/catch`;
  - se não existir mais, cai no primeiro perfil.
- **Trocar de perfil:**
  - recarrega o tema no `useDesignStore` a partir do `theme_options` do perfil novo;
  - **se o perfil não tiver tema, volta ao tema padrão**, para não herdar o tema do perfil anterior;
  - recarrega a lista de links e a prévia, e dispara `linksUpdated`.

### Onde o `user.id` vira o perfil atual

| Arquivo | Hoje | Passa a |
|---|---|---|
| `src/pages/Dashboard.tsx` | carrega e cria o perfil por `id = user.id` | usa o contexto; o onboarding abre quando `currentProfile.user_type` é nulo |
| `src/components/dashboard/SettingsTab.tsx` | `update … eq('id', user.id)` (2 lugares) | `eq('id', currentProfile.id)`; avatar continua na pasta `user.id` |
| `src/components/dashboard/DesignTab.tsx` | `update theme_options eq('id', user.id)` | `eq('id', currentProfile.id)` |
| `src/components/dashboard/LinksTab.tsx` | links por `user_id`; insert com `user_id` | lista por `profile_id = currentProfile.id`; insert com `user_id: user.id` **e** `profile_id: currentProfile.id` |
| `src/components/dashboard/ProfilePreview.tsx` | links por `user_id` | por `profile_id` do perfil recebido |
| `src/components/dashboard/OnboardingDialog.tsx` | `update … eq('id', user.id)`; links com `user_id` | recebe `profileId`; `update eq('id', profileId)`; links com `user_id` e `profile_id` |
| `src/hooks/useAnalyticsData.ts`, `src/pages/Analytics.tsx` | `profile_id = user.id`; links por `user_id` | perfil atual (`profile_id`); links por `profile_id` |
| `src/components/dashboard/LinkClicksDialog.tsx` | recebe `profileId` (que hoje é o user id) | recebe o id do perfil atual |
| `src/hooks/useUsernameValidation.ts` | disponível se o dono do @ é `user.id` | aceita `currentProfileId` e considera disponível se o @ for **desse perfil** |
| `src/pages/PublicProfile.tsx` | links por `user_id = profile.id` | links por `profile_id = profile.id` |

A página `/analytics` (rota própria) usa o mesmo contexto. O Provider fica no `App` em volta das rotas autenticadas (`/dashboard` e `/analytics`), ou a página lê a seleção pelo mesmo `localStorage` e carrega o perfil. O plano escolhe a opção mais simples de testar.

### Seletor na sidebar (`AppSidebar.tsx`)

- O bloco "LinkHub @dna" do topo vira um botão de menu (`DropdownMenu` do shadcn).
- O menu tem:
  - um item por perfil, com avatar (24 px), nome e @, e o atual marcado (`aria-checked`);
  - "Criar novo perfil", desabilitado com a dica "Limite de 10 perfis" quando houver 10;
  - "Meus perfis", que abre a aba nova.
- Com a sidebar recolhida, fica só o avatar do perfil atual como gatilho.
- "Ver Perfil" e "Copiar link" passam a usar o perfil atual (`getPublicProfileUrl(currentProfile)`).

### Aba "Meus perfis" (`src/components/dashboard/ProfilesTab.tsx`, nova)

- Fica no menu da sidebar, em "Painel de Controle", com ícone `Users`. O Dashboard ganha a aba `profiles`.
- Um card por perfil:
  - avatar, nome, @ e link público;
  - visitas e cliques dos últimos 30 dias: contagens `head` em `profile_views` e `link_clicks` por `profile_id`, `viewed_at`/`clicked_at` ≥ agora − 30 dias, com até 10 perfis × 2 consultas;
  - botões "Abrir" (seleciona e vai para Links) e "Excluir".
- **Excluir:**
  - diálogo que exige digitar o @username, ou o nome, se o perfil não tiver @;
  - avisa que links, estatísticas, foto e ícones enviados serão apagados;
  - fica desabilitado com explicação quando é o único perfil.
- **Card "Criar novo perfil":** some, ou fica desabilitado com a explicação, quando houver 10.
- A coluna de prévia do Dashboard fica oculta nesta aba, como já acontece com Analytics.

### Criar perfil (`src/components/dashboard/NewProfileDialog.tsx`, novo)

- Campos @username (`UsernameInput` + `useUsernameValidation` sem perfil atual) e nome.
- "Continuar":
  1. chama `createProfile`, que faz `insert({ owner_id: user.id, username, full_name })`;
  2. seleciona o perfil novo;
  3. o Dashboard abre o `OnboardingDialog` para ele, porque o `user_type` é nulo.
- **Erros:**
  - @ indisponível: aviso no campo;
  - limite (`P0001` / mensagem do gatilho): "Você já tem 10 perfis";
  - outros: toast.

## Admin

`supabase/functions/linkhub-admin-users/index.ts`, mais `src/pages/Admin.tsx`:
- **Lista:** contas com seus perfis. Por conta: e-mail, papel e perfis (`username`, nome, avatar, número de links). Os contadores somam todos os perfis da conta.
- **Excluir conta:** apaga **todos** os perfis do dono (`owner_id`). Links, visitas e cliques saem em cascata. A conta em `auth.users` continua, como hoje.
- **Estatísticas gerais:** "usuários" passa a contar **contas** (`count(DISTINCT owner_id)`), e ganha um contador de perfis.

## Compatibilidade

- **Sem mudança:** página pública, QR code, edge function `linkhub-profile-og` (busca por @), ícones dos links e buckets.
- **Contas atuais:** ficam com um perfil cada e o mesmo id. O seletor mostra um item só.
- **Links criados pelo frontend antigo depois da migração:** não ficam sem `profile_id`, porque a coluna é `NOT NULL`. O frontend antigo insere sem `profile_id` e falharia; por isso a migração cria um gatilho `BEFORE INSERT` em `links` que preenche `profile_id = user_id` quando ele vier nulo. É uma transição: o gatilho é inofensivo depois e fica documentado.

## Testes

- **Banco** (validados por leitura, porque não há Postgres local):
  - a migração é idempotente;
  - preenchimentos e FKs;
  - políticas;
  - gatilho de limite;
  - função de exclusão (dono, último perfil, retorno dos arquivos).

  Depois de aplicada, conferências por SQL em produção.
- **`CurrentProfileContext.test.tsx`:**
  - carrega e ordena os perfis;
  - cria o primeiro quando não há;
  - lê e grava a seleção no `localStorage` (com e sem `localStorage`);
  - cai no primeiro perfil quando o guardado sumiu;
  - a troca aplica o tema e volta ao padrão quando não há;
  - `createProfile` trata o limite;
  - `deleteProfile` chama a RPC e depois remove os arquivos devolvidos (`storage.remove` com os caminhos certos).
- **`AppSidebar`:** o menu lista os perfis, marca o atual, troca ao clicar e desabilita "Criar" com 10.
- **`ProfilesTab.test.tsx`:**
  - cards com contagens;
  - "Abrir" seleciona;
  - "Excluir" exige o @, fica bloqueado no único perfil e chama `deleteProfile`.
- **`NewProfileDialog.test.tsx`:** @ disponível, @ em uso, erro de limite e sucesso abrindo o onboarding.
- **Ajustes nos testes existentes** (`SettingsTab`, `LinksTab`, `ProfilePreview`, `OnboardingDialog`, `useUsernameValidation`, `PublicProfile`, se houver): passam a usar o perfil atual (`profile_id` e `eq('id', profileId)`).
- **Em produção:**
  - migração conferida (owner, `profile_id`, FKs, políticas, gatilhos e função);
  - criar um perfil de teste pelo painel, com seletor, onboarding, link e página pública;
  - trocar entre os perfis e conferir que tema e links não vazam;
  - excluir o perfil de teste e conferir no banco e nos buckets que nada sobrou.
  - O perfil `dna` não é alterado.
