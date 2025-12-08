import { GroupedProperty, LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { StageInfoTooltip } from '@/components/appraisals/StageInfoTooltip';
import { AppraisalStage } from '@/hooks/useAppraisalTemplates';
import { BeaconStatusIndicator } from './BeaconStatusIndicator';
import { useBeaconIntegration } from '@/hooks/useBeaconIntegration';

interface PropertyAppraisalCardProps {
  property: GroupedProperty;
  onClick: (appraisal: LoggedAppraisal) => void;
}

export const PropertyAppraisalCard = ({ property, onClick }: PropertyAppraisalCardProps) => {
  const { latestAppraisal, visitCount } = property;
  const { isBeaconEnabled } = useBeaconIntegration();

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
    if (outcome === 'WON') return 'bg-emerald-100 dark:bg-emerald-950/40';
    if (outcome === 'LOST') return 'bg-red-100 dark:bg-red-950/40';
    return '';
  };

  return (
    <div
      className={cn(
        "py-2 px-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors",
        getOutcomeStyle(latestAppraisal.outcome)
      )}
      onClick={() => onClick(latestAppraisal)}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Property info - single line */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">{latestAppraisal.address}</span>
          {latestAppraisal.suburb && (
            <span className="text-xs text-muted-foreground truncate hidden sm:inline">
              {latestAppraisal.suburb}
            </span>
          )}
          {latestAppraisal.vendor_name && (
            <>
              <span className="text-muted-foreground hidden md:inline">•</span>
              <span className="text-xs text-muted-foreground truncate hidden md:inline">
                {latestAppraisal.vendor_name}
              </span>
            </>
          )}
        </div>

        {/* Right: All metadata on one line */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Beacon Status - only show if Beacon enabled and report exists */}
          {isBeaconEnabled && latestAppraisal.beacon_report_id && (
            <BeaconStatusIndicator
              hasReport={!!latestAppraisal.beacon_report_id}
              viewCount={latestAppraisal.beacon_total_views || 0}
              propensityScore={latestAppraisal.beacon_propensity_score || 0}
              isHotLead={latestAppraisal.beacon_is_hot_lead || false}
              reportCreatedAt={latestAppraisal.beacon_report_created_at || undefined}
              reportSentAt={latestAppraisal.beacon_report_sent_at || undefined}
              compact
            />
          )}

          {/* Visit count */}
          {visitCount > 1 ? (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs px-1.5 py-0">
              <RotateCcw className="h-3 w-3 mr-1" />
              {visitCount}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground hidden lg:inline">1st</span>
          )}

          {/* Intent */}
          {latestAppraisal.intent && (
            <Badge variant="outline" className={cn("text-xs px-1.5 py-0", getIntentColor(latestAppraisal.intent))}>
              {latestAppraisal.intent}
            </Badge>
          )}

          {/* Stage */}
          {latestAppraisal.stage && (
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {latestAppraisal.stage}
              </Badge>
              <StageInfoTooltip stage={latestAppraisal.stage as AppraisalStage} className="h-3 w-3" />
            </div>
          )}

          {/* Outcome */}
          {latestAppraisal.outcome && latestAppraisal.outcome !== 'In Progress' && (
            <Badge 
              variant={latestAppraisal.outcome === 'WON' ? 'default' : 'outline'}
              className={cn(
                "text-xs px-1.5 py-0",
                latestAppraisal.outcome === 'WON' && "bg-emerald-500 text-white",
                latestAppraisal.outcome === 'LOST' && "bg-gray-500/10 text-gray-500"
              )}
            >
              {latestAppraisal.outcome}
            </Badge>
          )}

          {/* Date */}
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {format(new Date(latestAppraisal.appraisal_date), 'dd MMM')}
          </span>

          {/* Agent avatar */}
          {latestAppraisal.agent && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={latestAppraisal.agent.avatar_url} />
              <AvatarFallback className="text-[10px]">
                {getInitials(latestAppraisal.agent.full_name)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  );
};
