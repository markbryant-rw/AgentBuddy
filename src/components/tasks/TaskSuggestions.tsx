import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskSuggestion {
  title: string;
  priority: 'low' | 'medium' | 'high';
}

interface TaskSuggestionsProps {
  suggestions: TaskSuggestion[];
  onAccept: (selectedTasks: TaskSuggestion[]) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export const TaskSuggestions = ({
  suggestions,
  onAccept,
  onSkip,
  isLoading,
}: TaskSuggestionsProps) => {
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [editedTitles, setEditedTitles] = useState<Record<number, string>>({});

  const toggleTask = (index: number) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTasks(newSelected);
  };

  const handleTitleEdit = (index: number, newTitle: string) => {
    setEditedTitles({ ...editedTitles, [index]: newTitle });
  };

  const handleAccept = () => {
    const selected = suggestions
      .map((suggestion, index) => ({
        ...suggestion,
        title: editedTitles[index] || suggestion.title,
      }))
      .filter((_, index) => selectedTasks.has(index));
    
    onAccept(selected);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6 bg-card rounded-lg border border-border shadow-lg animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5 animate-pulse" />
          <h3 className="font-semibold">Generating task suggestions...</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 bg-card rounded-lg border border-border shadow-lg animate-in slide-in-from-bottom-4 duration-300">
      {/* Header with sparkle animation */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        <h3 className="font-semibold">Suggested Tasks</h3>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border transition-all duration-200",
              "hover:shadow-md hover:border-primary/30",
              selectedTasks.has(index) && "border-primary bg-primary/5"
            )}
          >
            <Checkbox
              checked={selectedTasks.has(index)}
              onCheckedChange={() => toggleTask(index)}
              className="mt-1"
            />
            <div className="flex-1 space-y-2">
              <Input
                value={editedTitles[index] || suggestion.title}
                onChange={(e) => handleTitleEdit(index, e.target.value)}
                className="border-0 p-0 h-auto font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Badge variant={getPriorityColor(suggestion.priority)} className="text-xs">
                {suggestion.priority} priority
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
        <Button
          onClick={handleAccept}
          disabled={selectedTasks.size === 0}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Add Selected ({selectedTasks.size})
        </Button>
      </div>
    </div>
  );
};
