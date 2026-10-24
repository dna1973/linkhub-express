import { describe, expect, it } from 'vitest';
import { ONBOARDING_TEMPLATES } from './onboardingTemplates';
import { resolveButtonColors } from '@/utils/linkButtonStyle';

// Valores da tabela da seção 3 da especificação (já normalizados)
const ESPERADO: Record<string, { bg: string; text: string; pageText: string }> = {
  'warm-peach': { bg: '#f5a876', text: '#3d2b1f', pageText: '#3D2B1F' },
  'clean-white': { bg: '#1a1a1a', text: '#1a1a1a', pageText: '#1A1A1A' },
  'ocean-deep': { bg: '#22d3ee', text: '#ffffff', pageText: '#FFFFFF' },
  'sunset-warm': { bg: '#ffffff', text: '#ffffff', pageText: '#FFFFFF' },
  'midnight-dark': { bg: '#3b82f6', text: '#e2e8f0', pageText: '#E2E8F0' },
  'forest-green': { bg: '#10b981', text: '#6ee7b7', pageText: '#D1FAE5' },
  'cyber-neon': { bg: '#00ff88', text: '#00ff88', pageText: '#00FF88' },
  'rose-elegant': { bg: '#fb7185', text: '#ffffff', pageText: '#881337' },
  'sand-cream': { bg: '#d97706', text: '#fffbeb', pageText: '#78350F' },
  'purple-haze': { bg: '#d946ef', text: '#2d1b4e', pageText: '#2D1B4E' },
};

describe('ONBOARDING_TEMPLATES', () => {
  it('tem os 10 modelos da especificação', () => {
    expect(ONBOARDING_TEMPLATES.map((t) => t.id).sort()).toEqual(Object.keys(ESPERADO).sort());
  });

  it.each(ONBOARDING_TEMPLATES.map((t) => [t.id, t] as const))('%s produz as cores da tabela', (id, template) => {
    const esperado = ESPERADO[id];
    expect(resolveButtonColors(template.config)).toEqual({ bg: esperado.bg, text: esperado.text });
    expect(template.config.colors.text).toBe(esperado.pageText);
  });

  it('colors.primary é igual à cor do botão', () => {
    for (const t of ONBOARDING_TEMPLATES) {
      expect(t.config.colors.primary?.toLowerCase()).toBe(t.config.buttonStyle.color?.toLowerCase());
    }
  });

  it('nenhum botão sólido tem texto da mesma cor do fundo', () => {
    for (const t of ONBOARDING_TEMPLATES.filter((t) => t.config.buttonStyle.type === 'solid')) {
      const { bg, text } = resolveButtonColors(t.config);
      expect(text).not.toBe(bg);
    }
  });

  it('não carrega campos antigos de desenho', () => {
    for (const t of ONBOARDING_TEMPLATES as any[]) {
      for (const campo of ['bg', 'textColor', 'btnBg', 'btnText', 'btnRadius']) {
        expect(t[campo]).toBeUndefined();
      }
    }
  });
});
