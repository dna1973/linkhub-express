import icon64 from '@/assets/linkhub-icon-64.png';
import icon128 from '@/assets/linkhub-icon-128.png';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  /** Lado em pixels CSS. */
  size: number;
  className?: string;
}

/**
 * Logotipo do LinkHub. Decorativo: aparece sempre ao lado do nome "LinkHub", por isso alt vazio.
 * O navegador escolhe a versão de 64 ou 128 px pela densidade da tela.
 */
export function BrandLogo({ size, className }: BrandLogoProps) {
  return (
    <img
      src={icon64}
      srcSet={`${icon64} 64w, ${icon128} 128w`}
      sizes={`${size}px`}
      width={size}
      height={size}
      alt=""
      draggable={false}
      className={cn('shrink-0 select-none rounded-full', className)}
    />
  );
}
