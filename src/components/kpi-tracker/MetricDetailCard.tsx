import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { TrendingUp, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MetricDetailCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricName: string;
  currentValue: number;
  weekTotal: number;
  target: number;
  last7Days: Array<{ date: string; value: number }>;
  personalBest?: number;
  color: string;
}

export function MetricDetailCard({
  open,
  onOpenChange,
  metricName,
  currentValue,
  weekTotal,
  target,
  last7Days,
  personalBest,
  color,
}: MetricDetailCardProps) {
  const progress = target > 0 ? (weekTotal / target) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" style={{ color }} />
            {metricName} Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{currentValue}</div>
              <div className="text-sm text-muted-foreground">Today</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{weekTotal}</div>
              <div className="text-sm text-muted-foreground">This Week</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-2xl font-bold">{progress.toFixed(0)}%</div>
              <div className="text-sm text-muted-foreground">Of Target</div>
            </div>
          </div>

          {/* Personal Best */}
          {personalBest && personalBest > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1 w-fit">
              <Award className="h-3 w-3" />
              Personal Best: {personalBest}
            </Badge>
          )}

          {/* 7-Day Trend */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Last 7 Days</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Notes */}
          <div>
            <label className="text-sm font-semibold mb-2 block">
              Today's Wins/Learnings
            </label>
            <Textarea
              placeholder="What went well? Any insights?"
              className="resize-none"
              rows={3}
            />
            <Button size="sm" className="mt-2">Save Note</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
