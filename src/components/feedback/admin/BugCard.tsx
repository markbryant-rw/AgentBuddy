import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ImageIcon, ArrowRight, CheckCircle, Archive } from 'lucide-react';

interface BugReport {
  id: string;
  summary: string;
  description: string;
  severity: string;
  status: string;
  vote_count: number;
  created_at: string;
  user_id: string;
  module?: string;
  archived_reason?: string;
  attachments?: string[];
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface BugCardProps {
  bug: BugReport;
  onClick: () => void;
  onStatusChange: (bugId: string, newStatus: string) => void;
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

// Status transition options based on current status
// Workflow: Triage → In Progress → Needs Review → Fixed (Complete)
const getStatusTransitions = (currentStatus: string) => {
  switch (currentStatus) {
    case 'triage':
    case 'open':
      return [
        { status: 'in_progress', label: 'Start Investigating', icon: ArrowRight, variant: 'default' as const },
      ];
    case 'in_progress':
      return [
        { status: 'needs_review', label: 'Move to Review', icon: ArrowRight, variant: 'default' as const },
      ];
    case 'needs_review':
      return [
        { status: 'fixed', label: 'Mark as Fixed', icon: CheckCircle, variant: 'success' as const },
        { status: 'in_progress', label: 'Back to Progress', icon: ArrowRight, variant: 'secondary' as const },
      ];
    case 'fixed':
      return [
        { status: 'archived', label: 'Archive', icon: Archive, variant: 'secondary' as const },
        { status: 'in_progress', label: 'Reopen', icon: ArrowRight, variant: 'secondary' as const },
      ];
    case 'archived':
      return [
        { status: 'in_progress', label: 'Reopen', icon: ArrowRight, variant: 'secondary' as const },
      ];
    default:
      return [];
  }
};

const severityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-amber-500',
  low: 'bg-blue-500',
};

export const BugCard = ({ bug, onClick, onStatusChange }: BugCardProps) => {
  const isFixed = bug.status === 'fixed';
  const isArchived = bug.status === 'archived';
  const completeStyles = isFixed
    ? 'border-l-4 border-green-500 bg-green-50/50 dark:bg-green-950/20'
    : isArchived
    ? 'border-l-4 border-muted bg-muted/30'
    : '';

  const transitions = getStatusTransitions(bug.status);

  return (
    <Card
      className={cn(
        'p-3 hover:shadow-md transition-all cursor-pointer',
        completeStyles
      )}
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* Top: Title + Single Main Badge */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xs font-semibold line-clamp-2 flex-1">{bug.summary}</h4>
          <div>
            {isFixed ? (
              <Badge variant="outline" className="bg-green-500 text-white text-[10px] px-1.5 border-green-500 shrink-0">
                Fixed ✓
              </Badge>
            ) : isArchived ? (
              <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] px-1.5 shrink-0">
                Archived
              </Badge>
            ) : (
              <Badge variant="outline" className={`${severityColors[bug.severity as keyof typeof severityColors]} text-white text-[10px] px-1.5 shrink-0`}>
                {bug.severity}
              </Badge>
            )}
          </div>
        </div>

        {/* Description Preview */}
        <p className="text-xs text-muted-foreground line-clamp-2">{bug.description}</p>

        {/* Module (only if meaningful) */}
        {shouldShowModule(bug.module) && (
          <Badge variant="secondary" className="text-[10px] w-fit">
            {getModuleDisplay(bug.module)}
          </Badge>
        )}

        {/* Bottom: Reporter + Time + Votes */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={bug.profiles?.avatar_url} />
              <AvatarFallback className="text-[10px]">
                {bug.profiles?.full_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-muted-foreground">
              {bug.profiles?.full_name || 'Unknown'}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(bug.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Votes + Attachments */}
        <div className="flex items-center gap-3">
          {bug.vote_count > 0 && (
            <span className="text-[10px] text-muted-foreground">
              👍 {bug.vote_count}
            </span>
          )}
          {bug.attachments && bug.attachments.length > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              {bug.attachments.length}
            </span>
          )}
        </div>

        {/* Archived Reason (subtle, at bottom) */}
        {isArchived && bug.archived_reason && (
          <div className="text-[10px] text-muted-foreground italic">
            {bug.archived_reason}
          </div>
        )}

        {/* Status Transition Buttons */}
        {transitions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/50">
            {transitions.map((transition, idx) => {
              const Icon = transition.icon;
              const isSuccess = transition.variant === 'success';
              const isPrimary = idx === 0;
              return (
                <Button
                  key={transition.status}
                  variant={isSuccess ? 'default' : isPrimary ? 'outline' : 'ghost'}
                  size="sm"
                  className={cn(
                    "h-7 text-xs font-medium min-w-0",
                    isPrimary && transitions.length === 1 && "flex-1",
                    isSuccess && "bg-green-600 hover:bg-green-700 text-white"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(bug.id, transition.status);
                  }}
                >
                  <Icon className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span className="truncate">{transition.label}</span>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
};
