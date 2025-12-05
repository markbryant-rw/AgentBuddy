import { Rocket } from 'lucide-react';
import { GrowNavigationCards } from '@/components/grow/GrowNavigationCards';
import { GrowQuickStats } from '@/components/grow/GrowQuickStats';

export default function GrowDashboard() {
  return (
    <div className="space-y-fluid-lg p-fluid-lg">
      {/* Header - Plain style like other dashboards */}
      <div>
        <div className="flex items-center gap-fluid-md">
          <Rocket className="h-icon-lg w-icon-lg text-primary" />
          <h1 className="text-fluid-3xl font-bold">Grow Dashboard</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-fluid-base">
          Continuous learning, skill development, and knowledge expansion
        </p>
      </div>

      <GrowQuickStats />
      <GrowNavigationCards />
    </div>
  );
}
