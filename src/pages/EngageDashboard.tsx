import { Users } from 'lucide-react';
import { EngageNavigationCards } from '@/components/engage/EngageNavigationCards';

export default function EngageDashboard() {
  return (
    <div className="space-y-fluid-lg p-fluid-lg">
      {/* Header */}
      <div className="animate-card-enter">
        <div className="flex items-center gap-fluid-md">
          <Users className="h-icon-lg w-icon-lg text-pink-600" />
          <h1 className="text-fluid-3xl font-bold">Engage Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-fluid-base">
          Connect with your community, celebrate wins, and access resources
        </p>
      </div>

      {/* Navigation Cards */}
      <div className="animate-card-enter stagger-1">
        <EngageNavigationCards />
      </div>
    </div>
  );
}
