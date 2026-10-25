import { describe, expect, it } from 'vitest';
import { formatClicks } from './formatClicks';

describe('formatClicks', () => {
  it('singular só para 1', () => {
    expect(formatClicks(1)).toBe('1 clique');
  });

  it('plural para 0 e para os demais', () => {
    expect(formatClicks(0)).toBe('0 cliques');
    expect(formatClicks(2)).toBe('2 cliques');
  });

  it('separador de milhar do pt-BR', () => {
    expect(formatClicks(1234)).toBe('1.234 cliques');
  });
});
