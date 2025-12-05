import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Settings, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWeeklyTaskSettings } from '@/hooks/useWeeklyTaskSettings';
import { useWeeklyTaskStats } from '@/hooks/useWeeklyTaskStats';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';

export function WeeklyTasksPerformanceCard() {
  const navigate = useNavigate();
  const { settings, isEnabled, generateTasksNow, templates } = useWeeklyTaskSettings();
  const { stats, isLoading } = useWeeklyTaskStats();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateNow = async () => {
    setIsGenerating(true);
    try {
      await generateTasksNow();
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Weekly Listing Tasks
          </CardTitle>
          <CardDescription>
            Automate recurring tasks for your active listings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Set up weekly recurring tasks like buyer callbacks, vendor reports, and campaign updates for each listing.
            </p>
            <Button onClick={() => navigate('/team/weekly-tasks')}>
              <Settings className="h-4 w-4 mr-2" />
              Set Up Weekly Tasks
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Weekly Tasks Performance
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateNow}
              disabled={isGenerating}
            >
              <Zap className="h-4 w-4 mr-1" />
              {isGenerating ? 'Generating...' : 'Generate Now'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/team/weekly-tasks')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          {templates.filter(t => t.is_active).length} task types configured
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Team overall progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Team Completion</span>
            <span className="text-muted-foreground">
              {stats.completedTasks}/{stats.totalTasks} tasks ({stats.completionRate}%)
            </span>
          </div>
          <Progress value={stats.completionRate} className="h-2" />
        </div>

        {/* Agent breakdown */}
        {stats.agentStats.length > 0 ? (
          <div className="space-y-3 pt-2">
            <h4 className="text-sm font-medium">Agent Progress</h4>
            {stats.agentStats.slice(0, 5).map((agent) => (
              <div key={agent.userId} className="flex items-center gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={agent.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {agent.fullName?.split(' ').map(n => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm truncate">{agent.fullName}</span>
                    <span className="text-xs text-muted-foreground">
                      {agent.completedTasks}/{agent.totalTasks}
                    </span>
                  </div>
                  <Progress 
                    value={agent.completionRate} 
                    className={cn(
                      'h-1.5',
                      agent.completionRate >= 80 ? '[&>div]:bg-green-500' :
                      agent.completionRate >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
                    )} 
                  />
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs min-w-12 justify-center',
                    agent.completionRate >= 80 ? 'border-green-500 text-green-600' :
                    agent.completionRate >= 50 ? 'border-amber-500 text-amber-600' : 'border-red-500 text-red-600'
                  )}
                >
                  {agent.completionRate}%
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No weekly tasks generated yet this week
          </div>
        )}
      </CardContent>
    </Card>
  );
}
