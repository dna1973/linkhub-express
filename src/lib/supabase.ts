export { supabase } from '@/integrations/supabase/client';

// Bucket com prefixo próprio pra não colidir com outros apps no mesmo Supabase.
export const AVATARS_BUCKET = 'linkhub-avatars';
// Ícones enviados para os links: mora em linkIcons/storagePrefix.ts (sem o cliente)
export { LINK_ICONS_BUCKET } from './linkIcons/storagePrefix';

// URL pública do app: mora em siteUrl.ts (sem o cliente); reexportada para os imports existentes
export { PUBLIC_SITE_URL } from './siteUrl';
