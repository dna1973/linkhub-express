-- Corrigir estrutura das tabelas de analytics

-- 1. Alterar link_id para UUID na tabela link_clicks
ALTER TABLE public.link_clicks 
ALTER COLUMN link_id TYPE UUID USING link_id::text::uuid;

-- 2. Adicionar foreign key constraint
ALTER TABLE public.link_clicks 
ADD CONSTRAINT fk_link_clicks_link_id 
FOREIGN KEY (link_id) REFERENCES public.links(id) ON DELETE CASCADE;

-- 3. Criar tabela de países para normalização
CREATE TABLE public.countries (
  id SERIAL PRIMARY KEY,
  code VARCHAR(2) UNIQUE NOT NULL, -- ISO country code (BR, US, etc)
  name VARCHAR(100) NOT NULL,
  name_pt VARCHAR(100), -- Nome em português
  continent VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Inserir países principais
INSERT INTO public.countries (code, name, name_pt, continent) VALUES
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
('ZA', 'South Africa', 'África do Sul', 'Africa');

-- 5. Adicionar colunas para melhor tracking
ALTER TABLE public.profile_views 
ADD COLUMN country_code VARCHAR(2),
ADD COLUMN session_id VARCHAR(100),
ADD COLUMN device_type VARCHAR(20);

ALTER TABLE public.link_clicks 
ADD COLUMN country_code VARCHAR(2),
ADD COLUMN session_id VARCHAR(100),
ADD COLUMN device_type VARCHAR(20);

-- 6. Criar índices para performance
CREATE INDEX idx_profile_views_country_code ON public.profile_views(country_code);
CREATE INDEX idx_link_clicks_country_code ON public.link_clicks(country_code);
CREATE INDEX idx_profile_views_session ON public.profile_views(session_id);
CREATE INDEX idx_link_clicks_session ON public.link_clicks(session_id);

-- 7. Criar view agregada para analytics
CREATE VIEW public.analytics_summary AS
SELECT 
  p.id as profile_id,
  p.username,
  COUNT(DISTINCT pv.id) as total_views,
  COUNT(DISTINCT lc.id) as total_clicks,
  COUNT(DISTINCT pv.session_id) as unique_visitors,
  COUNT(DISTINCT pv.country_code) as countries_reached,
  COALESCE(ROUND((COUNT(DISTINCT lc.id)::float / NULLIF(COUNT(DISTINCT pv.id), 0)) * 100, 2), 0) as conversion_rate
FROM public.profiles p
LEFT JOIN public.profile_views pv ON p.id = pv.profile_id
LEFT JOIN public.link_clicks lc ON p.id = lc.profile_id
GROUP BY p.id, p.username;

-- 8. Habilitar RLS na nova tabela
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

-- 9. Política para countries (leitura pública)
CREATE POLICY "Anyone can view countries" 
ON public.countries 
FOR SELECT 
USING (true);

-- 10. Função para normalizar país
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