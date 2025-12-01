import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useTasks } from '@/hooks/useTasks';

interface InlineTaskInputProps {
  listId: string;
  boardId?: string | null;
  onCancel: () => void;
}

export const InlineTaskInput = ({ listId, boardId, onCancel }: InlineTaskInputProps) => {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { createTask } = useTasks(boardId);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      e.preventDefault();
      await createTask({ title: title.trim(), listId });
      setTitle('');
      inputRef.current?.focus();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    if (!title.trim()) {
      onCancel();
    }
  };

  return (
    <div className="px-3 py-2">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Type task name and press Enter"
        className="h-9 text-sm"
      />
    </div>
  );
};
