import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsTab } from "@/components/feedback/admin/AnalyticsTab";
import { BugIntelligenceTab } from "@/components/feedback/admin/BugIntelligenceTab";
import { BugKanbanBoard } from "@/components/feedback/admin/BugKanbanBoard";
import { FeatureRequestKanbanBoard } from "@/components/feedback/admin/FeatureRequestKanbanBoard";
import { FeedbackMetricsSummary } from "@/components/feedback/admin/FeedbackMetricsSummary";
import { useBugKanbanMetrics, useFeatureKanbanMetrics } from "@/hooks/useKanbanMetrics";
import { Lightbulb, BarChart3, Target } from "lucide-react";

export default function FeedbackManagement() {
  const [activeTab, setActiveTab] = useState("hunt");
  const { data: bugMetrics } = useBugKanbanMetrics();
  const { data: featureMetrics } = useFeatureKanbanMetrics();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Feedback Management</h1>
        <p className="text-muted-foreground">
          Manage bug reports, feature requests, and view analytics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[420px]">
          <TabsTrigger value="hunt" className="gap-2">
            <Target className="h-4 w-4" />
            Bug Hunt
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Lightbulb className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hunt" className="mt-6 space-y-4">
          {bugMetrics && (
            <FeedbackMetricsSummary
              totalActive={bugMetrics.totalActive}
              avgTriageTime={bugMetrics.avgTriageTime}
              avgProgressTime={bugMetrics.avgProgressTime}
              completionRate={bugMetrics.completionRate}
              stageMetrics={bugMetrics.stageMetrics}
              type="bugs"
            />
          )}
          <BugKanbanBoard />
        </TabsContent>

        <TabsContent value="features" className="mt-6 space-y-4">
          {featureMetrics && (
            <FeedbackMetricsSummary
              totalActive={featureMetrics.totalActive}
              avgTriageTime={featureMetrics.avgTriageTime}
              avgProgressTime={featureMetrics.avgProgressTime}
              completionRate={featureMetrics.completionRate}
              stageMetrics={featureMetrics.stageMetrics}
              type="features"
            />
          )}
          <FeatureRequestKanbanBoard />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="space-y-6">
            <AnalyticsTab />
            <BugIntelligenceTab />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
