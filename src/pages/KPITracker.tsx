import { useState } from 'react';
import { useKPITrackerData } from '@/hooks/useKPITrackerData';
import { useWeekKPIData } from '@/hooks/useWeekKPIData';
import { useLoggingWindow } from '@/hooks/useLoggingWindow';
import { KPITrackerHeader } from '@/components/kpi-tracker/KPITrackerHeader';
import { PersonalKPISection } from '@/components/kpi-tracker/PersonalKPISection';
import { CCHExpandedCard } from '@/components/kpi-tracker/CCHExpandedCard';
import { TeamPerformanceSection } from '@/components/kpi-tracker/TeamPerformanceSection';
import { HistoricalTrendsSection } from '@/components/kpi-tracker/HistoricalTrendsSection';
import { ExportActionsCard } from '@/components/kpi-tracker/ExportActionsCard';
import { AnimatedCCHRing } from '@/components/kpi-tracker/AnimatedCCHRing';
import { TargetCompletionDashboard } from '@/components/kpi-tracker/TargetCompletionDashboard';
import { WeekCalendarStrip } from '@/components/kpi-tracker/WeekCalendarStrip';
import { WeekNavigator } from '@/components/kpi-tracker/WeekNavigator';
import { LoggingReminder } from '@/components/kpi-tracker/LoggingReminder';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { addWeeks } from 'date-fns';
import { cn } from '@/lib/utils';
import KPITrackerMobile from './KPITrackerMobile';

const KPITracker = () => {
  const { context, personal, team, loading } = useKPITrackerData();
  const { hasLoggedToday } = useLoggingWindow();
  const [weekOffset, setWeekOffset] = useState(0);
  const selectedWeekDate = addWeeks(new Date(), weekOffset);
  const { weekData, loading: weekLoading } = useWeekKPIData(selectedWeekDate);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  if (isMobile) {
    return <KPITrackerMobile />;
  }

  if (loading) {
    return (
      <div className="space-y-8 pb-20 md:pb-8">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <>
      <LoggingReminder hasLoggedToday={hasLoggedToday} />
      <div className="space-y-8 pb-20 md:pb-8">
        {/* Header Zone - Blue theme for performance */}
        <div className="bg-gradient-to-br from-blue-50/30 to-white dark:from-blue-900/5 dark:to-background p-6 rounded-xl">
          <KPITrackerHeader />
        </div>

        {/* Hero Section - Animated CCH Ring */}
        <Card className="p-8 flex flex-col items-center bg-gradient-to-br from-purple-50/30 to-white dark:from-purple-900/5 dark:to-background">
          <AnimatedCCHRing
            current={personal.cch.daily}
            target={personal.cch.dailyTarget}
            size={220}
          />
        </Card>

        {/* Week Calendar Strip */}
        <Card className={cn(
          "p-6 transition-all duration-300",
          weekOffset === 0 
            ? "bg-gradient-to-br from-green-50/30 via-blue-50/20 to-white dark:from-green-900/10 dark:via-blue-900/5 dark:to-background border-l-4 border-primary" 
            : "bg-card"
        )}>
          <div className="mb-4">
            <WeekNavigator
              currentDate={selectedWeekDate}
              offset={weekOffset}
              onNavigate={setWeekOffset}
            />
          </div>
          <WeekCalendarStrip
            weekData={weekData}
            baseDate={selectedWeekDate}
            onDayClick={(date) => navigate('/weekly-logs')}
          />
        </Card>

        {/* Personal Performance */}
        <PersonalKPISection kpis={personal.kpis} />

        {/* CCH Section with red accent */}
        <div className="bg-gradient-to-br from-white to-red-50/20 dark:from-background dark:to-red-900/5 p-6 rounded-xl">
          <CCHExpandedCard cch={personal.cch} />
        </div>

        {/* Team Performance - Only shown if user is on a team */}
        {team && <TeamPerformanceSection teamData={team} />}

        {/* Historical Trends */}
        <HistoricalTrendsSection />

        {/* Target Completion Dashboard */}
        <div className="bg-gradient-to-br from-purple-50/30 to-white dark:from-purple-900/5 dark:to-background p-6 rounded-xl">
          <TargetCompletionDashboard />
        </div>

        {/* Export Actions */}
        <ExportActionsCard />
      </div>
    </>
  );
};

export default KPITracker;
