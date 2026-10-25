const numberFormat = new Intl.NumberFormat('pt-BR');

/** "1 clique", "0 cliques", "1.234 cliques". */
export function formatClicks(count: number): string {
  return `${numberFormat.format(count)} ${count === 1 ? 'clique' : 'cliques'}`;
}
