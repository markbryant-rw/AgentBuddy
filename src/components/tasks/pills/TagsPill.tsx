import { useState } from 'react';
import { Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagSelectorContent } from '../TagSelectorContent';
import { cn } from '@/lib/utils';

interface TagsPillProps {
  task: any;
  showAlways?: boolean;
  isHovered?: boolean;
}

export const TagsPill = ({ task, showAlways = true, isHovered = false }: TagsPillProps) => {
  const [open, setOpen] = useState(false);

  const tags = task.tags || [];
  const hasMultipleTags = tags.length > 1;
  const shouldShow = tags.length > 0 || showAlways || isHovered;

  if (!shouldShow) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {tags.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Badge 
              variant="secondary" 
              className="h-5 px-2 text-xs"
              style={{ backgroundColor: tags[0].color + '20', color: tags[0].color }}
            >
              {tags[0].name}
            </Badge>
            {hasMultipleTags && (
              <span className="text-muted-foreground">+{tags.length - 1}</span>
            )}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 p-0",
              "transition-all duration-200",
              "opacity-0 group-hover:opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <TagIcon className="h-3 w-3" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 z-[9999]" 
        align="start"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <TagSelectorContent 
          taskId={task.id} 
          selectedTags={task.tags || []}
          onTagsChange={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
};
