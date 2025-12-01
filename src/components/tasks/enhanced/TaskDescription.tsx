import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit2, Save, X } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { RichTextPostEditor } from '@/components/social/RichTextPostEditor';
import DOMPurify from 'dompurify';

interface Task {
  id: string;
  description: string | null;
  [key: string]: any;
}

interface TaskDescriptionProps {
  task: Task;
}

export function TaskDescription({ task }: TaskDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(task.description || '');
  const { updateTask } = useTasks();

  const handleSave = async () => {
    await updateTask({
      taskId: task.id,
      updates: {
        description: description.trim() || null,
      },
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDescription(task.description || '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Description</h3>
        {!isEditing ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
            >
              <Save className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        <RichTextPostEditor
          value={description}
          onChange={setDescription}
          placeholder="Add a detailed description..."
        />
      ) : (
        <div className="prose prose-sm max-w-none">
          {task.description ? (
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(task.description) }} />
          ) : (
            <p className="text-muted-foreground text-sm">No description yet. Click edit to add one.</p>
          )}
        </div>
      )}
    </div>
  );
}
