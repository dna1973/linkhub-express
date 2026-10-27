// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import Analytics from './Analytics';

const mocks = vi.hoisted(() => ({
  calls: [] as unknown[][],
  current: { id: 'p2' } as { id: string; username?: string; full_name?: string } | null,
  navigate: vi.fn(),
  profileLoading: false,
  profileError: null as string | null,
  // Resposta de cada consulta: devolve as linhas (ou uma promessa delas)
  respond: (_table: string, _profileId: unknown): unknown => [],
}));

vi.mock('@/contexts/AuthContext', () => {
  const user = { id: 'u1' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/contexts/CurrentProfileContext', () => ({
  useCurrentProfile: () => ({
    currentProfile: mocks.current,
    loading: mocks.profileLoading,
    error: mocks.profileError,
  }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
// Gráficos e mapas não interessam aqui: só as consultas
vi.mock('recharts', () => {
  const Nada = () => null;
  return {
    LineChart: Nada, Line: Nada, AreaChart: Nada, Area: Nada, XAxis: Nada, YAxis: Nada, CartesianGrid: Nada,
    Tooltip: Nada, ResponsiveContainer: Nada, BarChart: Nada, Bar: Nada, PieChart: Nada, Pie: Nada, Cell: Nada,
  };
});
vi.mock('@/components/analytics/WorldHeatmap', () => ({ default: () => null }));
vi.mock('@/components/analytics/SimpleWorldMap', () => ({ SimpleWorldMap: () => null }));
vi.mock('@/components/analytics/ActivityHeatmap', () => ({ ActivityHeatmap: () => null }));
vi.mock('@/components/analytics/InsightsPanel', () => ({ InsightsPanel: () => null, useAnalyticsInsights: () => [] }));
vi.mock('@/lib/supabase', () => {
  // Cada encadeamento registra [tabela, método, ...argumentos] e resolve com lista vazia
  const query = (table: string) => {
    const q: any = {};
    let owner: unknown = null;
    for (const method of ['select', 'eq', 'gte', 'lte', 'order']) {
      q[method] = (...args: unknown[]) => {
        mocks.calls.push([table, method, ...args]);
        if (method === 'eq') owner = args[1];
        return q;
      };
    }
    q.then = (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
      Promise.resolve(mocks.respond(table, owner)).then((data) => ({ data, error: null })).then(resolve, reject);
    return q;
  };
  return { supabase: { from: (table: string) => query(table) } };
});

const eqCalls = () => mocks.calls.filter((call) => call[1] === 'eq');

beforeEach(() => {
  mocks.calls = [];
  mocks.current = { id: 'p2' };
  mocks.profileLoading = false;
  mocks.profileError = null;
  mocks.respond = () => [];
  vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Analytics por perfil', () => {
  it('busca visitas, cliques e links do perfil atual', async () => {
    render(<Analytics />);
    expect(await screen.findByText('Analytics')).toBeTruthy();

    expect(eqCalls()).toContainEqual(['profile_views', 'eq', 'profile_id', 'p2']);
    expect(eqCalls()).toContainEqual(['link_clicks', 'eq', 'profile_id', 'p2']);
    expect(eqCalls()).toContainEqual(['links', 'eq', 'user_id', 'p2']);
    expect(eqCalls().some((call) => call[3] === 'u1')).toBe(false);
  });

  it('trocar de perfil busca de novo com o id novo', async () => {
    const { rerender } = render(<Analytics />);
    await screen.findByText('Analytics');

    mocks.current = { id: 'p3' };
    rerender(<Analytics />);

    await waitFor(() => expect(eqCalls()).toContainEqual(['profile_views', 'eq', 'profile_id', 'p3']));
    expect(eqCalls()).toContainEqual(['links', 'eq', 'user_id', 'p3']);
  });

  it('sem perfil atual, não busca nada', async () => {
    mocks.current = null;
    render(<Analytics />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.calls).toHaveLength(0);
  });

  it('a resposta atrasada do perfil anterior não sobrescreve a do perfil atual', async () => {
    const rows = (n: number) => Array.from({ length: n }, () => ({ viewed_at: new Date().toISOString() }));
    let releaseP2: (value: unknown) => void = () => {};
    const p2Views = new Promise((resolve) => {
      releaseP2 = resolve;
    });
    mocks.respond = (table, owner) => {
      if (table !== 'profile_views') return [];
      return owner === 'p2' ? p2Views : rows(3);
    };

    const { rerender } = render(<Analytics />);
    await waitFor(() => expect(eqCalls()).toContainEqual(['profile_views', 'eq', 'profile_id', 'p2']));

    mocks.current = { id: 'p3' };
    rerender(<Analytics />);
    expect(await screen.findByText('Total de Visualizações')).toBeTruthy();
    const total = () => screen.getByText('Total de Visualizações').parentElement?.parentElement?.textContent ?? '';
    await waitFor(() => expect(total()).toContain('3'));

    releaseP2(rows(7));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(total()).toContain('3');
    expect(total()).not.toContain('7');
  });

  it('a resposta do perfil anterior não encerra o carregamento do atual', async () => {
    let releaseP2: (value: unknown) => void = () => {};
    const p2Views = new Promise((resolve) => {
      releaseP2 = resolve;
    });
    const p3Views = new Promise(() => {});
    mocks.respond = (table, owner) => (table === 'profile_views' ? (owner === 'p2' ? p2Views : p3Views) : []);

    const { rerender } = render(<Analytics />);
    await waitFor(() => expect(eqCalls()).toContainEqual(['profile_views', 'eq', 'profile_id', 'p2']));
    mocks.current = { id: 'p3' };
    rerender(<Analytics />);
    await waitFor(() => expect(eqCalls()).toContainEqual(['profile_views', 'eq', 'profile_id', 'p3']));

    releaseP2([]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('enquanto o contexto carrega, mostra o spinner e não busca', async () => {
    mocks.current = null;
    mocks.profileLoading = true;
    render(<Analytics />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('.animate-spin')).toBeTruthy();
    expect(screen.queryByText('Analytics')).toBeNull();
    expect(mocks.calls).toHaveLength(0);
  });

  it('sem perfil atual depois da carga, mostra o erro do contexto', async () => {
    mocks.current = null;
    mocks.profileError = 'Não foi possível carregar seus perfis.';
    render(<Analytics />);
    expect(await screen.findByText('Não foi possível carregar seus perfis.')).toBeTruthy();
    expect(document.querySelector('.animate-spin')).toBeNull();
  });

  it('sem perfil atual e sem mensagem do contexto, mostra o texto padrão', async () => {
    mocks.current = null;
    render(<Analytics />);
    expect(await screen.findByText('Não foi possível carregar o seu perfil.')).toBeTruthy();
  });

  it('o subtítulo mostra o @ do perfil atual, ou o nome se não houver @', async () => {
    mocks.current = { id: 'p2', username: 'dna', full_name: 'Daniel' };
    const { unmount } = render(<Analytics />);
    expect(await screen.findByText('Acompanhe o desempenho de @dna')).toBeTruthy();
    unmount();

    mocks.current = { id: 'p2', full_name: 'Minha loja' };
    render(<Analytics />);
    expect(await screen.findByText('Acompanhe o desempenho de Minha loja')).toBeTruthy();
  });

  it('links mais clicados: plural certo e contagem que não sai do card com título longo', async () => {
    const titulo = 'Playlist Arena CALOG: como usar a plataforma do começo ao fim';
    mocks.respond = (table) =>
      table === 'links'
        ? [
            { id: 'l1', title: titulo, clicks: 1 },
            { id: 'l2', title: 'Canal YouTube', clicks: 4 },
          ]
        : [];
    render(<Analytics />);

    const um = await screen.findByText('1 clique');
    expect(screen.getByText('4 cliques')).toBeTruthy();

    // A contagem não encolhe nem quebra; o título encolhe e corta com reticências
    expect(um.className).toContain('shrink-0');
    expect(um.className).toContain('whitespace-nowrap');
    const nome = screen.getByText(titulo);
    expect(nome.className).toContain('truncate');
    expect(nome.getAttribute('title')).toBe(titulo);
    expect(nome.parentElement?.className).toContain('min-w-0');
    expect(nome.parentElement?.parentElement?.className).toContain('gap-');
  });

  it('o subtítulo usa o rótulo da sidebar: sem @ e sem nome, "Perfil sem nome"', async () => {
    mocks.current = { id: 'p2', username: null, full_name: '   ' };
    render(<Analytics />);
    expect(await screen.findByText('Acompanhe o desempenho de Perfil sem nome')).toBeTruthy();
  });
});
