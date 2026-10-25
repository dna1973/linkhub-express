// Bucket e prefixo público dos ícones enviados pelos donos dos links.
// Fica fora de supabase.ts (padrão do siteUrl.ts): o ProfileView usa o prefixo sem carregar o cliente.
export const LINK_ICONS_BUCKET = 'linkhub-link-icons';

// Lê o env na chamada (e não na carga do módulo) para os testes poderem trocar o VITE_SUPABASE_URL.
export function getLinkIconsPublicPrefix(): string {
  const base = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/${LINK_ICONS_BUCKET}/`;
}

export const LINK_ICONS_PUBLIC_PREFIX = getLinkIconsPublicPrefix();
