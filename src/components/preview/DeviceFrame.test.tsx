// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DeviceFrame } from './DeviceFrame';
import { getDevice } from './devices';

afterEach(() => cleanup());

describe('DeviceFrame', () => {
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
