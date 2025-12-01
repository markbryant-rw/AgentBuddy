import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { useTaskTags } from '@/hooks/useTaskTags';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface TagSelectorContentProps {
  taskId: string;
  selectedTags: any[];
  onTagsChange: () => void;
}

const colorOptions = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
  '#8b5cf6', '#ec4899', '#64748b', '#6366f1'
];

export const TagSelectorContent = ({ taskId, selectedTags, onTagsChange }: TagSelectorContentProps) => {
  const { tags, createTag, addTagToTask, removeTagFromTask } = useTaskTags();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      const tag: any = await createTag({ name: newTagName.trim(), color: newTagColor });
      await addTagToTask({ taskId, tagId: tag.id });
      setNewTagName('');
      setNewTagColor('#3b82f6');
      setIsCreating(false);
      onTagsChange();
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  const handleToggleTag = async (tagId: string) => {
    const isSelected = selectedTags.some(t => t.id === tagId);
    const tag = tags.find(t => t.id === tagId);
    
    if (isSelected) {
      await removeTagFromTask({ taskId, tagId });
      toast.success(`"${tag?.name}" removed`);
    } else {
      await addTagToTask({ taskId, tagId });
      toast.success(`"${tag?.name}" added`);
    }
    // Don't close popover - let user add multiple tags
  };

  return (
    <div className="space-y-4 pointer-events-auto">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Labels</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreating(!isCreating)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {isCreating && (
        <div className="space-y-2 p-2 border rounded-md">
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="Tag name..."
            autoFocus
          />
          <div className="flex gap-1">
            {colorOptions.map((color) => (
              <button
                key={color}
                onClick={() => setNewTagColor(color)}
                className="w-6 h-6 rounded border-2"
                style={{
                  backgroundColor: color,
                  borderColor: newTagColor === color ? 'hsl(var(--primary))' : 'transparent',
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreateTag} className="flex-1">
              Create
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="max-h-60">
        <div className="space-y-1">
          {tags.map((tag) => {
            const isSelected = selectedTags.some(t => t.id === tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => handleToggleTag(tag.id)}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-muted transition-colors pointer-events-auto"
              >
                <Badge
                  variant="secondary"
                  className="border"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    borderColor: `${tag.color}40`,
                  }}
                >
                  {tag.name}
                </Badge>
                {isSelected && <X className="h-4 w-4 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
