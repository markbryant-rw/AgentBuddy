import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ClipboardList, ArrowRight, Phone, FileText, Home, TrendingUp, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DailyDigestProps {
  tasksCompleted: number;
  totalTasks: number;
  dailyCCH: number;
  dailyCCHTarget: number;
  callsMade: number;
  appraisals: number;
  openHomes: number;
  isCollapsed?: boolean;
}

export const DailyDigest = ({
  tasksCompleted,
  totalTasks,
  dailyCCH,
  dailyCCHTarget,
  callsMade,
  appraisals,
  openHomes,
  isCollapsed,
}: DailyDigestProps) => {
  const navigate = useNavigate();
  const cchProgress = dailyCCHTarget > 0 ? (dailyCCH / dailyCCHTarget) * 100 : 0;
  const taskProgress = totalTasks > 0 ? (tasksCompleted / totalTasks) * 100 : 0;

  return (
    <Card className="border-l-4 border-l-green-500 hover:shadow-xl transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-900/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <ClipboardList className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            Daily Digest
          </CardTitle>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/kpi-tracker')}
              className="gap-1.5 bg-background hover:bg-accent hover:scale-105 transition-all shadow-sm"
            >
              View Full
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-6 pt-6">
          {/* CCH Progress with enhanced styling */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Customer Contact Hours</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dailyCCH.toFixed(1)} / {dailyCCHTarget.toFixed(1)} hrs
                </p>
              </div>
            </div>
            
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(cchProgress, 100)}%` }}
              >
                {cchProgress >= 100 && (
                  <div className="absolute inset-0 bg-white/30 animate-pulse" />
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {cchProgress >= 100 ? (
                <>
                  <span className="text-2xl">🎉</span>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Target reached! Outstanding work!
                  </p>
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 text-orange-500" />
                  <p className="text-sm text-muted-foreground">
                    {(dailyCCHTarget - dailyCCH).toFixed(1)} hrs remaining
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Task Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Task Completion</span>
              <span className="text-muted-foreground">
                {tasksCompleted} / {totalTasks}
              </span>
            </div>
            <Progress value={taskProgress} className="h-2" />
          </div>

          {/* Activity Summary with enhanced styling */}
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Today's Activity
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium">Calls Made</span>
                </div>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{callsMade}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium">Appraisals</span>
                </div>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">{appraisals}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                    <Home className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <span className="text-sm font-medium">Open Homes</span>
                </div>
                <span className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{openHomes}</span>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
