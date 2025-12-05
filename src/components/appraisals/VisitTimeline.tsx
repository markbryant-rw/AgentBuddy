import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface VisitTimelineProps {
  visits: LoggedAppraisal[];
  currentVisitId?: string;
  onVisitClick?: (visit: LoggedAppraisal) => void;
}

export const VisitTimeline = ({ visits, currentVisitId, onVisitClick }: VisitTimelineProps) => {
  const getIntentColor = (intent?: string) => {
    switch (intent) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-muted-foreground';
    }
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'WON': return 'text-emerald-600 bg-emerald-500/10';
      case 'LOST': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (visits.length === 0) return null;

  return (
    <div className="space-y-3 p-4 rounded-lg bg-muted/50">
      <h3 className="text-base font-semibold text-foreground border-b border-border pb-2 flex items-center gap-2">
        <span>Visit Timeline</span>
        <Badge variant="secondary" className="text-xs">{visits.length} visit{visits.length > 1 ? 's' : ''}</Badge>
      </h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
        
        <div className="space-y-4">
          {visits.map((visit, index) => {
            const isCurrent = visit.id === currentVisitId;
            const isLatest = index === 0;
            
            return (
              <div
                key={visit.id}
                className={cn(
                  "relative pl-8 cursor-pointer group",
                  isCurrent && "bg-primary/5 -mx-2 px-2 py-2 rounded-lg ml-6"
                )}
                onClick={() => onVisitClick?.(visit)}
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    "absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 border-background",
                    isLatest ? getIntentColor(visit.intent) : "bg-muted-foreground/50"
                  )}
                />
                
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        "font-medium text-sm",
                        isCurrent && "text-primary"
                      )}>
                        {format(new Date(visit.appraisal_date), 'dd MMM yyyy')}
                      </span>
                      {isLatest && (
                        <Badge variant="secondary" className="text-xs">Latest</Badge>
                      )}
                      {isCurrent && (
                        <Badge variant="default" className="text-xs">Current</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {visit.stage && <span>{visit.stage}</span>}
                      {visit.intent && (
                        <Badge variant="outline" className={cn(
                          "text-xs py-0",
                          visit.intent === 'high' && "text-red-500 border-red-500/20",
                          visit.intent === 'medium' && "text-orange-500 border-orange-500/20",
                          visit.intent === 'low' && "text-blue-500 border-blue-500/20"
                        )}>
                          {visit.intent}
                        </Badge>
                      )}
                      {visit.outcome && visit.outcome !== 'In Progress' && (
                        <Badge variant="outline" className={cn("text-xs py-0", getOutcomeColor(visit.outcome))}>
                          {visit.outcome}
                        </Badge>
                      )}
                    </div>
                    
                    {visit.estimated_value && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Est: ${visit.estimated_value.toLocaleString()}
                      </div>
                    )}
                    
                    {visit.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 group-hover:line-clamp-none transition-all">
                        {visit.notes}
                      </p>
                    )}
                  </div>
                  
                  {visit.agent && (
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={visit.agent.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getInitials(visit.agent.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
