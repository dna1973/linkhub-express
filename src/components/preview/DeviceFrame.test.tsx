// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DeviceFrame } from './DeviceFrame';
import { getDevice } from './devices';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DeviceFrame com ResizeObserver simulado', () => {
  it('área de 300×500 no iPhone 16 Pro: reduz por f e desconecta ao desmontar', () => {
    const disconnect = vi.fn();
    class FakeResizeObserver {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        const entry = { target, contentRect: { width: 300, height: 500 } } as unknown as ResizeObserverEntry;
        this.callback([entry], this as unknown as ResizeObserver);
      }
      unobserve() {}
      disconnect = disconnect;
    }
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);

    const { unmount } = render(
      <DeviceFrame device={getDevice('iphone-16-pro')} statusBarColor="#ffffff">
        <p>conteúdo</p>
      </DeviceFrame>,
    );

    // Total 426×898: f = min(300/426, 500/898, 1) = 500/898, limitado pela altura
    const f = 500 / 898;
    expect(f).toBeLessThan(1);
    const slot = screen.getByTestId('device-slot');
    expect(parseFloat(slot.style.width)).toBeCloseTo(426 * f, 3);
    expect(parseFloat(slot.style.height)).toBeCloseTo(898 * f, 3);
    const frame = screen.getByTestId('device-frame');
    const scale = Number(/^scale\(([\d.]+)\)$/.exec(frame.style.transform)?.[1]);
    expect(scale).toBeCloseTo(f, 6);
    expect(frame.style.transformOrigin).toBe('top left');
    expect(frame.style.width).toBe('426px');
    expect(frame.style.height).toBe('898px');

    expect(disconnect).not.toHaveBeenCalled();
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
    expect(typeof ResizeObserver).toBe('undefined');
  });
});

describe('DeviceFrame', () => {
  it('moldura escondida do leitor de tela; só o conteúdo fica acessível', () => {
    render(
      <DeviceFrame device={getDevice('iphone-se')} statusBarColor="#ffffff">
        <p>conteúdo</p>
      </DeviceFrame>,
    );
    expect(screen.getByTestId('device-status-bar').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByTestId('device-home-button').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('9:41').closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText('conteúdo').closest('[aria-hidden="true"]')).toBeNull();
  });

  it('recorte e vinco escondidos do leitor de tela', () => {
    render(
      <DeviceFrame device={getDevice('galaxy-z-flip')} statusBarColor="#ffffff">
        <p>conteúdo</p>
      </DeviceFrame>,
    );
    expect(screen.getByTestId('device-cutout').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByTestId('device-fold').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('12:00').closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText('conteúdo').closest('[aria-hidden="true"]')).toBeNull();
  });

  it('sem ResizeObserver (jsdom), f = 1: tela e espaço reservado no tamanho real', () => {
    expect(typeof ResizeObserver).toBe('undefined');
    render(
      <DeviceFrame device={getDevice('iphone-16-pro')} statusBarColor="#ffffff">
        <p>conteúdo</p>
      </DeviceFrame>,
    );
    expect(screen.getByText('conteúdo')).toBeTruthy();
    expect(screen.getByTestId('device-slot').style.width).toBe('426px');
    expect(screen.getByTestId('device-slot').style.height).toBe('898px');
    const frame = screen.getByTestId('device-frame');
    expect(frame.style.transform).toBe('scale(1)');
    expect(frame.style.transformOrigin).toBe('top left');
    expect(frame.style.borderRadius).toBe('67px');
  });

  it('iPhone: horário 9:41, Dynamic Island e ícones na cor pedida', () => {
    render(
      <DeviceFrame device={getDevice('iphone-16-pro-max')} statusBarColor="#000000">
        <p>conteúdo</p>
      </DeviceFrame>,
    );
    expect(screen.getByText('9:41')).toBeTruthy();
    expect(screen.getByTestId('device-status-bar').style.color).toBe('rgb(0, 0, 0)');
    expect(screen.getByTestId('device-status-bar').style.height).toBe('54px');
    expect(screen.getByTestId('device-cutout').style.width).toBe('126px');
  });

  it('Galaxy: horário 12:00 e furo de câmera', () => {
    render(
      <DeviceFrame device={getDevice('galaxy-s25')} statusBarColor="#ffffff">
        <p>conteúdo</p>
      </DeviceFrame>,
    );
    expect(screen.getByText('12:00')).toBeTruthy();
    expect(screen.getByTestId('device-cutout').style.width).toBe('10px');
    expect(screen.queryByTestId('device-fold')).toBeNull();
  });

  it('iPhone SE: botão Home na moldura e barra clássica de 20 px', () => {
    render(
      <DeviceFrame device={getDevice('iphone-se')} statusBarColor="#ffffff">
        <p>conteúdo</p>
      </DeviceFrame>,
    );
    expect(screen.getByTestId('device-home-button')).toBeTruthy();
    expect(screen.queryByTestId('device-cutout')).toBeNull();
    expect(screen.getByTestId('device-status-bar').style.height).toBe('20px');
  });

  it('Z Flip: vinco no meio da altura', () => {
    render(
      <DeviceFrame device={getDevice('galaxy-z-flip')} statusBarColor="#ffffff">
        <p>conteúdo</p>
      </DeviceFrame>,
    );
    expect(screen.getByTestId('device-fold').style.top).toBe('50%');
  });
});
