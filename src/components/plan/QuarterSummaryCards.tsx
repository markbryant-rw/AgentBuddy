import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuarterSummaryCardsProps {
  onViewLastQuarter: () => void;
  onViewThisQuarter: () => void;
  onViewNextQuarter: () => void;
  currentProgress?: number;
  weeksIntoQuarter?: number;
  totalWeeks?: number;
}

export const QuarterSummaryCards = ({
  onViewLastQuarter,
  onViewThisQuarter,
  onViewNextQuarter,
  currentProgress = 57,
  weeksIntoQuarter = 8,
  totalWeeks = 13
}: QuarterSummaryCardsProps) => {
  const currentDate = new Date();
  const currentQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
  const currentYear = currentDate.getFullYear();

  const lastQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1;
  const lastQuarterYear = currentQuarter === 1 ? currentYear - 1 : currentYear;
  
  const nextQuarter = currentQuarter === 4 ? 1 : currentQuarter + 1;
  const nextQuarterYear = currentQuarter === 4 ? currentYear + 1 : currentYear;

  // Calculate status based on progress vs expected pace
  const expectedProgress = (weeksIntoQuarter / totalWeeks) * 100;
  const getStatus = () => {
    const diff = currentProgress - expectedProgress;
    if (diff >= 5) return { 
      label: 'Ahead of Pace', 
      color: 'bg-green-500 hover:bg-green-600', 
      icon: '✅',
      textColor: 'text-white'
    };
    if (diff >= -5) return { 
      label: 'On Track', 
      color: 'bg-blue-500 hover:bg-blue-600', 
      icon: '🎯',
      textColor: 'text-white'
    };
    if (diff >= -20) return { 
      label: 'Behind Pace', 
      color: 'bg-orange-500 hover:bg-orange-600', 
      icon: '⚠️',
      textColor: 'text-white'
    };
    return { 
      label: 'Critical', 
      color: 'bg-red-500 hover:bg-red-600', 
      icon: '🔴',
      textColor: 'text-white'
    };
  };

  const status = getStatus();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Last Quarter - Completed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-6 border-border/50 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold text-sm text-muted-foreground">Q{lastQuarter} RESULTS</h3>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">GCI:</span>
              <span className="text-lg font-bold">$38K / $45K</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Appraisals:</span>
              <span className="text-lg font-bold">42 / 35</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-2xl font-bold text-green-500 mb-1">85%</div>
            <div className="text-xs text-muted-foreground">Overall Achievement</div>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
            onClick={onViewLastQuarter}
          >
            View Review →
          </Button>
        </Card>
      </motion.div>

      {/* This Quarter - In Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="p-6 border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-background hover:border-primary transition-all shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm text-muted-foreground">Q{currentQuarter} PROGRESS</h3>
            </div>
            <Badge className={cn(status.color, status.textColor, "gap-1 px-2 py-1")}>
              <span>{status.icon}</span>
              <span className="text-xs font-medium">{status.label}</span>
            </Badge>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">GCI:</span>
              <span className="text-lg font-bold">$12.5K / $50K</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Appraisals:</span>
              <span className="text-lg font-bold">23 / 40</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-2xl font-bold text-primary mb-1">57%</div>
            <div className="text-xs text-muted-foreground">Progress Complete</div>
          </div>

          <Button 
            className="w-full" 
            size="sm"
            onClick={() => {
              document.getElementById('this-week')?.scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
              });
            }}
          >
            Current Plan →
          </Button>
        </Card>
      </motion.div>

      {/* Next Quarter - Planning */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="p-6 border-border/50 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-sm text-muted-foreground">Q{nextQuarter} PREVIEW</h3>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Target GCI:</span>
              <span className="text-lg font-bold">$50K</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-muted-foreground">Appraisals:</span>
              <span className="text-lg font-bold">40</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-2xl font-bold text-muted-foreground mb-1">📅</div>
            <div className="text-xs text-muted-foreground">Starts Jan 1, {nextQuarterYear}</div>
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            size="sm"
            onClick={onViewNextQuarter}
          >
            Start Planning →
          </Button>
        </Card>
      </motion.div>
    </div>
  );
};
