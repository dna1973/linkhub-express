// Validação de icon_value por icon_type. O banco só limita o tamanho: o app valida antes de
// gravar e antes de desenhar, porque o dono pode gravar qualquer valor pela API.
import { getFaviconUrl } from './detect';
import { isSingleEmoji } from './emoji';
import { LINK_ICON_UPLOAD_PATH_RE } from './storagePrefix';
import { BRAND_SLUG_RE, LUCIDE_NAME_RE } from './vendor';

export type IconType = 'auto' | 'brand' | 'lucide' | 'emoji' | 'favicon' | 'upload';

export type IconValueContext = {
  /** URL do link (usada pelo favicon). */
  url: string;
  /** Prefixo público do bucket de ícones (LINK_ICONS_PUBLIC_PREFIX). */
  uploadPrefix: string;
};

function isValidUpload(value: string, uploadPrefix: string): boolean {
  if (!uploadPrefix || !value.startsWith(uploadPrefix)) return false;
  return LINK_ICON_UPLOAD_PATH_RE.test(value.slice(uploadPrefix.length));
}

export function isValidIconValue(
  type: string | null | undefined,
  value: string | null | undefined,
  context: IconValueContext,
): boolean {
  const text = typeof value === 'string' ? value : null;
  switch (type) {
    case 'auto':
      return true;
    case 'brand':
      return text !== null && BRAND_SLUG_RE.test(text);
    case 'lucide':
      return text !== null && LUCIDE_NAME_RE.test(text);
    case 'emoji':
      return text !== null && isSingleEmoji(text);
    case 'favicon':
      return getFaviconUrl(context.url) !== null;
    case 'upload':
      return text !== null && isValidUpload(text, context.uploadPrefix);
    default:
      return false;
  }
}
