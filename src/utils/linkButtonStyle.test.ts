import { describe, expect, it } from 'vitest';
import {
  normalizeHex,
  getContrastText,
  resolveButtonColors,
  getButtonRadius,
  getLinkButtonStyle,
  getLinkButtonClassName,
  getBackgroundStyle,
} from './linkButtonStyle';

describe('normalizeHex', () => {
  it('expande #rgb e põe em minúsculas', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('#F5A876')).toBe('#f5a876');
  });
  it('devolve null para valor inválido ou vazio', () => {
    expect(normalizeHex('rgba(255,255,255,0.2)')).toBeNull();
    expect(normalizeHex('azul')).toBeNull();
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex(undefined)).toBeNull();
  });
});

describe('getContrastText', () => {
  it('escolhe preto em cores claras e branco em escuras', () => {
    expect(getContrastText('#ffffff')).toBe('#000000');
    expect(getContrastText('#000000')).toBe('#ffffff');
    expect(getContrastText('#F5A876')).toBe('#000000');
    expect(getContrastText('#FB7185')).toBe('#000000');
    expect(getContrastText('#3D2B1F')).toBe('#ffffff');
    expect(getContrastText('#ABC')).toBe('#000000');
  });
  it('usa branco para entrada inválida', () => {
    expect(getContrastText('nada')).toBe('#ffffff');
  });
});

describe('resolveButtonColors', () => {
  it('usa buttonStyle.color, depois colors.primary, depois #ffffff', () => {
    expect(resolveButtonColors({ buttonStyle: { type: 'solid', color: '#112233' }, colors: { primary: '#445566' } }).bg).toBe('#112233');
    expect(resolveButtonColors({ buttonStyle: { type: 'solid' }, colors: { primary: '#445566' } }).bg).toBe('#445566');
    expect(resolveButtonColors({ buttonStyle: { type: 'solid' } }).bg).toBe('#ffffff');
  });
  it('texto automático: sólido por contraste, contorno = cor do botão, demais = colors.text', () => {
    const colors = { text: '#E2E8F0' };
    expect(resolveButtonColors({ buttonStyle: { type: 'solid', color: '#ffffff' }, colors }).text).toBe('#000000');
    expect(resolveButtonColors({ buttonStyle: { type: 'outline', color: '#00FF88' }, colors }).text).toBe('#00ff88');
    for (const type of ['glass', 'modern', 'rounded'] as const) {
      expect(resolveButtonColors({ buttonStyle: { type, color: '#3B82F6' }, colors }).text).toBe('#e2e8f0');
    }
  });
  it('textColor "auto" equivale a ausente', () => {
    expect(resolveButtonColors({ buttonStyle: { type: 'solid', color: '#000000', textColor: 'auto' } }).text).toBe('#ffffff');
  });
  it('textColor manual vale para todos os estilos', () => {
    for (const type of ['solid', 'outline', 'glass', 'modern', 'rounded'] as const) {
      expect(resolveButtonColors({ buttonStyle: { type, color: '#F5A876', textColor: '#3D2B1F' } }).text).toBe('#3d2b1f');
    }
  });
  it('sem colors.text, estilos translúcidos usam #ffffff', () => {
    expect(resolveButtonColors({ buttonStyle: { type: 'glass' } }).text).toBe('#ffffff');
  });
  it('sem buttonStyle, trata como glass', () => {
    expect(resolveButtonColors({ colors: { text: '#123456' } })).toEqual({ bg: '#ffffff', text: '#123456' });
  });
});

describe('getButtonRadius', () => {
  it('mapeia os tamanhos e usa 8px como padrão', () => {
    expect(getButtonRadius('none')).toBe('0px');
    expect(getButtonRadius('sm')).toBe('4px');
    expect(getButtonRadius('md')).toBe('8px');
    expect(getButtonRadius('lg')).toBe('16px');
    expect(getButtonRadius('full')).toBe('9999px');
    expect(getButtonRadius(undefined)).toBe('8px');
  });
  it('aplica radiusScale, exceto em full', () => {
    expect(getButtonRadius('lg', 0.4)).toBe('6.4px');
    expect(getButtonRadius('full', 0.4)).toBe('9999px');
  });
});

describe('getLinkButtonStyle', () => {
  it('sólido: fundo da cor, sem borda, texto por contraste', () => {
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', color: '#F5A876', borderRadius: 'lg' } })).toEqual({
      background: '#f5a876',
      borderWidth: '0px',
      borderStyle: 'solid',
      borderColor: '#f5a876',
      color: '#000000',
      borderRadius: '16px',
    });
  });
  it('contorno: transparente com borda de 2px', () => {
    const style = getLinkButtonStyle({ buttonStyle: { type: 'outline', color: '#1A1A1A' } });
    expect(style.background).toBe('transparent');
    expect(style.borderWidth).toBe('2px');
    expect(style.borderColor).toBe('#1a1a1a');
    expect(style.color).toBe('#1a1a1a');
  });
  it('modern com #rgb gera sufixos de opacidade válidos', () => {
    const style = getLinkButtonStyle({ buttonStyle: { type: 'modern', color: '#ABC' } });
    expect(style.background).toBe('linear-gradient(135deg, #aabbcc20, #aabbcc40)');
    expect(style.borderColor).toBe('#aabbcc50');
    expect(style.borderWidth).toBe('1px');
  });
  it('glass: branco translúcido com borda de 1px', () => {
    const style = getLinkButtonStyle({ buttonStyle: { type: 'glass' }, colors: { text: '#ffffff' } });
    expect(style.background).toBe('rgba(255,255,255,0.1)');
    expect(style.borderColor).toBe('rgba(255,255,255,0.2)');
    expect(style.borderWidth).toBe('1px');
  });
  it('repassa radiusScale', () => {
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', borderRadius: 'lg' } }, { radiusScale: 0.4 }).borderRadius).toBe('6.4px');
  });
});

