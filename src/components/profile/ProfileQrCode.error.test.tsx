// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProfileQrCode } from './ProfileQrCode';

// Arquivo próprio: aqui o pacote é simulado. Falha só para a URL do perfil dna; as outras desenham.
vi.mock('qrcode.react', async () => {
  const { createElement } = await import('react');
  return {
    QRCodeSVG: ({ value }: { value: string }) => {
      if (value.endsWith('/dna')) throw new Error('falha simulada');
      return createElement('svg', { 'data-testid': 'qr-svg' });
    },
  };
});

const URL_FALHA = 'https://linkhub.avila.ia.br/dna';
const URL_OK = 'https://linkhub.avila.ia.br/outro';

// O React registra no console o erro que o limite capturou; o teste confere o log do próprio componente
let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

describe('ProfileQrCode com falha ao desenhar', () => {
  it('não desenha nada (nem cartão, nem legenda), registra o erro e o resto da página continua', () => {
    render(
      <div>
        <ProfileQrCode url={URL_FALHA} color="#000000" captionColor="#000000" />
        <p>resto do perfil</p>
      </div>,
    );
    expect(screen.getByText('resto do perfil')).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText('Aponte a câmera para abrir este perfil')).toBeNull();
    expect(consoleError).toHaveBeenCalledWith('QR code do perfil:', expect.objectContaining({ message: 'falha simulada' }));
  });

  it('depois de uma falha, uma URL nova (username trocado) volta a desenhar', () => {
    const { rerender } = render(<ProfileQrCode url={URL_FALHA} color="#000000" captionColor="#000000" />);
    expect(screen.queryByRole('img')).toBeNull();

    rerender(<ProfileQrCode url={URL_OK} color="#000000" captionColor="#000000" />);
    expect(screen.getByRole('img', { name: `QR code para abrir ${URL_OK}` })).toBeTruthy();
    expect(screen.getByText('Aponte a câmera para abrir este perfil')).toBeTruthy();
  });
});
