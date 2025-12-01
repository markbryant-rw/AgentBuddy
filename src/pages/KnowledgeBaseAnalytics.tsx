import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { useKBAnalytics } from "@/hooks/useKBAnalytics";
import { AnalyticsStats } from "@/components/knowledge-base/analytics/AnalyticsStats";
import { CompletionRateChart } from "@/components/knowledge-base/analytics/CompletionRateChart";
import { MostViewedTable } from "@/components/knowledge-base/analytics/MostViewedTable";
import { OutdatedContentAlert } from "@/components/knowledge-base/analytics/OutdatedContentAlert";

export default function KnowledgeBaseAnalytics() {
  const navigate = useNavigate();
  const { completionRates, mostViewed, outdatedContent, overallStats, isLoading } = useKBAnalytics();

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => navigate('/knowledge-base')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Knowledge Base
          </Button>
          <h1 className="text-4xl font-bold tracking-tight">Knowledge Base Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track usage, completion rates, and identify content that needs attention
          </p>
        </div>
        <Button variant="outline" disabled>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <AnalyticsStats stats={overallStats} />

          {/* Completion Rates Chart */}
          <CompletionRateChart data={completionRates} />

          {/* Most Viewed Table */}
          <MostViewedTable data={mostViewed} />

          {/* Outdated Content Alerts */}
          <OutdatedContentAlert data={outdatedContent} />
        </>
      )}
    </div>
  );
}
