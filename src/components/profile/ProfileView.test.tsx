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
});
