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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">PLAN Dashboard</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Your command center for goals, progress, and planning
          </p>
        </div>
        <Button size="lg" onClick={() => setCheckInOpen(true)}>
          <Plus className="h-5 w-5 mr-2" />
          Log Today's Activity
        </Button>
      </div>

      {/* Hero Metrics */}
      <PlanHeroMetrics />

      {/* Four Planning Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        <ReviewWidget />
        <CurrentWidget />
        <RoadmapWidget />
        <ReviewRoadmapWidget />
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
