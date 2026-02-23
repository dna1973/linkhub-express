import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, Instagram, Youtube, Github, Globe, Mail, Facebook, Linkedin } from 'lucide-react';
import googleDriveIcon from '@/assets/google-drive.png';
import notebookLmIcon from '@/assets/notebook-lm.svg';
import { supabase } from '@/lib/supabase';
import { safeOpenUrl } from '@/utils/sanitize';
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
  googledrive: ({ className }: { className?: string }) => <img src={googleDriveIcon} alt="Google Drive" className={className} />,
  'google drive': ({ className }: { className?: string }) => <img src={googleDriveIcon} alt="Google Drive" className={className} />,
  drive: ({ className }: { className?: string }) => <img src={googleDriveIcon} alt="Google Drive" className={className} />,
  notebooklm: ({ className }: { className?: string }) => <img src={notebookLmIcon} alt="NotebookLM" className={className} />,
  notebook: ({ className }: { className?: string }) => <img src={notebookLmIcon} alt="NotebookLM" className={className} />,
  website: Globe,
  web: Globe,
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

  // Escutar mudanças nos links
  useEffect(() => {
    const handleLinksUpdate = () => {
      if (user) {
        loadLinks();
      }
    };

    window.addEventListener('linksUpdated', handleLinksUpdate);
    return () => window.removeEventListener('linksUpdated', handleLinksUpdate);
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
    // Sempre usar o customTheme do store para preview em tempo real
    // Isso garante que todas as customizações sejam refletidas imediatamente
    const custom = customTheme;
    
    return {
      background: custom.background?.type === 'gradient' 
        ? `linear-gradient(135deg, ${custom.background.colors?.[0] || '#111827'}, ${custom.background.colors?.[1] || '#1f2937'})`
        : custom.background?.color || '#111827',
      buttonStyle: custom.buttonStyle?.type || 'glass',
      font: custom.font || { family: 'inter', size: 'md', weight: 'normal' },
      colors: custom.colors || { primary: '#ffffff', secondary: '#f3f4f6', accent: '#3b82f6', text: '#ffffff' },
    };
  };

  const getButtonClassName = (buttonStyle: string) => {
    const buttonColor = themeStyles.colors?.primary || '#ffffff';
    const textColor = themeStyles.colors?.text || '#ffffff';
    
    switch (buttonStyle) {
      case 'solid':
        return `border-0 hover:opacity-90`;
      case 'outline':
        return `bg-transparent border-2 hover:bg-white/10`;
      case 'modern':
        return `border backdrop-blur-sm hover:opacity-90`;
      case 'rounded':
        return `border backdrop-blur-sm hover:opacity-90 rounded-full`;
      case 'glass':
      default:
        return `bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20`;
    }
  };

  const getButtonStyle = (buttonStyle: string) => {
    const buttonColor = themeStyles.colors?.primary || '#ffffff';
    const textColor = themeStyles.colors?.text || '#ffffff';
    
    switch (buttonStyle) {
      case 'solid':
        return {
          backgroundColor: buttonColor,
          color: buttonColor === '#ffffff' ? '#000000' : '#ffffff'
        };
      case 'outline':
        return {
          borderColor: buttonColor,
          color: buttonColor
        };
      case 'modern':
        return {
          background: `linear-gradient(135deg, ${buttonColor}20, ${buttonColor}40)`,
          borderColor: `${buttonColor}50`,
          color: textColor
        };
      case 'rounded':
        return {
          background: `linear-gradient(135deg, ${buttonColor}20, ${buttonColor}40)`,
          borderColor: `${buttonColor}50`,
          color: textColor
        };
      case 'glass':
      default:
        return {
          color: textColor
        };
    }
  };

  const getIconComponent = (title: string, url?: string) => {
    const lowerTitle = title.toLowerCase();
    for (const [key, Icon] of Object.entries(ICON_MAP)) {
      if (key !== 'default' && lowerTitle.includes(key)) {
        return Icon;
      }
    }
    if (url) {
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('instagram.com')) return ICON_MAP.instagram;
      if (lowerUrl.includes('youtube.com')) return ICON_MAP.youtube;
      if (lowerUrl.includes('github.com')) return ICON_MAP.github;
      if (lowerUrl.includes('facebook.com')) return ICON_MAP.facebook;
      if (lowerUrl.includes('linkedin.com')) return ICON_MAP.linkedin;
      if (lowerUrl.includes('x.com') || lowerUrl.includes('twitter.com')) return ICON_MAP.x;
      if (lowerUrl.includes('tiktok.com')) return ICON_MAP.tiktok;
      if (lowerUrl.includes('drive.google.com')) return ICON_MAP.drive;
      if (lowerUrl.includes('notebooklm.google.com')) return ICON_MAP.notebooklm;
      if (lowerUrl.startsWith('mailto:')) return ICON_MAP.email;
    }
    return Globe;
  };

  const handleLinkClick = async (linkId: number, url: string) => {
    // Este é apenas um preview, não registrar analytics
    
    // Increment click count apenas para demonstração
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

    // Open link safely
    safeOpenUrl(url);
  };

  const themeStyles = getThemeStyles();

  const getFontClasses = () => {
    const font = themeStyles.font;
    if (!font) return '';
    
    let fontFamily = '';
    switch (font.family) {
      case 'inter':
        fontFamily = 'font-sans';
        break;
      case 'playfair':
        fontFamily = 'font-serif';
        break;
      case 'poppins':
        fontFamily = 'font-sans';
        break;
      case 'roboto-mono':
        fontFamily = 'font-mono';
        break;
      case 'dancing-script':
        fontFamily = 'font-serif italic';
        break;
      case 'montserrat':
        fontFamily = 'font-sans';
        break;
      case 'lora':
        fontFamily = 'font-serif';
        break;
      case 'source-code-pro':
        fontFamily = 'font-mono';
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

  const getFontStyle = () => {
    const font = themeStyles.font;
    if (!font) return {};
    
    let fontFamily = '';
    switch (font.family) {
      case 'inter':
        fontFamily = 'Inter, system-ui, sans-serif';
        break;
      case 'playfair':
        fontFamily = 'Playfair Display, serif';
        break;
      case 'poppins':
        fontFamily = 'Poppins, sans-serif';
        break;
      case 'roboto-mono':
        fontFamily = 'Roboto Mono, monospace';
        break;
      case 'dancing-script':
        fontFamily = 'Dancing Script, cursive';
        break;
      case 'montserrat':
        fontFamily = 'Montserrat, sans-serif';
        break;
      case 'lora':
        fontFamily = 'Lora, serif';
        break;
      case 'source-code-pro':
        fontFamily = 'Source Code Pro, monospace';
        break;
      default:
        fontFamily = 'system-ui, sans-serif';
    }
    
    return { fontFamily };
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      {/* Mobile Device Frame */}
      <div className="relative">
        {/* Device Shadow */}
        <div className="absolute inset-0 rounded-[3rem] bg-black/20 blur-lg transform translate-y-2"></div>
        
        {/* Device Frame */}
        <div className="relative w-[320px] h-[640px] bg-black rounded-[3rem] p-3 shadow-2xl">
          {/* Screen */}
          <div 
            className="w-full h-full rounded-[2.5rem] overflow-hidden relative"
            style={{ background: themeStyles.background }}
          >
            {/* Status Bar */}
            <div className="absolute top-0 left-0 right-0 h-6 bg-black/10 backdrop-blur-sm flex items-center justify-center">
              <div className="w-12 h-1 bg-white/30 rounded-full"></div>
            </div>
            
            {/* Content Area */}
            <div 
              className={`pt-6 pb-4 px-5 h-full flex flex-col justify-between ${getFontClasses()}`}
              style={getFontStyle()}
            >
            
            {/* Profile Section */}
            <div className="text-center mb-4 flex-shrink-0">
              <Avatar className="w-16 h-16 mx-auto mb-3 border-2 border-white/20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback 
                  className="bg-white/10 text-lg"
                  style={{ color: themeStyles.colors?.text || '#ffffff' }}
                >
                  {profile?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <h2 
                className="text-xl font-bold mb-2"
                style={{ color: themeStyles.colors?.text || '#ffffff' }}
              >
                {profile?.full_name || user?.email?.split('@')[0] || 'Usuário'}
              </h2>
              
              {profile?.username && profile?.show_username !== false && (
                <p 
                  className="text-sm mb-2 opacity-80"
                  style={{ color: themeStyles.colors?.text || '#ffffff' }}
                >
                  @{profile.username}
                </p>
              )}
              
              {profile?.bio && (
                <p 
                  className="text-sm leading-relaxed opacity-90"
                  style={{ color: themeStyles.colors?.text || '#ffffff' }}
                >
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Links Section */}
            <div className="space-y-2 flex-1 min-h-0 overflow-hidden">{/* Removido overflow-y-auto */}
              {links.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <ExternalLink 
                      className="h-6 w-6 opacity-60"
                      style={{ color: themeStyles.colors?.text || '#ffffff' }}
                    />
                  </div>
                  <p 
                    className="text-sm opacity-60"
                    style={{ color: themeStyles.colors?.text || '#ffffff' }}
                  >
                    Seus links aparecerão aqui
                  </p>
                </div>
              ) : (
                links.map((link) => {
                  const IconComponent = getIconComponent(link.title, link.url);
                  return (
                    <Button
                      key={link.id}
                      onClick={() => handleLinkClick(link.id, link.url)}
                      className={`w-full h-12 ${getButtonClassName(themeStyles.buttonStyle)} hover-bounce flex items-center justify-center space-x-3 transition-all duration-200`}
                      style={getButtonStyle(themeStyles.buttonStyle)}
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
              <p 
                className="text-xs opacity-40"
                style={{ color: themeStyles.colors?.text || '#ffffff' }}
              >
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