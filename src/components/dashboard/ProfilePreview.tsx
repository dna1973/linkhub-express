import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, Instagram, Youtube, Github, Globe, Mail, Facebook, Linkedin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDesignStore } from '@/stores/useDesignStore';

interface ProfilePreviewProps {
  profile: any;
}

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

export const ProfilePreview: React.FC<ProfilePreviewProps> = ({ profile }) => {
  const { user } = useAuth();
  const { currentTheme, customTheme } = useDesignStore();
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadLinks();
    }
  }, [user]);

  // Recarregar quando o tema mudar
  useEffect(() => {
    if (user) {
      loadLinks();
    }
  }, [currentTheme, customTheme, user]);

  const loadLinks = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('links')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_visible', true)
      .order('position');

    if (!error && data) {
      setLinks(data);
    }
  };

  const getThemeStyles = () => {
    // Se estivermos no modo preview (currentTheme é 'custom'), usar o store atual
    if (currentTheme === 'custom') {
      const custom = customTheme;
      return {
        background: custom.background?.type === 'gradient' 
          ? `linear-gradient(135deg, ${custom.background.colors?.[0] || '#111827'}, ${custom.background.colors?.[1] || '#1f2937'})`
          : custom.background?.color || '#111827',
        buttonStyle: custom.buttonStyle?.type || 'glass',
        font: custom.font,
        colors: custom.colors,
      };
    }
    
    // Usar configurações salvas do perfil se disponível
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
    };

    const themeId = currentTheme !== 'custom' ? currentTheme : (themeOptions?.themeId || 'default');
    const theme = defaultThemes[themeId];
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

  const themeStyles = getThemeStyles();

  const getFontClasses = () => {
    const font = themeStyles.font;
    if (!font) return '';
    
    let fontFamily = '';
    switch (font.family) {
      case 'serif':
        fontFamily = 'font-serif';
        break;
      case 'mono':
        fontFamily = 'font-mono';
        break;
      case 'display':
        fontFamily = 'font-sans font-bold';
        break;
      case 'handwriting':
        fontFamily = 'font-serif italic';
        break;
      default:
        fontFamily = 'font-sans';
    }
    
    let fontSize = '';
    switch (font.size) {
      case 'sm':
        fontSize = 'text-sm';
        break;
      case 'lg':
        fontSize = 'text-lg';
        break;
      default:
        fontSize = 'text-base';
    }
    
    let fontWeight = '';
    switch (font.weight) {
      case 'light':
        fontWeight = 'font-light';
        break;
      case 'medium':
        fontWeight = 'font-medium';
        break;
      case 'bold':
        fontWeight = 'font-bold';
        break;
      default:
        fontWeight = 'font-normal';
    }
    
    return `${fontFamily} ${fontSize} ${fontWeight}`;
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      {/* Mobile Device Frame */}
      <div className="relative">
        {/* Device Shadow */}
        <div className="absolute inset-0 rounded-[3rem] bg-black/20 blur-lg transform translate-y-2"></div>
        
        {/* Device Frame */}
        <div className="relative w-[280px] h-[580px] bg-black rounded-[3rem] p-2 shadow-2xl">
          {/* Screen */}
          <div 
            className="w-full h-full rounded-[2.5rem] overflow-hidden relative"
            style={{ background: themeStyles.background }}
          >
            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-black/20 backdrop-blur-sm flex items-center justify-center">
              <div className="w-16 h-1 bg-white/30 rounded-full"></div>
            </div>
            
            {/* Content Area */}
            <div className={`pt-12 pb-8 px-6 h-full flex flex-col ${getFontClasses()}`}>
            
            {/* Profile Section */}
            <div className="mb-6 flex-shrink-0">
              <Avatar className="w-20 h-20 mx-auto mb-4 border-2 border-white/20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-white/10 text-white text-xl">
                  {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <h2 className="text-xl font-bold text-white mb-2">
                {profile?.full_name || user?.email?.split('@')[0] || 'Usuário'}
              </h2>
              
              {profile?.username && (
                <p className="text-white/80 text-sm mb-2">@{profile.username}</p>
              )}
              
              {profile?.bio && (
                <p className="text-white/90 text-sm leading-relaxed">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Links Section */}
            <div className="space-y-3 flex-1 min-h-0 overflow-y-auto">
              {links.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <ExternalLink className="h-6 w-6 text-white/60" />
                  </div>
                  <p className="text-white/60 text-sm">
                    Seus links aparecerão aqui
                  </p>
                </div>
              ) : (
                links.map((link) => {
                  const IconComponent = getIconComponent(link.title);
                  return (
                    <Button
                      key={link.id}
                      onClick={() => handleLinkClick(link.id, link.url)}
                      className={`w-full h-12 ${getButtonClassName(themeStyles.buttonStyle)} hover-bounce flex items-center justify-center space-x-3 transition-all duration-200`}
                    >
                      <IconComponent className="h-5 w-5" />
                      <span className="font-medium">{link.title}</span>
                    </Button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <p className="text-white/40 text-xs">
                Powered by LinkHub
              </p>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};