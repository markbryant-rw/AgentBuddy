import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { WeeklyTargetCompletion } from '@/hooks/useTargetCompletionHistory';

interface PerKPICompletionChartProps {
  data: WeeklyTargetCompletion[];
}

export const PerKPICompletionChart = ({ data }: PerKPICompletionChartProps) => {
  const chartData = data.map(week => ({
    week: week.week,
    Calls: week.calls.percentage,
    SMS: week.sms.percentage,
    Appraisals: week.appraisals.percentage,
    'Open Homes': week.openHomes.percentage,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
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
          formatter={(value: number) => `${value.toFixed(1)}%`}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="line"
        />
        <ReferenceLine 
          y={100} 
          stroke="hsl(var(--muted-foreground))" 
          strokeDasharray="3 3"
          strokeOpacity={0.5}
        />
        <Line
          type="monotone"
          dataKey="Calls"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="SMS"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="Appraisals"
          stroke="hsl(var(--chart-4))"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="Open Homes"
          stroke="hsl(var(--chart-3))"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
