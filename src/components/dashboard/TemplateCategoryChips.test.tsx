// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TemplateCategoryChips } from './TemplateCategoryChips';

afterEach(() => cleanup());

describe('TemplateCategoryChips', () => {
  it('marca o filtro atual e avisa a troca', () => {
    const onChange = vi.fn();
    render(<TemplateCategoryChips value="todos" onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Todos' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Neon' }).getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Neo-brutalista' }));
    expect(onChange).toHaveBeenCalledWith('brutalista');
  });
});
