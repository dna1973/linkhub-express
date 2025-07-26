-- Criar tabela para rastrear visualizações do perfil
CREATE TABLE public.profile_views (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  city TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para rastrear cliques nos links
CREATE TABLE public.link_clicks (
  id BIGSERIAL PRIMARY KEY,
  link_id BIGINT NOT NULL,
  profile_id UUID NOT NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  city TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profile_views
CREATE POLICY "Usuários podem ver suas próprias visualizações"
ON public.profile_views
FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "Permitir inserção de visualizações"
ON public.profile_views
FOR INSERT
WITH CHECK (true);

-- Políticas RLS para link_clicks
CREATE POLICY "Usuários podem ver seus próprios cliques"
ON public.link_clicks
FOR SELECT
USING (profile_id = auth.uid());

CREATE POLICY "Permitir inserção de cliques"
ON public.link_clicks
FOR INSERT
WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_profile_views_profile_id ON public.profile_views(profile_id);
CREATE INDEX idx_profile_views_viewed_at ON public.profile_views(viewed_at);
CREATE INDEX idx_link_clicks_link_id ON public.link_clicks(link_id);
CREATE INDEX idx_link_clicks_profile_id ON public.link_clicks(profile_id);
CREATE INDEX idx_link_clicks_clicked_at ON public.link_clicks(clicked_at);