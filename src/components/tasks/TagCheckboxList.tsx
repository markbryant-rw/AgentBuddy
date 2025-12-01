import { useState } from 'react';
import { useTaskTags } from '@/hooks/useTaskTags';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TagCheckboxListProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', 
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

export const TagCheckboxList = ({ selectedIds, onChange }: TagCheckboxListProps) => {
  const { tags, isLoading, createTag } = useTaskTags();
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const handleToggle = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    try {
      const result = await createTag({ name: newTagName.trim(), color: newTagColor });
      
      // Check if we got a valid tag back
      if (!result || typeof result !== 'object') return;
      
      // At this point, result is definitely an object
      const resultObj = result as Record<string, any>;
      if (!('id' in resultObj)) return;
      
      const tagId = resultObj.id as string;
      if (tagId) {
        onChange([...selectedIds, tagId]);
        setNewTagName('');
        setNewTagColor(TAG_COLORS[0]);
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Select tags</p>
        {!isCreating && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Tag
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
          <Input
            placeholder="Tag name"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="h-8"
            autoFocus
          />
          <div className="flex gap-1 flex-wrap">
            {TAG_COLORS.map(color => (
              <button
                key={color}
                type="button"
                className={`w-6 h-6 rounded-full transition-all ${
                  newTagColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setNewTagColor(color)}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
              className="h-7 flex-1"
            >
              Create
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setIsCreating(false);
                setNewTagName('');
              }}
              className="h-7"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="max-h-[200px] overflow-y-auto space-y-1">
        {tags.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center">
            No tags yet. Create one above!
          </div>
        ) : (
          tags.map(tag => (
            <div
              key={tag.id}
              className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg cursor-pointer transition-colors"
              onClick={() => handleToggle(tag.id)}
            >
              <Checkbox
                checked={selectedIds.includes(tag.id)}
                onCheckedChange={() => handleToggle(tag.id)}
              />
              <Badge
                variant="outline"
                className="text-xs"
                style={{ 
                  backgroundColor: `${tag.color}15`,
                  borderColor: tag.color,
                  color: tag.color 
                }}
              >
                {tag.name}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
