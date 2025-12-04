import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Trash2, Clock, Pencil, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { DailyPlannerItem } from '@/hooks/useDailyPlanner';
import { motion } from 'framer-motion';
import { TimeEstimateSelector } from '@/components/tasks/daily/TimeEstimateSelector';
import { CompactAssigner } from './CompactAssigner';
import confetti from 'canvas-confetti';

interface PlannerItemProps {
  item: DailyPlannerItem;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveAssignments: (itemId: string, userIds: string[]) => void;
  onUpdateTime: (id: string, minutes: number) => void;
  onUpdateTitle?: (id: string, title: string) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
}

const categoryConfig = {
  big: {
    accentColor: 'border-t-blue-500',
    hoverColor: 'hover:border-blue-500/50 hover:shadow-blue-500/10',
  },
  medium: {
    accentColor: 'border-t-amber-500',
    hoverColor: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
  },
  little: {
    accentColor: 'border-t-green-500',
    hoverColor: 'hover:border-green-500/50 hover:shadow-green-500/10',
  },
};

export function PlannerItem({ 
  item, 
  onToggleComplete, 
  onDelete,
  onSaveAssignments,
  onUpdateTime,
  onUpdateTitle,
  onUpdateNotes
}: PlannerItemProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [titleValue, setTitleValue] = useState(item.title);
  const [notesValue, setNotesValue] = useState(item.notes || '');
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = categoryConfig[item.size_category || 'medium'];

  const handleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleComplete(item.id);
    
    if (!item.completed) {
      // Trigger confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
      // Flip to front to show success
      setIsFlipped(false);
    }
  };

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingTitle(true);
    setTitleValue(item.title);
  };

  const handleTitleSave = () => {
    if (titleValue.trim() && titleValue !== item.title && onUpdateTitle) {
      onUpdateTitle(item.id, titleValue.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTitleValue(item.title);
      setIsEditingTitle(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="w-[240px]"
    >
      <motion.div
        className={cn(
          "group relative w-[240px] h-[140px] rounded-lg border-2 bg-card transition-all cursor-pointer",
          item.completed 
            ? "bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500" 
            : "hover:shadow-md border-border hover:border-primary/50",
          isDragging && "opacity-30 scale-95 cursor-grabbing"
        )}
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ transformStyle: 'preserve-3d' }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front Side - Vertical Centered Layout */}
        <div 
          className={cn(
            "absolute inset-0 flex flex-col justify-between p-4",
            isFlipped && "invisible"
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Top row: Drag handle, Note indicator & Delete */}
          <div className="flex items-center justify-between">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {item.notes && (
                <div className="h-6 w-6 flex items-center justify-center">
                  <FileText className="h-3.5 w-3.5 text-primary/60" />
                </div>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                  setTitleValue(item.title);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Center: Title */}
          <div className="flex-1 flex items-center justify-center px-2">
            {isEditingTitle ? (
              <Input
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="text-base font-semibold text-center h-auto py-1 border-primary"
                autoFocus
                onFocus={(e) => e.target.select()}
              />
            ) : (
              <p 
                className={cn(
                  "text-base font-semibold text-center line-clamp-3 cursor-text hover:opacity-70 transition-opacity",
                  item.completed && "line-through text-muted-foreground"
                )}
                onDoubleClick={handleTitleDoubleClick}
                title="Double-click to edit"
              >
                {item.title}
              </p>
            )}
          </div>

          {/* Bottom row: Avatars & Time */}
          <div className="flex items-center justify-between">
            <div onClick={(e) => e.stopPropagation()}>
              <CompactAssigner item={item} onSave={onSaveAssignments} />
            </div>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <TimeEstimateSelector
                value={item.estimated_minutes || 15}
                onChange={(minutes) => onUpdateTime(item.id, minutes)}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2 text-xs font-medium rounded-full transition-opacity",
                    item.estimated_minutes 
                      ? item.completed 
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : "bg-muted text-muted-foreground" 
                      : "opacity-0 group-hover:opacity-100"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.estimated_minutes ? `${item.estimated_minutes}m` : <Clock className="h-3 w-3" />}
                </Button>
              </TimeEstimateSelector>
            </div>
          </div>

          {/* Centered Checkbox Overlay */}
          <div className={cn(
            "absolute inset-0 flex items-center justify-center pointer-events-none",
            isEditingTitle && "hidden"
          )}>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-12 w-12 rounded-full border-2 transition-all pointer-events-auto",
                item.completed 
                  ? "bg-green-500 border-green-500 text-white hover:bg-green-600 shadow-lg" 
                  : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100"
              )}
              onClick={handleComplete}
            >
              {item.completed && <Check className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Back Side - Description */}
        <div 
          className={cn(
            "absolute inset-0 flex flex-col p-4 justify-center",
            !isFlipped && "invisible"
          )}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (!isEditingNotes) {
              // Save notes if changed and flip back
              if (onUpdateNotes && notesValue !== item.notes) {
                onUpdateNotes(item.id, notesValue);
              }
              setIsFlipped(false);
            }
          }}
        >
          {!isEditingNotes ? (
            // Display mode - click anywhere to flip back
            <div className="relative w-full h-full flex items-center justify-center p-2 cursor-pointer">
              <p className="text-sm text-muted-foreground text-center whitespace-pre-wrap break-words">
                {notesValue || 'Click to add description...'}
              </p>
              {/* Edit button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 h-6 w-6 opacity-0 hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingNotes(true);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            // Edit mode - typing
            <Textarea
              value={notesValue}
              onChange={(e) => {
                const newValue = e.target.value;
                const lineCount = (newValue.match(/\n/g) || []).length + 1;
                
                if (lineCount <= 4 && newValue.length <= 200) {
                  setNotesValue(newValue);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsEditingNotes(false);
                  setIsFlipped(false);
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (onUpdateNotes && notesValue !== item.notes) {
                    onUpdateNotes(item.id, notesValue);
                  }
                  setIsEditingNotes(false);
                  setIsFlipped(false);
                }
              }}
              onBlur={() => {
                if (onUpdateNotes && notesValue !== item.notes) {
                  onUpdateNotes(item.id, notesValue);
                }
                setIsEditingNotes(false);
              }}
              placeholder="Describe this task..."
              rows={4}
              className="resize-none border-none bg-transparent text-sm leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
              maxLength={200}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}
