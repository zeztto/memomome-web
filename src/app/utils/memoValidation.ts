import { validateTitle, validateTextLength, VALIDATION_LIMITS } from './validation';
import type { StorageReadResult } from './storage';

export interface SavedMemo {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export const SAVED_MEMOS_KEY = 'web-notepad-saved-memos';
export const MEMO_STORAGE_ERROR = '저장된 메모 데이터를 읽을 수 없습니다. 원본을 유지하기 위해 메모 목록의 저장과 삭제를 중단했습니다.';

export function inspectSavedMemos(json: string | null): { memos: SavedMemo[]; valid: boolean } {
  if (json === null) return { memos: [], valid: true };
  try {
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data) || data.length > VALIDATION_LIMITS.MAX_MEMOS_COUNT) return { memos: [], valid: false };
    const ids = new Set<string>();
    const memos: SavedMemo[] = [];
    for (const memo of data) {
      if (!memo || typeof memo !== 'object' || typeof memo.id !== 'string' || !memo.id || ids.has(memo.id) ||
          typeof memo.title !== 'string' || !validateTitle(memo.title).valid ||
          typeof memo.content !== 'string' || !validateTextLength(memo.content).valid ||
          typeof memo.createdAt !== 'string' || !Number.isFinite(Date.parse(memo.createdAt)) ||
          typeof memo.updatedAt !== 'string' || !Number.isFinite(Date.parse(memo.updatedAt))) return { memos: [], valid: false };
      ids.add(memo.id);
      memos.push({ id:memo.id, title:memo.title, content:memo.content, createdAt:memo.createdAt, updatedAt:memo.updatedAt });
    }
    return { memos, valid: true };
  } catch {
    return { memos: [], valid: false };
  }
}

export function parseSavedMemos(json: string): SavedMemo[] {
  return inspectSavedMemos(json).memos;
}

interface MemoStorage {
  readItem(key: string): StorageReadResult;
  setItem(key: string, value: string): { success: boolean; error?: { message: string } };
}

export function persistSavedMemos(storage: MemoStorage, memos: SavedMemo[]): { success: boolean; blocked?: boolean; error?: { message: string } } {
  const read = storage.readItem(SAVED_MEMOS_KEY);
  if (!read.success || !inspectSavedMemos(read.value).valid) {
    return { success: false, blocked: true, error: { message: MEMO_STORAGE_ERROR } };
  }
  try {
    return storage.setItem(SAVED_MEMOS_KEY, JSON.stringify(memos));
  } catch {
    return { success: false, error: { message: '메모 저장에 실패했습니다.' } };
  }
}
