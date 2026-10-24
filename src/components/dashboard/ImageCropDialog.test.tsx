// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { canvasToBlob, getCroppedCanvas, scaleCanvas } from '@/utils/cropImage';
import { loadSegmenter, removeBackground } from '@/utils/backgroundRemoval';
import { ImageCropDialog } from './ImageCropDialog';

const toast = vi.hoisted(() => vi.fn());
const CROP_AREA = { x: 10, y: 20, width: 400, height: 400 };

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));

// O Cropper real só chama onCropComplete depois de carregar a imagem, o que não acontece no jsdom
vi.mock('react-easy-crop', async () => {
  const { useEffect } = await import('react');
  return {
    default: function FakeCropper({ onCropComplete }: { onCropComplete: (area: unknown, pixels: unknown) => void }) {
      useEffect(() => {
        onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 10, y: 20, width: 400, height: 400 });
      }, [onCropComplete]);
      return <div data-testid="cropper" />;
    },
  };
});

vi.mock('@/utils/cropImage', () => ({
  getCroppedCanvas: vi.fn(),
  scaleCanvas: vi.fn(),
  canvasToBlob: vi.fn(),
}));

vi.mock('@/utils/backgroundRemoval', () => ({
  AVATAR_MAX_SIZE: 512,
  loadSegmenter: vi.fn(),
  removeBackground: vi.fn(),
}));

const croppedCanvas = { id: 'recorte' } as unknown as HTMLCanvasElement;
const scaledCanvas = { id: 'reduzido' } as unknown as HTMLCanvasElement;
const resultCanvas = { id: 'sem-fundo' } as unknown as HTMLCanvasElement;

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let urlCount = 0;
let consoleError: { mockRestore: () => void };

beforeEach(() => {
  urlCount = 0;
  toast.mockReset();
  // As falhas simuladas são registradas com console.error de propósito
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  // Os componentes do Radix (Switch, Slider) usam ResizeObserver, que o jsdom não tem
  vi.stubGlobal('ResizeObserver', NoopResizeObserver);
  // O jsdom não tem createObjectURL/revokeObjectURL
  URL.createObjectURL = vi.fn(() => `blob:previa-${++urlCount}`);
  URL.revokeObjectURL = vi.fn();
  vi.mocked(getCroppedCanvas).mockReset().mockResolvedValue(croppedCanvas);
  vi.mocked(scaleCanvas).mockReset().mockReturnValue(scaledCanvas);
  vi.mocked(canvasToBlob).mockReset().mockImplementation(async (_canvas, type) => new Blob(['x'], { type }));
  vi.mocked(loadSegmenter).mockReset().mockResolvedValue({} as never);
  vi.mocked(removeBackground).mockReset().mockResolvedValue(resultCanvas);
});

afterEach(() => {
  cleanup();
  consoleError.mockRestore();
  vi.unstubAllGlobals();
  delete (URL as { createObjectURL?: unknown }).createObjectURL;
  delete (URL as { revokeObjectURL?: unknown }).revokeObjectURL;
});

function renderDialog(props: Partial<React.ComponentProps<typeof ImageCropDialog>> = {}) {
  const onCropComplete = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <ImageCropDialog open imageSrc="blob:original" onClose={onClose} onCropComplete={onCropComplete} {...props} />,
  );
  return { ...view, onCropComplete, onClose };
}

const removeSwitch = () => screen.getByRole('switch', { name: 'Remover fundo' });

