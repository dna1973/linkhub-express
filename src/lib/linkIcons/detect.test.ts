import { describe, expect, it } from 'vitest';
import {
  DETECTED_BRAND_SLUGS,
  DETECTION_TABLE,
  detectIconFromUrl,
  getFaviconUrl,
  getUrlHost,
} from './detect';

describe('detectIconFromUrl: cada linha da tabela', () => {
  const cases: Array<[string, 'brand' | 'lucide', string, string, string | null]> = [
    ['https://youtube.com/@canal', 'brand', 'youtube', 'YouTube', '#ff0000'],
    ['https://youtu.be/abc', 'brand', 'youtube', 'YouTube', '#ff0000'],
    ['https://instagram.com/perfil', 'brand', 'instagram', 'Instagram', '#ff0069'],
    ['https://tiktok.com/@perfil', 'brand', 'tiktok', 'TikTok', '#000000'],
    ['https://x.com/perfil', 'brand', 'x', 'X', '#000000'],
    ['https://twitter.com/perfil', 'brand', 'x', 'X', '#000000'],
    ['https://linkedin.com/in/perfil', 'lucide', 'linkedin', 'LinkedIn', '#0a66c2'],
    ['https://lnkd.in/abc', 'lucide', 'linkedin', 'LinkedIn', '#0a66c2'],
    ['https://github.com/perfil', 'brand', 'github', 'GitHub', '#181717'],
    ['https://facebook.com/perfil', 'brand', 'facebook', 'Facebook', '#0866ff'],
    ['https://fb.com/perfil', 'brand', 'facebook', 'Facebook', '#0866ff'],
    ['https://fb.me/perfil', 'brand', 'facebook', 'Facebook', '#0866ff'],
    ['https://drive.google.com/file/d/1', 'brand', 'googledrive', 'Google Drive', '#4285f4'],
    ['https://notebooklm.google.com/notebook/1', 'brand', 'notebooklm', 'NotebookLM', '#000000'],
    ['https://wa.me/5511999999999', 'brand', 'whatsapp', 'WhatsApp', '#25d366'],
    ['https://whatsapp.com/channel/1', 'brand', 'whatsapp', 'WhatsApp', '#25d366'],
    ['https://t.me/canal', 'brand', 'telegram', 'Telegram', '#26a5e4'],
    ['https://telegram.me/canal', 'brand', 'telegram', 'Telegram', '#26a5e4'],
    ['https://spotify.com/artist/1', 'brand', 'spotify', 'Spotify', '#1ed760'],
    ['https://threads.net/@perfil', 'brand', 'threads', 'Threads', '#000000'],
    ['https://threads.com/@perfil', 'brand', 'threads', 'Threads', '#000000'],
    ['https://discord.gg/abc', 'brand', 'discord', 'Discord', '#5865f2'],
    ['https://discord.com/invite/abc', 'brand', 'discord', 'Discord', '#5865f2'],
    ['mailto:alguem@example.com', 'lucide', 'mail', 'E-mail', null],
  ];

  it.each(cases)('%s', (url, kind, value, title, hex) => {
    expect(detectIconFromUrl(url)).toEqual({ kind, value, title, hex });
  });
});

describe('detectIconFromUrl: normalização', () => {
  it('ignora www. e m. na frente do host', () => {
    expect(detectIconFromUrl('https://www.youtube.com/watch?v=1')?.value).toBe('youtube');
    expect(detectIconFromUrl('https://m.facebook.com/perfil')?.value).toBe('facebook');
  });

  it('casa subdomínios', () => {
    expect(detectIconFromUrl('https://music.youtube.com/x')?.value).toBe('youtube');
    expect(detectIconFromUrl('https://open.spotify.com/track/1')?.value).toBe('spotify');
    expect(detectIconFromUrl('https://api.whatsapp.com/send?phone=1')?.value).toBe('whatsapp');
  });

  it('aceita URL sem esquema', () => {
    expect(detectIconFromUrl('instagram.com/perfil')?.value).toBe('instagram');
    expect(detectIconFromUrl('  github.com/perfil  ')?.value).toBe('github');
  });

  it('não diferencia maiúsculas no esquema e no host', () => {
    expect(detectIconFromUrl('HTTPS://WWW.YOUTUBE.COM/X')?.value).toBe('youtube');
    expect(detectIconFromUrl('MAILTO:alguem@example.com')?.value).toBe('mail');
  });

  it('não casa domínio que só termina com o mesmo texto', () => {
    expect(detectIconFromUrl('https://notyoutube.com/x')).toBeNull();
    expect(detectIconFromUrl('https://myx.com/x')).toBeNull();
  });

  it('não tem regra genérica para google.com', () => {
    expect(detectIconFromUrl('https://google.com')).toBeNull();
    expect(detectIconFromUrl('https://docs.google.com/document/d/1')).toBeNull();
  });

  it('tel:, outros esquemas, lixo e vazio dão null', () => {
    expect(detectIconFromUrl('tel:+5511999999999')).toBeNull();
    expect(detectIconFromUrl('ftp://youtube.com/x')).toBeNull();
    expect(detectIconFromUrl('javascript:alert(1)')).toBeNull();
    expect(detectIconFromUrl('http://')).toBeNull();
    expect(detectIconFromUrl('%%%')).toBeNull();
    expect(detectIconFromUrl('')).toBeNull();
    expect(detectIconFromUrl(null as unknown as string)).toBeNull();
  });

  it('site sem marca dá null', () => {
    expect(detectIconFromUrl('https://example.com')).toBeNull();
  });

  it('URL sem esquema com porta é um host com porta', () => {
    expect(detectIconFromUrl('youtube.com:8080/x')?.value).toBe('youtube');
    expect(detectIconFromUrl('www.youtube.com:8080')?.value).toBe('youtube');
  });

  it('porta explícita e credenciais na URL', () => {
    expect(detectIconFromUrl('https://youtube.com:443')?.value).toBe('youtube');
    // O host de verdade é evil.com: o "youtube.com" antes do @ é o usuário
    expect(detectIconFromUrl('https://youtube.com@evil.com')).toBeNull();
  });
});

