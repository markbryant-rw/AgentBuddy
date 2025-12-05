import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DailyCheckIn } from '@/components/playbook/DailyCheckIn';
import { PlanHeroMetrics } from '@/components/plan/PlanHeroMetrics';
import { ReviewWidget } from '@/components/plan/ReviewWidget';
import { CurrentWidget } from '@/components/plan/CurrentWidget';
import { RoadmapWidget } from '@/components/plan/RoadmapWidget';
import { ReviewRoadmapWidget } from '@/components/plan/ReviewRoadmapWidget';

export default function PlanDashboard() {
  const { user } = useAuth();
  const [checkInOpen, setCheckInOpen] = useState(false);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to view your plan dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-fluid-lg p-fluid-lg">
      {/* Header */}
      <div className="flex items-center justify-between animate-card-enter">
        <div>
          <div className="flex items-center gap-fluid-md">
            <Target className="h-icon-lg w-icon-lg text-blue-600" />
            <h1 className="text-fluid-3xl font-bold">Plan Dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-fluid-base">
            Your command center for goals, progress, and planning
          </p>
        </div>
        <Button size="lg" onClick={() => setCheckInOpen(true)}>
          <Plus className="h-icon-sm w-icon-sm mr-2" />
          Log Today's Activity
        </Button>
      </div>

      {/* Hero Metrics */}
      <div className="animate-card-enter stagger-1">
        <PlanHeroMetrics />
      </div>

      {/* Four Planning Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-fluid-lg">
        <div className="animate-card-enter stagger-2"><ReviewWidget /></div>
        <div className="animate-card-enter stagger-3"><CurrentWidget /></div>
        <div className="animate-card-enter stagger-4"><RoadmapWidget /></div>
        <div className="animate-card-enter stagger-5"><ReviewRoadmapWidget /></div>
      </div>

      {/* Modals */}
      <DailyCheckIn
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        userId={user.id}
        onSuccess={() => {}}
      />
    </div>
  );
}
