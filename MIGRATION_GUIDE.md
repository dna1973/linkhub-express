# 🚀 Guia de Execução da Migration - Analytics Structure

## 📋 Pré-requisitos
- Acesso ao Supabase Dashboard
- Permissões de administrador no projeto
- Backup dos dados (recomendado)

## 🔧 Passo a Passo

### 1. Acessar o Supabase Dashboard
1. Vá para [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Faça login na sua conta
3. Selecione o projeto `jyabzsduzfwllajmbzma`

### 2. Abrir o SQL Editor
1. No menu lateral, clique em **"SQL Editor"**
2. Clique em **"New query"** para criar uma nova consulta

### 3. Executar a Migration
1. Copie todo o conteúdo do arquivo `migration_script.sql`
2. Cole no SQL Editor
3. Clique em **"Run"** para executar

### 4. Verificar Resultados
Após a execução, você deve ver:
- ✅ "Migration completed successfully!"
- ✅ Lista das novas colunas criadas
- ✅ Contagem de países inseridos (20)
- ✅ Lista dos índices criados

### 5. Verificações Adicionais

#### Verificar Estrutura das Tabelas
```sql
-- Verificar colunas adicionadas
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('profile_views', 'link_clicks') 
  AND column_name IN ('country_code', 'session_id', 'device_type')
ORDER BY table_name, column_name;
```

#### Verificar Tabela de Países
```sql
-- Verificar países inseridos
SELECT code, name, name_pt FROM public.countries ORDER BY name;
```

#### Verificar Índices
```sql
-- Verificar índices criados
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('profile_views', 'link_clicks') 
  AND (indexname LIKE '%country%' OR indexname LIKE '%session%');
```

## 🔍 Troubleshooting

### Erro: "relation already exists"
- **Causa**: Tabela ou índice já existe
- **Solução**: Normal, o script é idempotente

### Erro: "column already exists"
- **Causa**: Coluna já foi adicionada anteriormente
- **Solução**: Normal, o script verifica existência

### Erro: "permission denied"
- **Causa**: Falta de permissões
- **Solução**: Verificar se você é admin do projeto

## 📊 Resultados Esperados

Após a migration, as tabelas terão:

### `profile_views`
- ✅ `country_code` (VARCHAR(2)) - Código ISO do país
- ✅ `session_id` (VARCHAR(100)) - ID da sessão do usuário
- ✅ `device_type` (VARCHAR(20)) - Tipo de dispositivo

### `link_clicks`
- ✅ `country_code` (VARCHAR(2)) - Código ISO do país
- ✅ `session_id` (VARCHAR(100)) - ID da sessão do usuário
- ✅ `device_type` (VARCHAR(20)) - Tipo de dispositivo

### `countries` (nova tabela)
- ✅ 20 países principais com códigos ISO
- ✅ Nomes em português e inglês
- ✅ Continentes

### Índices Criados
- ✅ `idx_profile_views_country_code`
- ✅ `idx_profile_views_session`
- ✅ `idx_link_clicks_country_code`
- ✅ `idx_link_clicks_session`

## 🎯 Próximos Passos

1. **Testar o sistema** - Visitar uma página pública para gerar dados
2. **Verificar Analytics** - Acessar `/analytics` para ver se o mapa funciona
3. **Monitorar logs** - Verificar se não há erros no console
4. **Validar dados** - Confirmar se os países estão sendo salvos corretamente

## 🆘 Suporte

Se encontrar problemas:
1. Verificar logs do navegador (F12 → Console)
2. Verificar logs do Supabase (Dashboard → Logs)
3. Executar queries de verificação acima
4. Reportar erros específicos

---

**⚠️ Importante**: Esta migration é segura e não remove dados existentes. Apenas adiciona novas colunas e estruturas.