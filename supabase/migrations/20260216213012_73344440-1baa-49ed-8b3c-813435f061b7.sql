
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  custom_domain TEXT,
  preferred_domain TEXT DEFAULT 'lovable',
  theme_options JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Links table
CREATE TABLE public.links (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Links are viewable by everyone" ON public.links FOR SELECT USING (true);
CREATE POLICY "Users can insert their own links" ON public.links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own links" ON public.links FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own links" ON public.links FOR DELETE USING (auth.uid() = user_id);

-- Profile views table (analytics)
CREATE TABLE public.profile_views (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  country_code TEXT,
  city TEXT,
  session_id TEXT,
  device_type TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert profile views" ON public.profile_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own profile views" ON public.profile_views FOR SELECT USING (
  profile_id IN (SELECT id FROM public.profiles WHERE id = auth.uid())
);

-- Link clicks table (analytics)
CREATE TABLE public.link_clicks (
  id BIGSERIAL PRIMARY KEY,
  link_id BIGINT NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  country_code TEXT,
  city TEXT,
  session_id TEXT,
  device_type TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert link clicks" ON public.link_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own link clicks" ON public.link_clicks FOR SELECT USING (
  profile_id IN (SELECT id FROM public.profiles WHERE id = auth.uid())
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_links_updated_at BEFORE UPDATE ON public.links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
