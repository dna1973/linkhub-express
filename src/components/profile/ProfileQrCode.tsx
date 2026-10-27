import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface ProfileQrCodeProps {
  /** Endereço público que o QR code abre. */
  url: string;
  /** Cor dos módulos, já com contraste sobre o branco (getQrModuleColor). */
  color: string;
  /** Cor da legenda: a do texto do tema. */
  captionColor: string;
}

/** Se o QR code falhar, o rodapé segue sem ele: o perfil nunca cai por causa do QR code. */
class QrCodeErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('QR code do perfil:', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Cartão branco com o QR code do perfil e a legenda, no rodapé do ProfileView. */
export const ProfileQrCode: React.FC<ProfileQrCodeProps> = ({ url, color, captionColor }) => (
  // key: URL nova (username trocado) tenta desenhar de novo depois de uma falha
  <QrCodeErrorBoundary key={url}>
    <div className="mb-4 flex flex-col items-center">
      <div role="img" aria-label={`QR code para abrir ${url}`} className="inline-block rounded-xl bg-white p-2 shadow-md">
        {/* marginSize 2 + o p-2 do cartão formam a zona de silêncio que os leitores precisam */}
        <QRCodeSVG value={url} size={120} level="M" fgColor={color} bgColor="#ffffff" marginSize={2} aria-hidden="true" />
      </div>
      {/* opacity-80, como o @username: com 60% a legenda ficava abaixo de 4,5:1 em vários temas claros */}
      <p className="mt-2 text-xs opacity-80" style={{ color: captionColor }}>
        Aponte a câmera para abrir este perfil
      </p>
    </div>
  </QrCodeErrorBoundary>
);
