import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ThemeConfig } from '@/stores/useDesignStore';
import { getLinkButtonClassName, getLinkButtonStyle } from '@/utils/linkButtonStyle';
import {
  FONT_FAMILY_CSS,
  getAvatarShapeStyle,
  getBackgroundLayer,
  getFontWeight,
  getPatternLayerStyle,
  getTextSizeClasses,
} from '@/utils/profileAppearance';
import { getQrModuleColor } from '@/utils/qrCodeColor';
import { getLinkIcon } from './linkIcons';
import { ProfileQrCode } from './ProfileQrCode';

export interface ProfileViewProfile {
  full_name?: string;
  username?: string;
  bio?: string;
  avatar_url?: string;
  show_username?: boolean;
  /** Ausente conta como ligado, como show_username */
  show_qr_code?: boolean;
}

export interface ProfileViewLink {
  id: number;
  title: string;
  url: string;
}

export interface ProfileViewProps {
  profile: ProfileViewProfile | null;
  links: ProfileViewLink[];
  /** null = padrão atual (#111827, glass, texto branco) */
  theme: ThemeConfig | null;
  onLinkClick: (link: { id: number; url: string }) => void;
  /** page: min-h-screen com fundo fixo. device: min-h-full; quem rola é a tela do DeviceFrame */
  variant: 'page' | 'device';
  /** Só device: padding-top em px (altura da barra de status do aparelho) */
  topInset?: number;
  /** Texto quando não há links */
  emptyMessage?: string;
  /** Endereço público do perfil (getPublicProfileUrl). Sem ele, o QR code do rodapé não aparece. */
  qrCodeUrl?: string | null;
}

/** Perfil desenhado a partir do tema. Usado pela página pública e pela prévia do painel. */
export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  links,
  theme,
  onLinkClick,
  variant,
  topInset = 0,
  emptyMessage = 'Nenhum link disponível',
  qrCodeUrl,
}) => {
  const textColor = theme?.colors?.text || '#ffffff';
  const buttonType = theme?.buttonStyle?.type || 'glass';
  const buttonSize = theme?.buttonStyle?.size || 'md';
  const linkButtonStyle = getLinkButtonStyle(theme ?? { colors: { text: '#ffffff' } });
  const background = getBackgroundLayer(theme);
  const pattern = getPatternLayerStyle(theme);
  const avatarShape = getAvatarShapeStyle(theme?.avatar?.shape);
  const fontFamily = theme?.font?.family ? FONT_FAMILY_CSS[theme.font.family] : undefined;
  // undefined mantém os pesos de hoje: bio 400 e texto do botão 500
  const fontWeight = getFontWeight(theme?.font?.weight);
  const textSizes = getTextSizeClasses(theme?.font?.size);

  const content = (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <Avatar
          className="w-24 h-24 mx-auto mb-6 border-4"
          style={{ borderColor: theme?.colors?.avatarBorder || 'rgba(255,255,255,0.2)', ...avatarShape }}
        >
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback className="bg-white/10 text-2xl" style={{ color: textColor, ...avatarShape }}>
            {profile?.full_name?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <h1 className="text-2xl font-bold mb-2" style={{ color: textColor }}>
          {profile?.full_name || 'Usuário'}
        </h1>

        {profile?.username && profile.show_username !== false && (
          <p className="text-sm mb-4 opacity-80" style={{ color: textColor }}>
            @{profile.username}
          </p>
        )}

        {profile?.bio && (
          <p
            className={cn(textSizes.bio, 'leading-relaxed max-w-sm mx-auto opacity-90')}
            style={{ color: textColor, fontWeight: fontWeight ?? 400 }}
          >
            {profile.bio}
          </p>
        )}
      </div>

      <div className="space-y-4 mb-8">
        {links.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="h-8 w-8 opacity-60" style={{ color: textColor }} />
            </div>
            <p className="text-lg opacity-60" style={{ color: textColor }}>
              {emptyMessage}
            </p>
          </div>
        ) : (
          links.map((link) => {
            const Icon = getLinkIcon(link.title, link.url);
            return (
              <Button
                key={link.id}
                onClick={() => onLinkClick({ id: link.id, url: link.url })}
                className={cn(
                  'w-full',
                  buttonSize === 'sm' ? 'h-10' : buttonSize === 'lg' ? 'h-14' : 'h-12',
                  getLinkButtonClassName(buttonType),
                  'hover-bounce flex items-center justify-center space-x-3 transition-all duration-200',
                  textSizes.button,
                )}
                style={linkButtonStyle}
              >
                <Icon className="h-6 w-6" />
                <span style={{ fontWeight: fontWeight ?? 500 }}>{link.title}</span>
              </Button>
            );
          })
        )}
      </div>

      <div className="text-center">
        {qrCodeUrl && profile?.show_qr_code !== false && (
          <ProfileQrCode url={qrCodeUrl} color={getQrModuleColor(theme)} captionColor={textColor} />
        )}
        {variant === 'page' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = '/')}
            className="rounded-full px-6 border-2 opacity-70 hover:opacity-100 bg-transparent transition-all duration-200 mb-3"
            style={{ color: textColor, borderColor: `${textColor}50` }}
          >
            👉 Clique aqui para criar seu LinkHub
          </Button>
        ) : (
          // Na prévia o rodapé é só texto: navegar tiraria o usuário do painel
          <p
            className="inline-block rounded-full px-6 py-1.5 border-2 text-sm opacity-70 mb-3"
            style={{ color: textColor, borderColor: `${textColor}50` }}
          >
            👉 Clique aqui para criar seu LinkHub
          </p>
        )}
        <p className="text-sm opacity-40" style={{ color: textColor }}>
          Powered by LinkHub
        </p>
      </div>
    </div>
  );

  if (variant === 'device') {
    // Fundo e padrão acompanham toda a altura do conteúdo; a rolagem é da tela do aparelho
    return (
      <div
        data-testid="profile-view"
        className={cn('relative min-h-full flex flex-col', background.className)}
        style={{ ...background.style, fontFamily, paddingTop: topInset }}
      >
        {pattern && <div aria-hidden className="pointer-events-none absolute inset-0" style={pattern} />}
        <div className="relative z-10 flex-1 flex items-center justify-center p-4">{content}</div>
      </div>
    );
  }

  return (
    <div data-testid="profile-view" className="min-h-screen relative" style={{ fontFamily }}>
      <div data-testid="profile-background" className={cn('fixed inset-0', background.className)} style={background.style} />
      {pattern && <div aria-hidden className="pointer-events-none fixed inset-0" style={pattern} />}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">{content}</div>
    </div>
  );
};