describe('DETECTION_TABLE e DETECTED_BRAND_SLUGS', () => {
  it('hex sempre em #rrggbb minúsculo, ou null', () => {
    for (const entry of DETECTION_TABLE) {
      if (entry.hex !== null) expect(entry.hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('lista os 13 slugs brand na ordem da tabela', () => {
    expect(DETECTED_BRAND_SLUGS).toEqual([
      'youtube',
      'instagram',
      'tiktok',
      'x',
      'github',
      'facebook',
      'googledrive',
      'notebooklm',
      'whatsapp',
      'telegram',
      'spotify',
      'threads',
      'discord',
    ]);
  });
});

describe('getFaviconUrl', () => {
  it('monta a URL do serviço de favicons com o host sem www.', () => {
    expect(getFaviconUrl('https://www.example.com/pagina')).toBe(
      'https://www.google.com/s2/favicons?domain=example.com&sz=64',
    );
    expect(getFaviconUrl('http://blog.example.com')).toBe(
      'https://www.google.com/s2/favicons?domain=blog.example.com&sz=64',
    );
  });

  it('aceita URL sem esquema', () => {
    expect(getFaviconUrl('example.com')).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=64');
  });

  it('só tira www., não m.', () => {
    expect(getFaviconUrl('https://m.example.com')).toBe(
      'https://www.google.com/s2/favicons?domain=m.example.com&sz=64',
    );
  });

  it('URL sem esquema com porta e host punycode', () => {
    expect(getFaviconUrl('localhost:5173')).toBe('https://www.google.com/s2/favicons?domain=localhost&sz=64');
    expect(getFaviconUrl('example.com:8080/x')).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=64');
    expect(getFaviconUrl('https://bücher.example')).toBe(
      'https://www.google.com/s2/favicons?domain=xn--bcher-kva.example&sz=64',
    );
    expect(getFaviconUrl('tel:191')).toBeNull();
    expect(getFaviconUrl('https://www.')).toBeNull();
  });

  it('null para outros esquemas, host vazio e lixo', () => {
    expect(getFaviconUrl('mailto:alguem@example.com')).toBeNull();
    expect(getFaviconUrl('tel:+5511999999999')).toBeNull();
    expect(getFaviconUrl('ftp://example.com')).toBeNull();
    expect(getFaviconUrl('http://')).toBeNull();
    expect(getFaviconUrl('%%%')).toBeNull();
    expect(getFaviconUrl('')).toBeNull();
  });
});

describe('getUrlHost', () => {
  it('devolve o host normalizado', () => {
    expect(getUrlHost('https://www.Example.com/pagina')).toBe('example.com');
    expect(getUrlHost('https://m.example.com')).toBe('example.com');
    expect(getUrlHost('blog.example.com/x')).toBe('blog.example.com');
  });

  it('host que some com a normalização dá null', () => {
    expect(getUrlHost('https://www.')).toBeNull();
    expect(getUrlHost('https://m.')).toBeNull();
    expect(detectIconFromUrl('https://www.')).toBeNull();
  });

  it('URL sem esquema com porta', () => {
    expect(getUrlHost('youtube.com:8080/x')).toBe('youtube.com');
    expect(getUrlHost('localhost:5173')).toBe('localhost');
    expect(getUrlHost('localhost:5173/pagina')).toBe('localhost');
  });

  it('host punycode e internacionalizado', () => {
    expect(getUrlHost('https://xn--bcher-kva.example/x')).toBe('xn--bcher-kva.example');
    expect(getUrlHost('https://bücher.example/x')).toBe('xn--bcher-kva.example');
  });

  it('tel: com número curto não vira host com porta', () => {
    expect(getUrlHost('tel:191')).toBeNull();
    expect(getUrlHost('sms:191')).toBeNull();
  });

  it('null para mailto:, tel: e lixo', () => {
    expect(getUrlHost('mailto:alguem@example.com')).toBeNull();
    expect(getUrlHost('tel:+5511999999999')).toBeNull();
    expect(getUrlHost('%%%')).toBeNull();
  });
});
