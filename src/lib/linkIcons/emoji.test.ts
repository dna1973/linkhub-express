import { describe, expect, it } from 'vitest';
import { isSingleEmoji } from './emoji';

// Roda fn sem Intl.Segmenter (como no Firefox ESR 115) e o devolve no fim.
function withoutSegmenter<T>(fn: () => T): T {
  const intl = Intl as any;
  const original = intl.Segmenter;
  delete intl.Segmenter;
  try {
    return fn();
  } finally {
    intl.Segmenter = original;
  }
}

const accepted: Array<[string, string]> = [
  ['simples', '😀'],
  ['com seletor de variação', '❤️'],
  ['tom de pele', '👍🏽'],
  ['família (ZWJ)', '👨‍👩‍👧‍👦'],
  ['beijo (ZWJ com seletor)', '👩‍❤️‍💋‍👨'],
  ['aperto de mãos com tons', '🧑🏽‍🤝‍🧑🏿'],
  ['bandeira', '🇧🇷'],
  ['bandeira por tags', '🏴󠁧󠁢󠁥󠁮󠁧󠁿'],
];

const rejected: Array<[string, string]> = [
  ['dois emojis', '😀😀'],
  ['duas bandeiras', '🇧🇷🇺🇸'],
  ['texto', 'abc'],
  ['emoji com texto', '😀a'],
  ['vazio', ''],
  ['espaço na frente', ' 😀'],
  ['espaço atrás', '😀 '],
  ['keycap (limitação aceita)', '1️⃣'],
  ['mais de 32 caracteres', '😀'.repeat(17)],
];

describe('isSingleEmoji com Intl.Segmenter', () => {
  it('o ambiente de teste tem Intl.Segmenter', () => {
    expect(typeof (Intl as any).Segmenter).toBe('function');
  });

  it.each(accepted)('aceita: %s', (_name, text) => {
    expect(isSingleEmoji(text)).toBe(true);
  });

  it.each(rejected)('recusa: %s', (_name, text) => {
    expect(isSingleEmoji(text)).toBe(false);
  });

  it('recusa valor que não é texto', () => {
    expect(isSingleEmoji(null as unknown as string)).toBe(false);
    expect(isSingleEmoji(undefined as unknown as string)).toBe(false);
  });
});

describe('isSingleEmoji sem Intl.Segmenter', () => {
  it.each(accepted)('aceita: %s', (_name, text) => {
    expect(withoutSegmenter(() => isSingleEmoji(text))).toBe(true);
  });

  it.each(rejected)('recusa: %s', (_name, text) => {
    expect(withoutSegmenter(() => isSingleEmoji(text))).toBe(false);
  });

  it('um indicador regional sozinho é recusado (bandeira exige 2)', () => {
    expect(withoutSegmenter(() => isSingleEmoji('🇧'))).toBe(false);
  });

  it('a família com ZWJ no fim ou repetido é recusada', () => {
    expect(withoutSegmenter(() => isSingleEmoji('👨‍'))).toBe(false);
    expect(withoutSegmenter(() => isSingleEmoji('👨‍‍👩'))).toBe(false);
  });
});

describe('Intl.Segmenter lido na hora da chamada', () => {
  it('usa o Segmenter presente no momento da chamada, não o da carga do módulo', () => {
    const intl = Intl as any;
    const original = intl.Segmenter;
    // Segmenter falso que junta tudo num só grafema: "😀😀" passa só se ele for lido agora
    intl.Segmenter = class {
      segment(text: string) {
        return [{ segment: text }];
      }
    };
    try {
      expect(isSingleEmoji('😀😀')).toBe(true);
    } finally {
      intl.Segmenter = original;
    }
    expect(isSingleEmoji('😀😀')).toBe(false);
  });
});
