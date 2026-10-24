import { describe, expect, it } from 'vitest';
import {
  FONT_FAMILY_CSS,
  getAvatarShapeStyle,
  getBackgroundLayer,
  getBaseBackgroundColor,
  getFontWeight,
  getPatternLayerStyle,
  getTextSizeClasses,
} from './profileAppearance';

describe('getPatternLayerStyle', () => {
  const colors = { text: '#0F172A' };

  it('none ou ausente devolve null', () => {
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'none' }, colors })).toBeNull();
    expect(getPatternLayerStyle({ background: { type: 'solid' }, colors })).toBeNull();
    expect(getPatternLayerStyle(null)).toBeNull();
  });
  it('valor desconhecido devolve null', () => {
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'xadrez' as any }, colors })).toBeNull();
  });
  it('dots: radial de 1.5px numa grade de 18px', () => {
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'dots' }, colors })).toEqual({
      backgroundImage: 'radial-gradient(circle, #0f172a1f 1.5px, transparent 1.5px)',
      backgroundSize: '18px 18px',
    });
  });
  it('grid: linhas de 1px a cada 24px', () => {
    expect(getPatternLayerStyle({ background: { type: 'gradient', pattern: 'grid' }, colors })).toEqual({
      backgroundImage: 'linear-gradient(#0f172a1f 1px, transparent 1px), linear-gradient(90deg, #0f172a1f 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    });
  });
  it('waves: listras diagonais repetidas', () => {
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'waves' }, colors })).toEqual({
      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #0f172a1f 10px, #0f172a1f 20px)',
      backgroundSize: 'auto',
    });
  });
  it('stripes: listras verticais de 1px a cada 12px', () => {
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'stripes' }, colors })).toEqual({
      backgroundImage: 'linear-gradient(90deg, #0f172a1f 1px, transparent 1px)',
      backgroundSize: '12px 12px',
    });
  });
  it('vale também para o tipo legado pattern', () => {
    expect(getPatternLayerStyle({ background: { type: 'pattern', pattern: 'dots' }, colors })?.backgroundSize).toBe('18px 18px');
  });
  it('sem colors.text válido, a cor do padrão é branca com alfa', () => {
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'stripes' } })?.backgroundImage).toBe(
      'linear-gradient(90deg, #ffffff1f 1px, transparent 1px)',
    );
    expect(getPatternLayerStyle({ background: { type: 'solid', pattern: 'stripes' }, colors: { text: 'branco' } })?.backgroundImage).toBe(
      'linear-gradient(90deg, #ffffff1f 1px, transparent 1px)',
    );
  });
});

describe('getBackgroundLayer', () => {
  it('nunca usa o atalho background', () => {
    const configs = [
      null,
      { background: { type: 'solid' as const, color: '#123456' } },
      { background: { type: 'pattern' as const, color: '#123456' } },
      { background: { type: 'gradient' as const, colors: ['#111111', '#222222'] } },
      { background: { type: 'gradient' as const, colors: ['#111111', '#222222'], animated: true } },
    ];
    for (const config of configs) {
      expect(getBackgroundLayer(config).style).not.toHaveProperty('background');
    }
  });
  it('config nula usa #111827', () => {
    expect(getBackgroundLayer(null)).toEqual({ style: { backgroundColor: '#111827' } });
  });
  it('sólido e legado: backgroundColor com as reservas do getBackgroundStyle', () => {
    expect(getBackgroundLayer({ background: { type: 'solid', color: '#abcdef' } })).toEqual({ style: { backgroundColor: '#abcdef' } });
    expect(getBackgroundLayer({ background: { type: 'solid', colors: ['#FFFFFF'] } })).toEqual({ style: { backgroundColor: '#FFFFFF' } });
    expect(getBackgroundLayer({ background: { type: 'pattern' } })).toEqual({ style: { backgroundColor: '#111827' } });
  });
  it('gradiente: backgroundImage 135° com reservas', () => {
    expect(getBackgroundLayer({ background: { type: 'gradient', colors: ['#111111', '#222222'] } })).toEqual({
      style: { backgroundImage: 'linear-gradient(135deg, #111111, #222222)' },
    });
    expect(getBackgroundLayer({ background: { type: 'gradient' } })).toEqual({
      style: { backgroundImage: 'linear-gradient(135deg, #111827, #1f2937)' },
    });
  });
  it('animação só vale para gradiente com animated === true', () => {
    expect(getBackgroundLayer({ background: { type: 'gradient', colors: ['#111111', '#222222'], animated: true } })).toEqual({
      style: { backgroundImage: 'linear-gradient(135deg, #111111, #222222)', backgroundSize: '200% 200%' },
      className: 'linkhub-gradient-animated',
    });
    expect(getBackgroundLayer({ background: { type: 'solid', color: '#111111', animated: true } }).className).toBeUndefined();
    expect(getBackgroundLayer({ background: { type: 'gradient', colors: ['#111111', '#222222'], animated: false } }).className).toBeUndefined();
  });
});

