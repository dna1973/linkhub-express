// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ProfilesTab } from './ProfilesTab';

type P = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };

const mocks = vi.hoisted(() => ({
  profiles: [] as P[],
  current: null as P | null,
  selectProfile: vi.fn(),
  deleteProfile: vi.fn(),
  toast: vi.fn(),
  counts: {} as Record<string, number>,
  countCalls: [] as unknown[][],
}));

vi.mock('@/contexts/CurrentProfileContext', () => ({
  MAX_PROFILES: 10,
  useCurrentProfile: () => ({
    profiles: mocks.profiles,
    currentProfile: mocks.current,
    selectProfile: mocks.selectProfile,
    deleteProfile: mocks.deleteProfile,
  }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/siteUrl', () => ({ PUBLIC_SITE_URL: 'https://example.test' }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: (columns: string, options: unknown) => ({
        eq: (column: string, value: string) => ({
          gte: async (dateColumn: string, since: string) => {
            mocks.countCalls.push([table, columns, options, column, value, dateColumn, since]);
            return { count: mocks.counts[`${table}:${value}`] ?? 0, error: null };
          },
        }),
      }),
    }),
  },
}));

const DNA: P = { id: 'u1', username: 'dna', full_name: 'Daniel', avatar_url: null };
const PRO: P = { id: 'p2', username: 'pro', full_name: 'Daniel Profissional', avatar_url: null };
const SEM_ARROBA: P = { id: 'p3', username: null, full_name: 'Rascunho', avatar_url: null };

beforeEach(() => {
  mocks.profiles = [DNA, PRO];
  mocks.current = DNA;
  mocks.selectProfile.mockReset();
  mocks.deleteProfile.mockReset().mockResolvedValue({ ok: true });
  mocks.toast.mockReset();
  mocks.counts = { 'profile_views:u1': 57, 'link_clicks:u1': 12, 'profile_views:p2': 3, 'link_clicks:p2': 0 };
  mocks.countCalls = [];
});
afterEach(() => cleanup());

function renderTab() {
  const onOpenLinks = vi.fn();
  const onCreateProfile = vi.fn();
  render(<ProfilesTab onOpenLinks={onOpenLinks} onCreateProfile={onCreateProfile} />);
  return { onOpenLinks, onCreateProfile };
}

const card = (index: number) => screen.getAllByTestId('profile-card')[index];

describe('ProfilesTab', () => {
  it('um card por perfil, com nome, @, link público e visitas e cliques de 30 dias', async () => {
    renderTab();
    expect(screen.getAllByTestId('profile-card')).toHaveLength(2);
    expect(within(card(0)).getByText('@dna')).toBeTruthy();
    expect(within(card(0)).getByText('https://example.test/dna')).toBeTruthy();
    expect(within(card(1)).getByText('Daniel Profissional')).toBeTruthy();

    await waitFor(() => expect(within(card(0)).getByTestId('profile-views').textContent).toBe('57'));
    expect(within(card(0)).getByTestId('profile-clicks').textContent).toBe('12');
    expect(within(card(1)).getByTestId('profile-views').textContent).toBe('3');

    // Contagem head por perfil, desde 30 dias atrás
    const views = mocks.countCalls.find((c) => c[0] === 'profile_views' && c[4] === 'u1')!;
    expect(views[2]).toEqual({ count: 'exact', head: true });
    expect(views[3]).toBe('profile_id');
    expect(views[5]).toBe('viewed_at');
    const desde = Date.parse(views[6] as string);
    const trintaDias = Date.now() - 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(desde - trintaDias)).toBeLessThan(60_000);
    expect(mocks.countCalls.some((c) => c[0] === 'link_clicks' && c[5] === 'clicked_at')).toBe(true);
  });

  it('"Abrir" seleciona o perfil e vai para Links', () => {
    const { onOpenLinks } = renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir @pro' }));
    expect(mocks.selectProfile).toHaveBeenCalledWith('p2');
    expect(onOpenLinks).toHaveBeenCalled();
  });

  it('excluir pede o @, explica o que será apagado e só confirma com ele digitado', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir @pro' }));

    expect(screen.getByText(/apaga o perfil, os links, a foto, os ícones enviados e as estatísticas/)).toBeTruthy();
    const confirmar = screen.getByRole('button', { name: /Excluir perfil/ }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Para confirmar, digite @pro'), { target: { value: 'outro' } });
    expect(confirmar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Para confirmar, digite @pro'), { target: { value: '@pro' } });
    expect(confirmar.disabled).toBe(false);
    fireEvent.click(confirmar);

    await waitFor(() => expect(mocks.deleteProfile).toHaveBeenCalledWith('p2'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Perfil excluído' })));
  });

  it('perfil sem @ pede o nome', () => {
    mocks.profiles = [DNA, SEM_ARROBA];
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Rascunho' }));
    fireEvent.change(screen.getByLabelText('Para confirmar, digite o nome do perfil: Rascunho'), {
      target: { value: 'Rascunho' },
    });
    expect((screen.getByRole('button', { name: /Excluir perfil/ }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('o único perfil não pode ser excluído, com a explicação', () => {
    mocks.profiles = [DNA];
    renderTab();
    expect((screen.getByRole('button', { name: 'Excluir @dna' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Este é o seu único perfil/)).toBeTruthy();
  });

  it('com 10 perfis, "Criar novo perfil" fica desabilitado com a explicação', () => {
    mocks.profiles = Array.from({ length: 10 }, (_, i) => ({ ...PRO, id: `p${i}`, username: `perfil${i}` }));
    renderTab();
    expect((screen.getByRole('button', { name: /Criar novo perfil/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/limite de 10 perfis/)).toBeTruthy();
  });

  it('"Criar novo perfil" chama o Dashboard', () => {
    const { onCreateProfile } = renderTab();
    fireEvent.click(screen.getByRole('button', { name: /Criar novo perfil/ }));
    expect(onCreateProfile).toHaveBeenCalled();
  });

  it('falha na exclusão mostra o erro e mantém o diálogo', async () => {
    mocks.deleteProfile.mockResolvedValue({ ok: false, error: 'other' });
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir @pro' }));
    fireEvent.change(screen.getByLabelText('Para confirmar, digite @pro'), { target: { value: 'pro' } });
    fireEvent.click(screen.getByRole('button', { name: /Excluir perfil/ }));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })),
    );
    expect(screen.getByRole('button', { name: /Excluir perfil/ })).toBeTruthy();
  });
});
