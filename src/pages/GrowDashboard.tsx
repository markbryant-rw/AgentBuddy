import { Rocket } from 'lucide-react';
import { GrowQuickStats } from '@/components/grow/GrowQuickStats';
import { GrowNavigationCards } from '@/components/grow/GrowNavigationCards';

export default function GrowDashboard() {
  return (
    <div className="space-y-fluid-lg p-fluid-lg">
      {/* Header - Plain style like other dashboards */}
      <div className="animate-card-enter">
        <div className="flex items-center gap-fluid-md">
          <Rocket className="h-icon-lg w-icon-lg text-emerald-600" />
          <h1 className="text-fluid-3xl font-bold">Grow Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-fluid-base">
          Continuous learning, skill development, and knowledge expansion
        </p>
      </div>

      <div className="animate-card-enter stagger-1">
        <GrowQuickStats />
      </div>
      <div className="animate-card-enter stagger-2">
        <GrowNavigationCards />
      </div>
    </div>
  );
}
