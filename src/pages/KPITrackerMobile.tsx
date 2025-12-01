import { useState } from 'react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { useKPITrackerData } from '@/hooks/useKPITrackerData';
import { AnimatedCCHRing } from '@/components/kpi-tracker/AnimatedCCHRing';
import { WeekCalendarStrip } from '@/components/kpi-tracker/WeekCalendarStrip';
import { MobileNav } from '@/components/kpi-tracker/mobile/MobileNav';
import { QuickLogSheet } from '@/components/kpi-tracker/mobile/QuickLogSheet';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const KPITrackerMobile = () => {
  const { context, personal, loading } = useKPITrackerData();
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const handleQuickLog = async (data: { calls: number; appraisals: number; openHomes: number }) => {
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Insert entries
    const entries = [
      { user_id: user.id, kpi_type: 'calls', value: data.calls, entry_date: today, period: 'daily' },
      { user_id: user.id, kpi_type: 'appraisals', value: data.appraisals, entry_date: today, period: 'daily' },
      { user_id: user.id, kpi_type: 'open_homes', value: data.openHomes, entry_date: today, period: 'daily' },
    ];

    await supabase.from('kpi_entries' as any).upsert(entries);
  };

  if (loading) {
    return (
      <div className="p-4 pb-20 space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-6">
      {/* Hero CCH Ring */}
      <Card className="p-6 flex justify-center">
        <AnimatedCCHRing
          current={personal.cch.daily}
          target={personal.cch.dailyTarget}
          size={180}
        />
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          onClick={() => setQuickLogOpen(true)}
          className="h-16"
        >
          <Plus className="h-5 w-5 mr-2" />
          Quick Log
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => navigate('/weekly-logs')}
          className="h-16"
        >
          <TrendingUp className="h-5 w-5 mr-2" />
          View Week
        </Button>
      </div>

      {/* Week Calendar */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">This Week</h3>
        <WeekCalendarStrip
          weekData={[]}
          onDayClick={(date) => navigate(`/weekly-logs?date=${format(date, 'yyyy-MM-dd')}`)}
        />
      </Card>

      {/* Metrics Overview - Swipeable cards */}
      <div className="space-y-3">
        {Object.entries(personal.kpis).map(([key, kpi]) => (
          <Card key={key} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground capitalize">{key}</div>
                <div className="text-2xl font-bold">{kpi.today}</div>
                <div className="text-xs text-muted-foreground">
                  Week: {kpi.week} / {kpi.goal}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">
                  {kpi.goal > 0 ? ((kpi.week / kpi.goal) * 100).toFixed(0) : 0}%
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Log Sheet */}
      <QuickLogSheet
        open={quickLogOpen}
        onOpenChange={setQuickLogOpen}
        onSave={handleQuickLog}
      />

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
};

export default KPITrackerMobile;
