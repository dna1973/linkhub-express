// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  // Contagens que falham ("tabela:perfil")
  failing: [] as string[],
  // Contagens que ficam pendentes até o teste chamar as funções de held
  hold: [] as string[],
  held: [] as (() => void)[],
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
          gte: (dateColumn: string, since: string) => {
            mocks.countCalls.push([table, columns, options, column, value, dateColumn, since]);
            const key = `${table}:${value}`;
            const response = () =>
              mocks.failing.includes(key)
                ? { count: null, error: { message: 'falhou' } }
                : { count: mocks.counts[key] ?? 0, error: null };
            if (mocks.hold.includes(key)) {
              return new Promise((resolve) => mocks.held.push(() => resolve(response())));
            }
            return Promise.resolve(response());
          },
        }),
      }),
    }),
  },
}));

const DNA: P = { id: 'u1', username: 'dna', full_name: 'Daniel', avatar_url: null };
const PRO: P = { id: 'p2', username: 'pro', full_name: 'Daniel Profissional', avatar_url: null };
const SEM_ARROBA: P = { id: 'p3', username: null, full_name: 'Rascunho', avatar_url: null };
// A aba Configurações grava full_name: null quando o campo é apagado
const SEM_NADA: P = { id: 'p4', username: null, full_name: null, avatar_url: null };

