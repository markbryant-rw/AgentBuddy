import { DailyPlannerView } from '@/components/planner/DailyPlannerView';
import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';

export default function DailyPlanner() {
  return (
    <div className="h-full flex flex-col">
      <WorkspaceHeader workspace="operate" currentPage="Daily Planner" />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <DailyPlannerView />
        </div>
      </div>
    </div>
  );
}
