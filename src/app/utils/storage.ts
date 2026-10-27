import { AppError, ErrorType, classifyError, logError } from './errorHandling';

export type StorageReadResult =
  | { success: true; value: string | null }
  | { success: false; error: AppError };

// 메모리 폴백 저장소 (localStorage 사용 불가 시)
class MemoryStorage {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }
}

// 안전한 localStorage 래퍼
export class SafeStorage {
  private storage: Storage | MemoryStorage;
  private isUsingFallback: boolean = false;

  constructor() {
    try {
      // localStorage 접근 가능성 테스트
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      this.storage = localStorage;
    } catch (error) {
      console.warn('localStorage 사용 불가, 메모리 저장소로 폴백');
      this.storage = new MemoryStorage();
      this.isUsingFallback = true;
    }
  }

  getItem(key: string): string | null {
    const result = this.readItem(key);
    return result.success ? result.value : null;
  }

  readItem(key: string): StorageReadResult {
    try {
      return { success: true, value: this.storage.getItem(key) };
    } catch (error) {
      const appError = classifyError(error);
      logError(appError, { operation: 'readItem', key });
      return { success: false, error: appError };
    }
  }

  setItem(key: string, value: string): { success: boolean; error?: AppError } {
    try {
      this.storage.setItem(key, value);
      return { success: true };
    } catch (error) {
      const appError = classifyError(error);
      logError(appError, { operation: 'setItem', key, valueLength: value.length });

      return { success: false, error: appError };
    }
  }

  removeItem(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (error) {
      const appError = classifyError(error);
      logError(appError, { operation: 'removeItem', key });
    }
  }

  isMemoryMode(): boolean {
    return this.isUsingFallback;
  }
}

// 싱글톤 인스턴스
export const safeStorage = new SafeStorage();

// JSON 안전 파싱
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    const appError = classifyError(error);
    logError(appError, { operation: 'safeJsonParse' });
    return defaultValue;
  }
}

// JSON 안전 직렬화
export function safeJsonStringify<T>(data: T, defaultValue: string = '{}'): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    const appError = new AppError(
      ErrorType.UNKNOWN,
      'JSON 변환에 실패했습니다.',
      error,
      false
    );
    logError(appError, { operation: 'safeJsonStringify' });
    return defaultValue;
  }
}
