// URL pública do app (ex.: https://linkhub.avila.ia.br). Cai para o origin atual se não definida.
// Fica fora de supabase.ts para quem só precisa da URL não carregar o cliente do Supabase.
const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : '';

export const PUBLIC_SITE_URL = (import.meta.env.VITE_PUBLIC_SITE_URL || fallbackOrigin).replace(/\/$/, '');
