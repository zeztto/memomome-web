import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

interface Match {
  start: number;
  end: number;
}

interface FindReplaceManager {
  // 상태
  isOpen: boolean;
  searchTerm: string;
  replaceTerm: string;
  currentMatchIndex: number;
  matches: Match[];

  // 액션
  setIsOpen: (isOpen: boolean) => void;
  setSearchTerm: (term: string) => void;
  setReplaceTerm: (term: string) => void;
  handleNextMatch: () => void;
  handlePrevMatch: () => void;
  handleReplace: (text: string, setText: (text: string) => void) => void;
  handleReplaceAll: (text: string, setText: (text: string) => void) => void;
  navigateToMatch: (textareaRef: React.RefObject<HTMLTextAreaElement>, text: string) => void;
}

export function useFindReplace(text: string): FindReplaceManager {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [replaceTerm, setReplaceTerm] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [shouldNavigate, setShouldNavigate] = useState(false);

  // 검색 결과 캐싱 (useMemo로 최적화)
  const matches = useMemo(() => {
    if (!searchTerm) {
      return [];
    }

    const foundMatches: Match[] = [];
    let index = text.toLowerCase().indexOf(searchTerm.toLowerCase());

    while (index !== -1) {
      foundMatches.push({ start: index, end: index + searchTerm.length });
      index = text.toLowerCase().indexOf(searchTerm.toLowerCase(), index + 1);
    }

    return foundMatches;
  }, [searchTerm, text]);

  // 검색어가 변경되면 인덱스 초기화
  useEffect(() => {
    if (!searchTerm) {
      setCurrentMatchIndex(-1);
    } else if (matches.length > 0) {
      setCurrentMatchIndex(0);
    } else {
      setCurrentMatchIndex(-1);
    }
    setShouldNavigate(false);
  }, [searchTerm, matches.length]);

  // 다음 매치로 이동
  const handleNextMatch = useCallback(() => {
    if (matches.length > 0) {
      setCurrentMatchIndex((prev) => {
        if (prev === -1) return 0;
        return (prev + 1) % matches.length;
      });
      setShouldNavigate(true);
    }
  }, [matches.length]);

  // 이전 매치로 이동
  const handlePrevMatch = useCallback(() => {
    if (matches.length > 0) {
      setCurrentMatchIndex((prev) => {
        if (prev === -1) return 0;
        return (prev - 1 + matches.length) % matches.length;
      });
      setShouldNavigate(true);
    }
  }, [matches.length]);

  // 현재 매치 바꾸기
  const handleReplace = useCallback((text: string, setText: (text: string) => void) => {
    if (matches.length > 0 && currentMatchIndex >= 0) {
      const match = matches[currentMatchIndex];
      const newText = text.substring(0, match.start) + replaceTerm + text.substring(match.end);
      setText(newText);
    }
  }, [matches, currentMatchIndex, replaceTerm]);

  // 모두 바꾸기
  const handleReplaceAll = useCallback((text: string, setText: (text: string) => void) => {
    if (!searchTerm) return;

    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const newText = text.replace(regex, () => replaceTerm);
    setText(newText);
    setSearchTerm("");
    setReplaceTerm("");
  }, [searchTerm, replaceTerm]);

  // 현재 매치로 스크롤 및 선택
  const navigateToMatch = useCallback((
    textareaRef: React.RefObject<HTMLTextAreaElement>,
    text: string
  ) => {
    if (shouldNavigate && matches.length > 0 && currentMatchIndex >= 0 && textareaRef.current) {
      const match = matches[currentMatchIndex];
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(match.start, match.end);
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight * (match.start / text.length);
      setShouldNavigate(false);
    }
  }, [shouldNavigate, matches, currentMatchIndex]);

  return {
    isOpen,
    searchTerm,
    replaceTerm,
    currentMatchIndex,
    matches,
    setIsOpen,
    setSearchTerm,
    setReplaceTerm,
    handleNextMatch,
    handlePrevMatch,
    handleReplace,
    handleReplaceAll,
    navigateToMatch,
  };
}