describe('getBaseBackgroundColor', () => {
  it('sólido usa color, depois colors[0], depois #111827', () => {
    expect(getBaseBackgroundColor({ background: { type: 'solid', color: '#F8FAFC' } })).toBe('#F8FAFC');
    expect(getBaseBackgroundColor({ background: { type: 'pattern', colors: ['#FFF7ED'] } })).toBe('#FFF7ED');
    expect(getBaseBackgroundColor({ background: { type: 'solid' } })).toBe('#111827');
  });
  it('gradiente usa colors[0]', () => {
    expect(getBaseBackgroundColor({ background: { type: 'gradient', color: '#000000', colors: ['#E9D5FF', '#FBCFE8'] } })).toBe('#E9D5FF');
    expect(getBaseBackgroundColor({ background: { type: 'gradient' } })).toBe('#111827');
  });
  it('sem config usa #111827', () => {
    expect(getBaseBackgroundColor(null)).toBe('#111827');
  });
});

describe('getAvatarShapeStyle', () => {
  it('círculo é o padrão', () => {
    expect(getAvatarShapeStyle(undefined)).toEqual({ borderRadius: '9999px' });
    expect(getAvatarShapeStyle('circle')).toEqual({ borderRadius: '9999px' });
  });
  it('arredondado usa 28%', () => {
    expect(getAvatarShapeStyle('rounded')).toEqual({ borderRadius: '28%' });
  });
  it('hexágono recorta e tira a borda', () => {
    expect(getAvatarShapeStyle('hexagon')).toEqual({
      clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)',
      borderRadius: 0,
      borderWidth: 0,
    });
  });
});

describe('fontes', () => {
  it('FONT_FAMILY_CSS tem as 8 famílias do editor', () => {
    expect(FONT_FAMILY_CSS).toEqual({
      inter: 'Inter, system-ui, sans-serif',
      playfair: 'Playfair Display, serif',
      poppins: 'Poppins, sans-serif',
      'roboto-mono': 'Roboto Mono, monospace',
      'dancing-script': 'Dancing Script, cursive',
      montserrat: 'Montserrat, sans-serif',
      lora: 'Lora, serif',
      'source-code-pro': 'Source Code Pro, monospace',
    });
  });
  it('getFontWeight mapeia os pesos e devolve undefined sem peso', () => {
    expect(getFontWeight('light')).toBe(300);
    expect(getFontWeight('normal')).toBe(400);
    expect(getFontWeight('medium')).toBe(500);
    expect(getFontWeight('bold')).toBe(700);
    expect(getFontWeight(undefined)).toBeUndefined();
  });
  it('getTextSizeClasses: md é o padrão e reproduz a página pública atual', () => {
    expect(getTextSizeClasses('sm')).toEqual({ bio: 'text-sm', button: 'text-base' });
    expect(getTextSizeClasses('md')).toEqual({ bio: 'text-base', button: 'text-lg' });
    expect(getTextSizeClasses('lg')).toEqual({ bio: 'text-lg', button: 'text-xl' });
    expect(getTextSizeClasses(undefined)).toEqual({ bio: 'text-base', button: 'text-lg' });
  });
});
