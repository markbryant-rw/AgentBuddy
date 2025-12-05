import { GroupedProperty, LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, RotateCcw, MapPin } from 'lucide-react';
import { format, differenceInMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface PropertyAppraisalCardProps {
  property: GroupedProperty;
  onClick: (appraisal: LoggedAppraisal) => void;
}

export const PropertyAppraisalCard = ({ property, onClick }: PropertyAppraisalCardProps) => {
  const { latestAppraisal, visits, visitCount, firstVisitDate, durationMonths } = property;

  const getIntentColor = (intent?: string) => {
    switch (intent) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return '';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getOutcomeStyle = (outcome?: string) => {
    if (outcome === 'WON') return 'bg-emerald-50/50 dark:bg-emerald-950/20';
    if (outcome === 'LOST') return 'bg-gray-100/50 dark:bg-gray-800/30';
    return '';
  };

  return (
    <div
      className={cn(
        "p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors",
        getOutcomeStyle(latestAppraisal.outcome)
      )}
      onClick={() => onClick(latestAppraisal)}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Property info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <h3 className="font-semibold truncate">{latestAppraisal.address}</h3>
          </div>
          {latestAppraisal.suburb && (
            <p className="text-sm text-muted-foreground ml-6">{latestAppraisal.suburb}</p>
          )}
          
          {/* Vendor and value */}
          <div className="flex items-center gap-4 mt-2 text-sm">
            {latestAppraisal.vendor_name && (
              <span className="text-muted-foreground">{latestAppraisal.vendor_name}</span>
            )}
            {latestAppraisal.estimated_value && (
              <span className="font-medium">${latestAppraisal.estimated_value.toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Center: Visit timeline visualization */}
        <div className="flex flex-col items-center gap-1">
          {visitCount > 1 ? (
            <>
              <div className="flex items-center gap-1">
                {visits.slice(0, 5).map((visit, idx) => (
                  <div
                    key={visit.id}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      idx === 0 ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                    title={format(new Date(visit.appraisal_date), 'dd MMM yyyy')}
                  />
                ))}
                {visitCount > 5 && (
                  <span className="text-xs text-muted-foreground ml-1">+{visitCount - 5}</span>
                )}
              </div>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                <RotateCcw className="h-3 w-3 mr-1" />
                {visitCount} visits
              </Badge>
              {durationMonths > 0 && (
                <span className="text-xs text-muted-foreground">
                  {durationMonths} month{durationMonths > 1 ? 's' : ''} nurturing
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">First visit</span>
          )}
        </div>

        {/* Right: Status and agent */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {latestAppraisal.intent && (
              <Badge variant="outline" className={cn("text-xs", getIntentColor(latestAppraisal.intent))}>
                {latestAppraisal.intent}
              </Badge>
            )}
            {latestAppraisal.stage && (
              <Badge variant="secondary" className="text-xs">
                {latestAppraisal.stage}
              </Badge>
            )}
            {latestAppraisal.outcome && latestAppraisal.outcome !== 'In Progress' && (
              <Badge 
                variant={latestAppraisal.outcome === 'WON' ? 'default' : 'outline'}
                className={cn(
                  "text-xs",
                  latestAppraisal.outcome === 'WON' && "bg-emerald-500 text-white",
                  latestAppraisal.outcome === 'LOST' && "bg-gray-500/10 text-gray-500"
                )}
              >
                {latestAppraisal.outcome}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(latestAppraisal.appraisal_date), 'dd MMM yyyy')}
          </div>

          {latestAppraisal.agent && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={latestAppraisal.agent.avatar_url} />
              <AvatarFallback className="text-xs">
                {getInitials(latestAppraisal.agent.full_name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
};
