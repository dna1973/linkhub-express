# Deploy do LinkHub Express no vpsavila

Destino: `https://linkhub.avila.ia.br` (frontend) + Supabase self-hosted em `https://supabase-api.avila.ia.br`, schema dedicado `linkhub`.

Convenções: "PowerShell" = notebook, na pasta do repositório clonado. "Servidor" = `ssh avila@192.168.1.24`.

## O que já foi adaptado no código

- Client Supabase lê tudo do `.env` (URL, anon key, schema) e não tem mais URL do Lovable fixa no código.
- Login Google nativo (`supabase.auth.signInWithOAuth`). Wrapper `@lovable.dev/cloud-auth-js`, `lovable-tagger` e broker de preview removidos.
- Domínio público vem de `VITE_PUBLIC_SITE_URL`.
- Bucket renomeado para `linkhub-avatars` e edge functions renomeadas para `linkhub-admin-users` e `linkhub-profile-og`, pra não colidir com outros apps.
- O LinkHub não cria trigger em `auth.users`, que é compartilhado com os outros apps (o expert_ink tem o `on_auth_user_created` → `expert_ink.handle_new_user`). O painel cria o primeiro perfil da conta no primeiro acesso.
- Uma conta tem até 10 perfis. O dono de cada perfil fica em `linkhub.profile_owners`, que só o próprio dono lê.
- Admin lista as contas que têm perfil no LinkHub, com os perfis de cada uma. "Excluir" apaga todos os perfis da conta (links e estatísticas juntos) e mantém a conta de login. Os arquivos do Storage ficam.
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

### Recuperação de senha

O app pede o link com `redirectTo: https://linkhub.avila.ia.br/auth/nova-senha` (fluxo implicit: o link do e-mail volta com `#access_token=…&type=recovery`). No GoTrue, que é compartilhado:

- SMTP (Resend) configurado nas variáveis `GOTRUE_SMTP_*`.
- `GOTRUE_URI_ALLOW_LIST` com `https://linkhub.avila.ia.br/**` (já tem); sem isso o GoTrue troca o destino pelo `SITE_URL`, que é de outro app.
- O modelo do e-mail de recuperação precisa usar `{{ .ConfirmationURL }}` (que leva o `redirect_to`), não `{{ .SiteURL }}`. O modelo vale para todos os apps do servidor: texto neutro, sem citar o LinkHub.
- `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_REAUTHENTICATION` desligado (padrão); ligado, o `updateUser({ password })` pede um código extra e a página mostra erro.
- O app exige 8 caracteres; `GOTRUE_PASSWORD_MIN_LENGTH` maior que isso faz o servidor recusar com `weak_password` (a página traduz).
- Limite de envio: `GOTRUE_RATE_LIMIT_EMAIL_SENT`; validade do link: `GOTRUE_MAILER_OTP_EXP`.

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
- Esqueci minha senha: o e-mail chega, o link abre `/auth/nova-senha`, a senha nova grava e a tela volta ao login (sem entrar no painel). Link usado de novo mostra "Este link expirou ou já foi usado".
- Onboarding aparece no primeiro acesso e cria o perfil em `linkhub.profiles`.
- Upload de avatar funciona (bucket `linkhub-avatars`).
- Perfil público `https://linkhub.avila.ia.br/<username>` abre e registra visualização. Clique em link incrementa contador.
- `/admin` abre só pra conta admin.
- F12 sem 401/403/CORS.

## Atualizações futuras

### Build

```powershell
npm run build
```

- O `prebuild` roda `scripts/prepare-mediapipe.mjs`, que prepara o motor e o modelo da remoção de fundo em `public/mediapipe/<versão>/`. O primeiro build numa máquina baixa o modelo (15,6 MB) uma vez; os seguintes reaproveitam.
- Sem internet e sem o modelo, o build **para com erro**, de propósito: um `dist` sem `mediapipe/` publicado por cima do servidor tiraria a remoção de fundo do ar. Rode de novo com internet. Só use `SKIP_MEDIAPIPE=1` se quiser mesmo publicar sem a remoção de fundo.
- O `prebuild` também roda `scripts/prepare-icons.mjs`, que copia os SVGs de marca (`simple-icons`) e do Lucide (`lucide-static`) de `node_modules` para `public/vendor-icons/<pacote>/<versão>/`, com um `catalog.v1.json` em cada pasta. Se faltar algo, ou se o `node_modules` tiver outra versão de um dos pacotes, o build também para com erro (`SKIP_VENDOR_ICONS=1` pula, deixando os ícones quebrados).
- Cada deploy envia cerca de 50 MB, quase todos do MediaPipe (`dist/mediapipe/`); os cerca de 5.000 SVGs dos ícones (`dist/vendor-icons/`) somam uns 6 MB.

