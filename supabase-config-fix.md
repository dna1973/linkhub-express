# Configuração Correta do Supabase para OAuth

## 1. Acesse o Painel do Supabase
- Vá para: https://supabase.com/dashboard
- Selecione seu projeto: jyabzsduzfwllajmbzma

## 2. Configurar Authentication > URL Configuration

### Site URL:
```
https://linkhub.estudioai.site
```

### Redirect URLs (adicione todas essas):
```
https://linkhub.estudioai.site/dashboard
https://linkhub.estudioai.site/auth/callback
http://localhost:5173/dashboard
http://localhost:5173/auth/callback
```

## 3. Configurar Authentication > Providers

### Google:
- Ative o provider Google
- Mantenha Client ID e Client Secret
- NÃO altere as configurações de redirect aqui

### GitHub:
- Ative o provider GitHub  
- Mantenha Client ID e Client Secret
- NÃO altere as configurações de redirect aqui

## 4. Salvar as configurações

Clique em "Save" em todas as seções modificadas.

## 5. Aguardar propagação

Aguarde 1-2 minutos para as configurações serem aplicadas.