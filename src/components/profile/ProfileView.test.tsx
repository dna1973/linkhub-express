// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ThemeConfig } from '@/stores/useDesignStore';
import { ProfileView } from './ProfileView';

afterEach(() => cleanup());

const profile = { full_name: 'Daniel Ávila', username: 'dna', bio: 'Engenheiro', show_username: true };
const links = [
  { id: 1, title: 'Meu site', url: 'https://example.com' },
  { id: 2, title: 'GitHub', url: 'https://github.com/dna' },
];

const theme: ThemeConfig = {
  background: { type: 'solid', color: '#F8FAFC', pattern: 'grid' },
  buttonStyle: { type: 'outline', color: '#1E293B', borderRadius: 'sm' },
  font: { family: 'lora', size: 'lg', weight: 'bold' },
  colors: { primary: '#1E293B', text: '#0F172A' },
  avatar: { shape: 'rounded' },
};

describe('ProfileView', () => {
  it('renderiza nome, @, bio e os links', () => {
    render(<ProfileView variant="page" profile={profile} links={links} theme={null} onLinkClick={vi.fn()} />);
    expect(screen.getByText('Daniel Ávila')).toBeTruthy();
    expect(screen.getByText('@dna')).toBeTruthy();
    expect(screen.getByText('Engenheiro')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Meu site/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /GitHub/ })).toBeTruthy();
  });

  it('show_username=false esconde o @', () => {
    render(<ProfileView variant="page" profile={{ ...profile, show_username: false }} links={links} theme={null} onLinkClick={vi.fn()} />);
    expect(screen.queryByText('@dna')).toBeNull();
  });

  it('clicar num link chama onLinkClick com id e url', () => {
    const onLinkClick = vi.fn();
    render(<ProfileView variant="page" profile={profile} links={links} theme={null} onLinkClick={onLinkClick} />);
    fireEvent.click(screen.getByRole('button', { name: /GitHub/ }));
    expect(onLinkClick).toHaveBeenCalledWith({ id: 2, url: 'https://github.com/dna' });
  });

  it('theme=null usa o padrão: fundo #111827, texto branco e pesos atuais', () => {
    render(<ProfileView variant="page" profile={profile} links={links} theme={null} onLinkClick={vi.fn()} />);
    expect(screen.getByTestId('profile-background').style.backgroundColor).toBe('rgb(17, 24, 39)');
    expect(screen.getByText('Daniel Ávila').style.color).toBe('rgb(255, 255, 255)');
    expect(screen.getByText('Engenheiro').style.fontWeight).toBe('400');
    expect(screen.getByText('Meu site').style.fontWeight).toBe('500');
    expect(screen.getByText('Engenheiro').className).toContain('text-base');
    expect(screen.getByRole('button', { name: /Meu site/ }).className).toContain('text-lg');
  });

  it('aplica família, peso e tamanho do tema', () => {
    render(<ProfileView variant="page" profile={profile} links={links} theme={theme} onLinkClick={vi.fn()} />);
    expect(screen.getByTestId('profile-view').style.fontFamily).toContain('Lora');
    expect(screen.getByText('Engenheiro').style.fontWeight).toBe('700');
    expect(screen.getByText('Meu site').style.fontWeight).toBe('700');
    expect(screen.getByText('Engenheiro').className).toContain('text-lg');
    expect(screen.getByRole('button', { name: /Meu site/ }).className).toContain('text-xl');
  });

  it('o formato do avatar vale também para o fallback', () => {
    render(<ProfileView variant="page" profile={profile} links={links} theme={theme} onLinkClick={vi.fn()} />);
    expect(screen.getByText('D').style.borderRadius).toBe('28%');
  });

  it('page: rodapé é botão e o fundo fica fixo', () => {
    const { container } = render(<ProfileView variant="page" profile={profile} links={[]} theme={null} onLinkClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /criar seu LinkHub/ })).toBeTruthy();
    expect(screen.getByText('Nenhum link disponível')).toBeTruthy();
    expect(container.innerHTML).toContain('min-h-screen');
    expect(screen.getByTestId('profile-background').classList.contains('fixed')).toBe(true);
    expect(screen.getByTestId('profile-background').classList.contains('inset-0')).toBe(true);
  });

  describe('camada de padrão', () => {
    // Os ícones do lucide também têm aria-hidden, mas são <svg>; a camada é o único <div aria-hidden>
    const patternLayer = (container: HTMLElement) => container.querySelector<HTMLElement>('div[aria-hidden="true"]');

    it('device: existe, é absolute inset-0 e tem backgroundImage', () => {
      const { container } = render(
        <ProfileView variant="device" profile={profile} links={links} theme={theme} onLinkClick={vi.fn()} />,
      );
      const layer = patternLayer(container);
      expect(layer).not.toBeNull();
      expect(layer!.classList.contains('absolute')).toBe(true);
      expect(layer!.classList.contains('inset-0')).toBe(true);
      expect(layer!.classList.contains('fixed')).toBe(false);
      expect(layer!.getAttribute('style')).toContain('linear-gradient');
    });

    it('page: existe e é fixed inset-0', () => {
      const { container } = render(
        <ProfileView variant="page" profile={profile} links={links} theme={theme} onLinkClick={vi.fn()} />,
      );
      const layer = patternLayer(container);
      expect(layer).not.toBeNull();
      expect(layer!.classList.contains('fixed')).toBe(true);
      expect(layer!.classList.contains('inset-0')).toBe(true);
      expect(layer!.getAttribute('style')).toContain('linear-gradient');
    });

    it.each([
      ['none', { ...theme, background: { ...theme.background, pattern: 'none' as const } }],
      ['ausente', { ...theme, background: { type: 'solid' as const, color: '#F8FAFC' } }],
    ])('pattern %s: a camada não existe nos dois variants', (_, semPadrao) => {
      for (const variant of ['page', 'device'] as const) {
        const { container, unmount } = render(
          <ProfileView variant={variant} profile={profile} links={links} theme={semPadrao} onLinkClick={vi.fn()} />,
        );
        expect(patternLayer(container)).toBeNull();
        unmount();
      }
    });
  });

  it('profile=null: mostra "Usuário" e a inicial "U"', () => {
    render(<ProfileView variant="page" profile={null} links={links} theme={null} onLinkClick={vi.fn()} />);
    expect(screen.getByText('Usuário')).toBeTruthy();
    expect(screen.getByText('U')).toBeTruthy();
  });

  it('device: não usa min-h-screen, aplica topInset e o rodapé é só texto', () => {
    const { container } = render(
      <ProfileView
        variant="device"
        topInset={54}
        profile={profile}
        links={[]}
        theme={theme}
        onLinkClick={vi.fn()}
        emptyMessage="Seus links aparecerão aqui"
      />,
    );
    expect(container.innerHTML).not.toContain('min-h-screen');
    const root = screen.getByTestId('profile-view');
    expect(root.className).toContain('min-h-full');
    expect(root.style.paddingTop).toBe('54px');
    expect(root.style.backgroundColor).toBe('rgb(248, 250, 252)');
    expect(screen.queryByRole('button', { name: /criar seu LinkHub/ })).toBeNull();
    expect(screen.getByText(/criar seu LinkHub/)).toBeTruthy();
    expect(screen.getByText('Seus links aparecerão aqui')).toBeTruthy();
  });

  describe('QR code do rodapé', () => {
    const QR_URL = 'https://linkhub.avila.ia.br/dna';
    const QR_NAME = `QR code para abrir ${QR_URL}`;

    it('com qrCodeUrl e show_qr_code ausente ou true, aparece nas duas variantes', () => {
      for (const perfil of [profile, { ...profile, show_qr_code: true }]) {
        for (const variant of ['page', 'device'] as const) {
          const { unmount } = render(
            <ProfileView variant={variant} profile={perfil} links={links} theme={theme} onLinkClick={vi.fn()} qrCodeUrl={QR_URL} />,
          );
          expect(screen.getByRole('img', { name: QR_NAME })).toBeTruthy();
          expect(screen.getByText('Aponte a câmera para abrir este perfil')).toBeTruthy();
          unmount();
        }
      }
    });

    it('show_qr_code=false esconde o QR code nas duas variantes', () => {
      for (const variant of ['page', 'device'] as const) {
        const { unmount } = render(
          <ProfileView
            variant={variant}
            profile={{ ...profile, show_qr_code: false }}
            links={links}
            theme={theme}
            onLinkClick={vi.fn()}
            qrCodeUrl={QR_URL}
          />,
        );
        expect(screen.queryByRole('img', { name: QR_NAME })).toBeNull();
        expect(screen.queryByText('Aponte a câmera para abrir este perfil')).toBeNull();
        unmount();
      }
    });

    it('sem qrCodeUrl (null ou prop omitida) não desenha nada nas duas variantes', () => {
      for (const qrCodeUrl of [null, undefined]) {
        for (const variant of ['page', 'device'] as const) {
          const { unmount } = render(
            <ProfileView variant={variant} profile={profile} links={links} theme={theme} onLinkClick={vi.fn()} qrCodeUrl={qrCodeUrl} />,
          );
          expect(screen.queryByRole('img')).toBeNull();
          expect(screen.queryByText('Aponte a câmera para abrir este perfil')).toBeNull();
          unmount();
        }
      }
    });

    it('tema do perfil dna: módulos no azul do fundo e legenda na cor do texto (cores diferentes)', () => {
      const marinho = {
        background: { type: 'gradient', colors: ['#0B1F3A', '#132F55'] },
        buttonStyle: { type: 'glass' },
        colors: { text: '#F1F5F9' },
      } as ThemeConfig;
      render(<ProfileView variant="page" profile={profile} links={links} theme={marinho} onLinkClick={vi.fn()} qrCodeUrl={QR_URL} />);
      const fills = [...screen.getByRole('img', { name: QR_NAME }).querySelectorAll('path')].map((p) => p.getAttribute('fill'));
      expect(fills).toEqual(['#ffffff', '#0b1f3a']);
      expect(screen.getByText('Aponte a câmera para abrir este perfil').style.color).toBe('rgb(241, 245, 249)');
    });

    it('módulos na cor do tema e legenda na cor do texto', () => {
      // theme deste arquivo: texto #0F172A, que tem contraste sobre o branco
      render(<ProfileView variant="page" profile={profile} links={links} theme={theme} onLinkClick={vi.fn()} qrCodeUrl={QR_URL} />);
      const fills = [...screen.getByRole('img', { name: QR_NAME }).querySelectorAll('path')].map((p) => p.getAttribute('fill'));
      expect(fills).toContain('#0f172a');
      expect(screen.getByText('Aponte a câmera para abrir este perfil').style.color).toBe('rgb(15, 23, 42)');
    });

    it('fica no rodapé: depois do último link e antes do "criar seu LinkHub", nas duas variantes', () => {
      for (const variant of ['page', 'device'] as const) {
        const { unmount } = render(
          <ProfileView variant={variant} profile={profile} links={links} theme={theme} onLinkClick={vi.fn()} qrCodeUrl={QR_URL} />,
        );
        const qr = screen.getByRole('img', { name: QR_NAME });
        const ultimoLink = screen.getByRole('button', { name: /GitHub/ });
        // page: o rodapé é botão; device: é só texto
        const criar = screen.getByText(/criar seu LinkHub/);
        expect(ultimoLink.compareDocumentPosition(qr) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(qr.compareDocumentPosition(criar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        unmount();
      }
    });
  });
});