### Migrações do banco

Quando o deploy trouxer um arquivo novo em `deploy/vpsavila/migrations/`, aplique-o **antes** de publicar o frontend. O frontend novo pode gravar colunas que só existem depois da migração, e o antigo ignora colunas novas, então essa ordem é sempre segura:

O arquivo vai por `scp` e é aplicado no servidor. Encadear o `Get-Content` com o `ssh` não serve: o Windows PowerShell 5.1 põe uma marca de codificação (BOM) no começo do texto enviado, e o `psql` acusa erro de sintaxe. Exemplo com a migração do QR code (troque o nome do arquivo nas duas linhas). O `-X` faz o `psql` ignorar o `~/.psqlrc` do contêiner, e o `s=$?` devolve o código do `psql` e apaga o arquivo mesmo quando a migração falha:

```powershell
scp deploy/vpsavila/migrations/2026-10-25-show-qr-code.sql avila@192.168.1.24:/tmp/
ssh avila@192.168.1.24 'docker exec -i supabase-db psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/2026-10-25-show-qr-code.sql; s=$?; rm -f /tmp/2026-10-25-show-qr-code.sql; exit $s'
```

Esperado: as linhas de cada comando da migração e nenhum `ERROR`. A do QR code imprime `SET`, `ALTER TABLE` e `NOTIFY`; a dos ícones (`2026-10-25-link-icons.sql`) imprime `BEGIN`, `SET`, três `ALTER TABLE`, três `DO`, `INSERT 0 1` (ou `INSERT 0 0` se o bucket já existir), pares `DROP POLICY`/`CREATE POLICY`, `NOTIFY` e `COMMIT`. Com erro, o `ON_ERROR_STOP` para tudo e **o frontend novo não deve ser publicado** até a migração passar. A dos vários perfis (`2026-10-26-varios-perfis.sql`) imprime `BEGIN`, `SET`, `LOCK TABLE`, `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE`, pares `DROP POLICY`/`CREATE POLICY`, `REVOKE`/`GRANT`, `INSERT 0 n`, três `DELETE 0`, quatro `DO`, `COMMENT`, `CREATE FUNCTION`, pares `DROP TRIGGER`/`CREATE TRIGGER`, `NOTIFY` e `COMMIT`. Na primeira vez, também aparecem avisos `NOTICE: … does not exist, skipping` dos `DROP … IF EXISTS` de políticas e gatilhos novos; são esperados.

Escreva as migrações de forma idempotente (`IF NOT EXISTS` e afins), para poderem rodar de novo sem quebrar nada.

### Ensaio de uma migração (vários perfis)

A `2026-10-26-varios-perfis.sql` mexe em chaves e políticas. Antes de aplicá-la, rode o ensaio: o script junta o corpo da migração duas vezes e os testes num arquivo que termina em `ROLLBACK`, então nada fica gravado. A única marca são as sequências de id (`links_id_seq`, `profile_views_id_seq`, `link_clicks_id_seq`), que avançam alguns números, porque sequência não volta no `ROLLBACK`. Os testes ficam em `scripts/ensaio-perfis-testes.sql` (banco) e `scripts/ensaio-perfis-testes-storage.sql` (Storage).

**Travas em `auth.users`.** A migração tira a FK `profiles_id_fkey` (AccessExclusiveLock em `auth.users`) e cria `profile_owners` com FK para `auth.users` (ShareRowExclusiveLock). As duas travas ficam até o fim da transação: na migração, alguns segundos; no ensaio, durante os dois corpos e todos os testes. Nesse tempo, login e renovação de sessão de **todos** os apps da VPS (expert_ink e outros) esperam. Rode o ensaio e a migração em horário calmo.

