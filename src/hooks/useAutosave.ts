import { useEffect, useRef, useState, useCallback } from 'react';

export function useAutosave<T>(
  data: T,
  onSave: (data: T) => Promise<void>,
  delay: number = 1500,
  enabled: boolean = true
) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(true);
  const lastSavedRef = useRef<string>(JSON.stringify(data));

  const save = useCallback(async (currentData: T) => {
    const serialized = JSON.stringify(currentData);
    if (serialized === lastSavedRef.current) return;
    
    setStatus('saving');
    try {
      await onSave(currentData);
      lastSavedRef.current = serialized;
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;
    
    // Skip first render
    if (initialRef.current) {
      initialRef.current = false;
      lastSavedRef.current = JSON.stringify(data);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(() => {
      save(data);
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [data, delay, enabled, save]);

  // Reset initial ref when enabled changes
  useEffect(() => {
    if (enabled) {
      initialRef.current = true;
      lastSavedRef.current = JSON.stringify(data);
    }
  }, [enabled]);

  return status;
}
