import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { HistoricalDataPoint } from '@/hooks/useKPIHistory';

interface CCHTrendChartProps {
  data: HistoricalDataPoint[];
}

export const CCHTrendChart = ({ data }: CCHTrendChartProps) => {
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
        <YAxis className="text-xs" label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--card))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
          formatter={(value: number) => `${value.toFixed(2)} hrs`}
        />
        <Line 
          type="monotone" 
          dataKey="cch" 
          stroke="hsl(var(--primary))" 
          name="CCH" 
          strokeWidth={3}
          dot={{ fill: 'hsl(var(--primary))', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
