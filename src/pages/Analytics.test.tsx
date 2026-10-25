// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import Analytics from './Analytics';

const mocks = vi.hoisted(() => ({
  calls: [] as unknown[][],
  current: { id: 'p2' } as { id: string } | null,
  navigate: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => {
  const user = { id: 'u1' };
  return { useAuth: () => ({ user }) };
});
vi.mock('@/contexts/CurrentProfileContext', () => ({
  useCurrentProfile: () => ({ currentProfile: mocks.current }),
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
    for (const method of ['select', 'eq', 'gte', 'lte', 'order']) {
      q[method] = (...args: unknown[]) => {
        mocks.calls.push([table, method, ...args]);
        return q;
      };
    }
    q.then = (resolve: (value: unknown) => void) => resolve({ data: [], error: null });
    return q;
  };
  return { supabase: { from: (table: string) => query(table) } };
});

const eqCalls = () => mocks.calls.filter((call) => call[1] === 'eq');

beforeEach(() => {
  mocks.calls = [];
  mocks.current = { id: 'p2' };
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
});
