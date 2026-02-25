import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, Instagram, Youtube, Github, Globe, Mail, Facebook, Linkedin } from 'lucide-react';
import googleDriveIcon from '@/assets/google-drive.png';
import notebookLmIcon from '@/assets/notebook-lm.svg';
import { supabase } from '@/lib/supabase';
import { safeOpenUrl, isValidUrl } from '@/utils/sanitize';

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

const updateMetaTag = (name: string, content: string, isProperty = false) => {
  const attr = isProperty ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
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

  // Atualizar meta tags dinâmicas e registrar visualização
  useEffect(() => {
    if (profile?.id) {
      registerProfileView();
      
      // Dynamic meta tags for SEO / social sharing (client-side)
      const title = profile.full_name
        ? `${profile.full_name} | LinkHub`
        : `@${profile.username} | LinkHub`;
      const description = profile.bio || `Confira os links de @${profile.username} no LinkHub`;
      
      document.title = title;
      updateMetaTag('description', description);
      updateMetaTag('og:title', title, true);
      updateMetaTag('og:description', description, true);
      updateMetaTag('og:type', 'profile', true);
      updateMetaTag('og:url', window.location.href, true);
      if (profile.avatar_url) {
        updateMetaTag('og:image', profile.avatar_url, true);
        updateMetaTag('twitter:image', profile.avatar_url);
      }
      updateMetaTag('twitter:card', 'summary');
      updateMetaTag('twitter:title', title);
      updateMetaTag('twitter:description', description);
    }
  }, [profile?.id]);

  // Escutar mudanças nos links para atualização em tempo real
  useEffect(() => {
    const handleLinksUpdate = () => {
      if (username && profile) {
        loadProfileData();
      }
    };

    window.addEventListener('linksUpdated', handleLinksUpdate);
    return () => window.removeEventListener('linksUpdated', handleLinksUpdate);
  }, [username, profile]);

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

  const registerProfileView = async () => {
    if (!profile?.id) return;

    try {
      // Obter informações do navegador
      const userAgent = navigator.userAgent;
      const referrer = document.referrer || null;
      
      // Obter dados de geolocalização melhorados
      let geoData = { country: null, countryCode: null, city: null };
      let deviceType = 'desktop';
      let sessionId = null;
      
      try {
        const geoModule = await import('@/utils/geolocation');
        geoData = await geoModule.getGeolocationData();
        deviceType = geoModule.getDeviceType();
        sessionId = geoModule.getOrCreateSessionId();
      } catch (error) {
        // Fallback silencioso
        try {
          const geoResponse = await fetch('https://ipapi.co/json/');
          if (geoResponse.ok) {
            const geoDataFallback = await geoResponse.json();
            geoData = {
              country: geoDataFallback.country_name || null,
              countryCode: geoDataFallback.country_code || null,
              city: geoDataFallback.city || null
            };
          }
        } catch {
          // Silently fail - geo data is optional
        }
      }
      
      // Registrar visualização com dados melhorados
      await supabase
        .from('profile_views')
        .insert({
          profile_id: profile.id,
          ip_address: null, // Será preenchido pelo servidor se necessário
          user_agent: userAgent,
          referrer: referrer,
          country: geoData.country,
          country_code: geoData.countryCode,
          city: geoData.city,
          session_id: sessionId,
          device_type: deviceType
        });
    } catch (error) {
      console.error('Erro ao registrar visualização:', error);
    }
  };

  const getThemeStyles = () => {
    const themeOptions = profile?.theme_options;
    
    // Use custom config when available (from onboarding templates or custom theme)
    if (themeOptions?.custom) {
      const custom = themeOptions.custom;
      return {
        background: custom.background?.type === 'gradient' 
          ? `linear-gradient(135deg, ${custom.background.colors?.[0] || '#111827'}, ${custom.background.colors?.[1] || '#1f2937'})`
          : custom.background?.color || custom.background?.colors?.[0] || '#111827',
        buttonStyle: custom.buttonStyle?.type || 'glass',
        font: custom.font,
        colors: custom.colors,
      };
    }

    // Temas predefinidos com cores de texto adequadas
    const defaultThemes: Record<string, any> = {
      'default': {
        background: '#111827',
        buttonStyle: 'glass',
        colors: { text: '#ffffff' },
      },
      'pebble-blue': {
        background: 'linear-gradient(135deg, #1e3a8a, #3730a3)',
        buttonStyle: 'solid',
        colors: { text: '#ffffff' },
      },
      'sunset': {
        background: 'linear-gradient(135deg, #f59e0b, #dc2626)',
        buttonStyle: 'outline',
        colors: { text: '#ffffff' },
      },
      'ocean': {
        background: 'linear-gradient(135deg, #0891b2, #1e40af)',
        buttonStyle: 'modern',
        colors: { text: '#ffffff' },
      },
      'forest': {
        background: 'linear-gradient(135deg, #065f46, #064e3b)',
        buttonStyle: 'glass',
        colors: { text: '#ffffff' },
      },
      'purple-rain': {
        background: 'linear-gradient(135deg, #7c3aed, #c026d3)',
        buttonStyle: 'solid',
        colors: { text: '#ffffff' },
      },
      'midnight': {
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        buttonStyle: 'glass',
        colors: { text: '#ffffff' },
      },
      'rose-gold': {
        background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        buttonStyle: 'modern',
        colors: { text: '#92400e' },
      },
      'cyber-neon': {
        background: 'linear-gradient(135deg, #0c0c0c, #1a1a1a)',
        buttonStyle: 'outline',
        colors: { primary: '#00ff88', secondary: '#00ccff', accent: '#ff0066', text: '#ffffff' },
      },
      'coral-reef': {
        background: 'linear-gradient(135deg, #ff6b6b, #4ecdc4)',
        buttonStyle: 'solid',
        colors: { text: '#ffffff' },
      },
    };

    const theme = defaultThemes[themeOptions?.themeId || 'default'];
    return theme || defaultThemes.default;
  };

  const getButtonClassName = (buttonStyle: string, themeColors?: any) => {
    const textColor = themeColors?.text || '#ffffff';
    const isLightText = textColor === '#ffffff' || textColor.startsWith('#fff');
    
    switch (buttonStyle) {
      case 'solid':
        return `bg-white/90 ${isLightText ? 'text-gray-900' : 'text-white'} hover:bg-white border-0`;
      case 'outline':
        return `bg-transparent border-2 hover:bg-white/10 ${isLightText ? 'text-white' : 'text-gray-900'}`;
      case 'modern':
        return `bg-white/20 border hover:bg-white/30 backdrop-blur-sm ${isLightText ? 'text-white' : 'text-gray-900'}`;
      case 'rounded':
        return `bg-white/20 border hover:bg-white/30 backdrop-blur-sm rounded-full ${isLightText ? 'text-white' : 'text-gray-900'}`;
      case 'glass':
      default:
        return `bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 ${isLightText ? 'text-white' : 'text-gray-900'}`;
    }
  };

  const getButtonStyle = (buttonStyle: string, themeColors?: any) => {
    const primaryColor = themeColors?.primary || '#ffffff';
    const textColor = themeColors?.text || '#ffffff';
    
    switch (buttonStyle) {
      case 'solid':
        return {
          backgroundColor: primaryColor,
          color: primaryColor === '#ffffff' ? '#000000' : '#ffffff',
          borderColor: primaryColor
        };
      case 'outline':
        return {
          borderColor: primaryColor,
          color: primaryColor
        };
      case 'modern':
        return {
          background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}40)`,
          borderColor: `${primaryColor}50`,
          color: textColor
        };
      case 'rounded':
        return {
          background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}40)`,
          borderColor: `${primaryColor}50`,
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
    // Check URL for known platforms
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
    // Default to Globe for regular websites instead of generic ExternalLink
    return Globe;
  };

  const handleLinkClick = (linkId: number, url: string) => {
    // CRITICAL: Open link FIRST, synchronously, before any async work.
    // iOS blocks window.open if it's not called directly from the user gesture.
    safeOpenUrl(url);

    // Register analytics in background (fire-and-forget)
    (async () => {
      try {
        let geoData = { country: null, countryCode: null, city: null };
        let deviceType = 'desktop';
        let sessionId = null;
        
        try {
          const geoModule = await import('@/utils/geolocation');
          geoData = await geoModule.getGeolocationData();
          deviceType = geoModule.getDeviceType();
          sessionId = geoModule.getOrCreateSessionId();
        } catch {
          try {
            const geoResponse = await fetch('https://ipapi.co/json/');
            if (geoResponse.ok) {
              const geoDataFallback = await geoResponse.json();
              geoData = {
                country: geoDataFallback.country_name || null,
                countryCode: geoDataFallback.country_code || null,
                city: geoDataFallback.city || null
              };
            }
          } catch {
            // Silently fail
          }
        }

        await supabase
          .from('link_clicks')
          .insert({
            link_id: linkId,
            profile_id: profile.id,
            ip_address: null,
            user_agent: navigator.userAgent,
            referrer: document.referrer || null,
            country: geoData.country,
            country_code: geoData.countryCode,
            city: geoData.city,
            session_id: sessionId,
            device_type: deviceType
          });
      } catch (error) {
        console.error('Erro ao registrar clique:', error);
      }
    })();
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
            <Avatar className="w-24 h-24 mx-auto mb-6 border-4" style={{ borderColor: themeStyles.colors?.avatarBorder || 'rgba(255,255,255,0.2)' }}>
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback 
                className="bg-white/10 text-2xl"
                style={{ color: themeStyles.colors?.text || '#ffffff' }}
              >
                {profile?.full_name?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <h1 
              className="text-2xl font-bold mb-2"
              style={{ color: themeStyles.colors?.text || '#ffffff' }}
            >
              {profile?.full_name || 'Usuário'}
            </h1>
            
            {profile?.show_username !== false && (
              <p 
                className="text-sm mb-4 opacity-80"
                style={{ color: themeStyles.colors?.text || '#ffffff' }}
              >
                @{profile.username}
              </p>
            )}
            
            {profile?.bio && (
              <p 
                className="text-base leading-relaxed max-w-sm mx-auto opacity-90"
                style={{ color: themeStyles.colors?.text || '#ffffff' }}
              >
                {profile.bio}
              </p>
            )}
          </div>

          {/* Links Section */}
          <div className="space-y-4 mb-8">
            {links.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <ExternalLink 
                    className="h-8 w-8 opacity-60"
                    style={{ color: themeStyles.colors?.text || '#ffffff' }}
                  />
                </div>
                <p 
                  className="text-lg opacity-60"
                  style={{ color: themeStyles.colors?.text || '#ffffff' }}
                >
                  Nenhum link disponível
                </p>
              </div>
            ) : (
              links.map((link) => {
                const IconComponent = getIconComponent(link.title, link.url);
                return (
                  <Button
                    key={link.id}
                    onClick={() => handleLinkClick(link.id, link.url)}
                    className={`w-full h-14 ${getButtonClassName(themeStyles.buttonStyle, themeStyles.colors)} hover-bounce flex items-center justify-center space-x-3 transition-all duration-200 text-lg`}
                    style={getButtonStyle(themeStyles.buttonStyle, themeStyles.colors)}
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/'}
              className="rounded-full px-6 border-2 opacity-70 hover:opacity-100 bg-transparent transition-all duration-200 mb-3"
              style={{ 
                color: themeStyles.colors?.text || '#ffffff',
                borderColor: `${themeStyles.colors?.text || '#ffffff'}50`
              }}
            >
              👉 Clique aqui para criar seu LinkHub
            </Button>
            <p 
              className="text-sm opacity-40"
              style={{ color: themeStyles.colors?.text || '#ffffff' }}
            >
              Powered by LinkHub
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;