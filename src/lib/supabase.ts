export { supabase } from '@/integrations/supabase/client';

// Bucket com prefixo próprio pra não colidir com outros apps no mesmo Supabase.
export const AVATARS_BUCKET = 'linkhub-avatars';

// URL pública do app (ex.: https://linkhub.avila.ia.br). Cai pro origin atual se não definida.
export const PUBLIC_SITE_URL = (
  import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin
).replace(/\/$/, '');
