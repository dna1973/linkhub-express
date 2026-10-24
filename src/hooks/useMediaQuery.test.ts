// @vitest-environment jsdom
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

type Listener = (event: { matches: boolean }) => void;

/** matchMedia falso: guarda os listeners e deixa o teste mudar o resultado. */
function createFakeMatchMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<Listener>();
  const matchMedia = (query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addEventListener: (type: string, listener: Listener) => {
      if (type === 'change') listeners.add(listener);
    },
    removeEventListener: (type: string, listener: Listener) => {
      if (type === 'change') listeners.delete(listener);
    },
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
  return {
    matchMedia,
    listeners,
    set(next: boolean) {
      matches = next;
      listeners.forEach((listener) => listener({ matches: next }));
    },
  };
}

// Restaurado depois de cada teste e no fim do arquivo
const originalMatchMedia = window.matchMedia;
afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
});
afterAll(() => {
  window.matchMedia = originalMatchMedia;
});

describe('useMediaQuery', () => {
  it('o valor inicial vem do matchMedia, já no primeiro render', () => {
    const fake = createFakeMatchMedia(true);
    window.matchMedia = fake.matchMedia as any;
    const values: boolean[] = [];
    renderHook(() => {
      const value = useMediaQuery('(min-width: 1024px)');
      values.push(value);
      return value;
    });
    expect(values[0]).toBe(true);
  });

  it('atualiza no evento change', () => {
    const fake = createFakeMatchMedia(false);
    window.matchMedia = fake.matchMedia as any;
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);

    act(() => fake.set(true));
    expect(result.current).toBe(true);

    act(() => fake.set(false));
    expect(result.current).toBe(false);
  });

  it('remove o listener ao desmontar', () => {
    const fake = createFakeMatchMedia(false);
    window.matchMedia = fake.matchMedia as any;
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(fake.listeners.size).toBe(1);
    unmount();
    expect(fake.listeners.size).toBe(0);
  });

  it('sem matchMedia, devolve false sem quebrar', () => {
    (window as any).matchMedia = undefined;
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
  });
});
