import { useEffect, useState } from 'react';

function hasMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/** true enquanto a media query casar. Sem matchMedia (jsdom), devolve false. */
export function useMediaQuery(query: string): boolean {
  // Valor inicial síncrono: o primeiro render já sabe o tamanho da tela
  const [matches, setMatches] = useState<boolean>(() => (hasMatchMedia() ? window.matchMedia(query).matches : false));

  useEffect(() => {
    if (!hasMatchMedia()) {
      setMatches(false);
      return;
    }
    const mql = window.matchMedia(query);
    const onChange = (event: { matches: boolean }) => setMatches(event.matches);
    // A query pode ter mudado entre o render e o efeito
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
