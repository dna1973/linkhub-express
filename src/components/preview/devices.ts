export type DeviceBrand = 'Apple' | 'Samsung';
export type DeviceCutout = 'dynamic-island' | 'home-button' | 'punch-hole';
export type StatusBarKind = 'ios' | 'ios-classic' | 'android';

export interface DeviceSpec {
  id: string;
  name: string;
  brand: DeviceBrand;
  /** Viewport CSS aproximado, em px (tabelas públicas de viewport; poucos px de diferença são aceitáveis) */
  screen: { width: number; height: number };
  /** Raio dos cantos da tela, em px */
  screenRadius: number;
  /** Espessura da moldura em cada lado, em px */
  bezel: { top: number; right: number; bottom: number; left: number };
  cutout: DeviceCutout;
  /** Z Flip: linha da dobra no meio da altura */
  fold?: boolean;
  statusBar: { kind: StatusBarKind; height: number };
}

const even = (px: number) => ({ top: px, right: px, bottom: px, left: px });

/** Catálogo só de dados. A ordem é a do seletor, dentro de cada marca. */
export const DEVICES: DeviceSpec[] = [
  {
    id: 'iphone-16-pro',
    name: 'iPhone 16 Pro',
    brand: 'Apple',
    screen: { width: 402, height: 874 },
    screenRadius: 55,
    bezel: even(12),
    cutout: 'dynamic-island',
    statusBar: { kind: 'ios', height: 54 },
  },
  {
    id: 'iphone-16-pro-max',
    name: 'iPhone 16 Pro Max',
    brand: 'Apple',
    screen: { width: 440, height: 956 },
    screenRadius: 55,
    bezel: even(12),
    cutout: 'dynamic-island',
    statusBar: { kind: 'ios', height: 54 },
  },
  {
    id: 'iphone-se',
    name: 'iPhone SE',
    brand: 'Apple',
    screen: { width: 375, height: 667 },
    screenRadius: 0,
    bezel: { top: 64, right: 16, bottom: 64, left: 16 },
    cutout: 'home-button',
    statusBar: { kind: 'ios-classic', height: 20 },
  },
  {
    id: 'galaxy-s25',
    name: 'Galaxy S25',
    brand: 'Samsung',
    screen: { width: 360, height: 780 },
    screenRadius: 32,
    bezel: even(9),
    cutout: 'punch-hole',
    statusBar: { kind: 'android', height: 28 },
  },
  {
    id: 'galaxy-s25-ultra',
    name: 'Galaxy S25 Ultra',
    brand: 'Samsung',
    screen: { width: 412, height: 891 },
    screenRadius: 14,
    bezel: even(9),
    cutout: 'punch-hole',
    statusBar: { kind: 'android', height: 28 },
  },
  {
    id: 'galaxy-a55',
    name: 'Galaxy A55',
    brand: 'Samsung',
    screen: { width: 384, height: 832 },
    screenRadius: 34,
    bezel: even(12),
    cutout: 'punch-hole',
    statusBar: { kind: 'android', height: 28 },
  },
  {
    id: 'galaxy-z-flip',
    name: 'Galaxy Z Flip',
    brand: 'Samsung',
    screen: { width: 412, height: 1004 },
    screenRadius: 26,
    bezel: even(10),
    cutout: 'punch-hole',
    fold: true,
    statusBar: { kind: 'android', height: 28 },
  },
];

export const DEFAULT_DEVICE_ID = 'iphone-16-pro';

/** Aparelho pelo id. Id inválido ou ausente cai no padrão. */
export function getDevice(id: string | null | undefined): DeviceSpec {
  return DEVICES.find((d) => d.id === id) ?? DEVICES.find((d) => d.id === DEFAULT_DEVICE_ID)!;
}

/** Tamanho total do aparelho: tela mais as bordas. */
export function getDeviceOuterSize(device: DeviceSpec): { width: number; height: number } {
  return {
    width: device.screen.width + device.bezel.left + device.bezel.right,
    height: device.screen.height + device.bezel.top + device.bezel.bottom,
  };
}

/**
 * Escala para o aparelho caber inteiro na área disponível, sem nunca aumentar:
 * f = min(largura disponível / largura total, altura disponível / altura total, 1).
 * Sem medida (jsdom, sem ResizeObserver, ou área ainda sem tamanho), f = 1.
 */
export function getDeviceScale(
  available: { width: number; height: number } | null,
  outer: { width: number; height: number },
): number {
  if (!available || available.width <= 0 || available.height <= 0) return 1;
  return Math.min(available.width / outer.width, available.height / outer.height, 1);
}
