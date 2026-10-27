// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProfileQrCode } from './ProfileQrCode';

afterEach(() => cleanup());

const URL_DNA = 'https://linkhub.avila.ia.br/dna';

describe('ProfileQrCode', () => {
  it('cartão com nome acessível, SVG de 120 px e módulos na cor pedida', () => {
    render(<ProfileQrCode url={URL_DNA} color="#0b1f3a" captionColor="#f1f5f9" />);
    const card = screen.getByRole('img', { name: `QR code para abrir ${URL_DNA}` });
    const svg = card.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
    expect(svg!.getAttribute('width')).toBe('120');
    expect(svg!.getAttribute('height')).toBe('120');
    // O pacote desenha dois paths: o fundo (bgColor) e os módulos (fgColor)
    const fills = [...svg!.querySelectorAll('path')].map((path) => path.getAttribute('fill'));
    expect(fills).toEqual(['#ffffff', '#0b1f3a']);
  });

  it('legenda na cor do texto do tema', () => {
    render(<ProfileQrCode url={URL_DNA} color="#0b1f3a" captionColor="#f1f5f9" />);
    const caption = screen.getByText('Aponte a câmera para abrir este perfil');
    expect(caption.style.color).toBe('rgb(241, 245, 249)');
    expect(caption.className).toContain('opacity-80');
  });

  it('URLs diferentes geram desenhos diferentes', () => {
    const modules = (url: string) => {
      const { container, unmount } = render(<ProfileQrCode url={url} color="#000000" captionColor="#000000" />);
      const d = container.querySelectorAll('svg path')[1].getAttribute('d');
      unmount();
      return d;
    };
    expect(modules(URL_DNA)).not.toBe(modules('https://linkhub.avila.ia.br/outro'));
  });
});
