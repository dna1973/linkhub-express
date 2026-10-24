import { describe, expect, it } from 'vitest';
import { ONBOARDING_TEMPLATES } from './onboardingTemplates';
import { resolveButtonColors } from '@/utils/linkButtonStyle';

// Cores dos 10 modelos clássicos (especificação de 2026-10-23, seção 3) e dos 12 novos
// (especificação de 2026-10-24, seção 5), já normalizadas
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
  'pro-navy': { bg: '#ffffff', text: '#000000', pageText: '#F1F5F9' },
  'pro-slate': { bg: '#1e293b', text: '#1e293b', pageText: '#0F172A' },
  'pro-olive': { bg: '#e9f5ec', text: '#1f3b2d', pageText: '#F0FDF4' },
  'brut-yellow': { bg: '#ffffff', text: '#000000', pageText: '#111111' },
  'brut-pink': { bg: '#a3e635', text: '#000000', pageText: '#111111' },
  'brut-cobalt': { bg: '#ffffff', text: '#000000', pageText: '#FFFFFF' },
  'neon-cyber': { bg: '#00f0ff', text: '#00f0ff', pageText: '#E0F7FF' },
  'neon-synth': { bg: '#ff2e97', text: '#ffffff', pageText: '#FFE3F1' },
  'neon-terminal': { bg: '#39ff14', text: '#39ff14', pageText: '#39FF14' },
  'soft-lavender': { bg: '#ffffff', text: '#6b21a8', pageText: '#4C1D95' },
  'soft-mint': { bg: '#10b981', text: '#065f46', pageText: '#065F46' },
  'soft-blush': { bg: '#fdba74', text: '#7c2d12', pageText: '#7C2D12' },
};

// Demais colunas da tabela dos 12 modelos novos (especificação de 2026-10-24, seção 5)
const NOVOS: Record<
  string,
  {
    name: string;
    category: string;
    background: Record<string, unknown>;
    button: { type: string; borderRadius: string; shadow: string; shadowColor?: string };
    font: { family: string; size: string; weight: string };
    avatar: string;
  }
> = {
  'pro-navy': {
    name: 'Marinho', category: 'profissional',
    background: { type: 'gradient', colors: ['#0B1F3A', '#132F55'] },
    button: { type: 'solid', borderRadius: 'md', shadow: 'soft' },
    font: { family: 'inter', size: 'md', weight: 'medium' }, avatar: 'circle',
  },
  'pro-slate': {
    name: 'Grafite', category: 'profissional',
    background: { type: 'solid', color: '#F8FAFC', pattern: 'grid' },
    button: { type: 'outline', borderRadius: 'sm', shadow: 'none' },
    font: { family: 'inter', size: 'md', weight: 'normal' }, avatar: 'rounded',
  },
  'pro-olive': {
    name: 'Oliva', category: 'profissional',
    background: { type: 'gradient', colors: ['#1F3B2D', '#2F5D46'] },
    button: { type: 'solid', borderRadius: 'lg', shadow: 'soft' },
    font: { family: 'lora', size: 'md', weight: 'medium' }, avatar: 'circle',
  },
  'brut-yellow': {
    name: 'Amarelo', category: 'brutalista',
    background: { type: 'solid', color: '#FDE047' },
    button: { type: 'solid', borderRadius: 'none', shadow: 'hard', shadowColor: '#000000' },
    font: { family: 'poppins', size: 'md', weight: 'bold' }, avatar: 'rounded',
  },
  'brut-pink': {
    name: 'Chiclete', category: 'brutalista',
    background: { type: 'solid', color: '#F9A8D4', pattern: 'dots' },
    button: { type: 'solid', borderRadius: 'sm', shadow: 'hard', shadowColor: '#000000' },
    font: { family: 'montserrat', size: 'md', weight: 'bold' }, avatar: 'hexagon',
  },
  'brut-cobalt': {
    name: 'Cobalto', category: 'brutalista',
    background: { type: 'solid', color: '#2563EB' },
    button: { type: 'solid', borderRadius: 'none', shadow: 'hard', shadowColor: '#000000' },
    font: { family: 'poppins', size: 'md', weight: 'bold' }, avatar: 'rounded',
  },
  'neon-cyber': {
    name: 'Cyber', category: 'neon',
    background: { type: 'gradient', colors: ['#0F0C29', '#302B63'], pattern: 'grid', animated: true },
    button: { type: 'outline', borderRadius: 'sm', shadow: 'glow' },
    font: { family: 'source-code-pro', size: 'md', weight: 'medium' }, avatar: 'hexagon',
  },
  'neon-synth': {
    name: 'Synthwave', category: 'neon',
    background: { type: 'gradient', colors: ['#2B1055', '#D53369'], animated: true },
    button: { type: 'solid', borderRadius: 'full', shadow: 'glow' },
    font: { family: 'montserrat', size: 'md', weight: 'bold' }, avatar: 'circle',
  },
  'neon-terminal': {
    name: 'Terminal', category: 'neon',
    background: { type: 'solid', color: '#050505', pattern: 'stripes' },
    button: { type: 'outline', borderRadius: 'none', shadow: 'glow' },
    font: { family: 'roboto-mono', size: 'md', weight: 'normal' }, avatar: 'rounded',
  },
  'soft-lavender': {
    name: 'Lavanda', category: 'suave',
    background: { type: 'gradient', colors: ['#E9D5FF', '#FBCFE8'], pattern: 'dots' },
    button: { type: 'solid', borderRadius: 'full', shadow: 'soft' },
    font: { family: 'poppins', size: 'md', weight: 'medium' }, avatar: 'circle',
  },
  'soft-mint': {
    name: 'Menta', category: 'suave',
    background: { type: 'gradient', colors: ['#D1FAE5', '#CFFAFE'], pattern: 'waves', animated: true },
    button: { type: 'modern', borderRadius: 'lg', shadow: 'soft' },
    font: { family: 'lora', size: 'md', weight: 'normal' }, avatar: 'rounded',
  },
  'soft-blush': {
    name: 'Blush', category: 'suave',
    background: { type: 'solid', color: '#FFF7ED', pattern: 'grid' },
    button: { type: 'solid', borderRadius: 'lg', shadow: 'soft' },
    font: { family: 'dancing-script', size: 'lg', weight: 'medium' }, avatar: 'rounded',
  },
};

