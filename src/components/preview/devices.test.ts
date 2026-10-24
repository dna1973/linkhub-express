import { describe, expect, it } from 'vitest';
import { DEFAULT_DEVICE_ID, DEVICES, getDevice, getDeviceOuterSize, getDeviceScale } from './devices';

// Tabela da seção 6 da especificação: [nome, marca, largura, altura, raio, recorte, barra, altura da barra]
const TABELA: Record<string, [string, string, number, number, number, string, string, number]> = {
  'iphone-16-pro': ['iPhone 16 Pro', 'Apple', 402, 874, 55, 'dynamic-island', 'ios', 54],
  'iphone-16-pro-max': ['iPhone 16 Pro Max', 'Apple', 440, 956, 55, 'dynamic-island', 'ios', 54],
  'iphone-se': ['iPhone SE', 'Apple', 375, 667, 0, 'home-button', 'ios-classic', 20],
  'galaxy-s25': ['Galaxy S25', 'Samsung', 360, 780, 32, 'punch-hole', 'android', 28],
  'galaxy-s25-ultra': ['Galaxy S25 Ultra', 'Samsung', 412, 891, 14, 'punch-hole', 'android', 28],
  'galaxy-a55': ['Galaxy A55', 'Samsung', 384, 832, 34, 'punch-hole', 'android', 28],
  'galaxy-z-flip': ['Galaxy Z Flip', 'Samsung', 412, 1004, 26, 'punch-hole', 'android', 28],
};

describe('DEVICES', () => {
  it('tem os 7 aparelhos com ids únicos', () => {
    const ids = DEVICES.map((d) => d.id);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
    expect([...ids].sort()).toEqual(Object.keys(TABELA).sort());
  });

  it.each(Object.entries(TABELA))('%s segue a tabela', (id, [name, brand, width, height, radius, cutout, kind, barHeight]) => {
    const device = getDevice(id);
    expect(device.name).toBe(name);
    expect(device.brand).toBe(brand);
    expect(device.screen).toEqual({ width, height });
    expect(device.screenRadius).toBe(radius);
    expect(device.cutout).toBe(cutout);
    expect(device.statusBar).toEqual({ kind, height: barHeight });
  });

  it('bordas da tabela: SE com 16 nas laterais e 64 no topo e na base', () => {
    expect(getDevice('iphone-se').bezel).toEqual({ top: 64, right: 16, bottom: 64, left: 16 });
    expect(getDevice('iphone-16-pro').bezel).toEqual({ top: 12, right: 12, bottom: 12, left: 12 });
    expect(getDevice('galaxy-s25').bezel.left).toBe(9);
    expect(getDevice('galaxy-s25-ultra').bezel.left).toBe(9);
    expect(getDevice('galaxy-a55').bezel.left).toBe(12);
    expect(getDevice('galaxy-z-flip').bezel.left).toBe(10);
  });

  it('só o Z Flip tem vinco', () => {
    expect(DEVICES.filter((d) => d.fold).map((d) => d.id)).toEqual(['galaxy-z-flip']);
  });

  it('dimensões positivas', () => {
    for (const d of DEVICES) {
      expect(d.screen.width).toBeGreaterThan(0);
      expect(d.screen.height).toBeGreaterThan(0);
      expect(d.statusBar.height).toBeGreaterThan(0);
      expect(Math.min(d.bezel.top, d.bezel.right, d.bezel.bottom, d.bezel.left)).toBeGreaterThan(0);
      expect(d.screenRadius).toBeGreaterThanOrEqual(0);
    }
  });

  it('marcas Apple e Samsung', () => {
    expect(DEVICES.filter((d) => d.brand === 'Apple')).toHaveLength(3);
    expect(DEVICES.filter((d) => d.brand === 'Samsung')).toHaveLength(4);
  });

  it('padrão válido: iPhone 16 Pro', () => {
    expect(DEFAULT_DEVICE_ID).toBe('iphone-16-pro');
    expect(DEVICES.some((d) => d.id === DEFAULT_DEVICE_ID)).toBe(true);
  });

  it('id inválido ou ausente cai no padrão', () => {
    expect(getDevice('nokia-3310').id).toBe(DEFAULT_DEVICE_ID);
    expect(getDevice(null).id).toBe(DEFAULT_DEVICE_ID);
    expect(getDevice(undefined).id).toBe(DEFAULT_DEVICE_ID);
    expect(getDevice('galaxy-a55').id).toBe('galaxy-a55');
  });
});

describe('getDeviceOuterSize', () => {
  it('soma as bordas à tela', () => {
    expect(getDeviceOuterSize(getDevice('iphone-16-pro'))).toEqual({ width: 426, height: 898 });
    expect(getDeviceOuterSize(getDevice('iphone-se'))).toEqual({ width: 407, height: 795 });
  });
});

describe('getDeviceScale', () => {
  const outer = { width: 426, height: 898 };

  it('sem medida, f = 1', () => {
    expect(getDeviceScale(null, outer)).toBe(1);
    expect(getDeviceScale({ width: 0, height: 0 }, outer)).toBe(1);
  });
  it('nunca aumenta', () => {
    expect(getDeviceScale({ width: 2000, height: 2000 }, outer)).toBe(1);
  });
  it('usa o menor dos dois lados', () => {
    expect(getDeviceScale({ width: 213, height: 2000 }, outer)).toBe(0.5);
    expect(getDeviceScale({ width: 2000, height: 449 }, outer)).toBe(0.5);
  });
});