describe('getLinkButtonClassName', () => {
  it('não traz classes de borda nem de fundo', () => {
    for (const type of ['solid', 'outline', 'glass', 'modern', 'rounded', undefined]) {
      expect(getLinkButtonClassName(type)).not.toMatch(/(^|\s)(border|bg-)/);
    }
  });
});

describe('getBackgroundStyle', () => {
  it('gradiente 135° com reservas', () => {
    expect(getBackgroundStyle({ background: { type: 'gradient', colors: ['#111111', '#222222'] } })).toBe('linear-gradient(135deg, #111111, #222222)');
    expect(getBackgroundStyle({ background: { type: 'gradient' } })).toBe('linear-gradient(135deg, #111827, #1f2937)');
  });
  it('sólido usa color, depois colors[0], depois #111827', () => {
    expect(getBackgroundStyle({ background: { type: 'solid', color: '#abcdef' } })).toBe('#abcdef');
    expect(getBackgroundStyle({ background: { type: 'solid', colors: ['#FFFFFF'] } })).toBe('#FFFFFF');
    expect(getBackgroundStyle({ background: { type: 'solid' } })).toBe('#111827');
  });
  it('sem config usa #111827', () => {
    expect(getBackgroundStyle(null)).toBe('#111827');
  });
});

describe('getLinkButtonStyle, sombra', () => {
  it('sem shadow ou com none não gera boxShadow', () => {
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', color: '#ffffff' } }).boxShadow).toBeUndefined();
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', color: '#ffffff', shadow: 'none' } }).boxShadow).toBeUndefined();
  });
  it('soft: sombra difusa fixa e borda do estilo mantida', () => {
    const style = getLinkButtonStyle({ buttonStyle: { type: 'outline', color: '#1E293B', shadow: 'soft' } });
    expect(style.boxShadow).toBe('0 4px 14px rgba(0,0,0,0.18)');
    expect(style.borderWidth).toBe('2px');
    expect(style.borderColor).toBe('#1e293b');
  });
  it('hard: borda de 2px e sombra deslocada, preta por padrão, sobrepondo a borda do estilo', () => {
    const style = getLinkButtonStyle({ buttonStyle: { type: 'solid', color: '#FFFFFF', shadow: 'hard' } });
    expect(style.borderWidth).toBe('2px');
    expect(style.borderStyle).toBe('solid');
    expect(style.borderColor).toBe('#000000');
    expect(style.boxShadow).toBe('4px 4px 0 #000000');
    const glass = getLinkButtonStyle({ buttonStyle: { type: 'glass', shadow: 'hard', shadowColor: '#FF0000' } });
    expect(glass.borderColor).toBe('#ff0000');
    expect(glass.boxShadow).toBe('4px 4px 0 #ff0000');
  });
  it('hard com shadowColor inválido usa preto', () => {
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', shadow: 'hard', shadowColor: 'vermelho' } }).boxShadow).toBe('4px 4px 0 #000000');
  });
  it('glow: usa a cor do botão como reserva e shadowColor quando houver', () => {
    expect(getLinkButtonStyle({ buttonStyle: { type: 'outline', color: '#00F0FF', shadow: 'glow' } }).boxShadow).toBe(
      '0 0 18px #00f0ff99, 0 0 4px #00f0ff',
    );
    expect(getLinkButtonStyle({ buttonStyle: { type: 'outline', color: '#00F0FF', shadow: 'glow', shadowColor: '#F0F' } }).boxShadow).toBe(
      '0 0 18px #ff00ff99, 0 0 4px #ff00ff',
    );
  });
  it('glow não mexe na borda do estilo', () => {
    const style = getLinkButtonStyle({ buttonStyle: { type: 'outline', color: '#39FF14', shadow: 'glow' } });
    expect(style.borderWidth).toBe('2px');
    expect(style.borderColor).toBe('#39ff14');
  });
  it('radiusScale escala os deslocamentos de hard e glow', () => {
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', shadow: 'hard' } }, { radiusScale: 0.5 }).boxShadow).toBe('2px 2px 0 #000000');
    expect(getLinkButtonStyle({ buttonStyle: { type: 'solid', color: '#ff2e97', shadow: 'glow' } }, { radiusScale: 0.4 }).boxShadow).toBe(
      '0 0 7.2px #ff2e9799, 0 0 1.6px #ff2e97',
    );
  });
});
