// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { LINK_ICONS_PUBLIC_PREFIX } from '@/lib/linkIcons/storagePrefix';
import { brandIconUrl } from '@/lib/linkIcons/vendor';
import { LinkIcon } from './LinkIcon';

afterEach(() => cleanup());

const uploadUrl = `${LINK_ICONS_PUBLIC_PREFIX}u1/7-123.png`;
const youtubeSrc = brandIconUrl('youtube');

function loadWithWidth(img: HTMLImageElement, width: number) {
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  fireEvent.load(img);
}

describe('LinkIcon', () => {
  it('desenha a máscara com a URL entre aspas, a cor e o tamanho', () => {
    const { container } = render(
      <LinkIcon link={{ url: 'https://youtube.com/@dna', accent_color: '#ff0000' }} defaultColor="#1f2937" size={18} />,
    );
    const span = container.querySelector('span.link-icon-mask') as HTMLSpanElement;
    expect(span).toBeTruthy();
    expect(youtubeSrc).toBe('/vendor-icons/simple-icons/16.35.0/youtube.svg');
    expect(span.style.maskImage).toBe(`url("${youtubeSrc}")`);
    expect(span.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(span.style.width).toBe('18px');
    expect(span.style.height).toBe('18px');
    expect(span.className).toContain('inline-block');
    expect(span.className).toContain('shrink-0');
    expect(span.getAttribute('aria-hidden')).toBe('true');
    expect(span.getAttribute('role')).toBeNull();
  });

  it('a máscara cai em defaultColor quando o contraste com o fundo é baixo', () => {
    const { container } = render(
      <LinkIcon
        link={{ url: 'https://x.com/dna', accent_color: '#000000' }}
        defaultColor="#ffffff"
        backgrounds={['#111827']}
      />,
    );
    const span = container.querySelector('span.link-icon-mask') as HTMLSpanElement;
    expect(span.style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(span.style.width).toBe('20px');
  });

  it('não decorativa, a máscara vira role="img" com aria-label', () => {
    const { getByRole } = render(
      <LinkIcon link={{ url: 'https://youtube.com/@dna' }} defaultColor="#1f2937" decorative={false} />,
    );
    const icon = getByRole('img');
    expect(icon.getAttribute('aria-label')).toBe('YouTube');
    expect(icon.getAttribute('aria-hidden')).toBeNull();
  });

  it('aplica a className extra', () => {
    const { container } = render(
      <LinkIcon link={{ url: 'https://youtube.com/@dna' }} defaultColor="#1f2937" className="mr-2" />,
    );
    expect(container.querySelector('span.link-icon-mask')?.className).toContain('mr-2');
  });

  it('emoji é aria-hidden, leading-none e tem o tamanho inline', () => {
    const { container } = render(
      <LinkIcon
        link={{ url: 'https://example.com', icon_type: 'emoji', icon_value: '🚀' }}
        defaultColor="#1f2937"
        size={20}
      />,
    );
    const span = container.querySelector('span') as HTMLSpanElement;
    expect(span.textContent).toBe('🚀');
    expect(span.getAttribute('aria-hidden')).toBe('true');
    expect(span.className).toContain('leading-none');
    expect(span.className).toContain('shrink-0');
    expect(span.style.width).toBe('20px');
    expect(span.style.height).toBe('20px');
    expect(span.style.fontSize).toBe('18px');
  });

  it('favicon vira <img> com os atributos de privacidade e o tamanho inline', () => {
    const { container } = render(<LinkIcon link={{ url: 'https://example.com' }} defaultColor="#1f2937" size={18} />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://www.google.com/s2/favicons?domain=example.com&sz=64');
    expect(img.getAttribute('alt')).toBe('');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(img.className).toContain('shrink-0');
    expect(img.style.width).toBe('18px');
    expect(img.style.height).toBe('18px');
  });

  it('favicon que carrega com largura >= 32 continua imagem', () => {
    const { container } = render(<LinkIcon link={{ url: 'https://example.com' }} defaultColor="#1f2937" />);
    loadWithWidth(container.querySelector('img') as HTMLImageElement, 64);
    expect(container.querySelector('img')).toBeTruthy();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('favicon com naturalWidth < 32 troca para o Globe', () => {
    const { container } = render(<LinkIcon link={{ url: 'https://example.com' }} defaultColor="#1f2937" size={18} />);
    loadWithWidth(container.querySelector('img') as HTMLImageElement, 16);
    expect(container.querySelector('img')).toBeNull();
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('class')).toContain('lucide-globe');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.style.width).toBe('18px');
    expect(svg.style.height).toBe('18px');
    expect(svg.style.color).toBe('rgb(31, 41, 55)');
  });

  it('erro no favicon troca para o Globe', () => {
    const { container } = render(<LinkIcon link={{ url: 'https://example.com' }} defaultColor="#1f2937" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('lucide-globe');
  });

  it('upload pequeno não troca para o Globe', () => {
    const { container } = render(
      <LinkIcon link={{ url: 'https://example.com', icon_type: 'upload', icon_value: uploadUrl }} defaultColor="#1f2937" />,
    );
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(uploadUrl);
    loadWithWidth(img, 16);
    expect(container.querySelector('img')).toBeTruthy();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('erro no upload troca para o Globe', () => {
    const { container } = render(
      <LinkIcon link={{ url: 'https://example.com', icon_type: 'upload', icon_value: uploadUrl }} defaultColor="#1f2937" />,
    );
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('lucide-globe');
  });

  it('upload com outro prefixo é recusado e cai em auto', () => {
    const { container } = render(
      <LinkIcon
        link={{ url: 'https://youtube.com/@dna', icon_type: 'upload', icon_value: uploadUrl }}
        defaultColor="#1f2937"
        uploadPrefix="https://outro.exemplo/storage/"
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect((container.querySelector('span.link-icon-mask') as HTMLSpanElement).style.maskImage).toBe(
      `url("${youtubeSrc}")`,
    );
  });

  it('a reserva é reiniciada quando o src muda', () => {
    const { container, rerender } = render(<LinkIcon link={{ url: 'https://example.com' }} defaultColor="#1f2937" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();

    rerender(<LinkIcon link={{ url: 'https://example.org' }} defaultColor="#1f2937" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://www.google.com/s2/favicons?domain=example.org&sz=64');

    // Voltar ao src que já tinha falhado também tenta de novo
    fireEvent.error(img);
    rerender(<LinkIcon link={{ url: 'https://example.com' }} defaultColor="#1f2937" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://www.google.com/s2/favicons?domain=example.com&sz=64',
    );
  });
});
