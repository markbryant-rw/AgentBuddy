import { Rocket } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { GrowNavigationCards } from "@/components/grow/GrowNavigationCards";
import { GrowQuickStats } from "@/components/grow/GrowQuickStats";

export default function GrowDashboard() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        icon={Rocket}
        title="GROW Workspace"
        description="Continuous learning, skill development, and knowledge expansion"
        category="grow"
      />

      <GrowQuickStats />
      <GrowNavigationCards />
    </div>
  );
}
