-- Create profiles table for user additional information
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    theme_id TEXT DEFAULT 'default',
    custom_theme JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create links table for user links
CREATE TABLE public.links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'link',
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create themes table for predefined themes
CREATE TABLE public.themes (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    config JSONB NOT NULL,
    preview_image TEXT,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default themes
INSERT INTO public.themes (id, name, config, preview_image) VALUES
('default', 'Default Dark', '{"background": {"type": "solid", "color": "#111827"}, "buttonStyle": "glass", "font": "system"}', null),
('pebble-blue', 'Pebble Blue', '{"background": {"type": "gradient", "colors": ["#1e3a8a", "#3730a3"]}, "buttonStyle": "solid", "font": "system"}', null),
('sunset', 'Sunset Glow', '{"background": {"type": "gradient", "colors": ["#f59e0b", "#dc2626"]}, "buttonStyle": "outline", "font": "system"}', null),
('ocean', 'Ocean Depths', '{"background": {"type": "gradient", "colors": ["#0891b2", "#1e40af"]}, "buttonStyle": "glass", "font": "system"}', null);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view any public profile" 
ON public.profiles 
FOR SELECT 
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Links policies
CREATE POLICY "Users can view links of public profiles" 
ON public.links 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.user_id = links.user_id 
        AND (profiles.is_public = true OR auth.uid() = profiles.user_id)
    )
);

CREATE POLICY "Users can create their own links" 
ON public.links 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links" 
ON public.links 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links" 
ON public.links 
FOR DELETE 
USING (auth.uid() = user_id);

-- Themes policies (public read)
CREATE POLICY "Anyone can view themes" 
ON public.themes 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_links_updated_at
    BEFORE UPDATE ON public.links
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_links_user_id ON public.links(user_id);
CREATE INDEX idx_links_position ON public.links(user_id, position);