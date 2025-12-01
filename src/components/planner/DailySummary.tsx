import { DailyPlannerItem } from '@/hooks/useDailyPlanner';
import { Progress } from '@/components/ui/progress';
import { Clock, Target, TrendingUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';
import { PomodoroStats } from '@/components/pomodoro/PomodoroStats';
interface DailySummaryProps {
  items: DailyPlannerItem[];
}
export function DailySummary({
  items
}: DailySummaryProps) {
  const [isOpen, setIsOpen] = useState(true);
  const completedItems = items.filter(i => i.completed);
  const totalEstimated = items.reduce((sum, i) => sum + (i.estimated_minutes || 0), 0);
  const completedTime = completedItems.reduce((sum, i) => sum + (i.estimated_minutes || 0), 0);
  const bigTasks = items.filter(i => i.size_category === 'big');
  const bigCompleted = bigTasks.filter(i => i.completed);
  const mediumTasks = items.filter(i => i.size_category === 'medium');
  const mediumCompleted = mediumTasks.filter(i => i.completed);
  const littleTasks = items.filter(i => i.size_category === 'little');
  const littleCompleted = littleTasks.filter(i => i.completed);
  const completionPercentage = totalEstimated > 0 ? Math.round(completedTime / totalEstimated * 100) : 0;
  const taskCompletionRate = items.length > 0 ? Math.round(completedItems.length / items.length * 100) : 0;

  // Generate insights
  const insights: string[] = [];
  if (bigCompleted.length === bigTasks.length && bigTasks.length > 0) {
    insights.push("🎯 All High-Impact Tasks crushed! You're unstoppable!");
  }
  if (littleCompleted.length >= 5) {
    insights.push(`⚡ ${littleCompleted.length} Quick Wins completed in under 15min!`);
  }
  if (taskCompletionRate >= 80) {
    insights.push("🔥 Outstanding productivity today!");
  }
  const remainingTime = totalEstimated - completedTime;
  const remainingHours = Math.round(remainingTime / 60 * 10) / 10;
  if (remainingTime > 0 && remainingHours > 0) {
    insights.push(`⏰ ${remainingHours}h remaining`);
  }
  const getProgressColor = (percent: number) => {
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };
  const getCategoryCompletion = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round(completed / total * 100);
  };
  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) {
      return `${mins}m`;
    }
    if (mins === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${mins}m`;
  };
  if (items.length === 0) return null;
  return <div className="space-y-4">
      {/* Pomodoro Stats Card */}
      

      {/* Daily Summary Collapsible */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-card border rounded-lg">
      <div className="p-6 pb-0">
        <CollapsibleTrigger 
          className="flex items-center justify-center w-full relative group hover:bg-accent/50 rounded-md transition-all duration-200 hover:scale-[1.01] cursor-pointer p-4 hover:border-primary/20 border-2 border-transparent"
          aria-label="Toggle daily progress details"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary transition-transform group-hover:scale-110" />
            <h3 className="text-lg font-semibold">Daily Progress</h3>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
              <span className="text-sm font-medium text-primary">
                {completedItems.length} of {items.length} tasks
              </span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-sm font-medium text-primary">{taskCompletionRate}%</span>
            </div>
          </div>
          <ChevronDown className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200 absolute right-4",
            isOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
      </div>

      {/* Insights - always visible */}
      {insights.length > 0 && <div className="px-6 pb-2 flex flex-wrap gap-2">
          {insights.slice(0, 2).map((insight, idx) => <div key={idx} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
              {insight}
            </div>)}
        </div>}
      
      <CollapsibleContent>
        <div className="p-6 pt-2 space-y-6">

      {/* Overall Time Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            Time Estimated
          </span>
          <span className="font-semibold">
            {formatMinutes(completedTime)} / {formatMinutes(totalEstimated)}
          </span>
        </div>
        <Progress value={completionPercentage} indicatorClassName={getProgressColor(completionPercentage)} className="h-3" />
        <p className="text-xs text-right text-muted-foreground">
          {completionPercentage}% complete
        </p>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {/* Big Tasks */}
        <div className={cn("p-4 rounded-lg border-2 transition-all", getCategoryCompletion(bigCompleted.length, bigTasks.length) >= 80 ? "border-green-500/30 bg-green-500/5" : getCategoryCompletion(bigCompleted.length, bigTasks.length) >= 50 ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/30")}>
          <div className="flex items-center justify-between mb-2">
            <Target className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium">High-Impact</span>
          </div>
          <div className="text-2xl font-bold">
            {bigCompleted.length}/{bigTasks.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {getCategoryCompletion(bigCompleted.length, bigTasks.length)}% done
          </p>
        </div>

        {/* Medium Tasks */}
        <div className={cn("p-4 rounded-lg border-2 transition-all", getCategoryCompletion(mediumCompleted.length, mediumTasks.length) >= 80 ? "border-green-500/30 bg-green-500/5" : getCategoryCompletion(mediumCompleted.length, mediumTasks.length) >= 50 ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/30")}>
          <div className="flex items-center justify-between mb-2">
            <Target className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-medium">Important</span>
          </div>
          <div className="text-2xl font-bold">
            {mediumCompleted.length}/{mediumTasks.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {getCategoryCompletion(mediumCompleted.length, mediumTasks.length)}% done
          </p>
        </div>

        {/* Little Tasks */}
        <div className={cn("p-4 rounded-lg border-2 transition-all", getCategoryCompletion(littleCompleted.length, littleTasks.length) >= 80 ? "border-green-500/30 bg-green-500/5" : getCategoryCompletion(littleCompleted.length, littleTasks.length) >= 50 ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/30")}>
          <div className="flex items-center justify-between mb-2">
            <Target className="h-4 w-4 text-green-500" />
            <span className="text-xs font-medium">Quick Wins</span>
          </div>
          <div className="text-2xl font-bold">
            {littleCompleted.length}/{littleTasks.length}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {getCategoryCompletion(littleCompleted.length, littleTasks.length)}% done
          </p>
        </div>
      </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
    </div>;
}