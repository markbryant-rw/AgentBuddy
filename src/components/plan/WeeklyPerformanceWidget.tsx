import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isToday, isFuture, isSameDay, addWeeks, getWeek } from 'date-fns';
import { Check, X, Lock, ChevronLeft, ChevronRight, Phone, ClipboardCheck, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DayData {
  date: Date;
  cch: number;
  logged: boolean;
}

interface TeamMemberBreakdown {
  userId: string;
  userName: string;
  calls: number;
  appraisals: number;
  openHomes: number;
}

interface WeeklyPerformanceWidgetProps {
  weekData: DayData[];
  onDayClick: (date: Date) => void;
  weekNumber: number;
  breakdown: {
    calls: { current: number; target: number };
    appraisals: { current: number; target: number };
    openHomes: { current: number; target: number };
  };
  totalCCH: number;
  targetCCH: number;
  teamBreakdown?: TeamMemberBreakdown[] | null;
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  userId: string;
}

export function WeeklyPerformanceWidget({ 
  weekData, 
  onDayClick, 
  weekNumber,
  breakdown,
  totalCCH,
  targetCCH,
  teamBreakdown,
  weekOffset,
  onWeekOffsetChange,
  userId
}: WeeklyPerformanceWidgetProps) {
  const queryClient = useQueryClient();
  
  const handlePrevWeek = () => {
    onWeekOffsetChange(weekOffset - 1);
  };

  const handleNextWeek = () => {
    onWeekOffsetChange(weekOffset + 1);
  };

  const baseDate = new Date();
  const currentWeekStart = addWeeks(startOfWeek(baseDate, { weekStartsOn: 1 }), weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const actualWeekNumber = getWeek(currentWeekStart, { weekStartsOn: 1 });
  
  // Fetch daily activities for this week
  const { data: dailyActivities } = useQuery({
    queryKey: ['daily-activities-week', userId, currentWeekStart.toISOString()],
    queryFn: async () => {
      const weekEnd = addDays(currentWeekStart, 6);
      const { data, error } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('user_id', userId)
        .gte('activity_date', format(currentWeekStart, 'yyyy-MM-dd'))
        .lte('activity_date', format(weekEnd, 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  // Real-time subscription for instant updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('daily-activities-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_activities',
          filter: `user_id=eq.${userId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['daily-activities-week'] });
          queryClient.invalidateQueries({ queryKey: ['weekly-breakdown-offset'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const getDayData = (date: Date) => {
    return weekData.find(d => isSameDay(d.date, date));
  };
  
  const getDayActivity = (date: Date) => {
    return dailyActivities?.find(d => isSameDay(new Date(d.activity_date), date));
  };

  const getStatusIcon = (date: Date, activity?: any) => {
    if (isFuture(date) && !isToday(date)) {
      return <Lock className="h-5 w-5 text-muted-foreground" />;
    }
    
    // Check if any activity was logged (calls, appraisals, or open homes)
    const hasActivity = activity && (
      (activity.calls || 0) > 0 || 
      (activity.appraisals || 0) > 0 || 
      (activity.open_homes || 0) > 0
    );
    
    if (hasActivity) {
      return <Check className="h-5 w-5 text-green-600" />;
    }
    
    return <X className="h-5 w-5 text-red-500" />;
  };

  const getStatusColor = (date: Date, dayData?: DayData) => {
    if (isFuture(date) && !isToday(date)) return 'bg-muted';
    if (dayData?.logged && dayData.cch >= 1.4) return 'bg-green-500';
    if (dayData?.logged && dayData.cch >= 1.0) return 'bg-yellow-500';
    if (dayData?.logged) return 'bg-orange-500';
    return 'bg-muted';
  };

  const calculateCCHContribution = (type: 'calls' | 'appraisals' | 'openHomes', value: number) => {
    switch (type) {
      case 'calls':
        return (value / 20).toFixed(1);
      case 'appraisals':
        return (value * 1).toFixed(1);
      case 'openHomes':
        return (value / 2).toFixed(1);
    }
  };

  const PerformanceCard = ({ 
    icon, 
    label, 
    current, 
    target, 
    color,
    type
  }: { 
    icon: React.ReactNode; 
    label: string; 
    current: number; 
    target: number; 
    color: string;
    type: 'calls' | 'appraisals' | 'openHomes';
  }) => {
    const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const cchContribution = calculateCCHContribution(type, current);

    // Get team member contributions for this KPI
    const teamContributions = teamBreakdown?.filter(member => {
      const value = type === 'calls' ? member.calls : type === 'appraisals' ? member.appraisals : member.openHomes;
      return value > 0;
    }).map(member => ({
      name: member.userName,
      value: type === 'calls' ? member.calls : type === 'appraisals' ? member.appraisals : member.openHomes,
      percentage: target > 0 ? ((type === 'calls' ? member.calls : type === 'appraisals' ? member.appraisals : member.openHomes) / target) * 100 : 0
    })) || [];

    return (
      <div className="space-y-3 p-6 rounded-xl border-2 bg-card hover:shadow-lg transition-all hover:scale-[1.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {icon}
            </div>
            <span className="text-base font-semibold">{label}</span>
          </div>
          <span className="text-sm font-bold text-primary px-2 py-1 bg-primary/10 rounded-md">{cchContribution}h</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">{current}</span>
            <span className="text-lg text-muted-foreground">/ {target}</span>
          </div>
          <Progress value={percentage} className="h-3" />
          <span className="text-sm font-medium text-muted-foreground">{percentage.toFixed(0)}%</span>
        </div>

        {/* Team Member Breakdown */}
        {teamContributions.length > 0 && (
          <div className="pt-3 border-t space-y-1.5">
            {teamContributions.map((member, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[120px]">{member.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{member.value}</span>
                  <span className="text-muted-foreground text-xs">({member.percentage.toFixed(0)}%)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-card via-card to-primary/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Core Business KPIs</h2>
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            "text-3xl font-bold px-4 py-2 rounded-lg transition-all",
            weekOffset === 0 && "bg-primary text-primary-foreground shadow-lg"
          )}>
            Week {actualWeekNumber}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handlePrevWeek}
              className="h-10 w-10 p-0 hover:bg-primary hover:text-primary-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-sm font-medium min-w-[120px] text-center">
              <span className={cn(
                weekOffset === 0 ? "text-primary" : "text-muted-foreground"
              )}>
                {totalCCH.toFixed(1)} / {targetCCH.toFixed(1)} hrs
              </span>
            </div>
            <Button
              variant="outline"
              size="lg"
              onClick={handleNextWeek}
              disabled={weekOffset >= 0}
              className="h-10 w-10 p-0 hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Performance Cards Grid - Top Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <PerformanceCard
          icon={<Phone className="h-6 w-6 text-blue-600" />}
          label="Calls"
          current={breakdown.calls.current}
          target={breakdown.calls.target}
          color="blue"
          type="calls"
        />
        <PerformanceCard
          icon={<ClipboardCheck className="h-6 w-6 text-purple-600" />}
          label="Appraisals"
          current={breakdown.appraisals.current}
          target={breakdown.appraisals.target}
          color="purple"
          type="appraisals"
        />
        <PerformanceCard
          icon={<Home className="h-6 w-6 text-green-600" />}
          label="Open Homes"
          current={breakdown.openHomes.current}
          target={breakdown.openHomes.target}
          color="green"
          type="openHomes"
        />
      </div>

      {/* 7-Day Calendar View - Bottom Section with Details */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((date) => {
          const dayData = getDayData(date);
          const activity = getDayActivity(date);
          const today = isToday(date);
          const future = isFuture(date) && !today;

          return (
            <button
              key={date.toISOString()}
              onClick={() => !future && onDayClick(date)}
              disabled={future}
              className={cn(
                'flex flex-col gap-1.5 p-2 rounded-lg border-2 transition-all hover:shadow-md relative',
                today && 'border-primary bg-primary/10 ring-2 ring-primary/20',
                !today && 'border-border bg-card',
                future && 'opacity-50 cursor-not-allowed',
                !future && 'hover:border-primary/50 hover:scale-105'
              )}
            >
              {/* Header with day name and status icon */}
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {format(date, 'EEE')}
                </div>
                <div className="flex-shrink-0">
                  {getStatusIcon(date, activity)}
                </div>
              </div>
              
              <div className={cn(
                'text-xl font-bold',
                today && 'text-primary'
              )}>
                {format(date, 'd')}
              </div>
              
              {/* Activity Details */}
              <div className="space-y-0.5 pt-1.5 border-t text-xs">
                <div className="flex items-center justify-between gap-1">
                  <Phone className="h-3 w-3 text-blue-600" />
                  <span className={cn("font-medium", !activity?.calls && "text-muted-foreground")}>
                    {activity?.calls || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <ClipboardCheck className="h-3 w-3 text-purple-600" />
                  <span className={cn("font-medium", !activity?.appraisals && "text-muted-foreground")}>
                    {activity?.appraisals || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <Home className="h-3 w-3 text-green-600" />
                  <span className={cn("font-medium", !activity?.open_homes && "text-muted-foreground")}>
                    {activity?.open_homes || 0}
                  </span>
                </div>
              </div>
              
              {/* Always show CCH if there's any activity */}
              {activity && (activity.cch_calculated || 0) > 0 && (
                <div className="text-xs font-bold text-primary pt-1">
                  {(activity.cch_calculated || 0).toFixed(1)}h
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Team Performance Section */}
      {teamBreakdown && teamBreakdown.length > 1 && (
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">
            Team Performance ({teamBreakdown.length} members)
          </h3>
          <div className="space-y-3">
            {teamBreakdown.map((member) => {
              const memberCCH = (
                member.calls / 20 + 
                member.appraisals * 1 + 
                member.openHomes / 2
              ).toFixed(1);
              
              return (
                <div key={member.userId} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                        {member.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{member.userName}</span>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{member.calls}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-purple-600" />
                      <span className="font-medium">{member.appraisals}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{member.openHomes}</span>
                    </div>
                    <div className="font-bold text-primary min-w-[60px] text-right">
                      {memberCCH}h
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}