describe('ImageCropDialog', () => {
  it('Aplicar sem remoção entrega JPEG 0,9 do recorte, sem carregar o MediaPipe', async () => {
    const { onCropComplete } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() => expect(onCropComplete).toHaveBeenCalledTimes(1));
    expect(onCropComplete.mock.calls[0][0].type).toBe('image/jpeg');
    expect(getCroppedCanvas).toHaveBeenCalledWith('blob:original', CROP_AREA, 0);
    expect(canvasToBlob).toHaveBeenCalledWith(croppedCanvas, 'image/jpeg', 0.9);
    expect(scaleCanvas).not.toHaveBeenCalled();
    expect(loadSegmenter).not.toHaveBeenCalled();
    expect(removeBackground).not.toHaveBeenCalled();
  });

  it('o interruptor mostra o carregamento e depois os controles e a miniatura', async () => {
    let finishLoading: () => void = () => {};
    vi.mocked(loadSegmenter).mockReturnValue(new Promise((resolve) => (finishLoading = () => resolve({} as never))));
    renderDialog();

    fireEvent.click(removeSwitch());
    expect(screen.getByRole('status').textContent).toContain('Preparando remoção de fundo… (só na primeira vez, cerca de 30 MB)');
    expect(removeSwitch().hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Aplicar' }).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Transparente' })).toBeNull();

    await act(async () => finishLoading());

    expect(screen.queryByRole('status')).toBeNull();
    expect(removeSwitch().getAttribute('aria-checked')).toBe('true');
    expect(removeSwitch().hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Transparente' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Cor' }).getAttribute('aria-pressed')).toBe('false');

    const preview = await screen.findByRole('img', { name: 'Prévia sem fundo' });
    expect(preview.getAttribute('src')).toBe('blob:previa-1');
    expect(scaleCanvas).toHaveBeenCalledWith(croppedCanvas, 256);
    expect(removeBackground).toHaveBeenCalledWith(scaledCanvas, null);
    expect(canvasToBlob).toHaveBeenCalledWith(resultCanvas, 'image/png');
  });

  it('na falha do carregamento aparece o toast, o interruptor desliga e o recorte normal continua', async () => {
    vi.mocked(loadSegmenter).mockRejectedValue(new Error('sem WebGL'));
    const { onCropComplete } = renderDialog();

    fireEvent.click(removeSwitch());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Não foi possível remover o fundo neste navegador.', variant: 'destructive' }),
      ),
    );
    expect(removeSwitch().getAttribute('aria-checked')).toBe('false');
    expect(removeSwitch().hasAttribute('disabled')).toBe(false);
    expect(screen.queryByRole('button', { name: 'Transparente' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    await waitFor(() => expect(onCropComplete).toHaveBeenCalledTimes(1));
    expect(onCropComplete.mock.calls[0][0].type).toBe('image/jpeg');
  });

  it('na falha da miniatura aparece o toast e o interruptor desliga', async () => {
    vi.mocked(removeBackground).mockRejectedValue(new Error('erro do modelo'));
    renderDialog();

    fireEvent.click(removeSwitch());

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Não foi possível remover o fundo neste navegador.' })),
    );
    expect(removeSwitch().getAttribute('aria-checked')).toBe('false');
  });

  it('Aplicar com remoção reduz para 512 px e entrega PNG', async () => {
    const { onCropComplete } = renderDialog();
    fireEvent.click(removeSwitch());
    await screen.findByRole('button', { name: 'Transparente' });

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() => expect(onCropComplete).toHaveBeenCalledTimes(1));
    expect(onCropComplete.mock.calls[0][0].type).toBe('image/png');
    expect(scaleCanvas).toHaveBeenCalledWith(croppedCanvas, 512);
    expect(removeBackground).toHaveBeenCalledWith(scaledCanvas, null);
    expect(canvasToBlob).toHaveBeenCalledWith(resultCanvas, 'image/png');
    expect(canvasToBlob).not.toHaveBeenCalledWith(expect.anything(), 'image/jpeg', 0.9);
  });

  it('se Aplicar falhar com o fundo removido, mostra o toast e não fecha', async () => {
    const { onCropComplete } = renderDialog();
    fireEvent.click(removeSwitch());
    await screen.findByRole('button', { name: 'Transparente' });
    vi.mocked(removeBackground).mockRejectedValue(new Error('erro do modelo'));

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ description: 'Não foi possível remover o fundo neste navegador.' })),
    );
    expect(onCropComplete).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Aplicar' }).hasAttribute('disabled')).toBe(false));
  });

  it('initialRemoveBackground já abre ligado', async () => {
    renderDialog({ initialRemoveBackground: true });

    expect(loadSegmenter).toHaveBeenCalledTimes(1);
    expect(removeSwitch().getAttribute('aria-checked')).toBe('true');
    await screen.findByRole('button', { name: 'Transparente' });
  });

  it('Cor: atalhos normalizados, sem o inválido, e a cor escolhida vai para a remoção', async () => {
    const { unmount } = renderDialog({ themeColors: { background: '#1E3A8A', button: 'vermelho' } });
    fireEvent.click(removeSwitch());
    await screen.findByRole('img', { name: 'Prévia sem fundo' });

    fireEvent.click(screen.getByRole('button', { name: 'Cor' }));
    const shortcuts = screen.getAllByRole('button', { name: /\(#/ });
    expect(shortcuts.map((b) => b.getAttribute('aria-label'))).toEqual(['Fundo do tema (#1e3a8a)', 'Branco (#ffffff)']);
    const colorInput = screen.getByLabelText('Cor atrás da pessoa') as HTMLInputElement;
    expect(colorInput.value).toBe('#1e3a8a');

    fireEvent.click(screen.getByRole('button', { name: 'Branco (#ffffff)' }));
    expect(colorInput.value).toBe('#ffffff');

    await waitFor(() => expect(removeBackground).toHaveBeenLastCalledWith(scaledCanvas, '#ffffff'));
    await waitFor(() => expect(screen.getByRole('img', { name: 'Prévia sem fundo' }).getAttribute('src')).not.toBe('blob:previa-1'));
    // A miniatura anterior é revogada a cada troca, e a última ao fechar
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa-1');
    const last = screen.getByRole('img', { name: 'Prévia sem fundo' }).getAttribute('src');
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(last);
  });

  it('sem themeColors, o único atalho é o branco', async () => {
    renderDialog();
    fireEvent.click(removeSwitch());
    fireEvent.click(await screen.findByRole('button', { name: 'Cor' }));

    expect(screen.getAllByRole('button', { name: /\(#/ }).map((b) => b.getAttribute('aria-label'))).toEqual(['Branco (#ffffff)']);
  });
});
