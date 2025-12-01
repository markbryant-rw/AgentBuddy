import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface PlaybookCompletion {
  id: string;
  title: string;
  total_cards: number;
  completed_cards: number;
  completion_rate: number;
}

interface CompletionRateChartProps {
  data: PlaybookCompletion[] | undefined;
}

export function CompletionRateChart({ data }: CompletionRateChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Completion Rates by Playbook</CardTitle>
          <CardDescription>Track how well playbooks are being completed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No completion data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(item => ({
    name: item.title.length > 20 ? item.title.substring(0, 20) + '...' : item.title,
    rate: item.completion_rate,
    color: item.completion_rate > 75 ? 'hsl(var(--chart-1))' : 
           item.completion_rate > 50 ? 'hsl(var(--chart-2))' : 
           item.completion_rate > 25 ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-4))'
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Completion Rates by Playbook</CardTitle>
        <CardDescription>Track how well playbooks are being completed</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              className="text-xs"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis 
              label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }}
              domain={[0, 100]}
            />
            <Tooltip 
              formatter={(value: number) => [`${value.toFixed(1)}%`, 'Completion Rate']}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px'
              }}
            />
            <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
