-- Adicionar campos para configuração de domínio personalizado
ALTER TABLE public.profiles 
ADD COLUMN custom_domain text,
ADD COLUMN preferred_domain text DEFAULT 'lovable';

-- Comentários para documentar os novos campos
COMMENT ON COLUMN public.profiles.custom_domain IS 'Domínio personalizado do usuário (ex: meusite.com)';
COMMENT ON COLUMN public.profiles.preferred_domain IS 'Domínio preferido para links públicos: lovable ou custom';