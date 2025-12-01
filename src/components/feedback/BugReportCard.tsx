import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BugReport } from '@/hooks/useBugReports';
import { useBugVotes } from '@/hooks/useBugVotes';
import { format } from 'date-fns';
import { Paperclip, MessageSquare, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// Move static functions outside component for better performance
const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'low':
      return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
    case 'medium':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
    case 'high':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20';
    case 'critical':
      return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20';
    default:
      return 'bg-muted text-muted-foreground border-muted';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
    case 'investigating':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'fixed':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'duplicate':
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    case 'rejected':
      return 'bg-muted text-muted-foreground border-muted';
    default:
      return 'bg-muted text-muted-foreground border-muted';
  }
};

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

interface BugReportCardProps {
  bug: BugReport;
  onClick: () => void;
}

const BugReportCardComponent = ({ bug, onClick }: BugReportCardProps) => {
  const { hasVoted, toggleVote, isToggling } = useBugVotes(bug.id);

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleVote();
  };

  return (
    <Card 
      className="group hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-red-500"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg leading-tight flex-1">
              {bug.summary}
            </h3>
            <div className="flex gap-2 flex-shrink-0">
              <Badge variant="outline" className={getSeverityColor(bug.severity)}>
                {bug.severity.toUpperCase()}
              </Badge>
              <Badge variant="outline" className={getStatusColor(bug.status)}>
                {getStatusLabel(bug.status)}
              </Badge>
            </div>
          </div>
          
          <p className="text-muted-foreground text-sm line-clamp-2">
            {bug.description}
          </p>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span>By {bug.profiles?.full_name || 'Anonymous'}</span>
            <span>•</span>
            <span>{format(new Date(bug.created_at), 'MMM d, yyyy')}</span>
            {bug.module && (
              <>
                <span>•</span>
                <span className="font-medium">{bug.module}</span>
              </>
            )}
            {bug.attachments && bug.attachments.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {bug.attachments.length}
                </span>
              </>
            )}
            {bug.admin_comments && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                  <MessageSquare className="h-3 w-3" />
                  Admin replied
                </span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleVoteClick}
              disabled={isToggling}
              className={cn(
                "gap-2 h-8",
                hasVoted && "text-primary"
              )}
            >
              <UserCheck className={cn("h-4 w-4", hasVoted && "fill-primary")} />
              <span className="text-xs font-medium">
                {hasVoted ? "Me too" : "Me too"}
              </span>
              {bug.vote_count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {bug.vote_count}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const BugReportCard = memo(BugReportCardComponent);
