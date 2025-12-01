import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, DollarSign, Home, FileText, ClipboardCheck, Users, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface LadderRung {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  actual: number;
  target: number;
  unit: string;
  status: 'ahead' | 'on_track' | 'behind' | 'critical';
  details?: string;
}

interface ActivityLadderProps {
  quarterlyActuals: {
    gci: number;
    sales: number;
    listings: number;
    appraisals: number;
    connections: number;
    calls: number;
  };
  quarterlyTargets: {
    gci: number;
    sales: number;
    listings: number;
    appraisals: number;
    connections: number;
    calls: number;
  };
}

export const ActivityLadder = ({ quarterlyActuals, quarterlyTargets }: ActivityLadderProps) => {
  const [expandedRung, setExpandedRung] = useState<number | null>(null);

  const calculateStatus = (actual: number, target: number): LadderRung['status'] => {
    const percentage = (actual / target) * 100;
    if (percentage >= 100) return 'ahead';
    if (percentage >= 85) return 'on_track';
    if (percentage >= 60) return 'behind';
    return 'critical';
  };

  const getStatusColor = (status: LadderRung['status']) => {
    switch (status) {
      case 'ahead':
        return 'text-green-500';
      case 'on_track':
        return 'text-primary';
      case 'behind':
        return 'text-orange-500';
      case 'critical':
        return 'text-red-500';
    }
  };

  const getProgressColor = (status: LadderRung['status']) => {
    switch (status) {
      case 'ahead':
        return '[&>div]:bg-green-500';
      case 'on_track':
        return '[&>div]:bg-primary';
      case 'behind':
        return '[&>div]:bg-orange-500';
      case 'critical':
        return '[&>div]:bg-red-500';
    }
  };

  const rungs: LadderRung[] = [
    {
      icon: DollarSign,
      label: 'GCI Goal',
      actual: quarterlyActuals.gci,
      target: quarterlyTargets.gci,
      unit: '$',
      status: calculateStatus(quarterlyActuals.gci, quarterlyTargets.gci),
      details: 'Your income target drives everything below',
    },
    {
      icon: Home,
      label: 'Sales',
      actual: quarterlyActuals.sales,
      target: quarterlyTargets.sales,
      unit: '',
      status: calculateStatus(quarterlyActuals.sales, quarterlyTargets.sales),
      details: 'Closed transactions generating GCI',
    },
    {
      icon: FileText,
      label: 'Listings',
      actual: quarterlyActuals.listings,
      target: quarterlyTargets.listings,
      unit: '',
      status: calculateStatus(quarterlyActuals.listings, quarterlyTargets.listings),
      details: 'Active listings from appraisals won',
    },
    {
      icon: ClipboardCheck,
      label: 'Appraisals',
      actual: quarterlyActuals.appraisals,
      target: quarterlyTargets.appraisals,
      unit: '',
      status: calculateStatus(quarterlyActuals.appraisals, quarterlyTargets.appraisals),
      details: 'The lead indicator - focus here first',
    },
    {
      icon: Users,
      label: 'Connections',
      actual: quarterlyActuals.connections,
      target: quarterlyTargets.connections,
      unit: '',
      status: calculateStatus(quarterlyActuals.connections, quarterlyTargets.connections),
      details: 'Meaningful conversations from calls',
    },
    {
      icon: Phone,
      label: 'Calls',
      actual: quarterlyActuals.calls,
      target: quarterlyTargets.calls,
      unit: '',
      status: calculateStatus(quarterlyActuals.calls, quarterlyTargets.calls),
      details: 'The activity driver - volume matters',
    },
  ];

  const toggleRung = (index: number) => {
    setExpandedRung(expandedRung === index ? null : index);
  };

  return (
    <Card id="the-ladder" className="p-6 scroll-mt-24">
      <h3 className="text-lg font-semibold mb-4">THE LADDER</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Your quarterly goal broken down into actionable steps. Each rung depends on the one below it.
      </p>

      <div className="space-y-3">
        {rungs.map((rung, index) => {
          const Icon = rung.icon;
          const percentage = Math.min((rung.actual / rung.target) * 100, 100);
          const isExpanded = expandedRung === index;

          return (
            <motion.div
              key={rung.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <div
                className={cn(
                  "border rounded-lg p-4 transition-all cursor-pointer hover:border-primary/50",
                  isExpanded && "border-primary/50 bg-primary/5"
                )}
                onClick={() => toggleRung(index)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-lg bg-background", getStatusColor(rung.status))}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{rung.label}</h4>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className={cn("text-sm font-semibold", getStatusColor(rung.status))}>
                        {rung.unit === '$' ? `$${(rung.actual / 1000).toFixed(1)}K` : rung.actual} / {rung.unit === '$' ? `$${(rung.target / 1000).toFixed(0)}K` : rung.target}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={percentage} 
                        className={cn("flex-1", getProgressColor(rung.status))}
                      />
                      <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-right">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                            {rung.details}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {index < rungs.length - 1 && !isExpanded && (
                  <div className="flex justify-center mt-2">
                    <div className="w-px h-4 bg-border" />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
};
