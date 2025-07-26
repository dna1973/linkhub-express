# Instruções de Deploy para Produção

## Configurações Necessárias

### 1. Variáveis de Ambiente na Plataforma de Deploy

Configure estas variáveis no seu provedor de hosting (Vercel, Netlify, etc.):

```env
VITE_SUPABASE_URL=https://jyabzsduzfwllajmbzma.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5YWJ6c2R1emZ3bGxham1iem1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2MjMsImV4cCI6MjA2OTA2ODYyM30.WcXhZIKlInqdiEwLubKPpDZV1bV6lxPwV6j7J0cK12w
VITE_APP_URL=https://linkhub.estudioai.site
```

### 2. Configurações OAuth

#### Google:
- Redirect URI: `https://jyabzsduzfwllajmbzma.supabase.co/auth/v1/callback`
- Authorized domains: `linkhub.estudioai.site`

#### GitHub:
- Homepage URL: `https://linkhub.estudioai.site`
- Callback URL: `https://jyabzsduzfwllajmbzma.supabase.co/auth/v1/callback`

#### Supabase:
- Site URL: `https://linkhub.estudioai.site`
- Redirect URLs: `https://linkhub.estudioai.site/dashboard`

### 3. Build Commands

```bash
# Build para produção
npm run build

# Preview local do build
npm run preview
```

### 4. Verificação Pós-Deploy

1. Teste login com email/senha
2. Teste login com Google
3. Teste login com GitHub
4. Verifique redirecionamentos
5. Teste criação de perfil automática