# Deploy do LinkHub Express no vpsavila

Destino: `https://linkhub.avila.ia.br` (frontend) + Supabase self-hosted em `https://supabase-api.avila.ia.br`, schema dedicado `linkhub`.

Convenções: "PowerShell" = notebook, na pasta do repositório clonado. "Servidor" = `ssh avila@192.168.1.24`.

## O que já foi adaptado no código

- Client Supabase lê tudo do `.env` (URL, anon key, schema) e não tem mais URL do Lovable fixa no código.
- Login Google nativo (`supabase.auth.signInWithOAuth`). Wrapper `@lovable.dev/cloud-auth-js`, `lovable-tagger` e broker de preview removidos.
- Domínio público vem de `VITE_PUBLIC_SITE_URL`.
- Bucket renomeado para `linkhub-avatars` e edge functions renomeadas para `linkhub-admin-users` e `linkhub-profile-og`, pra não colidir com outros apps.
- Nenhum trigger em `auth.users` (que é compartilhado com os outros apps). O Dashboard cria o perfil no primeiro acesso.
- Admin lista só quem tem perfil no LinkHub, e "excluir" apaga só os dados do LinkHub, mantendo a conta de login.
- `supabase/migrations/` ficou só como histórico. O schema que vale é `deploy/vpsavila/linkhub_schema.sql`.

## 1. Banco

PowerShell:

```powershell
scp deploy/vpsavila/linkhub_schema.sql avila@192.168.1.24:/tmp/
ssh avila@192.168.1.24 'docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/linkhub_schema.sql && rm /tmp/linkhub_schema.sql'
```

Esperado: `BEGIN`, vários `CREATE`, `COMMIT`. Se der erro, nada é aplicado (transação).

## 2. Expor o schema no PostgREST

Servidor:

```bash
nano ~/docker/supabase/docker/.env
```

Na linha `PGRST_DB_SCHEMAS`, acrescentar `,linkhub` no final. Ex.: `PGRST_DB_SCHEMAS=public,storage,graphql_public,expert_ink,linkhub`.

Na mesma edição, liberar o redirect do app no GoTrue. Acrescentar na linha `ADDITIONAL_REDIRECT_URLS` (separado por vírgula):

```
https://linkhub.avila.ia.br/**
```

Salvar e recriar:

```bash
cd ~/docker/supabase/docker && docker compose up -d --force-recreate rest auth
```

## 3. Google OAuth

Se o Google já está habilitado no GoTrue (por causa de outro app), só falta, no Google Cloud Console, no mesmo client OAuth:

- Origens JavaScript autorizadas: `https://linkhub.avila.ia.br`
- URI de redirecionamento (provavelmente já existe): `https://supabase-api.avila.ia.br/auth/v1/callback`

## 4. Edge functions

PowerShell:

```powershell
scp -r supabase/functions/linkhub-admin-users supabase/functions/linkhub-profile-og avila@192.168.1.24:~/docker/supabase/docker/volumes/functions/
ssh avila@192.168.1.24 'find ~/docker/supabase/docker/volumes/functions -type d -exec chmod 755 {} + && find ~/docker/supabase/docker/volumes/functions -type f -exec chmod 644 {} +'
ssh avila@192.168.1.24 'cd ~/docker/supabase/docker && docker compose up -d --force-recreate functions'
```

As functions usam `linkhub` como schema e `https://linkhub.avila.ia.br` como domínio por padrão. Não precisa de env nova. Se quiser sobrescrever: `SUPABASE_LINKHUB_SCHEMA` e `SUPABASE_LINKHUB_SITE_URL` (com o prefixo `SUPABASE_`, nos 3 lugares de sempre).

Atenção: `linkhub-profile-og` é chamada por robôs do WhatsApp e redes sociais, sem token. Se o `.env` do Supabase estiver com `FUNCTIONS_VERIFY_JWT=true`, ela responde 401 e o preview não aparece. O `linkhub-admin-users` valida o usuário por conta própria, então funciona dos dois jeitos.

Teste (servidor):

```bash
curl -s "https://supabase-api.avila.ia.br/functions/v1/linkhub-profile-og?u=teste" | head -5
```

Esperado: HTML começando com `<!DOCTYPE html>`.

## 5. Build do frontend

PowerShell, na raiz do repo. Criar `.env` a partir do `.env.example` e colar a ANON_KEY do Supabase self-hosted (está no Bitwarden, pasta "Avila Lab"):

```powershell
Copy-Item .env.example .env
notepad .env
npm install
npm run build
```

## 6. Container nginx

Porta sugerida: `8092`. Antes, confirmar que está livre (servidor):

```bash
ss -tlnp | grep 809
```

Se a 8092 estiver ocupada, trocar no `deploy/vpsavila/docker-compose.yml` antes de enviar.

PowerShell:

```powershell
ssh avila@192.168.1.24 'mkdir -p ~/docker/linkhub-frontend/html'
scp deploy/vpsavila/nginx.conf deploy/vpsavila/docker-compose.yml avila@192.168.1.24:~/docker/linkhub-frontend/
scp -r dist/* avila@192.168.1.24:~/docker/linkhub-frontend/html/
ssh avila@192.168.1.24 'find ~/docker/linkhub-frontend -type d -exec chmod 755 {} + && find ~/docker/linkhub-frontend -type f -exec chmod 644 {} + && cd ~/docker/linkhub-frontend && docker compose up -d'
ssh avila@192.168.1.24 'curl -sS http://localhost:8092 | head -5'
```

## 7. Cloudflare Tunnel

one.dash.cloudflare.com → Networks → Tunnels → `lab01` → Public Hostnames → Add:

- Subdomain: `linkhub` · Domain: `avila.ia.br`
- Service: `HTTP` · URL: `localhost:8092`

Sem Cloudflare Access (é página pública).

## 8. Admin

Depois de logar a primeira vez no app, promover a conta (servidor):

```bash
docker exec -i supabase-db psql -U postgres -d postgres -c "INSERT INTO linkhub.user_roles (user_id, role) SELECT id, 'admin'::linkhub.app_role FROM auth.users WHERE email = 'SEU_EMAIL_AQUI';"
```

## 9. Validação

- Login com email e com Google volta logado pro `/dashboard`.
- Onboarding aparece no primeiro acesso e cria o perfil em `linkhub.profiles`.
- Upload de avatar funciona (bucket `linkhub-avatars`).
- Perfil público `https://linkhub.avila.ia.br/<username>` abre e registra visualização. Clique em link incrementa contador.
- `/admin` abre só pra conta admin.
- F12 sem 401/403/CORS.

## Atualizações futuras

PowerShell (preserva o inode do bind mount):

```powershell
npm run build
ssh avila@192.168.1.24 'find ~/docker/linkhub-frontend/html -mindepth 1 -delete'
scp -r dist/* avila@192.168.1.24:~/docker/linkhub-frontend/html/
ssh avila@192.168.1.24 'find ~/docker/linkhub-frontend/html -type d -exec chmod 755 {} + && find ~/docker/linkhub-frontend/html -type f -exec chmod 644 {} +'
```

Como é PWA, quem já abriu o app recebe a versão nova no próximo carregamento (o `sw.js` não fica em cache).
