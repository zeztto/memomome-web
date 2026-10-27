import { useState, useCallback, useRef, useEffect } from 'react';

export interface HistoryEntry {
  content: string;
  timestamp: string;
}

interface HistoryManager {
  history: HistoryEntry[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  currentVersion: number;
  undoVersion: number | null;
  redoVersion: number | null;
  addToHistory: (content: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  restoreFromHistory: (index: number) => string;
  clearHistory: () => void;
  isUpdatingFromHistory: React.MutableRefObject<boolean>;
}

export function useHistoryManager(maxHistory: number = 20): HistoryManager {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUpdatingFromHistory = useRef(false);

  // 히스토리에 추가 (디바운스는 호출하는 쪽에서 처리)
  const addToHistory = useCallback((content: string) => {
    if (isUpdatingFromHistory.current) {
      isUpdatingFromHistory.current = false;
      return;
    }

    setHistory(prev => {
      // 빈 텍스트는 첫 번째 히스토리로 저장하지 않음
      if (content.trim().length === 0 && prev.length === 0) {
        return prev;
      }

      // 현재 텍스트가 히스토리의 현재 항목과 다를 때만 추가
      if (historyIndex === -1 || content !== prev[historyIndex]?.content) {
        const newHistory = prev.slice(0, historyIndex + 1);
        const newEntry: HistoryEntry = {
          content,
          timestamp: new Date().toISOString(),
        };
        newHistory.push(newEntry);

        // 최대 개수 제한
        if (newHistory.length > maxHistory) {
          newHistory.shift();
          setHistoryIndex(newHistory.length - 1);
          return newHistory;
        } else {
          setHistoryIndex(newHistory.length - 1);
          return newHistory;
        }
      }

      return prev;
    });
  }, [historyIndex, maxHistory]);

  // Undo
  const undo = useCallback((): string | null => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      isUpdatingFromHistory.current = true;
      setHistoryIndex(newIndex);
      return history[newIndex].content;
    }
    return null;
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback((): string | null => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      isUpdatingFromHistory.current = true;
      setHistoryIndex(newIndex);
      return history[newIndex].content;
    }
    return null;
  }, [history, historyIndex]);

  // 특정 히스토리로 복원
  const restoreFromHistory = useCallback((index: number): string => {
    isUpdatingFromHistory.current = true;
    setHistoryIndex(index);
    return history[index].content;
  }, [history]);

  // 히스토리 초기화
  const clearHistory = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // 계산된 값들
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const currentVersion = history.length > 0 ? historyIndex + 1 : 0;
  const undoVersion = canUndo ? historyIndex : null;
  const redoVersion = canRedo ? historyIndex + 2 : null;

  return {
    history,
    historyIndex,
    canUndo,
    canRedo,
    currentVersion,
    undoVersion,
    redoVersion,
    addToHistory,
    undo,
    redo,
    restoreFromHistory,
    clearHistory,
    isUpdatingFromHistory,
  };
}
