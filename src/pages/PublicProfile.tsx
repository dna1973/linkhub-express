import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { safeOpenUrl, isValidUrl } from '@/utils/sanitize';
import { resolveThemeConfig } from '@/utils/themes';
import { ProfileView } from '@/components/profile/ProfileView';

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

  return (
    <ProfileView
      variant="page"
      profile={profile}
      links={links}
      theme={resolveThemeConfig(profile?.theme_options as Record<string, any> | null)}
      onLinkClick={(link) => handleLinkClick(link.id, link.url)}
    />
  );
};

export default PublicProfile;