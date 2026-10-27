import { useCallback, useState } from 'react';
import { DEFAULT_DEVICE_ID, getDevice } from '@/components/preview/devices';
import type { DeviceSpec } from '@/components/preview/devices';

export const PREVIEW_DEVICE_STORAGE_KEY = 'linkhub:preview-device';

function readStoredDeviceId(): string {
  try {
    return getDevice(window.localStorage.getItem(PREVIEW_DEVICE_STORAGE_KEY)).id;
  } catch {
    // Armazenamento bloqueado (janela privada, dados do site bloqueados): usa o padrão
    return DEFAULT_DEVICE_ID;
  }
}

/** Aparelho da prévia, lembrado neste navegador. Id inválido ou ausente cai no padrão. */
export function useSelectedDevice(): { device: DeviceSpec; setDeviceId: (id: string) => void } {
  const [deviceId, setDeviceIdState] = useState<string>(readStoredDeviceId);

  const setDeviceId = useCallback((id: string) => {
    const next = getDevice(id).id;
    setDeviceIdState(next);
    try {
      window.localStorage.setItem(PREVIEW_DEVICE_STORAGE_KEY, next);
    } catch {
      // Sem armazenamento, a escolha vale só enquanto a página estiver aberta
    }
  }, []);

  return { device: getDevice(deviceId), setDeviceId };
}
