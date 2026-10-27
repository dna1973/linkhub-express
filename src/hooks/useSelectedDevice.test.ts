// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { PREVIEW_DEVICE_STORAGE_KEY, useSelectedDevice } from './useSelectedDevice';

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('useSelectedDevice', () => {
  it('sem valor guardado usa o padrão', () => {
    const { result } = renderHook(() => useSelectedDevice());
    expect(result.current.device.id).toBe('iphone-16-pro');
  });

  it('lê o aparelho guardado', () => {
    window.localStorage.setItem(PREVIEW_DEVICE_STORAGE_KEY, 'galaxy-a55');
    const { result } = renderHook(() => useSelectedDevice());
    expect(result.current.device.id).toBe('galaxy-a55');
  });

  it('id guardado inválido cai no padrão', () => {
    window.localStorage.setItem(PREVIEW_DEVICE_STORAGE_KEY, 'nokia-3310');
    const { result } = renderHook(() => useSelectedDevice());
    expect(result.current.device.id).toBe('iphone-16-pro');
  });

  it('trocar o aparelho guarda o id', () => {
    const { result } = renderHook(() => useSelectedDevice());
    act(() => result.current.setDeviceId('galaxy-z-flip'));
    expect(result.current.device.id).toBe('galaxy-z-flip');
    expect(window.localStorage.getItem(PREVIEW_DEVICE_STORAGE_KEY)).toBe('galaxy-z-flip');
  });

  it('funciona com o armazenamento bloqueado', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const { result } = renderHook(() => useSelectedDevice());
    expect(result.current.device.id).toBe('iphone-16-pro');
    act(() => result.current.setDeviceId('iphone-se'));
    expect(result.current.device.id).toBe('iphone-se');
  });
});
