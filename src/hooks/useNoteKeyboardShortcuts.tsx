import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseNoteKeyboardShortcutsProps {
  onNewNote?: () => void;
  onSearch?: () => void;
  onFocusMode?: () => void;
  onAIActions?: () => void;
  onEscape?: () => void;
}

export const useNoteKeyboardShortcuts = ({
  onNewNote,
  onSearch,
  onFocusMode,
  onAIActions,
  onEscape,
}: UseNoteKeyboardShortcutsProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + N - New note
      if (cmdOrCtrl && e.key === 'n' && onNewNote) {
        e.preventDefault();
        onNewNote();
      }

      // Cmd/Ctrl + K - Search
      if (cmdOrCtrl && e.key === 'k' && onSearch) {
        e.preventDefault();
        onSearch();
      }

      // Cmd/Ctrl + Shift + F - Focus mode
      if (cmdOrCtrl && e.shiftKey && e.key === 'F' && onFocusMode) {
        e.preventDefault();
        onFocusMode();
      }

      // Cmd/Ctrl + / - AI actions
      if (cmdOrCtrl && e.key === '/' && onAIActions) {
        e.preventDefault();
        onAIActions();
      }

      // Escape - Exit editor
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNewNote, onSearch, onFocusMode, onAIActions, onEscape, navigate]);
};
