import { useState, type CSSProperties } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveLinkIcon, type LinkIconSource } from '@/lib/linkIcons/resolve';
import { LINK_ICONS_PUBLIC_PREFIX } from '@/lib/linkIcons/storagePrefix';

export type LinkIconProps = {
  link: LinkIconSource;
  /** Cor da máscara sem accent_color (ou com contraste baixo) e do Globe de reserva. */
  defaultColor: string;
  /** Fundos sobre os quais o ícone aparece; vale o pior contraste. */
  backgrounds?: string[];
  /** Lado em px. */
  size?: number;
  className?: string;
  /** Padrão true: o título do link já está ao lado. */
  decorative?: boolean;
  /** Prefixo público do bucket de ícones enviados. */
  uploadPrefix?: string;
};

// O src vem do vendor.ts, só com [a-z0-9_-]: as aspas da url() não podem ser quebradas.
const maskStyle = (src: string, color: string, size: number): CSSProperties => ({
  width: size,
  height: size,
  backgroundColor: color,
  maskImage: `url("${src}")`,
  WebkitMaskImage: `url("${src}")`,
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
});

/** Abaixo disso, o favicon do Google é o globo genérico de 16 px. */
const MIN_FAVICON_WIDTH = 32;

/**
 * Ícone de um link. O tamanho vai inline em todo elemento: o <Button> força [&_svg]:size-4,
 * e o estilo inline vence a classe.
 */
export function LinkIcon({
  link,
  defaultColor,
  backgrounds,
  size = 20,
  className,
  decorative = true,
  uploadPrefix = LINK_ICONS_PUBLIC_PREFIX,
}: LinkIconProps) {
  const icon = resolveLinkIcon(link, { defaultColor, backgrounds, uploadPrefix });
  const imageSrc = icon.kind === 'image' ? icon.src : null;
  const [failed, setFailed] = useState(false);
  // Reinicia a reserva quando o src muda (ajuste de estado durante a renderização, sem efeito)
  const [currentSrc, setCurrentSrc] = useState(imageSrc);
  if (currentSrc !== imageSrc) {
    setCurrentSrc(imageSrc);
    setFailed(false);
  }

  if (icon.kind === 'mask') {
    const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': icon.label };
    return (
      <span
        {...a11y}
        className={cn('link-icon-mask inline-block shrink-0', className)}
        style={maskStyle(icon.src, icon.color, size)}
      />
    );
  }

  if (icon.kind === 'emoji') {
    return (
      <span
        aria-hidden="true"
        className={cn('inline-flex shrink-0 items-center justify-center leading-none', className)}
        style={{ width: size, height: size, fontSize: size * 0.9 }}
      >
        {icon.value}
      </span>
    );
  }

  if (failed) {
    return (
      <Globe
        aria-hidden="true"
        className={cn('shrink-0', className)}
        style={{ width: size, height: size, color: defaultColor }}
      />
    );
  }

  return (
    <img
      src={icon.src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={cn('shrink-0', className)}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
      onLoad={(event) => {
        if (icon.source === 'favicon' && event.currentTarget.naturalWidth < MIN_FAVICON_WIDTH) setFailed(true);
      }}
    />
  );
}
