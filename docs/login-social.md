# Login Social - Guia Completo

## Visão Geral

O LinkHub agora suporta login social com Google e GitHub, proporcionando uma experiência de autenticação mais rápida e conveniente para os usuários.

## Funcionalidades Implementadas

### ✅ Provedores Suportados
- **Google OAuth 2.0**: Login com conta Google
- **GitHub OAuth**: Login com conta GitHub
- **Email/Senha**: Método tradicional mantido

### ✅ Recursos Automáticos
- **Criação de Perfil**: Perfil criado automaticamente no primeiro login
- **Sincronização de Dados**: Nome e avatar importados automaticamente
- **Fallback Inteligente**: Dados padrão quando informações não estão disponíveis

## Como Funciona

### Fluxo de Autenticação Social

1. **Usuário clica no botão de login social**
2. **Redirecionamento para o provedor** (Google/GitHub)
3. **Usuário autoriza a aplicação**
4. **Retorno com dados do usuário**
5. **Criação/atualização automática do perfil**
6. **Redirecionamento para o dashboard**

### Dados Sincronizados

#### Do Google:
```json
{
  "full_name": "Nome Completo do Usuário",
  "avatar_url": "https://lh3.googleusercontent.com/...",
  "email": "usuario@gmail.com"
}
```

#### Do GitHub:
```json
{
  "name": "Nome do Usuário",
  "avatar_url": "https://avatars.githubusercontent.com/...",
  "email": "usuario@users.noreply.github.com"
}
```

## Configuração Técnica

### 1. Configuração no Supabase

```sql
-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name', 
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Implementação no Frontend

```typescript
// Hook de autenticação
const signInWithProvider = async (provider: 'github' | 'google') => {
  const redirectUrl = `${window.location.origin}/dashboard`;
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl
    }
  });
  return { error };
};

// Uso no componente
const handleSocialLogin = async (provider: 'github' | 'google') => {
  const { error } = await signInWithProvider(provider);
  
  if (error) {
    toast({
      title: "Erro no login",
      description: `Erro ao fazer login com ${provider}`,
      variant: "destructive",
    });
  }
};
```

### 3. Interface do Usuário

```tsx
// Botões de login social
<Button
  onClick={() => handleSocialLogin('google')}
  variant="outline"
  className="w-full"
>
  <GoogleIcon className="w-5 h-5 mr-2" />
  Continuar com Google
</Button>

<Button
  onClick={() => handleSocialLogin('github')}
  variant="outline"
  className="w-full"
>
  <Github className="w-5 h-5 mr-2" />
  Continuar com GitHub
</Button>
```

## Configuração de Provedores

### Google OAuth Setup

1. **Google Cloud Console**
   - Acesse [console.cloud.google.com](https://console.cloud.google.com)
   - Crie/selecione um projeto
   - Ative a Google+ API

2. **Credenciais OAuth**
   - Vá para "APIs & Services" > "Credentials"
   - Crie "OAuth 2.0 Client ID"
   - Tipo: "Web application"
   - URLs autorizadas:
     ```
     https://SEU_PROJECT_REF.supabase.co/auth/v1/callback
     http://localhost:5173/dashboard
     ```

3. **Configuração no Supabase**
   - Authentication > Providers > Google
   - Ative o provider
   - Adicione Client ID e Client Secret

### GitHub OAuth Setup

1. **GitHub Developer Settings**
   - Acesse [github.com/settings/developers](https://github.com/settings/developers)
   - Clique em "New OAuth App"

2. **Configuração da App**
   - Application name: "LinkHub"
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`

3. **Configuração no Supabase**
   - Authentication > Providers > GitHub
   - Ative o provider
   - Adicione Client ID e Client Secret

## Segurança

### Validações Implementadas
- **Verificação de domínio**: URLs de callback validadas
- **Tokens seguros**: JWT tokens com expiração
- **Dados sanitizados**: Inputs validados e sanitizados
- **HTTPS obrigatório**: Conexões seguras em produção

### Políticas de Privacidade
- **Dados mínimos**: Apenas informações necessárias são coletadas
- **Consentimento**: Usuário autoriza explicitamente
- **Transparência**: Dados coletados são claramente indicados

## Troubleshooting

### Problemas Comuns

#### 1. Erro de Callback URL
```
Error: redirect_uri_mismatch
```
**Solução**: Verificar se as URLs de callback estão corretas nos provedores

#### 2. Perfil não criado automaticamente
```
Error: Profile not found
```
**Solução**: Verificar se o trigger `handle_new_user` está ativo

#### 3. Avatar não carregando
```
Error: Image not accessible
```
**Solução**: Verificar CORS e permissões de imagem

### Debug

#### Verificar dados do usuário:
```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log('User metadata:', user?.user_metadata);
console.log('App metadata:', user?.app_metadata);
```

#### Verificar perfil criado:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();
console.log('Profile:', profile);
```

## Métricas e Analytics

### Dados Coletados
- **Método de login usado**: Google, GitHub ou Email
- **Taxa de conversão**: Por provedor
- **Tempo de onboarding**: Primeira configuração
- **Retenção**: Por método de autenticação

### Dashboard de Analytics
```typescript
// Exemplo de métricas
const authMetrics = {
  google: { users: 1250, conversion: 85% },
  github: { users: 890, conversion: 78% },
  email: { users: 450, conversion: 65% }
};
```

## Roadmap Futuro

### Próximos Provedores
- [ ] **Discord OAuth**: Para comunidades de gaming
- [ ] **Twitter OAuth**: Para criadores de conteúdo
- [ ] **LinkedIn OAuth**: Para profissionais
- [ ] **Apple Sign In**: Para usuários iOS

### Melhorias Planejadas
- [ ] **Link de contas**: Conectar múltiplos provedores
- [ ] **Migração de dados**: Entre métodos de login
- [ ] **SSO empresarial**: Para organizações
- [ ] **2FA integrado**: Autenticação de dois fatores

## Suporte

Para problemas relacionados ao login social:

1. **Verifique a documentação** dos provedores
2. **Consulte os logs** do Supabase
3. **Teste em ambiente local** primeiro
4. **Abra uma issue** no repositório se necessário

## Contribuição

Para contribuir com melhorias no sistema de autenticação:

1. **Fork** o repositório
2. **Crie uma branch** para sua feature
3. **Implemente** seguindo os padrões
4. **Teste** com todos os provedores
5. **Abra um PR** com descrição detalhada

---

O login social torna o LinkHub mais acessível e melhora significativamente a experiência do usuário, reduzindo o atrito no processo de cadastro e login.