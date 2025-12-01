import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Phone, ClipboardCheck, Home, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface CCHActivityCardProps {
  weeklyCCH: number;
  targetCCH: number;
  calls: number;
  appraisalsCompleted: number;
  openHomes: number;
}

export function CCHActivityCard({
  weeklyCCH,
  targetCCH,
  calls,
  appraisalsCompleted,
  openHomes,
}: CCHActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const percentage = (weeklyCCH / targetCCH) * 100;
  const callsCCH = calls * 0.05;
  const appraisalsCCH = appraisalsCompleted * 1.0;
  const openHomesCCH = openHomes * 0.5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className="overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-6 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Activity Tracking (CCH)</h3>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold">{weeklyCCH.toFixed(1)}</span>
                <span className="text-lg text-muted-foreground">/ {targetCCH.toFixed(1)} hrs</span>
                <span className="text-sm text-muted-foreground">({percentage.toFixed(0)}%)</span>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
            <ChevronDown 
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform ml-4",
                isExpanded && "rotate-180"
              )} 
            />
          </div>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-6 pb-6 space-y-4 border-t">
                <p className="text-sm text-muted-foreground pt-4">
                  This Week's Activity Breakdown
                </p>

                {/* Calls */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">Calls</p>
                      <p className="text-sm text-muted-foreground">{calls} calls made</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{callsCCH.toFixed(1)} hrs</p>
                    <p className="text-xs text-muted-foreground">@ 3 min/call</p>
                  </div>
                </div>

                {/* Appraisals Completed */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <ClipboardCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">Appraisals Completed</p>
                      <p className="text-sm text-muted-foreground">{appraisalsCompleted} completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{appraisalsCCH.toFixed(1)} hrs</p>
                    <p className="text-xs text-muted-foreground">@ 1 hr each</p>
                  </div>
                </div>

                {/* Open Homes */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Home className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium">Open Homes</p>
                      <p className="text-sm text-muted-foreground">{openHomes} held</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{openHomesCCH.toFixed(1)} hrs</p>
                    <p className="text-xs text-muted-foreground">@ 30 min each</p>
                  </div>
                </div>

                {/* Total Summary */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Total CCH This Week</p>
                    <p className="text-xl font-bold">{weeklyCCH.toFixed(1)} / {targetCCH.toFixed(1)} hrs</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
