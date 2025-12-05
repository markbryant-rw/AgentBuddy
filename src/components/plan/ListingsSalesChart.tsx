import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

interface WeeklyDataPoint {
  week: string;
  weekNum: number;
  listings: number;
  sales: number;
}

interface ListingsSalesChartProps {
  data: WeeklyDataPoint[];
  listingsTarget?: number | null;
  salesTarget?: number | null;
}

export const ListingsSalesChart = ({ data, listingsTarget, salesTarget }: ListingsSalesChartProps) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
        No data available yet
      </div>
    );
  }

  // Calculate max value for Y axis
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.listings, d.sales)),
    listingsTarget || 0,
    salesTarget || 0
  );

  return (
    <div className="h-[120px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <XAxis 
            dataKey="week" 
            tick={{ fontSize: 10 }} 
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            tick={{ fontSize: 10 }} 
            tickLine={false}
            axisLine={false}
            domain={[0, Math.max(maxValue + 2, 5)]}
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ 
              fontSize: 12, 
              borderRadius: 8,
              border: '1px solid hsl(var(--border))',
              backgroundColor: 'hsl(var(--popover))',
              color: 'hsl(var(--popover-foreground))'
            }}
            formatter={(value: number, name: string) => [
              value,
              name === 'listings' ? 'Listings' : 'Sales'
            ]}
          />
          
          {/* Target reference lines */}
          {listingsTarget && (
            <ReferenceLine 
              y={listingsTarget} 
              stroke="hsl(var(--chart-1))" 
              strokeDasharray="3 3" 
              strokeOpacity={0.5}
            />
          )}
          {salesTarget && (
            <ReferenceLine 
              y={salesTarget} 
              stroke="hsl(var(--chart-2))" 
              strokeDasharray="3 3" 
              strokeOpacity={0.5}
            />
          )}

          {/* Listings line (blue) */}
          <Line
            type="monotone"
            dataKey="listings"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5 }}
          />
          
          {/* Sales line (green) */}
          <Line
            type="monotone"
            dataKey="sales"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5 }}
          />

          <Legend 
            verticalAlign="bottom" 
            height={20}
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">
                {value === 'listings' ? 'Listings' : 'Sales'}
              </span>
            )}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
