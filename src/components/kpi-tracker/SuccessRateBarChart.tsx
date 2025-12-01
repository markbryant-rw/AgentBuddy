import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { WeeklyTargetCompletion } from '@/hooks/useTargetCompletionHistory';

interface SuccessRateBarChartProps {
  data: WeeklyTargetCompletion[];
}

export const SuccessRateBarChart = ({ data }: SuccessRateBarChartProps) => {
  const calculateSuccessRate = (kpiKey: 'calls' | 'sms' | 'appraisals' | 'openHomes') => {
    const weeksWithTargets = data.filter(w => w[kpiKey].target > 0);
    if (weeksWithTargets.length === 0) return 0;
    const successfulWeeks = weeksWithTargets.filter(w => w[kpiKey].percentage >= 100);
    return (successfulWeeks.length / weeksWithTargets.length) * 100;
  };

  const chartData = [
    { name: 'Calls', rate: calculateSuccessRate('calls'), color: 'hsl(var(--chart-1))' },
    { name: 'SMS', rate: calculateSuccessRate('sms'), color: 'hsl(var(--chart-2))' },
    { name: 'Appraisals', rate: calculateSuccessRate('appraisals'), color: 'hsl(var(--chart-4))' },
    { name: 'Open Homes', rate: calculateSuccessRate('openHomes'), color: 'hsl(var(--chart-3))' },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          type="number" 
          domain={[0, 100]}
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          label={{ value: '% of Weeks Target Met', position: 'bottom' }}
        />
        <YAxis 
          type="category" 
          dataKey="name"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          width={100}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Success Rate']}
        />
        <Bar dataKey="rate" radius={[0, 8, 8, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
