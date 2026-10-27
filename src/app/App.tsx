import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Textarea } from "./components/ui/textarea";
import { Button } from "./components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Separator } from "./components/ui/separator";
import { Download, Trash2, FileText, Search, Replace, ReplaceAll, ChevronDown, ChevronUp, X, Save, FolderOpen, Undo, Redo, History, Eye, EyeOff, FilePlus } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { safeStorage } from "./utils/storage";
import { toTextCsv } from "./utils/textCsv";
import { escapeHtml, sanitizeFilename } from "./utils/validation";
import { classifyError } from "./utils/errorHandling";
import { useHistoryManager } from "./hooks/useHistoryManager";
import { useAutoSave } from "./hooks/useAutoSave";
import { useFindReplace } from "./hooks/useFindReplace";
import { useMemoStorage } from "./hooks/useMemoStorage";

const STORAGE_KEY = "web-notepad-content";

export default function App() {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Custom Hooks
  const historyManager = useHistoryManager(20);
  const findReplace = useFindReplace(text);
  const memoStorage = useMemoStorage();

  // Dialog 상태
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [memosDialogOpen, setMemosDialogOpen] = useState(false);
  const [memoTitle, setMemoTitle] = useState("");
  const [expandedHistoryItems, setExpandedHistoryItems] = useState<Set<number>>(new Set());

  // 로컬 스토리지에서 불러오기
  useEffect(() => {
    // 메모리 모드 경고
    if (safeStorage.isMemoryMode()) {
      toast.warning('브라우저 저장소를 사용할 수 없어 메모리 모드로 실행됩니다. 페이지를 새로고침하면 데이터가 사라집니다.', {
        duration: 5000,
      });
    }

    const saved = safeStorage.getItem(STORAGE_KEY);
    if (saved) {
      setText(saved);
      toast.success("이전에 작성한 메모를 불러왔습니다");
    }
  }, []);

  // 자동 저장 (Custom Hook 사용)
  useAutoSave(text, {
    storageKey: STORAGE_KEY,
    debounceMs: 1000,
    onSaveError: (error) => {
      toast.error(error.message, {
        duration: 5000,
        action: {
          label: '다운로드',
          onClick: () => handleDownloadTxt(),
        },
      });
    },
  });

  // 히스토리 업데이트 (디바운스 적용)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      historyManager.addToHistory(text);
    }, 500); // 500ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [text, historyManager]);

  // Undo 기능
  const handleUndo = useCallback(() => {
    const content = historyManager.undo();
    if (content !== null) {
      setText(content);
      toast.success("실행 취소");
    }
  }, [historyManager]);

  // Redo 기능
  const handleRedo = useCallback(() => {
    const content = historyManager.redo();
    if (content !== null) {
      setText(content);
      toast.success("다시 실행");
    }
  }, [historyManager]);

  // 히스토리에서 복원
  const handleRestoreFromHistory = useCallback((index: number) => {
    const content = historyManager.restoreFromHistory(index);
    setText(content);
    setHistoryDialogOpen(false);
    toast.success("선택한 시점으로 복원되었습니다");
  }, [historyManager]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // 찾기/바꾸기 - 현재 매치로 네비게이션
  useEffect(() => {
    findReplace.navigateToMatch(textareaRef, text);
  }, [findReplace, text]);

  // 찾기/바꾸기 핸들러 (Custom Hook 사용)
  const handleReplace = useCallback(() => {
    findReplace.handleReplace(text, setText);
    toast.success("1개 항목을 바꿨습니다");
  }, [findReplace, text]);

  const handleReplaceAll = useCallback(() => {
    const count = findReplace.matches.length;
    findReplace.handleReplaceAll(text, setText);
    toast.success(`${count}개 항목을 모두 바꿨습니다`);
  }, [findReplace, text]);

  const handleClear = useCallback(() => {
    if (window.confirm("현재 메모를 초기화하고 새 메모를 시작하시겠습니까?")) {
      setText("");
      historyManager.clearHistory();
      memoStorage.clearCurrentMemo();
      safeStorage.removeItem(STORAGE_KEY);
      toast.success("새 메모를 시작합니다");
    }
  }, [historyManager, memoStorage]);

  // 파일명 생성 헬퍼 함수
  const generateFilename = useCallback((extension: string) => {
    const title = memoStorage.currentMemoTitle || "untitled";
    const hash = Math.random().toString(36).substring(2, 10);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");
    const timestamp = `${year}${month}${day}${hour}${minute}${second}`;

    return `w.store_${title}_${hash}_${timestamp}.${extension}`;
  }, [memoStorage.currentMemoTitle]);

  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = sanitizeFilename(filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`${filename} 파일이 다운로드되었습니다`);
    } catch (error) {
      const appError = classifyError(error);
      console.error('Download failed:', appError);
      toast.error('파일 다운로드에 실패했습니다. 메모 크기가 너무 크거나 브라우저 메모리가 부족할 수 있습니다.');
    }
  }, []);

  const handleDownloadTxt = useCallback(() => {
    downloadFile(text, generateFilename("txt"), "text/plain");
  }, [text, downloadFile, generateFilename]);

  const handleDownloadMd = useCallback(() => {
    downloadFile(text, generateFilename("md"), "text/markdown");
  }, [text, downloadFile, generateFilename]);

  const handleDownloadHtml = useCallback(() => {
    const htmlContent = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(memoStorage.currentMemoTitle || 'Memo')}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
        }
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <pre>${escapeHtml(text)}</pre>
</body>
</html>`;
    downloadFile(htmlContent, generateFilename("html"), "text/html");
  }, [text, downloadFile, generateFilename, memoStorage.currentMemoTitle]);

  const handleDownloadJson = useCallback(() => {
    const jsonContent = JSON.stringify(
      {
        content: text,
        createdAt: new Date().toISOString(),
        wordCount: text.trim().split(/\s+/).filter(Boolean).length,
        charCount: text.length,
      },
      null,
      2
    );
    downloadFile(jsonContent, generateFilename("json"), "application/json");
  }, [text, downloadFile, generateFilename]);

  const handleDownloadCsv = useCallback(() => {
    const csvWithBom = toTextCsv(text);
    downloadFile(csvWithBom, generateFilename("csv"), "text/csv;charset=utf-8;");
  }, [text, downloadFile, generateFilename]);

  // 메모 저장 함수 (새로 저장)
  const handleSaveMemo = useCallback(() => {
    const success = memoStorage.saveMemo(memoTitle, text);
    if (success) {
      setSaveDialogOpen(false);
      setMemoTitle("");
    }
  }, [memoTitle, text, memoStorage]);

  // 메모 덮어쓰기
  const handleOverwriteMemo = useCallback(() => {
    const success = memoStorage.overwriteMemo(memoTitle, text);
    if (success) {
      setSaveDialogOpen(false);
      setMemoTitle("");
    }
  }, [memoTitle, text, memoStorage]);

  // 저장 Dialog 열 때 현재 메모 제목 자동 입력
  useEffect(() => {
    if (saveDialogOpen && memoStorage.currentMemoTitle) {
      setMemoTitle(memoStorage.currentMemoTitle);
    }
  }, [saveDialogOpen, memoStorage.currentMemoTitle]);

  // 메모 불러오기
  const handleLoadMemo = useCallback((memo: typeof memoStorage.savedMemos[0]) => {
    setText(memo.content);
    memoStorage.loadMemo(memo);
    setMemosDialogOpen(false);
  }, [memoStorage]);

  // 메모 삭제
  const handleDeleteMemo = useCallback((id: string) => {
    memoStorage.deleteMemo(id);
  }, [memoStorage]);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;
  const lineCount = text ? text.split("\n").length : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Toaster position="top-center" />
      
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary text-primary-foreground rounded-lg">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle>메모모미 (MeMoMoMe)</CardTitle>
                  <CardDescription>
                    모든 내용은 내부에만 저장되고 외부로 전송되지 않습니다
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={handleClear}
                >
                  <FilePlus className="mr-2 h-4 w-4" />
                  새 메모
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setMemosDialogOpen(true)}
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  메모 목록 ({memoStorage.savedMemos.length})
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={!text}
                >
                  <Save className="mr-2 h-4 w-4" />
                  저장하기
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={!text}>
                      <Download className="mr-2 h-4 w-4" />
                      다운로드
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={handleDownloadTxt}>
                      텍스트 파일 (.txt)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadMd}>
                      마크다운 (.md)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadHtml}>
                      HTML 파일 (.html)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadJson}>
                      JSON 파일 (.json)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadCsv}>
                      CSV 파일 (.csv)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Button
                  variant="outline"
                  onClick={handleUndo}
                  disabled={!historyManager.canUndo}
                  title="Ctrl+Z"
                >
                  <Undo className="mr-2 h-4 w-4" />
                  실행 취소{historyManager.undoVersion !== null && ` (${historyManager.undoVersion})`}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleRedo}
                  disabled={!historyManager.canRedo}
                  title="Ctrl+Y"
                >
                  <Redo className="mr-2 h-4 w-4" />
                  다시 실행{historyManager.redoVersion !== null && ` (${historyManager.redoVersion})`}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setHistoryDialogOpen(true)}
                >
                  <History className="mr-2 h-4 w-4" />
                  수정 내역 ({historyManager.history.length})
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => findReplace.setIsOpen(true)}
                  disabled={!text}
                >
                  <Search className="mr-2 h-4 w-4" />
                  찾기/바꾸기
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {memoStorage.storageError && <p role="alert" className="text-sm text-destructive">{memoStorage.storageError}</p>}
            {/* 찾기/바꾸기 인라인 UI */}
            {findReplace.isOpen && (
              <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">찾기 및 바꾸기</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      findReplace.setIsOpen(false);
                      findReplace.setSearchTerm("");
                      findReplace.setReplaceTerm("");
                    }}
                    aria-label="찾기 닫기"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">찾을 내용</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="search"
                          value={findReplace.searchTerm}
                          onChange={(e) => findReplace.setSearchTerm(e.target.value)}
                          placeholder="검색어를 입력하세요"
                          className="pr-8"
                        />
                        {findReplace.searchTerm && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                            onClick={() => findReplace.setSearchTerm("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={findReplace.handlePrevMatch}
                          aria-label="이전 검색 결과"
                          disabled={findReplace.matches.length === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={findReplace.handleNextMatch}
                          aria-label="다음 검색 결과"
                          disabled={findReplace.matches.length === 0}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {findReplace.searchTerm && (
                      <p className="text-sm text-muted-foreground">
                        {findReplace.matches.length > 0
                          ? `${findReplace.currentMatchIndex + 1} / ${findReplace.matches.length}개 결과`
                          : "결과 없음"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="replace">바꿀 내용</Label>
                    <div className="relative">
                      <Input
                        id="replace"
                        value={findReplace.replaceTerm}
                        onChange={(e) => findReplace.setReplaceTerm(e.target.value)}
                        placeholder="바꿀 내용을 입력하세요"
                        className="pr-8"
                      />
                      {findReplace.replaceTerm && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                          onClick={() => findReplace.setReplaceTerm("")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={handleReplace}
                      disabled={findReplace.matches.length === 0}
                    >
                      <Replace className="mr-2 h-4 w-4" />
                      바꾸기
                    </Button>
                    <Button
                      onClick={handleReplaceAll}
                      disabled={findReplace.matches.length === 0}
                    >
                      <ReplaceAll className="mr-2 h-4 w-4" />
                      모두 바꾸기
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="여기에 메모를 입력하세요..."
                className="min-h-[400px] resize-none"
                ref={textareaRef}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>
                  문자: <span className="font-medium text-foreground">{charCount}</span>
                </span>
                <span>
                  단어: <span className="font-medium text-foreground">{wordCount}</span>
                </span>
                <span>
                  줄: <span className="font-medium text-foreground">{lineCount}</span>
                </span>
                {historyManager.currentVersion > 0 && (
                  <span className="text-primary">
                    버전: <span className="font-medium">{historyManager.currentVersion}</span>
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 저장 Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>메모 저장하기</DialogTitle>
            <DialogDescription>
              메모에 제목을 지정하여 브라우저에 저장합니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="memo-title">제목</Label>
              <Input
                id="memo-title"
                value={memoTitle}
                onChange={(e) => setMemoTitle(e.target.value)}
                placeholder="메모 제목을 입력하세요"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveMemo();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                취소
              </Button>
              {memoStorage.currentMemoId ? (
                <>
                  <Button variant="outline" onClick={handleSaveMemo}>
                    새 메모로 저장
                  </Button>
                  <Button onClick={handleOverwriteMemo}>
                    덮어쓰기
                  </Button>
                </>
              ) : (
                <Button onClick={handleSaveMemo}>
                  저장
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 메모 목록 Dialog */}
      <Dialog open={memosDialogOpen} onOpenChange={setMemosDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>저장된 메모 ({memoStorage.savedMemos.length}개)</DialogTitle>
            <DialogDescription>
              저장된 메모를 선택하여 불러오거나 삭제할 수 있습니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 overflow-y-auto max-h-[60vh]">
            {memoStorage.savedMemos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                저장된 메모가 없습니다
              </p>
            ) : (
              memoStorage.sortedMemos.map((memo) => (
                <div
                  key={memo.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleLoadMemo(memo)}>
                    <h3 className="font-medium truncate">{memo.title}</h3>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      {memo.content.substring(0, 100)}
                      {memo.content.length > 100 ? "..." : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(memo.createdAt).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMemo(memo.id);
                    }}
                    aria-label={`${memo.title} 메모 삭제`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 수정 내역 Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>수정 내역 ({historyManager.history.length}개)</DialogTitle>
            <DialogDescription>
              특정 시점의 수정 내역을 선택하여 복원할 수 있습니다
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 overflow-y-auto max-h-[60vh]">
            {historyManager.history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                수정 내역이 없습니다
              </p>
            ) : (
              [...historyManager.history].reverse().map((entry, reverseIndex) => {
                const index = historyManager.history.length - 1 - reverseIndex;
                const isCurrent = index === historyManager.historyIndex;
                const isExpanded = expandedHistoryItems.has(index);
                const prevEntry = index > 0 ? historyManager.history[index - 1] : null;
                const charDiff = prevEntry ? entry.content.length - prevEntry.content.length : entry.content.length;
                const lineDiff = prevEntry ? entry.content.split("\n").length - prevEntry.content.split("\n").length : entry.content.split("\n").length;
                const versionNumber = index + 1;
                
                return (
                  <div
                    key={index}
                    className={`border rounded-lg transition-colors ${
                      isCurrent ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                    }`}
                  >
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => handleRestoreFromHistory(index)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            v{versionNumber}
                          </span>
                          {isCurrent && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                              현재
                            </span>
                          )}
                          {prevEntry && (
                            <span className="text-xs text-muted-foreground">
                              {charDiff > 0 ? `+${charDiff}자` : charDiff < 0 ? `${charDiff}자` : "변경 없음"}
                              {lineDiff !== 0 && `, ${lineDiff > 0 ? `+${lineDiff}줄` : `${lineDiff}줄`}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString("ko-KR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedHistoryItems(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(index)) {
                                  newSet.delete(index);
                                } else {
                                  newSet.add(index);
                                }
                                return newSet;
                              });
                            }}
                          >
                            {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${!isExpanded && 'line-clamp-3'}`}>
                        {entry.content || "(비어있음)"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {entry.content.length}자 · {entry.content.split("\n").length}줄
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
