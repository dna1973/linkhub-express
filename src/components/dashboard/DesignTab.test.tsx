// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ONBOARDING_TEMPLATES } from './onboardingTemplates';
import { createDefaultCustomTheme, useDesignStore } from '@/stores/useDesignStore';
import { getBackgroundEditorColors } from '@/utils/profileAppearance';
import { DesignTab } from './DesignTab';

const mocks = vi.hoisted(() => ({ update: vi.fn(), toast: vi.fn() }));

// Se a aba ainda usar a conta, grava em 'u1' e o teste de gravação acusa
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      update: (values: unknown) => ({
        eq: async (column: string, value: unknown) => mocks.update(table, values, column, value),
      }),
    })),
  },
}));

const PEACH = ONBOARDING_TEMPLATES.find((t) => t.id === 'warm-peach')!;
const COM_TEMA = { id: 'p1', theme_options: { themeId: 'warm-peach', custom: PEACH.config } };
const SEM_TEMA = { id: 'p2', theme_options: {} };

const peach = () => screen.getByRole('button', { name: 'Modelo Peach' });
const corPrincipal = () => (screen.getByPlaceholderText('#111827') as HTMLInputElement).value;

beforeEach(() => {
  mocks.update.mockReset().mockReturnValue({ error: null });
  mocks.toast.mockReset();
  useDesignStore.getState().resetDesign();
});
afterEach(() => cleanup());

describe('DesignTab', () => {
  it('começa pelo tema salvo do perfil', () => {
    render(<DesignTab key={COM_TEMA.id} profile={COM_TEMA} onProfileUpdate={vi.fn()} />);
    expect(peach().getAttribute('aria-pressed')).toBe('true');

    fireEvent.mouseDown(screen.getByRole('tab', { name: /Personalizado/ }));
    expect(corPrincipal()).toBe(getBackgroundEditorColors(PEACH.config.background).primary);
  });

  it('na troca, o perfil sem tema começa no padrão, sem herdar o tema do anterior', () => {
    const { rerender } = render(<DesignTab key={COM_TEMA.id} profile={COM_TEMA} onProfileUpdate={vi.fn()} />);
    expect(peach().getAttribute('aria-pressed')).toBe('true');

    // O store ainda tem o tema do perfil anterior, como no painel antes do contexto aplicar o novo
    useDesignStore.getState().setCustomTheme(PEACH.config);
    rerender(<DesignTab key={SEM_TEMA.id} profile={SEM_TEMA} onProfileUpdate={vi.fn()} />);

    for (const button of screen.getAllByRole('button', { name: /^Modelo / })) {
      expect(button.getAttribute('aria-pressed')).toBe('false');
    }
    fireEvent.mouseDown(screen.getByRole('tab', { name: /Personalizado/ }));
    expect(corPrincipal()).toBe(getBackgroundEditorColors(createDefaultCustomTheme().background).primary);
  });

  it('ao voltar para a aba, o store (prévia) volta ao tema salvo, não ao modelo escolhido sem salvar', () => {
    const first = render(<DesignTab key="a" profile={COM_TEMA} onProfileUpdate={vi.fn()} />);
    expect(useDesignStore.getState().currentTheme).toBe('warm-peach');

    // Escolhe outro modelo sem salvar e sai da aba (o Radix desmonta)
    const outro = screen.getAllByRole('button', { name: /^Modelo / }).find((b) => b.getAttribute('aria-pressed') === 'false')!;
    fireEvent.click(outro);
    expect(useDesignStore.getState().currentTheme).not.toBe('warm-peach');
    first.unmount();

    render(<DesignTab key="b" profile={COM_TEMA} onProfileUpdate={vi.fn()} />);
    expect(useDesignStore.getState().currentTheme).toBe('warm-peach');
    expect(useDesignStore.getState().customTheme).toEqual(PEACH.config);
    expect(peach().getAttribute('aria-pressed')).toBe('true');
  });

  it('"Salvar Modelo" grava no perfil recebido', async () => {
    const onProfileUpdate = vi.fn();
    render(<DesignTab key={SEM_TEMA.id} profile={SEM_TEMA} onProfileUpdate={onProfileUpdate} />);
    fireEvent.click(peach());
    fireEvent.click(screen.getByRole('button', { name: /Salvar Modelo/ }));

    await waitFor(() => expect(onProfileUpdate).toHaveBeenCalled());
    expect(mocks.update).toHaveBeenCalledWith(
      'profiles',
      expect.objectContaining({ theme_options: expect.objectContaining({ themeId: 'warm-peach' }) }),
      'id',
      'p2',
    );
  });
});
