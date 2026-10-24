import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { safeOpenUrl } from '@/utils/sanitize';
import { useAuth } from '@/contexts/AuthContext';
import { useDesignStore } from '@/stores/useDesignStore';
import { ProfileView } from '@/components/profile/ProfileView';

interface ProfilePreviewProps {
  profile: any;
}

export const ProfilePreview: React.FC<ProfilePreviewProps> = ({ profile }) => {
  const { user } = useAuth();
  const userId = user?.id;
  // Sempre o customTheme do store, para a prévia acompanhar o editor em tempo real
  const customTheme = useDesignStore((state) => state.customTheme);
  const [links, setLinks] = useState<any[]>([]);

  // Links: ao montar, quando o usuário muda e no evento linksUpdated. Mudar o tema não busca de novo.
  useEffect(() => {
    if (!userId) return;
    let active = true;

    const loadLinks = async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', userId)
        .eq('is_visible', true)
        .order('position');

      if (active && !error && data) {
        setLinks(data);
      }
    };

    loadLinks();
    window.addEventListener('linksUpdated', loadLinks);
    return () => {
      active = false;
      window.removeEventListener('linksUpdated', loadLinks);
    };
  }, [userId]);

  const previewProfile = { ...profile, full_name: profile?.full_name || user?.email?.split('@')[0] };

  return (
    <div className="w-full h-full flex items-center justify-center p-2">
      <div className="relative">
        <div className="absolute inset-0 rounded-[3rem] bg-black/20 blur-lg transform translate-y-2"></div>
        <div className="relative w-[320px] h-[640px] bg-black rounded-[3rem] p-3 shadow-2xl">
          <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative">
            <div className="absolute inset-0 overflow-y-auto">
              <ProfileView
                variant="device"
                topInset={24}
                profile={previewProfile}
                links={links}
                theme={customTheme}
                // Prévia: só abre o link, sem registrar clique
                onLinkClick={(link) => safeOpenUrl(link.url)}
                emptyMessage="Seus links aparecerão aqui"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
