import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, Instagram, Youtube, Github, Globe, Mail, Facebook, Linkedin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ICON_MAP: Record<string, any> = {
  instagram: Instagram,
  x: ExternalLink,
  tiktok: ExternalLink,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  github: Github,
  website: Globe,
  email: Mail,
  default: ExternalLink,
};

const PublicProfile = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (username) {
      loadProfileData();
    }
  }, [username]);

  const loadProfileData = async () => {
    try {
      // Load profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Load links for this user
      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', profileData.id)
        .eq('is_visible', true)
        .order('position');

      if (!linksError && linksData) {
        setLinks(linksData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const getThemeStyles = () => {
    const themeOptions = profile?.theme_options;
    
    if (themeOptions?.themeId === 'custom' && themeOptions?.custom) {
      const custom = themeOptions.custom;
      return {
        background: custom.background?.type === 'gradient' 
          ? `linear-gradient(135deg, ${custom.background.colors?.[0] || '#111827'}, ${custom.background.colors?.[1] || '#1f2937'})`
          : custom.background?.color || '#111827',
        buttonStyle: custom.buttonStyle?.type || 'glass',
        font: custom.font,
        colors: custom.colors,
      };
    }

    // Temas predefinidos
    const defaultThemes: Record<string, any> = {
      'default': {
        background: '#111827',
        buttonStyle: 'glass',
      },
      'pebble-blue': {
        background: 'linear-gradient(135deg, #1e3a8a, #3730a3)',
        buttonStyle: 'solid',
      },
      'sunset': {
        background: 'linear-gradient(135deg, #f59e0b, #dc2626)',
        buttonStyle: 'outline',
      },
      'ocean': {
        background: 'linear-gradient(135deg, #0891b2, #1e40af)',
        buttonStyle: 'glass',
      },
      'forest': {
        background: 'linear-gradient(135deg, #065f46, #064e3b)',
        buttonStyle: 'glass',
      },
    };

    const theme = defaultThemes[themeOptions?.themeId || 'default'];
    return theme || defaultThemes.default;
  };

  const getButtonClassName = (buttonStyle: string) => {
    switch (buttonStyle) {
      case 'solid':
        return 'bg-white/90 text-gray-900 hover:bg-white border-0';
      case 'outline':
        return 'bg-transparent text-white border-2 border-white/50 hover:bg-white/10';
      case 'modern':
        return 'bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm';
      case 'rounded':
        return 'bg-white/20 text-white border border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-full';
      case 'glass':
      default:
        return 'btn-glass text-white';
    }
  };

  const getIconComponent = (title: string) => {
    const lowerTitle = title.toLowerCase();
    for (const [key, Icon] of Object.entries(ICON_MAP)) {
      if (lowerTitle.includes(key)) {
        return Icon;
      }
    }
    return ICON_MAP.default;
  };

  const handleLinkClick = async (linkId: number, url: string) => {
    // Increment click count
    const { data: currentLink } = await supabase
      .from('links')
      .select('clicks')
      .eq('id', linkId)
      .single();
    
    if (currentLink) {
      await supabase
        .from('links')
        .update({ clicks: currentLink.clicks + 1 })
        .eq('id', linkId);
    }

    // Open link
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl mb-8">Perfil não encontrado</p>
          <Button 
            onClick={() => window.location.href = '/'}
            className="btn-gradient-primary"
          >
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const themeStyles = getThemeStyles();

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div 
        className="fixed inset-0"
        style={{ background: themeStyles.background }}
      />
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          
          {/* Profile Section */}
          <div className="text-center mb-8">
            <Avatar className="w-24 h-24 mx-auto mb-6 border-4 border-white/20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-white/10 text-white text-2xl">
                {profile?.full_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <h1 className="text-2xl font-bold text-white mb-2">
              {profile?.full_name || 'Usuário'}
            </h1>
            
            <p className="text-white/80 text-sm mb-4">@{profile.username}</p>
            
            {profile?.bio && (
              <p className="text-white/90 text-base leading-relaxed max-w-sm mx-auto">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Links Section */}
          <div className="space-y-4 mb-8">
            {links.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <ExternalLink className="h-8 w-8 text-white/60" />
                </div>
                <p className="text-white/60 text-lg">
                  Nenhum link disponível
                </p>
              </div>
            ) : (
              links.map((link) => {
                const IconComponent = getIconComponent(link.title);
                return (
                  <Button
                    key={link.id}
                    onClick={() => handleLinkClick(link.id, link.url)}
                    className={`w-full h-14 ${getButtonClassName(themeStyles.buttonStyle)} hover-bounce flex items-center justify-center space-x-3 transition-all duration-200 text-lg`}
                  >
                    <IconComponent className="h-6 w-6" />
                    <span className="font-medium">{link.title}</span>
                  </Button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-white/40 text-sm mb-4">
              Powered by LinkHub
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="text-white/60 hover:text-white"
            >
              Crie o seu LinkHub
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;