beforeEach(() => {
  mocks.profiles = [DNA, PRO];
  mocks.current = DNA;
  mocks.selectProfile.mockReset();
  mocks.deleteProfile.mockReset().mockResolvedValue({ ok: true });
  mocks.toast.mockReset();
  mocks.counts = { 'profile_views:u1': 57, 'link_clicks:u1': 12, 'profile_views:p2': 3, 'link_clicks:p2': 0 };
  mocks.countCalls = [];
  mocks.failing = [];
  mocks.hold = [];
  mocks.held = [];
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderTab() {
  const onOpenLinks = vi.fn();
  const onCreateProfile = vi.fn();
  const view = render(<ProfilesTab onOpenLinks={onOpenLinks} onCreateProfile={onCreateProfile} />);
  return { ...view, onOpenLinks, onCreateProfile };
}

const card = (index: number) => screen.getAllByTestId('profile-card')[index];
const confirmButton = () => screen.getByRole('button', { name: /Excluir perfil/ }) as HTMLButtonElement;
/** Texto dos elementos ligados por aria-describedby. */
const descriptionOf = (element: HTMLElement) =>
  (element.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');

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
    const clicks = mocks.countCalls.find((c) => c[0] === 'link_clicks' && c[4] === 'u1')!;
    expect(clicks[2]).toEqual({ count: 'exact', head: true });
    expect(clicks[3]).toBe('profile_id');
    expect(clicks[5]).toBe('clicked_at');
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
    // Só o @ exato: nem um @ que começa com ele, nem o começo dele
    fireEvent.change(screen.getByLabelText('Para confirmar, digite @pro'), { target: { value: '@prox' } });
    expect(confirmar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Para confirmar, digite @pro'), { target: { value: 'pr' } });
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
    expect(confirmButton().disabled).toBe(true);
    const campo = screen.getByLabelText('Para confirmar, digite o nome do perfil: Rascunho');
    fireEvent.change(campo, { target: { value: 'rascunho' } });
    expect(confirmButton().disabled).toBe(true);
    fireEvent.change(campo, { target: { value: 'Rascunho' } });
    expect(confirmButton().disabled).toBe(false);
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

  it('erro de contagem: travessão com "Não foi possível carregar"', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.failing = ['profile_views:u1'];
    renderTab();
    await waitFor(() => expect(within(card(0)).getByTestId('profile-clicks').textContent).toBe('12'));
    const views = within(card(0)).getByTestId('profile-views');
    expect(views.textContent).toBe('—');
    expect(views.getAttribute('aria-label')).toBe('Não foi possível carregar');
    expect(views.getAttribute('title')).toBe('Não foi possível carregar');
    expect(within(card(0)).getByTestId('profile-clicks').getAttribute('aria-label')).toBeNull();
  });

  it('reordenar os perfis com uma contagem pendente: cada card fica com a sua', async () => {
    mocks.hold = ['profile_views:u1', 'link_clicks:u1'];
    const view = renderTab();
    await waitFor(() => expect(within(card(1)).getByTestId('profile-views').textContent).toBe('3'));
    expect(within(card(0)).getByTestId('profile-views').textContent).toBe('…');

    mocks.profiles = [PRO, DNA];
    view.rerender(<ProfilesTab onOpenLinks={vi.fn()} onCreateProfile={vi.fn()} />);
    expect(within(card(0)).getByText('Daniel Profissional')).toBeTruthy();
    expect(within(card(0)).getByTestId('profile-views').textContent).toBe('3');
    expect(within(card(1)).getByTestId('profile-views').textContent).toBe('…');

    await act(async () => mocks.held.forEach((release) => release()));
    await waitFor(() => expect(within(card(1)).getByTestId('profile-views').textContent).toBe('57'));
    expect(within(card(0)).getByTestId('profile-views').textContent).toBe('3');
    expect(within(card(1)).getByTestId('profile-clicks').textContent).toBe('12');
  });

  it('dois cliques em "Excluir perfil" com a exclusão pendente: uma chamada só', () => {
    mocks.deleteProfile.mockReturnValue(new Promise(() => {}));
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir @pro' }));
    fireEvent.change(screen.getByLabelText('Para confirmar, digite @pro'), { target: { value: 'pro' } });
    // Os dois no mesmo lote: o segundo chega antes de o botão ficar desabilitado
    act(() => {
      confirmButton().click();
      confirmButton().click();
    });
    expect(mocks.deleteProfile).toHaveBeenCalledTimes(1);
  });

  it('perfil sem @ e sem nome: "Perfil sem nome" no card e no diálogo, e confirma com "excluir"', async () => {
    mocks.profiles = [DNA, SEM_NADA];
    renderTab();
    expect(within(card(1)).getByText('Perfil sem nome')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Perfil sem nome' }));
    expect(screen.getByRole('heading', { name: 'Excluir Perfil sem nome?' })).toBeTruthy();

    expect(confirmButton().disabled).toBe(true);
    const campo = screen.getByLabelText('Para confirmar, digite excluir');
    fireEvent.change(campo, { target: { value: 'outra coisa' } });
    expect(confirmButton().disabled).toBe(true);
    fireEvent.change(campo, { target: { value: 'excluir' } });
    expect(confirmButton().disabled).toBe(false);
    fireEvent.click(confirmButton());
    await waitFor(() => expect(mocks.deleteProfile).toHaveBeenCalledWith('p4'));
  });

  it('o "Excluir" desabilitado do único perfil aponta para a explicação', () => {
    mocks.profiles = [DNA];
    renderTab();
    expect(descriptionOf(screen.getByRole('button', { name: 'Excluir @dna' }))).toMatch(/Este é o seu único perfil/);
  });

  it('"Criar novo perfil" desabilitado no limite aponta para a explicação', () => {
    mocks.profiles = Array.from({ length: 10 }, (_, i) => ({ ...PRO, id: `p${i}`, username: `perfil${i}` }));
    renderTab();
    expect(descriptionOf(screen.getByRole('button', { name: /Criar novo perfil/ }))).toMatch(/limite de 10 perfis/);
  });

  it('depois de excluir, o foco vai para o título da aba', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir @pro' }));
    fireEvent.change(screen.getByLabelText('Para confirmar, digite @pro'), { target: { value: 'pro' } });
    fireEvent.click(confirmButton());

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Meus perfis' })));
  });

  it('Enter no campo de confirmação confirma só com o texto certo', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir @pro' }));
    const campo = screen.getByLabelText('Para confirmar, digite @pro');
    fireEvent.change(campo, { target: { value: 'outro' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(mocks.deleteProfile).not.toHaveBeenCalled();

    fireEvent.change(campo, { target: { value: '@pro' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    await waitFor(() => expect(mocks.deleteProfile).toHaveBeenCalledWith('p2'));
  });
});
