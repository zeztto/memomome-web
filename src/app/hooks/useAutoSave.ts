import { useEffect, useRef } from 'react';
import { safeStorage } from '../utils/storage';
import { toast } from 'sonner';

interface UseAutoSaveOptions {
  storageKey: string;
  debounceMs?: number;
  onSaveError?: (error: Error) => void;
}

export function useAutoSave(
  text: string,
  options: UseAutoSaveOptions
): void {
  const { storageKey, debounceMs = 1000, onSaveError } = options;
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    // 변경사항이 없으면 저장하지 않음
    if (text === lastSavedRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const result = safeStorage.setItem(storageKey, text);

      if (result.success) {
        lastSavedRef.current = text;
      } else if (result.error) {
        // 에러 발생 시 콜백 호출
        if (onSaveError) {
          onSaveError(new Error(result.error.message));
        }
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [text, storageKey, debounceMs, onSaveError]);
}
