import { GroupedProperty, LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { format, parseISO, isBefore, isToday, startOfDay } from 'date-fns';
import { Calendar, RotateCcw, CheckCircle2, MapPin, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { AppraisalTaskCount } from '@/hooks/useAppraisalTaskCounts';
import { BeaconStatusIndicator } from './BeaconStatusIndicator';

interface PropertyAppraisalCardProps {
  property: GroupedProperty;
  onClick: (appraisal: LoggedAppraisal) => void;
  taskCount?: AppraisalTaskCount;
}

export const PropertyAppraisalCard = ({ property, onClick, taskCount }: PropertyAppraisalCardProps) => {
  const { latestAppraisal, visitCount } = property;
  const isBooked = latestAppraisal.appointment_status === 'booked';
  const appointmentDate = parseISO(latestAppraisal.appraisal_date);
  const isOverdue = isBooked && isBefore(appointmentDate, startOfDay(new Date())) && !isToday(appointmentDate);

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

  // Determine if tasks are overdue
  const hasOverdueTasks = taskCount && taskCount.overdue > 0;

  // Determine row styling based on booking state
  const getRowStyle = () => {
    if (isOverdue) {
      return 'border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20';
    }
    if (isBooked) {
      return 'border-l-4 border-l-sky-500 bg-sky-50/50 dark:bg-sky-950/20';
    }
    if (latestAppraisal.outcome === 'WON') {
      return 'bg-emerald-50/30 dark:bg-emerald-950/10';
    }
    if (latestAppraisal.outcome === 'LOST') {
      return 'bg-gray-50/50 dark:bg-gray-800/20';
    }
    return '';
  };

  // Determine stage or outcome to show
  const getStageOrOutcome = () => {
    if (latestAppraisal.outcome === 'WON') {
      return { label: 'WON', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
    }
    if (latestAppraisal.outcome === 'LOST') {
      return { label: 'LOST', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
    }
    return { label: latestAppraisal.stage || 'VAP', className: '' };
  };

  const stageOrOutcome = getStageOrOutcome();

  return (
    <div 
      className={cn(
        "px-3 py-2 rounded-md border cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3",
        getRowStyle()
      )}
      onClick={() => onClick(latestAppraisal)}
    >
      {/* 1. Address & Suburb */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium truncate">{latestAppraisal.address}</span>
        {latestAppraisal.suburb && (
          <span className="text-muted-foreground text-sm truncate hidden sm:inline">
            • {latestAppraisal.suburb}
          </span>
        )}
      </div>

      {/* 2. Task counter (red if overdue) */}
      {taskCount && taskCount.total > 0 && (
        <div className={cn(
          "flex items-center gap-1 text-xs shrink-0",
          hasOverdueTasks ? "text-red-500 font-medium" : "text-muted-foreground"
        )}>
          <span>{taskCount.done}/{taskCount.total}</span>
        </div>
      )}

      {/* 3. Beacon Status Indicator (4-step pipeline) */}
      <BeaconStatusIndicator
        compact
        hasReport={!!latestAppraisal.beacon_report_url}
        isSent={!!latestAppraisal.beacon_report_sent_at}
        viewCount={latestAppraisal.beacon_total_views || 0}
        propensityScore={latestAppraisal.beacon_propensity_score || 0}
        isHotLead={latestAppraisal.beacon_is_hot_lead || false}
        reportCreatedAt={latestAppraisal.beacon_report_created_at}
        reportSentAt={latestAppraisal.beacon_report_sent_at}
      />

      {/* 4. Repeat visit count */}
      {visitCount > 1 && (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs px-1.5 py-0 h-5 shrink-0">
          <RotateCcw className="h-3 w-3 mr-0.5" />
          {visitCount}
        </Badge>
      )}

      {/* 5. Intent */}
      {latestAppraisal.intent && (
        <Badge variant="outline" className={cn("text-xs px-1.5 py-0 h-5 shrink-0", getIntentColor(latestAppraisal.intent))}>
          {latestAppraisal.intent}
        </Badge>
      )}

      {/* 6. Stage OR Outcome (not both) */}
      <Badge 
        variant={stageOrOutcome.label === 'WON' || stageOrOutcome.label === 'LOST' ? 'outline' : 'secondary'} 
        className={cn("text-xs px-1.5 py-0 h-5 shrink-0", stageOrOutcome.className)}
      >
        {stageOrOutcome.label === 'WON' && <CheckCircle2 className="h-3 w-3 mr-0.5" />}
        {stageOrOutcome.label}
      </Badge>

      {/* Booking status badge (if applicable) */}
      {isOverdue && (
        <Badge className="bg-amber-500 text-white border-0 text-xs px-1.5 py-0 h-5 shrink-0">
          <AlertTriangle className="h-3 w-3 mr-0.5" />
          OVERDUE
        </Badge>
      )}
      {isBooked && !isOverdue && (
        <Badge className="bg-sky-500 text-white border-0 text-xs px-1.5 py-0 h-5 shrink-0">
          <Clock className="h-3 w-3 mr-0.5" />
          BOOKED
        </Badge>
      )}

      {/* 7. Date */}
      <span className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
        <Calendar className="h-3.5 w-3.5" />
        {format(appointmentDate, 'dd MMM')}
        {isBooked && latestAppraisal.appointment_time && (
          <span className="font-medium text-sky-600 dark:text-sky-400">
            {latestAppraisal.appointment_time}
          </span>
        )}
      </span>

      {/* 8. Agent avatar */}
      {latestAppraisal.agent && (
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={latestAppraisal.agent.avatar_url} />
          <AvatarFallback className="text-xs">
            {getInitials(latestAppraisal.agent.full_name)}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};
