import React, { useLayoutEffect, useRef, useState } from 'react';
import { BatteryFull, Signal, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDeviceOuterSize, getDeviceScale } from './devices';
import type { DeviceSpec } from './devices';

interface DeviceFrameProps {
  device: DeviceSpec;
  /** Cor do horário e dos ícones da barra de status, calculada por quem usa */
  statusBarColor: string;
  /** Classes da área medida. A altura dela precisa vir do pai (ex.: flex-1 min-h-0), nunca do conteúdo. */
  className?: string;
  children: React.ReactNode;
}

type Size = { width: number; height: number };

/** Área útil (sem padding) do elemento, ou null se ainda não tem tamanho. */
function measureContentBox(element: HTMLElement): Size | null {
  const style = getComputedStyle(element);
  const width = element.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
  const height = element.clientHeight - (parseFloat(style.paddingTop) || 0) - (parseFloat(style.paddingBottom) || 0);
  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * Tamanho do conteúdo do elemento. null enquanto não medir ou quando não há tamanho (jsdom).
 * Mede já na montagem, antes da pintura, para o aparelho não aparecer no tamanho real e cortado
 * até a primeira notificação do ResizeObserver; depois acompanha as mudanças pelo observer.
 */
function useElementSize(ref: React.RefObject<HTMLElement>): Size | null {
  const [size, setSize] = useState<Size | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const initial = measureContentBox(element);
    if (initial) setSize(initial);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

const StatusBar: React.FC<{ device: DeviceSpec; color: string }> = ({ device, color }) => {
  const { kind, height } = device.statusBar;
  const ios = kind === 'ios';
  const iconClass = ios ? 'h-4 w-4' : 'h-3 w-3';

  return (
    <div
      data-testid="device-status-bar"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between font-semibold"
      style={{
        height,
        color,
        paddingLeft: ios ? 34 : kind === 'android' ? 18 : 8,
        paddingRight: ios ? 30 : kind === 'android' ? 16 : 8,
        fontSize: ios ? 16 : 12,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <span>{kind === 'android' ? '12:00' : '9:41'}</span>
      <span className="flex items-center gap-1">
        <Signal className={iconClass} />
        <Wifi className={iconClass} />
        <BatteryFull className={iconClass} />
      </span>
    </div>
  );
};

const CameraCutout: React.FC<{ device: DeviceSpec }> = ({ device }) => {
  if (device.cutout === 'dynamic-island') {
    return (
      <div
        data-testid="device-cutout"
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-black"
        style={{ top: 11, width: 126, height: 37 }}
      />
    );
  }
  if (device.cutout === 'punch-hole') {
    return (
      <div
        data-testid="device-cutout"
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 rounded-full bg-black"
        style={{ top: 12, width: 10, height: 10 }}
      />
    );
  }
  // home-button: o botão fica na moldura, fora da tela
  return null;
};

/**
 * Aparelho desenhado em CSS, com a tela no tamanho real (viewport CSS) e reduzido por
 * transform: scale(f) para caber na área medida, sem nunca aumentar.
 */
export const DeviceFrame: React.FC<DeviceFrameProps> = ({ device, statusBarColor, className, children }) => {
  const areaRef = useRef<HTMLDivElement>(null);
  const available = useElementSize(areaRef);
  const outer = getDeviceOuterSize(device);
  const f = getDeviceScale(available, outer);
  const { screen, bezel } = device;

  return (
    <div ref={areaRef} data-testid="device-area" className={cn('w-full overflow-hidden p-3', className)}>
      {/* Reserva exatamente o espaço visual do aparelho já reduzido */}
      <div data-testid="device-slot" className="relative mx-auto" style={{ width: outer.width * f, height: outer.height * f }}>
        <div
          data-testid="device-frame"
          data-device={device.id}
          className="absolute left-0 top-0 bg-neutral-900 shadow-2xl ring-1 ring-white/10"
          style={{
            width: outer.width,
            height: outer.height,
            borderRadius: device.screenRadius + bezel.left,
            transform: `scale(${f})`,
            transformOrigin: 'top left',
          }}
        >
          <div
            className="absolute overflow-hidden bg-black"
            style={{ top: bezel.top, left: bezel.left, width: screen.width, height: screen.height, borderRadius: device.screenRadius }}
          >
            <div
              data-testid="device-screen"
              className="absolute inset-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {children}
            </div>
            <StatusBar device={device} color={statusBarColor} />
            <CameraCutout device={device} />
            {device.fold && (
              <div
                data-testid="device-fold"
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 z-10 h-px bg-black/20"
                style={{ top: '50%' }}
              />
            )}
          </div>
          {device.cutout === 'home-button' && (
            <div
              data-testid="device-home-button"
              aria-hidden="true"
              className="absolute left-1/2 -translate-x-1/2 rounded-full border-2 border-neutral-600"
              style={{ width: 44, height: 44, bottom: (bezel.bottom - 44) / 2 }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
