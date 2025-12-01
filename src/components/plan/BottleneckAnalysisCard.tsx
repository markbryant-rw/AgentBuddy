import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Phone, Users, TrendingDown, Lightbulb, Target } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottleneckAnalysisCardProps {
  isVisible: boolean;
  quarterlyTargets: {
    calls: number;
    connections: number;
    appraisals: number;
  };
  actuals: {
    calls: number;
    connections: number;
    appraisals: number;
  };
  weeksIntoQuarter: number;
  totalWeeks: number;
  conversionRates: {
    callToConnection: number;
    connectionToAppraisal: number;
  };
}

export function BottleneckAnalysisCard({
  isVisible,
  quarterlyTargets,
  actuals,
  weeksIntoQuarter,
  totalWeeks,
  conversionRates,
}: BottleneckAnalysisCardProps) {
  if (!isVisible) return null;

  const expectedProgress = weeksIntoQuarter / totalWeeks;
  const weeksRemaining = totalWeeks - weeksIntoQuarter;
  
  // Calculate expected vs actual
  const expectedCalls = Math.round(quarterlyTargets.calls * expectedProgress);
  const expectedConnections = Math.round(quarterlyTargets.connections * expectedProgress);
  const expectedAppraisals = Math.round(quarterlyTargets.appraisals * expectedProgress);
  
  const callsGap = expectedCalls - actuals.calls;
  const connectionsGap = expectedConnections - actuals.connections;
  
  // Calculate actual conversion rates
  const actualCallToConnection = actuals.calls > 0 ? (actuals.connections / actuals.calls) : 0;
  const actualConnectionToAppraisal = actuals.connections > 0 ? (actuals.appraisals / actuals.connections) : 0;
  
  // Determine primary bottleneck
  const callsPercentage = (actuals.calls / expectedCalls) * 100;
  const connectionsPercentage = (actuals.connections / expectedConnections) * 100;
  const appraisalsPercentage = (actuals.appraisals / expectedAppraisals) * 100;
  
  const bottlenecks = [
    { type: 'calls', percentage: callsPercentage, gap: callsGap },
    { type: 'connections', percentage: connectionsPercentage, gap: connectionsGap },
  ].sort((a, b) => a.percentage - b.percentage);
  
  const primaryBottleneck = bottlenecks[0];
  
  // Calculate catch-up requirements
  const callsNeededPerWeek = weeksRemaining > 0 
    ? Math.ceil((quarterlyTargets.calls - actuals.calls) / weeksRemaining)
    : 0;
  const currentCallsPerWeek = Math.round(actuals.calls / weeksIntoQuarter);
  const additionalCallsNeeded = callsNeededPerWeek - currentCallsPerWeek;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="p-6 border-orange-500/50 bg-orange-500/5">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">What's Driving Your Appraisals?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  To hit {quarterlyTargets.appraisals} appraisals, you need activity at every level of the funnel
                </p>
              </div>
            </div>

            {/* Progress Metrics */}
            <div className="space-y-4">
              {/* Calls */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Calls</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {actuals.calls} / {quarterlyTargets.calls} ({callsPercentage.toFixed(0)}%)
                  </span>
                </div>
                <Progress 
                  value={callsPercentage} 
                  className="h-2"
                  indicatorClassName={cn(
                    callsPercentage >= 90 && 'bg-green-500',
                    callsPercentage >= 70 && callsPercentage < 90 && 'bg-blue-500',
                    callsPercentage >= 50 && callsPercentage < 70 && 'bg-orange-500',
                    callsPercentage < 50 && 'bg-red-500'
                  )}
                />
                {callsGap > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Behind pace by {callsGap} calls (should be at {expectedCalls})
                  </p>
                )}
              </div>

              {/* Connections */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Meaningful Connections</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {actuals.connections} / {quarterlyTargets.connections} ({connectionsPercentage.toFixed(0)}%)
                  </span>
                </div>
                <Progress 
                  value={connectionsPercentage} 
                  className="h-2"
                  indicatorClassName={cn(
                    connectionsPercentage >= 90 && 'bg-green-500',
                    connectionsPercentage >= 70 && connectionsPercentage < 90 && 'bg-blue-500',
                    connectionsPercentage >= 50 && connectionsPercentage < 70 && 'bg-orange-500',
                    connectionsPercentage < 50 && 'bg-red-500'
                  )}
                />
                {connectionsGap > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Behind pace by {connectionsGap} connections
                  </p>
                )}
              </div>
            </div>

            {/* Conversion Analysis */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Conversion Rate Analysis</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Call → Connection</p>
                  <p className="text-lg font-semibold">
                    {(actualCallToConnection * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Target: {(conversionRates.callToConnection * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Connection → Appraisal</p>
                  <p className="text-lg font-semibold">
                    {(actualConnectionToAppraisal * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Target: {(conversionRates.connectionToAppraisal * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Bottleneck */}
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-semibold text-red-600 dark:text-red-400">
                    Primary Bottleneck: {primaryBottleneck.type === 'calls' ? 'Call Volume' : 'Connection Quality'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {primaryBottleneck.type === 'calls' 
                      ? `You're ${Math.abs(primaryBottleneck.gap)} calls behind pace. Low call volume limits your entire funnel.`
                      : `Connection rate is below target. Your calls aren't converting to meaningful conversations.`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h4 className="font-semibold">Recommended Actions</h4>
              </div>
              
              <div className="space-y-2">
                {additionalCallsNeeded > 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Target className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Increase Call Volume</p>
                      <p className="text-sm text-muted-foreground">
                        Add {additionalCallsNeeded} calls/week (current: {currentCallsPerWeek}, need: {callsNeededPerWeek})
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 Suggestion: Add a 2nd "Hour of Power" session (Wed + Fri mornings)
                      </p>
                    </div>
                  </div>
                )}
                
                {actualCallToConnection < conversionRates.callToConnection && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Target className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">Improve Call Quality</p>
                      <p className="text-sm text-muted-foreground">
                        Your connection rate is {(actualCallToConnection * 100).toFixed(1)}% (target: {(conversionRates.callToConnection * 100).toFixed(0)}%)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 Suggestion: Use smart call list to prioritize warmer contacts
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" className="flex-1" size="sm">
                View Call Quality Analysis
              </Button>
              <Button variant="outline" className="flex-1" size="sm">
                Set Up Action Plan
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
