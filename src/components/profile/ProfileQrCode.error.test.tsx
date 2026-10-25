// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProfileQrCode } from './ProfileQrCode';

// Arquivo próprio: aqui o pacote inteiro é simulado para lançar erro ao desenhar
vi.mock('qrcode.react', () => ({
  QRCodeSVG: () => {
    throw new Error('falha simulada');
  },
}));

afterEach(() => cleanup());

describe('ProfileQrCode com falha ao desenhar', () => {
  it('não desenha nada (nem cartão, nem legenda) e o resto da página continua', () => {
    // O React registra no console o erro que o limite capturou
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        <div>
          <ProfileQrCode url="https://linkhub.avila.ia.br/dna" color="#000000" captionColor="#000000" />
          <p>resto do perfil</p>
        </div>,
      );
      expect(screen.getByText('resto do perfil')).toBeTruthy();
      expect(screen.queryByRole('img')).toBeNull();
      expect(screen.queryByText('Aponte a câmera para abrir este perfil')).toBeNull();
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
