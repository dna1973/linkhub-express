-- Fix: Add search_path to update_profile_from_auth function (security)
CREATE OR REPLACE FUNCTION public.update_profile_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    full_name = COALESCE(
      public.profiles.full_name, 
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    avatar_url = COALESCE(
      public.profiles.avatar_url,
      NEW.raw_user_meta_data->>'avatar_url'
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Add database constraints for input validation (using DO block to avoid errors if already exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bio_max_length') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT bio_max_length CHECK (length(bio) <= 500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'full_name_max_length') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT full_name_max_length CHECK (length(full_name) <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'username_max_length') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT username_max_length CHECK (length(username) <= 30);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'link_title_max_length') THEN
    ALTER TABLE public.links ADD CONSTRAINT link_title_max_length CHECK (length(title) <= 200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'link_url_max_length') THEN
    ALTER TABLE public.links ADD CONSTRAINT link_url_max_length CHECK (length(url) <= 2000);
  END IF;
END $$;
