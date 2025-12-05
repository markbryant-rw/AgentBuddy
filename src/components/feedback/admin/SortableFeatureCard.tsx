import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  vote_count: number;
  created_at: string;
  user_id: string;
  module?: string;
  priority?: string;
  archived_reason?: string;
  attachments?: string[];
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface SortableFeatureCardProps {
  feature: FeatureRequest;
  onClick: () => void;
}

// Helper functions for smart module filtering
const shouldShowModule = (module?: string) => {
  if (!module) return false;
  const hiddenModules = ['feedback-centre', 'feedback', 'system', 'general'];
  return !hiddenModules.includes(module.toLowerCase());
};

const moduleDisplayNames: Record<string, string> = {
  'appraisals': 'Appraisals',
  'transactions': 'Transactions',
  'transaction-coordinating': 'Transactions',
  'tasks': 'Tasks',
  'daily-planner': 'Planner',
  'messaging': 'Messages',
  'stock-board': 'Stock',
  'team-management': 'Teams',
  'office-manager': 'Office',
};

const getModuleDisplay = (module?: string) => {
  if (!module) return null;
  return moduleDisplayNames[module.toLowerCase()] || module;
};

export const SortableFeatureCard = ({ feature, onClick }: SortableFeatureCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: feature.id,
    data: { type: 'feature', feature },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-blue-500',
  };

  const isCompleted = feature.status === 'completed';
  const isArchived = feature.status === 'archived';
  const completeStyles = isCompleted
    ? 'border-l-4 border-green-500 bg-green-50/50 dark:bg-green-950/20'
    : isArchived
    ? 'border-l-4 border-muted bg-muted/30'
    : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative transition-all duration-300 ease-out',
        isDragging && 'z-50 opacity-30 scale-105',
        isOver && 'mt-16 mb-2'
      )}
      {...attributes}
      {...listeners}
    >
      {/* Drop Indicator */}
      {isOver && (
        <div className="absolute -top-14 left-2 right-2 flex items-center gap-2">
          <div className="h-[3px] flex-1 bg-primary rounded-full animate-pulse shadow-[0_0_16px_rgba(59,130,246,0.9)]" />
        </div>
      )}
      
      <Card
        className={cn(
          'p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all',
          completeStyles
        )}
        onClick={onClick}
      >
        <div className="space-y-2">
          {/* Top: Title + Single Main Badge */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-semibold line-clamp-2 flex-1">{feature.title}</h4>
            <div>
              {isCompleted ? (
                <Badge variant="outline" className="bg-green-500 text-white text-[10px] px-1.5 border-green-500 shrink-0">
                  Done ✓
                </Badge>
              ) : isArchived ? (
                <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] px-1.5 shrink-0">
                  Archived
                </Badge>
              ) : feature.priority ? (
                <Badge variant="outline" className={`${priorityColors[feature.priority as keyof typeof priorityColors]} text-white text-[10px] px-1.5 shrink-0`}>
                  {feature.priority}
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Description Preview */}
          <p className="text-xs text-muted-foreground line-clamp-2">{feature.description}</p>

          {/* Module (only if meaningful) */}
          {shouldShowModule(feature.module) && (
            <Badge variant="secondary" className="text-[10px] w-fit">
              {getModuleDisplay(feature.module)}
            </Badge>
          )}

          {/* Bottom: Reporter + Time + Votes */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={feature.profiles?.avatar_url} />
                <AvatarFallback className="text-[10px]">
                  {feature.profiles?.full_name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] text-muted-foreground">
                {feature.profiles?.full_name || 'Unknown'}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {formatDistanceToNow(new Date(feature.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Votes + Attachments */}
          <div className="flex items-center gap-3">
            {feature.vote_count > 0 && (
              <span className="text-[10px] text-muted-foreground">
                👍 {feature.vote_count}
              </span>
            )}
            {feature.attachments && feature.attachments.length > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {feature.attachments.length}
              </span>
            )}
          </div>

          {/* Archived Reason (subtle, at bottom) */}
          {isArchived && feature.archived_reason && (
            <div className="text-[10px] text-muted-foreground italic">
              {feature.archived_reason}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
