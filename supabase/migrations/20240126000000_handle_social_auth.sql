-- Função para criar perfil automaticamente após login social
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para executar a função quando um novo usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Atualizar perfil existente com dados do OAuth se disponível
CREATE OR REPLACE FUNCTION public.update_profile_from_auth()
RETURNS trigger AS $$
BEGIN
  -- Atualizar apenas se os campos estão vazios
  UPDATE public.profiles 
  SET 
    full_name = COALESCE(
      full_name, 
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    avatar_url = COALESCE(
      avatar_url,
      new.raw_user_meta_data->>'avatar_url'
    )
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar perfil quando dados do usuário são atualizados
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.update_profile_from_auth();