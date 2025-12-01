import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { HistoricalDataPoint } from '@/hooks/useKPIHistory';

interface KPITrendChartProps {
  data: HistoricalDataPoint[];
}

export const KPITrendChart = ({ data }: KPITrendChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          className="text-xs"
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        <YAxis className="text-xs" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Line type="monotone" dataKey="calls" stroke="hsl(var(--chart-1))" name="Calls" strokeWidth={2} />
        <Line type="monotone" dataKey="sms" stroke="hsl(var(--chart-2))" name="SMS" strokeWidth={2} />
        <Line type="monotone" dataKey="appraisals" stroke="hsl(var(--chart-3))" name="Appraisals" strokeWidth={2} />
        <Line type="monotone" dataKey="openHomes" stroke="hsl(var(--chart-4))" name="Open Homes" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
};
