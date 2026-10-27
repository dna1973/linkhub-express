import { readFileSync } from 'node:fs';
import path from 'node:path';
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
  // Limitação aceita: são Extended_Pictographic, então passam
  ['copyright (limitação aceita)', '©'],
  ['marca registrada (limitação aceita)', '®'],
  ['trademark (limitação aceita)', '™'],
  ['dupla exclamação (limitação aceita)', '‼'],
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

  it('o limite de 32 caracteres recusa uma sequência ZWJ que é um grafema só', () => {
    const longSequence = Array(12).fill('👨').join('\u{200D}');
    expect(longSequence.length).toBeGreaterThan(32);
    expect(Array.from(new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' }).segment(longSequence))).toHaveLength(1);
    expect(isSingleEmoji(longSequence)).toBe(false);
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

  it('o limite de 32 caracteres recusa 7 partes válidas unidas por ZWJ', () => {
    const sevenParts = Array(7).fill('🧑🏽').join('\u{200D}');
    expect(sevenParts.length).toBeGreaterThan(32);
    expect(sevenParts.split('\u{200D}')).toHaveLength(7);
    expect(withoutSegmenter(() => isSingleEmoji(sevenParts))).toBe(false);
  });

  it('um indicador regional sozinho é recusado (bandeira exige 2)', () => {
    expect(withoutSegmenter(() => isSingleEmoji('🇧'))).toBe(false);
  });

  it('a família com ZWJ no fim ou repetido é recusada', () => {
    expect(withoutSegmenter(() => isSingleEmoji('👨‍'))).toBe(false);
    expect(withoutSegmenter(() => isSingleEmoji('👨‍‍👩'))).toBe(false);
  });
});

describe('código-fonte do emoji.ts', () => {
  it('escreve ZWJ e seletores de variação como escapes, sem caracteres invisíveis literais', () => {
    const source = readFileSync(path.join(__dirname, 'emoji.ts'), 'utf8');
    expect(source).not.toMatch(/[\u{200B}-\u{200F}\u{FE0E}\u{FE0F}\u{20E3}]/u);
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
