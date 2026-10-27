// 에러 타입 정의
export enum ErrorType {
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_ACCESS_DENIED = 'STORAGE_ACCESS_DENIED',
  STORAGE_CORRUPTED = 'STORAGE_CORRUPTED',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  UNKNOWN = 'UNKNOWN',
}

// 커스텀 에러 클래스
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    public message: string,
    public originalError?: unknown,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 에러 분류 함수
export function classifyError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof DOMException) {
    if (error.name === 'QuotaExceededError') {
      return new AppError(
        ErrorType.STORAGE_QUOTA_EXCEEDED,
        '저장 공간이 부족합니다. 일부 메모를 삭제하거나 다운로드 후 삭제해주세요.',
        error,
        true
      );
    }
    if (error.name === 'SecurityError') {
      return new AppError(
        ErrorType.STORAGE_ACCESS_DENIED,
        '브라우저 개인정보 보호 모드에서는 저장 기능을 사용할 수 없습니다.',
        error,
        false
      );
    }
  }

  if (error instanceof SyntaxError) {
    return new AppError(
      ErrorType.STORAGE_CORRUPTED,
      '저장된 데이터가 손상되었습니다. 백업을 불러오시겠습니까?',
      error,
      true
    );
  }

  return new AppError(
    ErrorType.UNKNOWN,
    '알 수 없는 오류가 발생했습니다.',
    error,
    false
  );
}

// 에러 로깅 (프로덕션 환경에서는 서비스로 전송)
export function logError(error: AppError, context?: Record<string, unknown>): void {
  console.error('[AppError]', {
    type: error.type,
    message: error.message,
    recoverable: error.recoverable,
    context,
    stack: error.stack,
    originalError: error.originalError,
  });
}
