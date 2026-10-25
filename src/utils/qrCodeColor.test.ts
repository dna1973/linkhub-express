import { describe, expect, it } from 'vitest';
import type { ThemeConfig } from '@/stores/useDesignStore';
import { getQrModuleColor } from './qrCodeColor';

describe('getQrModuleColor', () => {
  it.each<[string, ThemeConfig | null, string]>([
    [
      'texto escuro passa',
      { background: { type: 'solid', color: '#ffffff' }, colors: { text: '#1f2937' } } as ThemeConfig,
      '#1f2937',
    ],
    [
      'perfil dna: texto claro falha, fundo azul-marinho passa',
      {
        background: { type: 'gradient', colors: ['#0B1F3A', '#132F55'] },
        buttonStyle: { type: 'glass' },
        colors: { text: '#F1F5F9' },
      } as ThemeConfig,
      '#0b1f3a',
    ],
    [
      'texto, fundo e botão claros: preto',
      {
        background: { type: 'solid', color: '#f8fafc' },
        buttonStyle: { type: 'solid', color: '#ffffff' },
        colors: { text: '#f1f5f9' },
      } as ThemeConfig,
      '#000000',
    ],
    [
      'texto e fundo claros, botão escuro: vale o botão',
      {
        background: { type: 'solid', color: '#f8fafc' },
        buttonStyle: { type: 'solid', color: '#1E40AF' },
        colors: { text: '#f1f5f9' },
      } as ThemeConfig,
      '#1e40af',
    ],
    ['tema null: texto branco falha, fundo padrão #111827 passa', null, '#111827'],
    [
      'texto inválido é pulado',
      { background: { type: 'solid', color: '#0f172a' }, colors: { text: 'azul' } } as ThemeConfig,
      '#0f172a',
    ],
  ])('%s', (_, theme, expected) => {
    expect(getQrModuleColor(theme)).toBe(expected);
  });
});
