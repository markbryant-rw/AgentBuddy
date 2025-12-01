import { useDailyPlannerAnalytics } from '@/hooks/useDailyPlannerAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, addDays, startOfWeek } from 'date-fns';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, Target, Zap, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeeklyAnalyticsProps {
  weekStart: Date;
}

export function WeeklyAnalytics({ weekStart }: WeeklyAnalyticsProps) {
  const start = startOfWeek(weekStart, { weekStartsOn: 0 });
  const { analytics, isLoading } = useDailyPlannerAnalytics(start);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) return null;

  const { summary, dailyTrends, categoryBreakdown, bestDay, insights, comparison } = analytics;

  // Prepare chart data
  const chartData = dailyTrends.map(day => ({
    name: format(new Date(day.date), 'EEE'),
    fullDate: format(new Date(day.date), 'MMM d'),
    completion: Math.round(day.completionRate),
    tasks: day.tasksCompleted,
  }));

  const categoryChartData = [
    { 
      name: 'High-Impact', 
      completed: categoryBreakdown.big.completed,
      total: categoryBreakdown.big.total,
      rate: categoryBreakdown.big.total > 0 
        ? Math.round((categoryBreakdown.big.completed / categoryBreakdown.big.total) * 100) 
        : 0,
    },
    { 
      name: 'Important', 
      completed: categoryBreakdown.medium.completed,
      total: categoryBreakdown.medium.total,
      rate: categoryBreakdown.medium.total > 0 
        ? Math.round((categoryBreakdown.medium.completed / categoryBreakdown.medium.total) * 100) 
        : 0,
    },
    { 
      name: 'Quick Wins', 
      completed: categoryBreakdown.little.completed,
      total: categoryBreakdown.little.total,
      rate: 100, // Just for visualization
    },
  ];

  const totalTimeHours = Math.round((summary.completedTime / 60) * 10) / 10;
  const estimatedTimeHours = Math.round((summary.totalEstimatedTime / 60) * 10) / 10;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.completedTasks}/{summary.totalTasks}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(summary.completionRate)}% completion rate
            </p>
            <Progress value={summary.completionRate} className="mt-2" />
            {comparison.lastWeek.changeInTasks !== 0 && (
              <div className={cn(
                "flex items-center gap-1 text-xs mt-2",
                comparison.lastWeek.changeInTasks > 0 ? "text-green-600" : "text-red-600"
              )}>
                {comparison.lastWeek.changeInTasks > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(comparison.lastWeek.changeInTasks)} vs last week
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Invested</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTimeHours}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              of {estimatedTimeHours}h estimated
            </p>
            <Progress 
              value={estimatedTimeHours > 0 ? (totalTimeHours / estimatedTimeHours) * 100 : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Focus Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categoryBreakdown.big.total > 0 
                ? Math.round((categoryBreakdown.big.completed / categoryBreakdown.big.total) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              High-Impact completion rate
            </p>
            <Progress 
              value={categoryBreakdown.big.total > 0 
                ? (categoryBreakdown.big.completed / categoryBreakdown.big.total) * 100 
                : 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Productivity Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm"
                >
                  <span className="flex-shrink-0">{insight.split(' ')[0]}</span>
                  <span>{insight.substring(insight.indexOf(' ') + 1)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Completion Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  label={{ value: '%', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: any, name: string) => [
                    name === 'completion' ? `${value}%` : value,
                    name === 'completion' ? 'Completion Rate' : 'Tasks Completed'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="completion" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="name" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: any, name: string) => [
                    value,
                    name === 'completed' ? 'Completed' : 'Total'
                  ]}
                />
                <Legend />
                <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" />
                <Bar dataKey="total" fill="hsl(var(--muted))" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Best Day Spotlight */}
      {bestDay && bestDay.completionRate >= 70 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏆 Best Day: {bestDay.dayName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {Math.round(bestDay.completionRate)}%
                </div>
                <div className="text-xs text-muted-foreground">Completion Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {bestDay.tasksCompleted}
                </div>
                <div className="text-xs text-muted-foreground">Tasks Done</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  <Zap className="h-8 w-8 inline" />
                </div>
                <div className="text-xs text-muted-foreground">Power Day</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown Details */}
      <Card>
        <CardHeader>
          <CardTitle>Time Distribution by Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Big 3 */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="flex items-center gap-2">
                🎯 <span className="font-medium">High-Impact Tasks</span>
              </span>
              <span className="text-muted-foreground">
                {categoryBreakdown.big.completed}/{categoryBreakdown.big.total} · {Math.round(categoryBreakdown.big.timeSpent / 60)}h
              </span>
            </div>
            <Progress 
              value={categoryBreakdown.big.total > 0 
                ? (categoryBreakdown.big.completed / categoryBreakdown.big.total) * 100 
                : 0}
              className="h-2"
            />
          </div>

          {/* Priority */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="flex items-center gap-2">
                ⭐ <span className="font-medium">Important Work</span>
              </span>
              <span className="text-muted-foreground">
                {categoryBreakdown.medium.completed}/{categoryBreakdown.medium.total} · {Math.round(categoryBreakdown.medium.timeSpent / 60)}h
              </span>
            </div>
            <Progress 
              value={categoryBreakdown.medium.total > 0 
                ? (categoryBreakdown.medium.completed / categoryBreakdown.medium.total) * 100 
                : 0}
              className="h-2"
            />
          </div>

          {/* Quick Wins */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="flex items-center gap-2">
                ⚡ <span className="font-medium">Quick Wins</span>
              </span>
              <span className="text-muted-foreground">
                {categoryBreakdown.little.completed} tasks · {Math.round(categoryBreakdown.little.timeSpent / 60)}h
              </span>
            </div>
            <Progress 
              value={100}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
