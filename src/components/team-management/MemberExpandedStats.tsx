import { useState } from 'react';
import { MemberAnalytics } from '@/hooks/useTeamMemberAnalytics';
import { MemberGoal } from '@/hooks/useTeamGoals';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Home, CheckCircle2, Clock, AlertTriangle, Percent, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MemberExpandedStatsProps {
  memberId: string;
  analytics: MemberAnalytics | undefined;
  memberGoals: MemberGoal[];
  roles: string[];
  isExpanded: boolean;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

const getProgressColor = (current: number, target: number) => {
  if (target === 0) return 'bg-muted';
  const percent = (current / target) * 100;
  if (percent >= 75) return 'bg-emerald-500';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-red-500';
};

export function MemberExpandedStats({ 
  memberId, 
  analytics, 
  memberGoals, 
  roles, 
  isExpanded 
}: MemberExpandedStatsProps) {
  const [taskPeriod, setTaskPeriod] = useState<'week' | 'month'>('week');
  
  const isAssistant = roles.includes('assistant') && !roles.includes('salesperson') && !roles.includes('team_leader');
  
  // Get goals for this member
  const appraisalGoal = memberGoals.find(g => g.user_id === memberId && g.kpi_type === 'appraisals');
  const listingGoal = memberGoals.find(g => g.user_id === memberId && g.kpi_type === 'listings');
  const salesGoal = memberGoals.find(g => g.user_id === memberId && g.kpi_type === 'sales');

  if (!analytics) return null;

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4 pt-2 border-t bg-gradient-to-r from-amber-50/60 to-orange-50/60 dark:from-amber-950/20 dark:to-orange-950/20">
            {isAssistant ? (
              // Assistant view - Task stats with week/month toggle
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Task Performance</span>
                  <div className="flex gap-1 bg-muted rounded-md p-0.5">
                    <Button
                      variant={taskPeriod === 'week' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => { e.stopPropagation(); setTaskPeriod('week'); }}
                    >
                      This Week
                    </Button>
                    <Button
                      variant={taskPeriod === 'month' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => { e.stopPropagation(); setTaskPeriod('month'); }}
                    >
                      This Month
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <StatCard
                    icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    label="Completed"
                    value={taskPeriod === 'week' ? analytics.weeklyTasksCompleted : analytics.monthlyTasksCompleted}
                  />
                  <StatCard
                    icon={<Clock className="h-4 w-4 text-blue-600" />}
                    label="Open"
                    value={taskPeriod === 'week' ? analytics.weeklyTasksOpen : analytics.monthlyTasksOpen}
                  />
                  <StatCard
                    icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
                    label="Overdue"
                    value={taskPeriod === 'week' ? analytics.weeklyTasksOverdue : analytics.monthlyTasksOverdue}
                    highlight={taskPeriod === 'week' ? analytics.weeklyTasksOverdue > 0 : analytics.monthlyTasksOverdue > 0}
                  />
                  <StatCard
                    icon={<Percent className="h-4 w-4 text-purple-600" />}
                    label="Completion"
                    value={`${taskPeriod === 'week' ? analytics.weeklyCompletionRate : analytics.monthlyCompletionRate}%`}
                    showProgress
                    progressValue={taskPeriod === 'week' ? analytics.weeklyCompletionRate : analytics.monthlyCompletionRate}
                  />
                </div>
              </div>
            ) : (
              // Salesperson/Team Leader view - Quarterly performance with goals
              <div className="space-y-3">
                <span className="text-sm font-medium text-muted-foreground">Quarterly Performance</span>
                
                <div className="grid grid-cols-4 gap-3">
                  <GoalStatCard
                    icon={<Target className="h-4 w-4 text-teal-600" />}
                    label="Appraisals"
                    current={analytics.quarterlyAppraisals}
                    target={appraisalGoal?.target_value}
                  />
                  <GoalStatCard
                    icon={<Home className="h-4 w-4 text-blue-600" />}
                    label="Listings"
                    current={analytics.quarterlyListings}
                    target={listingGoal?.target_value}
                  />
                  <GoalStatCard
                    icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                    label="Sales"
                    current={analytics.quarterlySales}
                    target={salesGoal?.target_value}
                  />
                  <StatCard
                    icon={<span className="text-sm">💰</span>}
                    label="Pipeline"
                    value={formatCurrency(analytics.pipelineValue)}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Simple stat card without goal
function StatCard({ 
  icon, 
  label, 
  value, 
  highlight = false,
  showProgress = false,
  progressValue = 0
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  highlight?: boolean;
  showProgress?: boolean;
  progressValue?: number;
}) {
  return (
    <div className={`bg-card/80 backdrop-blur-sm rounded-lg p-3 border ${highlight ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : 'border-border/50'}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-semibold ${highlight ? 'text-red-600' : ''}`}>
        {value}
      </div>
      {showProgress && (
        <Progress value={progressValue} className="h-1.5 mt-2" />
      )}
    </div>
  );
}

// Stat card with goal progress
function GoalStatCard({ 
  icon, 
  label, 
  current,
  target
}: { 
  icon: React.ReactNode; 
  label: string; 
  current: number;
  target?: number;
}) {
  const hasGoal = target !== undefined && target > 0;
  const percent = hasGoal ? Math.min((current / target) * 100, 100) : 0;
  
  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-lg p-3 border border-border/50">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-semibold">
        {hasGoal ? (
          <span>
            {current} <span className="text-muted-foreground font-normal">/ {target}</span>
          </span>
        ) : (
          current
        )}
      </div>
      {hasGoal && (
        <div className="mt-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${getProgressColor(current, target)}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