**Gatilho do expert_ink.** `auth.users` tem o `on_auth_user_created` → `expert_ink.handle_new_user`. As contas de teste do ensaio passam por ele (gravam em `expert_ink.profiles`), e excluir conta cascateia em `expert_ink.*`. O `ROLLBACK` desfaz tudo. Se o ensaio parar com erro em `expert_ink.*`, não mexa no outro app: pare e veja com o Daniel.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\ensaio-migracao-perfis.ps1
scp "$env:TEMP\linkhub-ensaio-varios-perfis.sql" avila@192.168.1.24:/tmp/
ssh avila@192.168.1.24 'docker exec -i supabase-db psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/linkhub-ensaio-varios-perfis.sql; s=$?; rm -f /tmp/linkhub-ensaio-varios-perfis.sql; exit $s'
```

Esperado: as linhas dos comandos (`BEGIN`, `LOCK TABLE`, `CREATE TABLE`, vários `DO`, `CREATE POLICY`…), nenhum `ERROR` e `ROLLBACK` no fim. Um `ERROR: ENSAIO FALHOU (n): …` diz qual caso falhou; nada foi gravado (só as sequências de id `links_id_seq`, `profile_views_id_seq` e `link_clicks_id_seq` avançam alguns números, porque não voltam no `ROLLBACK`). O caso `S7` olha as políticas de leitura de `storage.objects` de todos os apps da VPS: se parar nele, alguma política vale para `anon`/`public` sem filtrar `bucket_id` (ou cita um bucket do LinkHub) e devolveria os objetos do LinkHub ao anônimo. Não mexa na política de outro app: veja com o Daniel. O `s=$?` devolve o código do `psql`, mesmo com o `rm` depois.

Para conferir o banco antes e depois de aplicar (só leitura):

```powershell
scp scripts/conferencia-perfis.sql avila@192.168.1.24:/tmp/
ssh avila@192.168.1.24 'docker exec -i supabase-db psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < /tmp/conferencia-perfis.sql; s=$?; rm -f /tmp/conferencia-perfis.sql; exit $s'
```

### Publicar

O build novo sobe para `html.new` e só então troca de lugar com o atual, que fica em `html.old` para voltar se precisar. Nada é apagado antes de o novo estar inteiro no servidor. Como a troca muda a pasta montada no contêiner, o `--force-recreate` é obrigatório.

O `dist` vai empacotado num `.tgz`: com os cerca de 5.000 SVGs dos ícones, o `scp -r` arquivo por arquivo fica lento. O `--format ustar` evita que o GNU tar do servidor avise de cabeçalhos `LIBARCHIVE.*` do `tar.exe` do Windows (o aviso seria inofensivo).

No PowerShell, um comando nativo (`tar.exe`, `scp`, `ssh`) que falha **não** interrompe as linhas seguintes. Por isso o procedimento é um bloco único `& { … }`, colado inteiro: cada passo confere o `$LASTEXITCODE` e o `throw` para o bloco no primeiro erro. No servidor, cada linha encadeia os comandos com `&&`, e a troca de pastas só acontece se `html.new/index.html` existir. Se o bloco parar antes da troca, o site continua no ar com o `html` atual.

```powershell
& {
  $tgz = "$env:TEMP\linkhub-dist.tgz"
  tar.exe --format ustar -czf $tgz -C dist .
  if ($LASTEXITCODE -ne 0) { throw 'Falhou: empacotar o dist' }
  ssh avila@192.168.1.24 'rm -f /tmp/linkhub-dist.tgz'
  if ($LASTEXITCODE -ne 0) { throw 'Falhou: apagar o .tgz antigo no servidor' }
  scp $tgz avila@192.168.1.24:/tmp/
  if ($LASTEXITCODE -ne 0) { throw 'Falhou: enviar o .tgz' }
  ssh avila@192.168.1.24 'cd ~/docker/linkhub-frontend && rm -rf html.new && mkdir html.new && tar -xzf /tmp/linkhub-dist.tgz -C html.new && rm -f /tmp/linkhub-dist.tgz && test -f html.new/index.html && test -f html.new/vendor-icons/simple-icons/16.35.0/youtube.svg'
  if ($LASTEXITCODE -ne 0) { throw 'Falhou: extrair e conferir o html.new no servidor' }
  ssh avila@192.168.1.24 'find ~/docker/linkhub-frontend/html.new -type d -exec chmod 755 {} + && find ~/docker/linkhub-frontend/html.new -type f -exec chmod 644 {} +'
  if ($LASTEXITCODE -ne 0) { throw 'Falhou: chmod do html.new' }
  ssh avila@192.168.1.24 'cd ~/docker/linkhub-frontend && test -f html.new/index.html && rm -rf html.old && mv html html.old && mv html.new html && docker compose up -d --force-recreate && sleep 40 && docker inspect --format "{{.State.Health.Status}}" linkhub-nginx'
  if ($LASTEXITCODE -ne 0) { throw 'Falhou: trocar as pastas e recriar o contêiner' }
  Remove-Item $tgz
}
```

Esperado: `healthy` no fim, sem nenhuma mensagem `Falhou: …`. Se vier `starting`, repita só o `docker inspect`. Se aparecer `Falhou: …`, corrija a causa e rode o bloco inteiro de novo: cada passo pode ser repetido.

### Quando o `nginx.conf` mudar

Teste o arquivo novo num contêiner descartável antes de tocar no que está em uso, e faça a troca junto com a publicação acima (o `--force-recreate` também é o que faz o nginx ler o arquivo novo):

```powershell
scp deploy/vpsavila/nginx.conf avila@192.168.1.24:~/docker/linkhub-frontend/nginx.conf.new
ssh avila@192.168.1.24 'docker run --rm -v ~/docker/linkhub-frontend/nginx.conf.new:/etc/nginx/conf.d/default.conf:ro nginx:1.27-alpine nginx -t'
ssh avila@192.168.1.24 'cd ~/docker/linkhub-frontend && cp nginx.conf nginx.conf.old && mv nginx.conf.new nginx.conf && chmod 644 nginx.conf'
```

Esperado no `nginx -t`: `syntax is ok` e `test is successful`. Se falhar, pare: o nginx em uso continua com o arquivo antigo.

### Prévia dos perfis no WhatsApp e nas redes

O WhatsApp, o Telegram e as redes sociais não rodam o JavaScript do site: montam a prévia de um link com as tags `og:` do HTML que recebem. Por isso o `nginx.conf` reconhece esses robôs pelo `User-Agent` (o `map` `$linkhub_preview_bot`) e, quando pedem `/<@>`, busca a página na edge function `linkhub-profile-og`, com o nome, a bio e a foto do perfil. Quem visita recebe o site normal, e as rotas do app (`/auth`, `/dashboard`…) ficam de fora. A lista dessas rotas no `nginx.conf` é conferida contra `APP_ROUTE_SEGMENTS` por `src/lib/nginxPreview.test.ts`: ao criar uma rota nova, atualize os dois. Se a edge function falhar, o robô recebe o site com a prévia genérica.

Para conferir depois de uma troca:

```powershell
curl.exe -s -A 'WhatsApp/2.23.20.0 A' https://linkhub.avila.ia.br/dna | Select-String -Pattern 'og:(title|image)'
curl.exe -s -A 'Mozilla/5.0' https://linkhub.avila.ia.br/dna | Select-String -Pattern 'og:(title|image)'
```

Esperado: no primeiro, o nome e a foto do perfil; no segundo, a prévia genérica do LinkHub. O WhatsApp guarda a prévia de cada endereço por um tempo: um link já enviado continua com a prévia antiga, e para testar na hora vale mandar o endereço com algo no fim (`/dna?v=2`).

### Conferir

```powershell
curl.exe -s https://linkhub.avila.ia.br/ | Select-String -Pattern 'assets/index-[^"]+\.js'
curl.exe -s -o NUL -w '%{http_code}\n' https://linkhub.avila.ia.br/mediapipe/1.1.1/models/selfie_multiclass_256x256.tflite
curl.exe -s -o NUL -w '%{http_code} %{content_type}\n' https://linkhub.avila.ia.br/vendor-icons/simple-icons/16.35.0/youtube.svg
curl.exe -s -o NUL -D - https://linkhub.avila.ia.br/vendor-icons/simple-icons/16.35.0/youtube.svg | Select-String -Pattern '^cache-control'
curl.exe -s -o NUL -w '%{http_code}\n' https://linkhub.avila.ia.br/vendor-icons/simple-icons/16.35.0/nao-existe.svg
```

Esperado: o mesmo `index-*.js` do `dist/index.html`, `200` no modelo, `200 image/svg+xml` no ícone do YouTube, `cache-control: public, max-age=2592000` e `404` no SVG inexistente. Os dois últimos provam que o bloco `/vendor-icons/` do `nginx.conf` está em vigor: sem ele, o SVG vem sem esse cache e o inexistente volta o `index.html` com `200`.

### Subir a versão dos ícones (simple-icons / lucide-static)

As versões ficam fixas em três lugares, conferidos pelo `src/lib/linkIcons/vendor.test.ts`: `package.json` (`devDependencies`, sem `^`), `scripts/prepare-icons.mjs` e `src/lib/linkIcons/vendor.ts`. O caminho servido carrega a versão, e o script apaga as pastas das versões antigas no build seguinte.

O Simple Icons **remove marcas** entre versões. Antes de publicar uma versão nova, liste os slugs de marca gravados nos links (servidor):

```bash
docker exec -i supabase-db psql -U postgres -d postgres -c "SELECT DISTINCT icon_value FROM linkhub.links WHERE icon_type = 'brand';"
```

Confira se cada slug ainda tem um `<slug>.svg` em `node_modules/simple-icons/icons/` da versão nova. Se algum sumiu, não publique até decidir o que fazer com esses links (trocar o ícone deles ou ficar na versão atual).

### Voltar à versão anterior

```powershell
ssh avila@192.168.1.24 'cd ~/docker/linkhub-frontend && mv html html.new && mv html.old html && docker compose up -d --force-recreate'
```

Se o `nginx.conf` também mudou, volte com `cp nginx.conf.old nginx.conf` antes do `docker compose`.

Como é PWA, quem já abriu o app recebe a versão nova no próximo carregamento (o `sw.js` não fica em cache).
