import { AppError, ErrorType } from './errorHandling';

// 상수 정의
export const VALIDATION_LIMITS = {
  MAX_MEMO_LENGTH: 1_000_000, // 1MB (대략)
  MAX_TITLE_LENGTH: 200,
  MAX_MEMOS_COUNT: 100,
  MAX_HISTORY_SIZE: 20,
} as const;

// HTML 이스케이프 (XSS 방지)
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

// 텍스트 길이 검증
export function validateTextLength(
  text: string,
  maxLength: number = VALIDATION_LIMITS.MAX_MEMO_LENGTH
): {
  valid: boolean;
  error?: AppError;
} {
  if (text.length > maxLength) {
    return {
      valid: false,
      error: new AppError(
        ErrorType.VALIDATION_FAILED,
        `메모 크기가 너무 큽니다 (최대 ${Math.floor(maxLength / 1000)}KB)`,
        undefined,
        true
      ),
    };
  }
  return { valid: true };
}

// 제목 검증
export function validateTitle(title: string): {
  valid: boolean;
  error?: AppError;
  sanitized?: string;
} {
  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return {
      valid: false,
      error: new AppError(
        ErrorType.VALIDATION_FAILED,
        '제목을 입력해주세요',
        undefined,
        true
      ),
    };
  }

  if (trimmed.length > VALIDATION_LIMITS.MAX_TITLE_LENGTH) {
    return {
      valid: false,
      error: new AppError(
        ErrorType.VALIDATION_FAILED,
        `제목은 ${VALIDATION_LIMITS.MAX_TITLE_LENGTH}자를 초과할 수 없습니다`,
        undefined,
        true
      ),
    };
  }

  // 제목에서 위험한 문자 제거
  const sanitized = trimmed.replace(/[<>]/g, '');

  if (sanitized.trim().length === 0) {
    return {
      valid: false,
      error: new AppError(ErrorType.VALIDATION_FAILED, '제목을 입력해주세요', undefined, true),
    };
  }

  return { valid: true, sanitized };
}

// 파일명 생성 시 안전한 문자만 허용
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\s+/g, '-')  // 공백을 하이픈으로 변경
    .replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ_.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/-{2,}/g, '-')  // 연속된 하이픈을 하나로
    .substring(0, 100);
}
