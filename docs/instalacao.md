# Guia de Instalação

## Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Conta no Supabase
- Git

## Instalação Local

### 1. Clone o Repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd linkhub
```

### 2. Instale as Dependências

```bash
npm install
# ou
yarn install
```

### 3. Configuração do Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### 4. Configuração do Supabase

#### 4.1. Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie a URL e a chave anônima

#### 4.2. Configurar Autenticação Social

No painel do Supabase, vá para Authentication > Providers e configure:

**Google OAuth:**
1. Ative o provider Google
2. Configure Client ID e Client Secret do Google Console
3. Adicione URLs de redirecionamento:
   - `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`
   - `http://localhost:5173/dashboard` (para desenvolvimento)

**GitHub OAuth:**
1. Ative o provider GitHub
2. Configure Client ID e Client Secret do GitHub
3. Adicione URLs de redirecionamento:
   - `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`
   - `http://localhost:5173/dashboard` (para desenvolvimento)

#### 4.3. Executar Migrações
```bash
# Instalar Supabase CLI
npm install -g @supabase/cli

# Login no Supabase
supabase login

# Linkar projeto local
supabase link --project-ref SEU_PROJECT_REF

# Executar migrações
supabase db push
```

### 5. Executar o Projeto

```bash
npm run dev
```

O projeto estará disponível em `http://localhost:5173`

## Configuração de Produção

### 1. Build do Projeto

```bash
npm run build
```

### 2. Deploy no Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### 3. Variáveis de Ambiente na Produção

Configure as seguintes variáveis no painel do Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Configuração do Banco de Dados

### Estrutura das Tabelas

Execute os seguintes comandos SQL no editor do Supabase:

```sql
-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (username IS NOT NULL);

-- Políticas de segurança para links
CREATE POLICY "Users can manage own links" ON links
  FOR ALL USING (profile_id = auth.uid());

CREATE POLICY "Public links are viewable by everyone" ON links
  FOR SELECT USING (
    profile_id IN (
      SELECT id FROM profiles WHERE username IS NOT NULL
    )
  );

-- Políticas de segurança para analytics
CREATE POLICY "Users can view own analytics" ON analytics
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Anyone can insert analytics" ON analytics
  FOR INSERT WITH CHECK (true);
```

## Configuração OAuth (Login Social)

### Google OAuth Setup

1. **Acesse o Google Cloud Console**
   - Vá para [console.cloud.google.com](https://console.cloud.google.com)
   - Crie um novo projeto ou selecione um existente

2. **Ativar Google+ API**
   - Vá para "APIs & Services" > "Library"
   - Procure por "Google+ API" e ative

3. **Criar Credenciais OAuth**
   - Vá para "APIs & Services" > "Credentials"
   - Clique em "Create Credentials" > "OAuth 2.0 Client IDs"
   - Tipo de aplicação: "Web application"
   - Adicione URLs de redirecionamento:
     ```
     https://SEU_PROJECT_REF.supabase.co/auth/v1/callback
     http://localhost:5173/dashboard
     ```

4. **Configurar no Supabase**
   - Vá para Authentication > Providers > Google
   - Ative o provider
   - Cole Client ID e Client Secret

### GitHub OAuth Setup

1. **Acesse GitHub Developer Settings**
   - Vá para [github.com/settings/developers](https://github.com/settings/developers)
   - Clique em "New OAuth App"

2. **Configurar OAuth App**
   - Application name: "LinkHub"
   - Homepage URL: `http://localhost:5173` (dev) ou sua URL de produção
   - Authorization callback URL: `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`

3. **Configurar no Supabase**
   - Vá para Authentication > Providers > GitHub
   - Ative o provider
   - Cole Client ID e Client Secret

### URLs de Redirecionamento

Para produção, adicione também:
```
https://seu-dominio.com/dashboard
https://seu-dominio.vercel.app/dashboard
```

## Configuração de Desenvolvimento

### 1. ESLint e Prettier

O projeto já vem configurado com ESLint e Prettier. Para executar:

```bash
# Verificar lint
npm run lint

# Corrigir automaticamente
npm run lint:fix
```

### 2. Husky (Git Hooks)

```bash
# Instalar husky
npm install --save-dev husky

# Configurar pre-commit
npx husky add .husky/pre-commit "npm run lint"
```

### 3. Testes

```bash
# Instalar dependências de teste
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Executar testes
npm run test
```

## Troubleshooting

### Problemas Comuns

#### 1. Erro de CORS
- Verifique se a URL do Supabase está correta
- Confirme se o domínio está autorizado no painel do Supabase

#### 2. Erro de Autenticação
- Verifique se as chaves do Supabase estão corretas
- Confirme se o RLS está configurado corretamente

#### 3. Erro de Build
- Limpe o cache: `npm run clean`
- Reinstale dependências: `rm -rf node_modules && npm install`

### Logs e Debug

#### 1. Habilitar logs detalhados
```env
VITE_LOG_LEVEL=debug
```

#### 2. Debug do Supabase
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
})
```

## Scripts Disponíveis

```json
{
  "dev": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "lint": "eslint .",
  "preview": "vite preview",
  "test": "vitest",
  "clean": "rm -rf dist node_modules/.vite"
}
```