const CLASSICOS = [
  'warm-peach', 'clean-white', 'ocean-deep', 'sunset-warm', 'midnight-dark',
  'forest-green', 'cyber-neon', 'rose-elegant', 'sand-cream', 'purple-haze',
];

describe('ONBOARDING_TEMPLATES', () => {
  it('tem os 22 modelos das especificações', () => {
    expect(ONBOARDING_TEMPLATES.map((t) => t.id).sort()).toEqual(Object.keys(ESPERADO).sort());
  });

  it('os ids são únicos', () => {
    const ids = ONBOARDING_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(ONBOARDING_TEMPLATES.map((t) => [t.id, t] as const))('%s produz as cores da tabela', (id, template) => {
    const esperado = ESPERADO[id];
    expect(resolveButtonColors(template.config)).toEqual({ bg: esperado.bg, text: esperado.text });
    expect(template.config.colors.text).toBe(esperado.pageText);
  });

  it.each(Object.entries(NOVOS))('%s segue a tabela dos modelos novos', (id, esperado) => {
    const template = ONBOARDING_TEMPLATES.find((t) => t.id === id);
    expect(template?.name).toBe(esperado.name);
    expect(template?.category).toBe(esperado.category);
    expect(template?.config.background).toEqual(esperado.background);
    const { type, borderRadius, shadow, shadowColor, size } = template!.config.buttonStyle;
    expect({ type, borderRadius, shadow, shadowColor }).toEqual(esperado.button);
    expect(size).toBeUndefined();
    expect(template?.config.font).toEqual(esperado.font);
    expect(template?.config.avatar).toEqual({ shape: esperado.avatar });
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
    // font saiu do modelo: a miniatura usa FONT_FAMILY_CSS[config.font.family]
    for (const t of ONBOARDING_TEMPLATES as any[]) {
      for (const campo of ['bg', 'textColor', 'btnBg', 'btnText', 'btnRadius', 'font']) {
        expect(t[campo]).toBeUndefined();
      }
    }
  });

  it('todo modelo tem uma categoria válida', () => {
    for (const t of ONBOARDING_TEMPLATES) {
      expect(['classico', 'profissional', 'brutalista', 'neon', 'suave']).toContain(t.category);
    }
  });

  it('os 10 modelos originais ficam em classico', () => {
    for (const id of CLASSICOS) {
      expect(ONBOARDING_TEMPLATES.find((t) => t.id === id)?.category).toBe('classico');
    }
    expect(ONBOARDING_TEMPLATES.filter((t) => t.category === 'classico')).toHaveLength(10);
  });

  it.each(['profissional', 'brutalista', 'neon', 'suave'])('existem 3 modelos na categoria %s', (categoria) => {
    expect(ONBOARDING_TEMPLATES.filter((t) => t.category === categoria)).toHaveLength(3);
  });
});
