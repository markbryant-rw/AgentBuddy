import { format, isWithinInterval, startOfWeek, endOfWeek, differenceInYears } from "date-fns";
import { Heart, Calendar, Phone, Gift, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnniversaryTouchpoint {
  id: string;
  title: string;
  address: string;
  vendor_name: string | null;
  settlement_date: string;
  aftercare_year: number;
  due_date: string;
  completed: boolean;
}

interface AnniversaryTouchpointsProps {
  touchpoints: AnniversaryTouchpoint[];
  onComplete?: (taskId: string) => void;
}

export function AnniversaryTouchpoints({ touchpoints, onComplete }: AnniversaryTouchpointsProps) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Filter for this week's anniversary touchpoints
  const thisWeeksTouchpoints = touchpoints.filter(t => {
    const dueDate = new Date(t.due_date);
    return isWithinInterval(dueDate, { start: weekStart, end: weekEnd }) && !t.completed;
  });

  if (thisWeeksTouchpoints.length === 0) {
    return null;
  }

  const getYearEmoji = (year: number) => {
    if (year === 1) return '🎂';
    if (year === 5) return '🎉';
    if (year === 10) return '🏆';
    return '💝';
  };

  const getMilestoneLabel = (year: number) => {
    if (year === 1) return 'First Anniversary';
    if (year === 5) return '5-Year Milestone';
    if (year === 10) return 'Decade Celebration';
    return `Year ${year}`;
  };

  return (
    <Card className="border-none bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
            <Heart className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <CardTitle className="text-lg bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Anniversary Touchpoints
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {thisWeeksTouchpoints.length} relationship{thisWeeksTouchpoints.length > 1 ? 's' : ''} to nurture
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {thisWeeksTouchpoints.map((touchpoint) => (
          <div
            key={touchpoint.id}
            className={cn(
              "p-4 rounded-xl bg-white/70 dark:bg-black/20",
              "border border-pink-200/50 dark:border-pink-800/30"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{getYearEmoji(touchpoint.aftercare_year)}</span>
                  <Badge variant="outline" className="bg-pink-100/50 border-pink-300 text-pink-700">
                    {getMilestoneLabel(touchpoint.aftercare_year)}
                  </Badge>
                </div>
                
                <p className="font-medium text-sm">
                  {touchpoint.vendor_name || 'Client'} at {touchpoint.address}
                </p>
                
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due {format(new Date(touchpoint.due_date), 'EEE, MMM d')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Settled {format(new Date(touchpoint.settlement_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>

              {onComplete && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1 border-pink-300 hover:bg-pink-50 hover:border-pink-400"
                  onClick={() => onComplete(touchpoint.id)}
                >
                  <Phone className="h-3 w-3" />
                  Mark Done
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
