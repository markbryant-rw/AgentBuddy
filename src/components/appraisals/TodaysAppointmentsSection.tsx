import { useMemo } from 'react';
import { LoggedAppraisal } from '@/hooks/useLoggedAppraisals';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface TodaysAppointmentsSectionProps {
  appraisals: LoggedAppraisal[];
  onAppraisalClick: (appraisal: LoggedAppraisal) => void;
  onLogClick?: (appraisal: LoggedAppraisal) => void;
}

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  appraisal: 'Appraisal',
  follow_up: 'Follow-Up',
  listing_presentation: 'Listing Presentation',
};

export const TodaysAppointmentsSection = ({
  appraisals,
  onAppraisalClick,
  onLogClick,
}: TodaysAppointmentsSectionProps) => {
  // Filter for booked appointments
  const bookedAppointments = useMemo(() => {
    return appraisals.filter(a => (a as any).appointment_status === 'booked');
  }, [appraisals]);

  // Separate today's and overdue appointments
  const { todaysAppointments, overdueAppointments } = useMemo(() => {
    const today: LoggedAppraisal[] = [];
    const overdue: LoggedAppraisal[] = [];

    bookedAppointments.forEach(appointment => {
      const appointmentDate = parseISO(appointment.appraisal_date);
      if (isToday(appointmentDate)) {
        today.push(appointment);
      } else if (isPast(appointmentDate)) {
        overdue.push(appointment);
      }
    });

    // Sort by time
    today.sort((a, b) => {
      const timeA = (a as any).appointment_time || '00:00';
      const timeB = (b as any).appointment_time || '00:00';
      return timeA.localeCompare(timeB);
    });

    // Sort overdue by date (most recent first)
    overdue.sort((a, b) => 
      new Date(b.appraisal_date).getTime() - new Date(a.appraisal_date).getTime()
    );

    return { todaysAppointments: today, overdueAppointments: overdue };
  }, [bookedAppointments]);

  if (todaysAppointments.length === 0 && overdueAppointments.length === 0) {
    return null;
  }

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const AppointmentCard = ({ appointment, isOverdue }: { appointment: LoggedAppraisal; isOverdue: boolean }) => {
    const appointmentTime = (appointment as any).appointment_time;
    const appointmentType = (appointment as any).appointment_type || 'appraisal';

    return (
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
          isOverdue 
            ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/15" 
            : "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15"
        )}
        onClick={() => onAppraisalClick(appointment)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Time badge */}
          <div className={cn(
            "flex flex-col items-center justify-center px-3 py-1.5 rounded-lg min-w-[60px]",
            isOverdue ? "bg-red-500/20" : "bg-amber-500/20"
          )}>
            {appointmentTime ? (
              <>
                <Clock className={cn("h-3 w-3 mb-0.5", isOverdue ? "text-red-600" : "text-amber-600")} />
                <span className={cn("text-sm font-bold", isOverdue ? "text-red-700" : "text-amber-700")}>
                  {appointmentTime.slice(0, 5)}
                </span>
              </>
            ) : (
              <Calendar className={cn("h-4 w-4", isOverdue ? "text-red-600" : "text-amber-600")} />
            )}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{appointment.address}</span>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs shrink-0",
                  isOverdue 
                    ? "bg-red-500/10 text-red-600 border-red-500/20" 
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                )}
              >
                {APPOINTMENT_TYPE_LABELS[appointmentType]}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              {appointment.vendor_name && (
                <span className="truncate">{appointment.vendor_name}</span>
              )}
              {appointment.suburb && (
                <span className="flex items-center gap-1 shrink-0">
                  <MapPin className="h-3 w-3" />
                  {appointment.suburb}
                </span>
              )}
              {isOverdue && (
                <span className="text-red-600 flex items-center gap-1 shrink-0">
                  <AlertCircle className="h-3 w-3" />
                  {format(parseISO(appointment.appraisal_date), 'MMM d')}
                </span>
              )}
            </div>
          </div>

          {/* Agent */}
          {appointment.agent && (
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={appointment.agent.avatar_url} />
              <AvatarFallback className="text-xs">{getInitials(appointment.agent.full_name)}</AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* Log button */}
        <Button
          size="sm"
          variant={isOverdue ? "destructive" : "default"}
          className={cn(
            "ml-3 shrink-0",
            !isOverdue && "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onLogClick?.(appointment);
          }}
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Log
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Overdue Section */}
      {overdueAppointments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-red-600">
              Overdue Appointments ({overdueAppointments.length})
            </h3>
          </div>
          <div className="space-y-2">
            {overdueAppointments.map(appointment => (
              <AppointmentCard 
                key={appointment.id} 
                appointment={appointment} 
                isOverdue={true} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Today's Section */}
      {todaysAppointments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-amber-600">
              Today's Appointments ({todaysAppointments.length})
            </h3>
          </div>
          <div className="space-y-2">
            {todaysAppointments.map(appointment => (
              <AppointmentCard 
                key={appointment.id} 
                appointment={appointment} 
                isOverdue={false} 
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
