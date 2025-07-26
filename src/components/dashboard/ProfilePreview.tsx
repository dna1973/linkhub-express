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
    const themeOptions = profile?.theme_options;
    
    if (themeOptions?.themeId === 'custom' && themeOptions?.custom) {
      const custom = themeOptions.custom;
      return {
        background: custom.background?.type === 'gradient' 
          ? `linear-gradient(135deg, ${custom.background.colors?.[0] || '#111827'}, ${custom.background.colors?.[1] || '#1f2937'})`
          : custom.background?.color || '#111827',
        buttonStyle: custom.buttonStyle || 'glass',
      };
    }

    // Default themes
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

    const theme = defaultThemes[themeOptions?.themeId || 'default'];
    return theme || defaultThemes.default;
  };

  const getButtonClassName = (buttonStyle: string) => {
    switch (buttonStyle) {
      case 'solid':
        return 'bg-white/90 text-gray-900 hover:bg-white border-0';
      case 'outline':
        return 'bg-transparent text-white border-2 border-white/50 hover:bg-white/10';
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

  return (
    <div className="w-full h-full relative overflow-hidden rounded-lg">
      {/* Background */}
      <div 
        className="absolute inset-0"
        style={{ background: themeStyles.background }}
      />
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-start p-6 text-center">
        {/* Phone Frame Mockup */}
        <div className="w-full max-w-sm mx-auto bg-black/20 backdrop-blur-sm rounded-[2.5rem] p-2 border border-white/10">
          <div className="bg-background/5 rounded-[2rem] p-6 h-[600px] overflow-y-auto">
            
            {/* Profile Section */}
            <div className="mb-8">
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
            <div className="space-y-4">
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
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-white/40 text-xs">
                Powered by LinkHub
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};