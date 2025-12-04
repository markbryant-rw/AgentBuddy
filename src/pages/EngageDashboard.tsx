import { Users } from 'lucide-react';
import { EngageNavigationCards } from '@/components/engage/EngageNavigationCards';

export default function EngageDashboard() {
  return (
    <div className="space-y-fluid-lg p-fluid-lg">
      {/* Header */}
      <div>
        <div className="flex items-center gap-fluid-md">
          <Users className="h-icon-lg w-icon-lg text-primary" />
          <h1 className="text-fluid-3xl font-bold">ENGAGE Workspace</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-fluid-base">
          Connect with your community, celebrate wins, and access resources
        </p>
      </div>

      {/* Navigation Cards */}
      <EngageNavigationCards />
    </div>
  );
}
