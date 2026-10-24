const KEY = 'linkhub:chunk-reload';

function lerFlag(): boolean {
  try {
    return !!sessionStorage.getItem(KEY);
  } catch {
    return false;
  }
}

function gravarFlag(): boolean {
  try {
    sessionStorage.setItem(KEY, '1');
    return true;
  } catch {
    return false;
  }
}

function limparFlag(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* sessionStorage indisponível (modo privado) */
  }
}

/**
 * Depois de um deploy, os chunks com hash antigo somem. Se o import() de uma página
 * falhar, recarrega uma vez para pegar o index.html novo. Na segunda falha, deixa o
 * ErrorBoundary mostrar a tela de erro.
 */
export function reloadOnChunkError(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (lerFlag()) return;
    // Sem sessionStorage não dá para evitar laço de recarga: não recarrega
    if (!gravarFlag()) return;
    event.preventDefault();
    window.location.reload();
  });
  // App carregou: libera nova recarga em um deploy futuro
  setTimeout(limparFlag, 5000);
}
