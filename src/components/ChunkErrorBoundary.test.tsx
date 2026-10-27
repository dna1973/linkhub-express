// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ChunkErrorBoundary } from './ChunkErrorBoundary';

function Quebrado(): JSX.Element {
  throw new Error('chunk sumiu');
}

describe('ChunkErrorBoundary', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('mostra mensagem e botão Recarregar quando o filho lança erro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ChunkErrorBoundary>
        <Quebrado />
      </ChunkErrorBoundary>,
    );
    expect(screen.getByText('Não foi possível carregar esta página.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recarregar' })).toBeTruthy();
  });

  it('renderiza os filhos quando não há erro', () => {
    render(
      <ChunkErrorBoundary>
        <p>ok</p>
      </ChunkErrorBoundary>,
    );
    expect(screen.getByText('ok')).toBeTruthy();
  });
});
