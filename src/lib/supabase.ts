export { supabase } from '@/integrations/supabase/client';

// Bucket com prefixo próprio pra não colidir com outros apps no mesmo Supabase.
export const AVATARS_BUCKET = 'linkhub-avatars';

// URL pública do app: mora em siteUrl.ts (sem o cliente); reexportada para os imports existentes
export { PUBLIC_SITE_URL } from './siteUrl';
