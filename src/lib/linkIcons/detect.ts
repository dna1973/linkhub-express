// Detecção do ícone pela URL do link. A tabela fica aqui, sem depender do catálogo de marcas.

export type DetectedIcon = {
  kind: 'brand' | 'lucide';
  value: string;
  title: string;
  /** Cor oficial em #rrggbb minúsculo, quando se sabe. */
  hex: string | null;
};

export type DetectionEntry = DetectedIcon & { domains: string[] };

// Hexes conferidos contra node_modules/simple-icons/data/simple-icons.json (packages.test.ts).
export const DETECTION_TABLE: DetectionEntry[] = [
  { domains: ['youtube.com', 'youtu.be'], kind: 'brand', value: 'youtube', title: 'YouTube', hex: '#ff0000' },
  { domains: ['instagram.com'], kind: 'brand', value: 'instagram', title: 'Instagram', hex: '#ff0069' },
  { domains: ['tiktok.com'], kind: 'brand', value: 'tiktok', title: 'TikTok', hex: '#000000' },
  { domains: ['x.com', 'twitter.com'], kind: 'brand', value: 'x', title: 'X', hex: '#000000' },
  // O Simple Icons removeu o LinkedIn: o ícone vem do Lucide, com a cor oficial da marca
  { domains: ['linkedin.com', 'lnkd.in'], kind: 'lucide', value: 'linkedin', title: 'LinkedIn', hex: '#0a66c2' },
  { domains: ['github.com'], kind: 'brand', value: 'github', title: 'GitHub', hex: '#181717' },
  { domains: ['facebook.com', 'fb.com', 'fb.me'], kind: 'brand', value: 'facebook', title: 'Facebook', hex: '#0866ff' },
  { domains: ['drive.google.com'], kind: 'brand', value: 'googledrive', title: 'Google Drive', hex: '#4285f4' },
  { domains: ['notebooklm.google.com'], kind: 'brand', value: 'notebooklm', title: 'NotebookLM', hex: '#000000' },
  { domains: ['wa.me', 'whatsapp.com'], kind: 'brand', value: 'whatsapp', title: 'WhatsApp', hex: '#25d366' },
  { domains: ['t.me', 'telegram.me'], kind: 'brand', value: 'telegram', title: 'Telegram', hex: '#26a5e4' },
  { domains: ['spotify.com'], kind: 'brand', value: 'spotify', title: 'Spotify', hex: '#1ed760' },
  { domains: ['threads.net', 'threads.com'], kind: 'brand', value: 'threads', title: 'Threads', hex: '#000000' },
  { domains: ['discord.gg', 'discord.com'], kind: 'brand', value: 'discord', title: 'Discord', hex: '#5865f2' },
];

const MAIL_ICON: DetectedIcon = { kind: 'lucide', value: 'mail', title: 'E-mail', hex: null };

/** Os slugs `brand` da tabela, na ordem: a grade de marcas os mostra com a busca vazia. */
export const DETECTED_BRAND_SLUGS: string[] = DETECTION_TABLE.filter((entry) => entry.kind === 'brand').map(
  (entry) => entry.value,
);

function parseHttpUrl(raw: string): URL | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
  if (hasScheme && !/^https?:/i.test(trimmed)) return null;
  try {
    const url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
    return url.hostname ? url : null;
  } catch {
    return null;
  }
}

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^(www|m)\./, '');
}

/** Host em minúsculas, sem `www.` nem `m.`; `null` para o que não for http(s). */
export function getUrlHost(url: string): string | null {
  const parsed = parseHttpUrl(url);
  return parsed ? normalizeHost(parsed.hostname) : null;
}

export function detectIconFromUrl(url: string): DetectedIcon | null {
  if (/^mailto:/i.test((url ?? '').trim())) return { ...MAIL_ICON };
  const host = getUrlHost(url);
  if (!host) return null;
  const entry = DETECTION_TABLE.find((item) =>
    item.domains.some((domain) => host === domain || host.endsWith(`.${domain}`)),
  );
  if (!entry) return null;
  const { kind, value, title, hex } = entry;
  return { kind, value, title, hex };
}

/** Favicon pelo serviço público do Google. Só tira `www.` do host (o `m.` pode ser outro site). */
export function getFaviconUrl(url: string): string | null {
  const parsed = parseHttpUrl(url);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (!host) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
}
