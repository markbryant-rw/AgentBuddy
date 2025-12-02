import { useState, useRef, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AddDailyTaskInputProps {
  defaultCategory?: 'big' | 'medium' | 'little';
}

export function AddDailyTaskInput({ defaultCategory = 'little' }: AddDailyTaskInputProps = {}) {
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { createTask, updateTask } = useTasks();
  const queryClient = useQueryClient();

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && title.trim()) {
      e.preventDefault();
      handleCreate();
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) return;

    const { data: teamMemberData } = await (supabase as any)
      .from('team_members')
      .select('team_id')
      .eq('user_id', user?.id)
      .single();

    if (!teamMemberData) return;

    const today = new Date().toISOString().split('T')[0];
    const { data: existingLittleTasks } = await (supabase as any)
      .from('tasks')
      .select('daily_position')
      .eq('size_category', 'little')
      .eq('scheduled_date', today)
      .eq('team_id', teamMemberData.team_id);

    const maxPosition = Math.max(-1, ...(existingLittleTasks?.map(t => t.daily_position ?? -1) || []));

    const task = await createTask({
      title: title.trim(),
      listId: null,
    });

    if (task?.id) {
      await updateTask({
        taskId: task.id,
        updates: {
          // @ts-ignore - New fields not yet in generated types
          scheduled_date: today,
          size_category: 'little',
          estimated_duration_minutes: 5,
          daily_position: maxPosition + 1,
        }
      });
    }

    setTitle('');
    inputRef.current?.focus();
    
    await queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
    await queryClient.refetchQueries({ queryKey: ['daily-tasks'] });
  };

  return (
    <Input
      ref={inputRef}
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="+ Add a quick win (5min task, press Enter)"
      className="text-sm border-dashed"
    />
  );
}
