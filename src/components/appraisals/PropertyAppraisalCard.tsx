import { GroupedProperty, LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { format, parseISO, isBefore, isToday, startOfDay } from 'date-fns';
import { Calendar, Clock, RotateCcw, Flame, CheckCircle2, MapPin, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { AppraisalTaskCount } from '@/hooks/useAppraisalTaskCounts';

interface PropertyAppraisalCardProps {
  property: GroupedProperty;
  onClick: (appraisal: LoggedAppraisal) => void;
  taskCount?: AppraisalTaskCount;
}

export const PropertyAppraisalCard = ({ property, onClick, taskCount }: PropertyAppraisalCardProps) => {
  const { latestAppraisal, visitCount, durationMonths } = property;
  const isBooked = latestAppraisal.appointment_status === 'booked';
  const appointmentDate = parseISO(latestAppraisal.appraisal_date);
  const isOverdue = isBooked && isBefore(appointmentDate, startOfDay(new Date())) && !isToday(appointmentDate);
  const isTodays = isBooked && isToday(appointmentDate);

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
    switch (outcome) {
      case 'WON': return 'bg-emerald-50/50 dark:bg-emerald-950/20';
      case 'LOST': return 'bg-gray-100/50 dark:bg-gray-800/30';
      default: return '';
    }
  };

  // Calculate task progress
  const taskProgress = taskCount && taskCount.total > 0 
    ? Math.round((taskCount.done / taskCount.total) * 100) 
    : null;

  // Determine card styling based on booking state
  const getCardStyle = () => {
    if (isOverdue) {
      return 'bg-amber-100 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/50';
    }
    if (isBooked) {
      return 'bg-sky-100 dark:bg-sky-950/40 border-sky-400 dark:border-sky-600 ring-2 ring-sky-400/50';
    }
    return getOutcomeStyle(latestAppraisal.outcome);
  };

  return (
    <div 
      className={cn(
        "p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all",
        getCardStyle()
      )}
      onClick={() => onClick(latestAppraisal)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Address and visit count */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg truncate">{latestAppraisal.address}</h3>
            {visitCount > 1 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">
                <RotateCcw className="h-3 w-3 mr-1" />
                {visitCount} visits
              </Badge>
            )}
            {/* Booking status badges */}
            {isOverdue && (
              <Badge className="bg-amber-500 text-white border-0 shrink-0 animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                OVERDUE
              </Badge>
            )}
            {isBooked && !isOverdue && (
              <Badge className="bg-sky-500 text-white border-0 shrink-0">
                <Clock className="h-3 w-3 mr-1" />
                BOOKED
              </Badge>
            )}
          </div>
          
          {/* Suburb */}
          {latestAppraisal.suburb && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {latestAppraisal.suburb}
            </p>
          )}
          
          {/* Beacon status */}
          {latestAppraisal.beacon_report_id && (
            <div className="flex items-center gap-2 mt-2">
              <Flame className={cn(
                "h-4 w-4",
                latestAppraisal.beacon_is_hot_lead ? "text-orange-500" : "text-muted-foreground"
              )} />
              {latestAppraisal.beacon_propensity_score && (
                <span className="text-xs text-muted-foreground">
                  Score: {latestAppraisal.beacon_propensity_score}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side: status info */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Intent badge */}
          {latestAppraisal.intent && (
            <Badge variant="outline" className={getIntentColor(latestAppraisal.intent)}>
              {latestAppraisal.intent}
            </Badge>
          )}
          
          {/* Stage */}
          <Badge variant="secondary" className="text-xs">
            {latestAppraisal.stage || 'VAP'}
          </Badge>
          
          {/* Outcome */}
          {latestAppraisal.outcome && latestAppraisal.outcome !== 'In Progress' && (
            <Badge 
              variant="outline" 
              className={cn(
                latestAppraisal.outcome === 'WON' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                latestAppraisal.outcome === 'LOST' && "bg-gray-500/10 text-gray-600 border-gray-500/20"
              )}
            >
              {latestAppraisal.outcome === 'WON' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {latestAppraisal.outcome}
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom row: date, agent, tasks */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {/* Date and time for booked appointments */}
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(appointmentDate, 'dd MMM yyyy')}
            {isBooked && latestAppraisal.appointment_time && (
              <span className="ml-1 font-medium text-sky-600 dark:text-sky-400">
                @ {latestAppraisal.appointment_time}
              </span>
            )}
          </span>
          
          {/* Nurturing duration */}
          {durationMonths > 0 && (
            <span className="text-xs">
              Nurturing: {durationMonths} month{durationMonths !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Task progress */}
          {taskProgress !== null && (
            <div className="flex items-center gap-2 text-xs">
              <Progress value={taskProgress} className="w-16 h-1.5" />
              <span className="text-muted-foreground">
                {taskCount?.done}/{taskCount?.total}
              </span>
            </div>
          )}
          
          {/* Agent avatar */}
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