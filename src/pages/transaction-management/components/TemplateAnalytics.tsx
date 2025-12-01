import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, TrendingUp, Clock, Target } from 'lucide-react';
import { useTemplateAnalytics } from '@/hooks/useTemplateAnalytics';
import { Progress } from '@/components/ui/progress';

export const TemplateAnalytics = () => {
  const { analytics, isLoading } = useTemplateAnalytics();

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="h-48 animate-pulse bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  const totalUsage = analytics.reduce((sum, a) => sum + a.usageCount, 0);
  const avgCompletionRate = analytics.length > 0
    ? analytics.reduce((sum, a) => sum + a.averageCompletionRate, 0) / analytics.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Projects Created</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCompletionRate.toFixed(0)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.length > 0
                ? (analytics.reduce((sum, a) => sum + a.averageDuration, 0) / analytics.length).toFixed(0)
                : 0}d
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Usage Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Template Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics
              .sort((a, b) => b.usageCount - a.usageCount)
              .map(template => (
                <div key={template.templateId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{template.templateName}</span>
                    <span className="text-muted-foreground">{template.usageCount} projects</span>
                  </div>
                  <Progress value={(template.usageCount / totalUsage) * 100} />
                </div>
              ))}
            {analytics.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No usage data available yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completion Rates by Template */}
      <Card>
        <CardHeader>
          <CardTitle>Completion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics
              .sort((a, b) => b.averageCompletionRate - a.averageCompletionRate)
              .map(template => (
                <div key={template.templateId} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{template.templateName}</span>
                    <span className="text-muted-foreground">
                      {template.averageCompletionRate.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={template.averageCompletionRate} />
                </div>
              ))}
            {analytics.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No completion data available yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
