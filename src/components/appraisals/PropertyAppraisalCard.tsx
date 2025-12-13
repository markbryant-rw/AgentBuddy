import { GroupedProperty, LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { format, parseISO, isBefore, isToday, startOfDay } from 'date-fns';
import { Calendar, RotateCcw, Flame, CheckCircle2, MapPin, AlertTriangle, Clock } from 'lucide-react';
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

  // Calculate task progress
  const taskProgress = taskCount && taskCount.total > 0 
    ? Math.round((taskCount.done / taskCount.total) * 100) 
    : null;

  // Determine row styling based on booking state - subtle left border approach
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

  return (
    <div 
      className={cn(
        "px-3 py-2 rounded-md border cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3",
        getRowStyle()
      )}
      onClick={() => onClick(latestAppraisal)}
    >
      {/* Address & Suburb */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium truncate">{latestAppraisal.address}</span>
        {latestAppraisal.suburb && (
          <span className="text-muted-foreground text-sm truncate hidden sm:inline">
            • {latestAppraisal.suburb}
          </span>
        )}
      </div>

      {/* Agent name */}
      {latestAppraisal.agent && (
        <span className="text-sm text-muted-foreground truncate hidden md:inline max-w-[120px]">
          {latestAppraisal.agent.full_name}
        </span>
      )}

      {/* Task progress - compact */}
      {taskProgress !== null && (
        <div className="flex items-center gap-1.5 text-xs shrink-0 hidden lg:flex">
          <Progress value={taskProgress} className="w-12 h-1" />
          <span className="text-muted-foreground">{taskCount?.done}/{taskCount?.total}</span>
        </div>
      )}

      {/* Beacon hot lead */}
      {latestAppraisal.beacon_is_hot_lead && (
        <Flame className="h-3.5 w-3.5 text-orange-500 shrink-0" />
      )}

      {/* Visit count */}
      {visitCount > 1 && (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs px-1.5 py-0 h-5 shrink-0">
          <RotateCcw className="h-3 w-3 mr-0.5" />
          {visitCount}
        </Badge>
      )}

      {/* Booking status badge */}
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

      {/* Intent */}
      {latestAppraisal.intent && (
        <Badge variant="outline" className={cn("text-xs px-1.5 py-0 h-5 shrink-0", getIntentColor(latestAppraisal.intent))}>
          {latestAppraisal.intent}
        </Badge>
      )}

      {/* Stage */}
      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 shrink-0">
        {latestAppraisal.stage || 'VAP'}
      </Badge>

      {/* Outcome */}
      {latestAppraisal.outcome && latestAppraisal.outcome !== 'In Progress' && (
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs px-1.5 py-0 h-5 shrink-0",
            latestAppraisal.outcome === 'WON' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
            latestAppraisal.outcome === 'LOST' && "bg-gray-500/10 text-gray-600 border-gray-500/20"
          )}
        >
          {latestAppraisal.outcome === 'WON' && <CheckCircle2 className="h-3 w-3 mr-0.5" />}
          {latestAppraisal.outcome}
        </Badge>
      )}

      {/* Date */}
      <span className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
        <Calendar className="h-3.5 w-3.5" />
        {format(appointmentDate, 'dd MMM')}
        {isBooked && latestAppraisal.appointment_time && (
          <span className="font-medium text-sky-600 dark:text-sky-400">
            {latestAppraisal.appointment_time}
          </span>
        )}
      </span>

      {/* Agent avatar */}
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
