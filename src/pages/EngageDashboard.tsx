import { Users } from 'lucide-react';
import { EngageNavigationCards } from '@/components/engage/EngageNavigationCards';

export default function EngageDashboard() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">ENGAGE Workspace</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Connect with your community, celebrate wins, and access resources
        </p>
      </div>

      {/* Navigation Cards */}
      <EngageNavigationCards />
    </div>
  );
}
