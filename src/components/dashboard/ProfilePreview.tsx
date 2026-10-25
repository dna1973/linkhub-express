import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { safeOpenUrl } from '@/utils/sanitize';
import { useAuth } from '@/contexts/AuthContext';
import { useDesignStore } from '@/stores/useDesignStore';
import { ProfileView } from '@/components/profile/ProfileView';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelect } from '@/components/preview/DeviceSelect';
import { useSelectedDevice } from '@/hooks/useSelectedDevice';
import { getContrastText } from '@/utils/linkButtonStyle';
import { getBaseBackgroundColor } from '@/utils/profileAppearance';
import { getPublicProfileUrl } from '@/lib/publicProfileUrl';

interface ProfilePreviewProps {
  profile: any;
  /** Conteúdo à direita do seletor de aparelho (no Dialog de tela estreita, o botão Fechar) */
  headerEnd?: React.ReactNode;
  className?: string;
}

/**
 * Prévia do perfil dentro do aparelho escolhido. Coluna de altura definida pelo pai:
 * seletor no topo e, embaixo, a área medida onde o aparelho é reduzido para caber.
 */
export const ProfilePreview: React.FC<ProfilePreviewProps> = ({ profile, headerEnd, className }) => {
  const { user } = useAuth();
  // Links do perfil recebido (o atual), não da conta. A conta só dá o nome reserva (e-mail).
  const profileId: string | undefined = profile?.id;
  // Sempre o customTheme do store, para a prévia acompanhar o editor em tempo real
  const customTheme = useDesignStore((state) => state.customTheme);
  const { device, setDeviceId } = useSelectedDevice();
  const [links, setLinks] = useState<any[]>([]);

  // Links: ao montar, quando o perfil muda e no evento linksUpdated. Mudar o tema não busca de novo.
  useEffect(() => {
    if (!profileId) return;
    let active = true;

    const loadLinks = async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('user_id', profileId)
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
  }, [profileId]);

  const previewProfile = { ...profile, full_name: profile?.full_name || user?.email?.split('@')[0] };
  // Horário e ícones legíveis também em fundo claro (Grafite, Blush)
  const statusBarColor = getContrastText(getBaseBackgroundColor(customTheme));

  return (
    <div className={cn('flex h-full flex-col gap-3', className)}>
      {/* Linha própria (um div): no Dialog, o seletor [&>button]:hidden não alcança os botões daqui */}
      <div className="flex items-center justify-between gap-2">
        <DeviceSelect value={device.id} onChange={setDeviceId} />
        {headerEnd}
      </div>
      <DeviceFrame device={device} statusBarColor={statusBarColor} className="flex-1 min-h-0">
        <ProfileView
          variant="device"
          topInset={device.statusBar.height}
          profile={previewProfile}
          links={links}
          theme={customTheme}
          // Prévia: só abre o link, sem registrar clique
          onLinkClick={(link) => safeOpenUrl(link.url)}
          emptyMessage="Seus links aparecerão aqui"
          // Perfil gravado: o QR code da prévia é o mesmo que o visitante vê
          qrCodeUrl={getPublicProfileUrl(profile)}
        />
      </DeviceFrame>
    </div>
  );
};
