import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { WeeklyTargetCompletion } from '@/hooks/useTargetCompletionHistory';

interface TargetCompletionTrendChartProps {
  data: WeeklyTargetCompletion[];
}

export const TargetCompletionTrendChart = ({ data }: TargetCompletionTrendChartProps) => {
  const chartData = data.map(week => ({
    week: week.week,
    completion: week.overallCompletionRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="week" 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Completion']}
        />
        <ReferenceLine 
          y={100} 
          stroke="hsl(var(--chart-2))" 
          strokeDasharray="3 3" 
          label={{ value: 'Target', position: 'right' }}
        />
        <Line
          type="monotone"
          dataKey="completion"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          dot={{ fill: 'hsl(var(--primary))', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
