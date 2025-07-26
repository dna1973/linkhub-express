-- ============================================================================
-- MIGRATION: Fix Analytics Structure
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================================

-- 1. Primeiro, vamos verificar a estrutura atual das tabelas
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('links', 'link_clicks', 'profile_views')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2. Adicionar novas colunas às tabelas existentes (se não existirem)
-- Para profile_views
DO $$ 
BEGIN
  -- Adicionar country_code se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profile_views' 
    AND column_name = 'country_code'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profile_views ADD COLUMN country_code VARCHAR(2);
  END IF;

  -- Adicionar session_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profile_views' 
    AND column_name = 'session_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profile_views ADD COLUMN session_id VARCHAR(100);
  END IF;

  -- Adicionar device_type se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profile_views' 
    AND column_name = 'device_type'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profile_views ADD COLUMN device_type VARCHAR(20);
  END IF;
END $$;

-- Para link_clicks
DO $$ 
BEGIN
  -- Adicionar country_code se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'link_clicks' 
    AND column_name = 'country_code'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.link_clicks ADD COLUMN country_code VARCHAR(2);
  END IF;

  -- Adicionar session_id se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'link_clicks' 
    AND column_name = 'session_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.link_clicks ADD COLUMN session_id VARCHAR(100);
  END IF;

  -- Adicionar device_type se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'link_clicks' 
    AND column_name = 'device_type'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.link_clicks ADD COLUMN device_type VARCHAR(20);
  END IF;
END $$;

-- 3. Criar tabela de países para normalização (se não existir)
CREATE TABLE IF NOT EXISTS public.countries (
  id SERIAL PRIMARY KEY,
  code VARCHAR(2) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_pt VARCHAR(100),
  continent VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Inserir países principais (apenas se a tabela estiver vazia)
INSERT INTO public.countries (code, name, name_pt, continent) 
SELECT * FROM (VALUES
  ('BR', 'Brazil', 'Brasil', 'South America'),
  ('US', 'United States', 'Estados Unidos', 'North America'),
  ('GB', 'United Kingdom', 'Reino Unido', 'Europe'),
  ('DE', 'Germany', 'Alemanha', 'Europe'),
  ('FR', 'France', 'França', 'Europe'),
  ('IT', 'Italy', 'Itália', 'Europe'),
  ('ES', 'Spain', 'Espanha', 'Europe'),
  ('PT', 'Portugal', 'Portugal', 'Europe'),
  ('CA', 'Canada', 'Canadá', 'North America'),
  ('MX', 'Mexico', 'México', 'North America'),
  ('AR', 'Argentina', 'Argentina', 'South America'),
  ('CL', 'Chile', 'Chile', 'South America'),
  ('CO', 'Colombia', 'Colômbia', 'South America'),
  ('PE', 'Peru', 'Peru', 'South America'),
  ('JP', 'Japan', 'Japão', 'Asia'),
  ('CN', 'China', 'China', 'Asia'),
  ('IN', 'India', 'Índia', 'Asia'),
  ('AU', 'Australia', 'Austrália', 'Oceania'),
  ('RU', 'Russia', 'Rússia', 'Europe'),
  ('ZA', 'South Africa', 'África do Sul', 'Africa')
) AS v(code, name, name_pt, continent)
WHERE NOT EXISTS (SELECT 1 FROM public.countries LIMIT 1);

-- 5. Criar índices para performance (se não existirem)
DO $$
BEGIN
  -- Índices para profile_views
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profile_views_country_code') THEN
    CREATE INDEX idx_profile_views_country_code ON public.profile_views(country_code);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profile_views_session') THEN
    CREATE INDEX idx_profile_views_session ON public.profile_views(session_id);
  END IF;

  -- Índices para link_clicks
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_link_clicks_country_code') THEN
    CREATE INDEX idx_link_clicks_country_code ON public.link_clicks(country_code);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_link_clicks_session') THEN
    CREATE INDEX idx_link_clicks_session ON public.link_clicks(session_id);
  END IF;
END $$;

-- 6. Habilitar RLS na tabela countries (se não estiver habilitado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'countries' 
    AND rowsecurity = true
    AND schemaname = 'public'
  ) THEN
    ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 7. Criar política para countries (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Anyone can view countries'
    AND tablename = 'countries'
    AND schemaname = 'public'
  ) THEN
    CREATE POLICY "Anyone can view countries" 
    ON public.countries 
    FOR SELECT 
    USING (true);
  END IF;
END $$;

-- 8. Criar função para normalizar país (se não existir)
CREATE OR REPLACE FUNCTION public.normalize_country_name(country_name TEXT)
RETURNS VARCHAR(2) AS $$
DECLARE
  country_code VARCHAR(2);
BEGIN
  -- Tentar encontrar por nome exato
  SELECT code INTO country_code 
  FROM public.countries 
  WHERE LOWER(name) = LOWER(country_name) 
     OR LOWER(name_pt) = LOWER(country_name)
  LIMIT 1;
  
  -- Se não encontrou, tentar busca parcial
  IF country_code IS NULL THEN
    SELECT code INTO country_code 
    FROM public.countries 
    WHERE LOWER(name) LIKE '%' || LOWER(country_name) || '%'
       OR LOWER(name_pt) LIKE '%' || LOWER(country_name) || '%'
    LIMIT 1;
  END IF;
  
  RETURN country_code;
END;
$$ LANGUAGE plpgsql;

-- 9. Verificar se tudo foi criado corretamente
SELECT 'Migration completed successfully!' as status;

-- Verificar estrutura final das tabelas
SELECT 
  table_name, 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name IN ('profile_views', 'link_clicks', 'countries')
  AND table_schema = 'public'
  AND column_name IN ('country_code', 'session_id', 'device_type', 'code', 'name')
ORDER BY table_name, column_name;

-- Verificar se os países foram inseridos
SELECT COUNT(*) as countries_count FROM public.countries;

-- Verificar índices criados
SELECT 
  indexname, 
  tablename 
FROM pg_indexes 
WHERE tablename IN ('profile_views', 'link_clicks') 
  AND indexname LIKE 'idx_%country%' OR indexname LIKE 'idx_%session%'
ORDER BY tablename, indexname;