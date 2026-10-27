import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Salva `data` automaticamente `delay` ms depois da última alteração.
 *
 * - `enabled = false` só pausa: o que for alterado durante a pausa é salvo quando ela acabar.
 * - `resetKey` marca o início de uma nova edição (ex.: outro link aberto no diálogo).
 *   Quando ele muda, os dados atuais viram a referência e não são salvos.
 */
export function useAutosave<T>(
  data: T,
  onSave: (data: T) => Promise<void>,
  delay: number = 1500,
  enabled: boolean = true,
  resetKey?: unknown
) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSavedRef = useRef<string>(JSON.stringify(data));
  const resetKeyRef = useRef(resetKey);
  // Guardar a função em ref evita reiniciar a espera quando o pai recria o callback
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const save = useCallback(async (currentData: T) => {
    const serialized = JSON.stringify(currentData);
    if (serialized === lastSavedRef.current) return;

    setStatus('saving');
    try {
      await onSaveRef.current(currentData);
      lastSavedRef.current = serialized;
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, []);

  useEffect(() => {
    if (resetKeyRef.current !== resetKey) {
      resetKeyRef.current = resetKey;
      lastSavedRef.current = JSON.stringify(data);
    }

    if (!enabled) return;
    if (JSON.stringify(data) === lastSavedRef.current) return;

    const timeout = setTimeout(() => {
      save(data);
    }, delay);

    return () => clearTimeout(timeout);
  }, [data, delay, enabled, resetKey, save]);

  return status;
}
