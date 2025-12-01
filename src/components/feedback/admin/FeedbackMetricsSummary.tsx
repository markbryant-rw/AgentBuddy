import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface StageMetrics {
  triage: number;
  inProgress: number;
  needsReview: number;
  completed: number;
}

interface FeedbackMetricsSummaryProps {
  totalActive: number;
  avgTriageTime: number;
  avgProgressTime: number;
  completionRate: number;
  stageMetrics: StageMetrics;
  type: 'bugs' | 'features';
}

export const FeedbackMetricsSummary = ({
  totalActive,
  avgTriageTime,
  avgProgressTime,
  completionRate,
  stageMetrics,
  type,
}: FeedbackMetricsSummaryProps) => {
  const getTimeColor = (days: number) => {
    if (days < 3) return "text-green-600";
    if (days < 7) return "text-amber-600";
    return "text-red-600";
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 70) return "text-green-600";
    if (rate >= 50) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <Card className="p-4 mb-4 bg-gradient-to-r from-background to-muted/20">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {/* Total Active */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Active {type === 'bugs' ? 'Bugs' : 'Features'}</span>
          </div>
          <p className="text-2xl font-bold">{totalActive}</p>
        </div>

        {/* Avg Triage Time */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Avg Triage</span>
          </div>
          <p className={`text-2xl font-bold ${getTimeColor(avgTriageTime)}`}>
            {avgTriageTime.toFixed(1)}d
          </p>
        </div>

        {/* Avg Progress Time */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Avg Progress</span>
          </div>
          <p className={`text-2xl font-bold ${getTimeColor(avgProgressTime)}`}>
            {avgProgressTime.toFixed(1)}d
          </p>
        </div>

        {/* Completion Rate */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Completion</span>
          </div>
          <p className={`text-2xl font-bold ${getCompletionColor(completionRate)}`}>
            {completionRate.toFixed(0)}%
          </p>
        </div>

        {/* Stage Counts */}
        <div className="flex flex-col col-span-2 md:col-span-4 lg:col-span-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Items by Stage</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-orange-500/50 bg-orange-500/10">
              Triage: {stageMetrics.triage}
            </Badge>
            <Badge variant="outline" className="border-purple-500/50 bg-purple-500/10">
              In Progress: {stageMetrics.inProgress}
            </Badge>
            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10">
              Needs Review: {stageMetrics.needsReview}
            </Badge>
            <Badge variant="outline" className="border-green-500/50 bg-green-500/10">
              Complete: {stageMetrics.completed}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};
