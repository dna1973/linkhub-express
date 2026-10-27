// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutosave } from './useAutosave';

type Props = { data: { bio: string }; enabled: boolean; resetKey?: string; onSave?: (d: { bio: string }) => Promise<void> };

function setup(initial: Props) {
  const onSave = vi.fn(async (_d: { bio: string }) => {});
  const hook = renderHook(
    (p: Props) => useAutosave(p.data, p.onSave ?? onSave, 1500, p.enabled, p.resetKey),
    { initialProps: initial },
  );
  return { onSave, ...hook };
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('não salva os dados iniciais', async () => {
    const { onSave } = setup({ data: { bio: 'a' }, enabled: true });
    await advance(5000);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('salva depois do atraso quando os dados mudam', async () => {
    const { onSave, rerender } = setup({ data: { bio: 'a' }, enabled: true });
    rerender({ data: { bio: 'b' }, enabled: true });
    await advance(1499);
    expect(onSave).not.toHaveBeenCalled();
    await advance(1);
    expect(onSave).toHaveBeenCalledWith({ bio: 'b' });
  });

  it('salva a alteração feita enquanto estava pausado, quando volta a ser liberado', async () => {
    // Caso do perfil: a validação do username pausa o autosave ao abrir a página
    const { onSave, rerender } = setup({ data: { bio: 'a' }, enabled: false });
    rerender({ data: { bio: 'editado' }, enabled: false });
    await advance(5000);
    expect(onSave).not.toHaveBeenCalled();

    rerender({ data: { bio: 'editado' }, enabled: true });
    await advance(1500);
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ bio: 'editado' });
  });

  it('salva quando a pausa acontece no meio da digitação', async () => {
    const { onSave, rerender } = setup({ data: { bio: 'a' }, enabled: true });
    rerender({ data: { bio: 'ab' }, enabled: true });
    rerender({ data: { bio: 'ab' }, enabled: false });
    await advance(3000);
    expect(onSave).not.toHaveBeenCalled();
    rerender({ data: { bio: 'ab' }, enabled: true });
    await advance(1500);
    expect(onSave).toHaveBeenCalledWith({ bio: 'ab' });
  });

  it('não reinicia a espera quando só a função de salvar muda', async () => {
    const { onSave, rerender } = setup({ data: { bio: 'a' }, enabled: true });
    const data = { bio: 'b' }; // mesmo objeto, como o formData entre renders sem digitação
    rerender({ data, enabled: true });
    await advance(1000);
    rerender({ data, enabled: true, onSave }); // mesma função
    rerender({ data, enabled: true, onSave: (d) => onSave(d) }); // função nova, como no Dashboard
    await advance(500);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('ao trocar o resetKey, os dados novos viram a base e não são salvos', async () => {
    // Caso do link: abrir outro link no diálogo carrega os valores dele
    const { onSave, rerender } = setup({ data: { bio: '' }, enabled: false, resetKey: undefined });
    rerender({ data: { bio: 'link 1' }, enabled: true, resetKey: 'id-1' });
    await advance(5000);
    expect(onSave).not.toHaveBeenCalled();

    rerender({ data: { bio: 'link 1 editado' }, enabled: true, resetKey: 'id-1' });
    await advance(1500);
    expect(onSave).toHaveBeenCalledWith({ bio: 'link 1 editado' });
  });

  it('não salva de novo o que já foi salvo', async () => {
    const { onSave, rerender } = setup({ data: { bio: 'a' }, enabled: true });
    rerender({ data: { bio: 'b' }, enabled: true });
    await advance(1500);
    rerender({ data: { bio: 'b' }, enabled: false });
    rerender({ data: { bio: 'b' }, enabled: true });
    await advance(5000);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
