import { useState, useCallback, useEffect, useMemo } from 'react';
import { safeStorage } from '../utils/storage';
import { validateTitle, validateTextLength, VALIDATION_LIMITS } from '../utils/validation';
import { toast } from 'sonner';

import { inspectSavedMemos, persistSavedMemos, SAVED_MEMOS_KEY, MEMO_STORAGE_ERROR, type SavedMemo } from '../utils/memoValidation';
export type { SavedMemo } from '../utils/memoValidation';

interface MemoStorageManager {
  savedMemos: SavedMemo[];
  currentMemoTitle: string;
  currentMemoId: string | null;
  storageError: string | null;
  sortedMemos: SavedMemo[];

  setCurrentMemoTitle: (title: string) => void;
  setCurrentMemoId: (id: string | null) => void;

  saveMemo: (title: string, content: string) => boolean;
  overwriteMemo: (title: string, content: string) => boolean;
  loadMemo: (memo: SavedMemo) => void;
  deleteMemo: (id: string) => void;
  clearCurrentMemo: () => void;
}

export function useMemoStorage(): MemoStorageManager {
  const [savedMemos, setSavedMemos] = useState<SavedMemo[]>([]);
  const [currentMemoTitle, setCurrentMemoTitle] = useState("");
  const [currentMemoId, setCurrentMemoId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  // 초기 로드
  useEffect(() => {
    const read = safeStorage.readItem(SAVED_MEMOS_KEY);
    if (!read.success) {
      setSavedMemos([]);
      setStorageError(MEMO_STORAGE_ERROR);
      return;
    }
    const stored = inspectSavedMemos(read.value);
    setSavedMemos(stored.memos);
    setStorageError(stored.valid ? null : MEMO_STORAGE_ERROR);
  }, []);

  // 정렬된 메모 목록 (useMemo로 캐싱)
  const sortedMemos = useMemo(() =>
    [...savedMemos].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [savedMemos]
  );

  // 새 메모 저장
  const saveMemo = useCallback((title: string, content: string): boolean => {
    if (storageError) { toast.error(storageError); return false; }
    // 제목 검증
    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
      toast.error(titleValidation.error!.message);
      return false;
    }

    // 메모 크기 검증
    const textValidation = validateTextLength(content);
    if (!textValidation.valid) {
      toast.error(textValidation.error!.message);
      return false;
    }

    // 메모 개수 제한 체크
    if (savedMemos.length >= VALIDATION_LIMITS.MAX_MEMOS_COUNT) {
      toast.error(`최대 ${VALIDATION_LIMITS.MAX_MEMOS_COUNT}개까지만 저장할 수 있습니다. 일부 메모를 삭제해주세요.`);
      return false;
    }

    const newMemo: SavedMemo = {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: titleValidation.sanitized!,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedMemos = [...savedMemos, newMemo];
    const result = persistSavedMemos(safeStorage, updatedMemos);

    if (!result.success && result.error) {
      if (result.blocked) setStorageError(result.error.message);
      toast.error(result.error.message);
      return false;
    }

    setSavedMemos(updatedMemos);
    setCurrentMemoTitle(titleValidation.sanitized!);
    setCurrentMemoId(newMemo.id);
    toast.success(`"${newMemo.title}" 메모가 저장되었습니다`);
    return true;
  }, [savedMemos, storageError]);

  // 메모 덮어쓰기
  const overwriteMemo = useCallback((title: string, content: string): boolean => {
    if (storageError) { toast.error(storageError); return false; }
    if (!currentMemoId) {
      toast.error("현재 메모 ID를 찾을 수 없습니다");
      return false;
    }

    // 제목 검증
    const titleValidation = validateTitle(title);
    if (!titleValidation.valid) {
      toast.error(titleValidation.error!.message);
      return false;
    }

    // 메모 크기 검증
    const textValidation = validateTextLength(content);
    if (!textValidation.valid) {
      toast.error(textValidation.error!.message);
      return false;
    }

    const updatedMemos = savedMemos.map(memo =>
      memo.id === currentMemoId
        ? {
            ...memo,
            title: titleValidation.sanitized!,
            content,
            updatedAt: new Date().toISOString(),
          }
        : memo
    );

    const result = persistSavedMemos(safeStorage, updatedMemos);

    if (!result.success && result.error) {
      if (result.blocked) setStorageError(result.error.message);
      toast.error(result.error.message);
      return false;
    }

    setSavedMemos(updatedMemos);
    setCurrentMemoTitle(titleValidation.sanitized!);
    toast.success(`"${titleValidation.sanitized}" 메모가 업데이트되었습니다`);
    return true;
  }, [currentMemoId, savedMemos, storageError]);

  // 메모 불러오기
  const loadMemo = useCallback((memo: SavedMemo) => {
    setCurrentMemoTitle(memo.title);
    setCurrentMemoId(memo.id);
    toast.success(`"${memo.title}" 메모를 불러왔습니다`);
  }, []);

  // 메모 삭제
  const deleteMemo = useCallback((id: string) => {
    if (storageError) { toast.error(storageError); return; }
    const memo = savedMemos.find(m => m.id === id);
    if (!memo) return;

    if (window.confirm(`"${memo.title}" 메모를 삭제하시겠습니까?`)) {
      const updatedMemos = savedMemos.filter(m => m.id !== id);
      const result = persistSavedMemos(safeStorage, updatedMemos);

      if (!result.success && result.error) {
        if (result.blocked) setStorageError(result.error.message);
        toast.error(result.error.message);
        return;
      }

      setSavedMemos(updatedMemos);
      if (currentMemoId === id) {
        setCurrentMemoId(null);
        setCurrentMemoTitle("");
      }
      toast.success(`"${memo.title}" 메모가 삭제되었습니다`);
    }
  }, [savedMemos, currentMemoId, storageError]);

  // 현재 메모 정보 초기화
  const clearCurrentMemo = useCallback(() => {
    setCurrentMemoTitle("");
    setCurrentMemoId(null);
  }, []);

  return {
    savedMemos,
    storageError,
    currentMemoTitle,
    currentMemoId,
    sortedMemos,
    setCurrentMemoTitle,
    setCurrentMemoId,
    saveMemo,
    overwriteMemo,
    loadMemo,
    deleteMemo,
    clearCurrentMemo,
  };
}
