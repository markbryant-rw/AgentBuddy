import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";

interface TaskCompletionTrendsChartProps {
  data: Array<{
    date: string;
    completed: number;
    overdue: number;
  }>;
}

export const TaskCompletionTrendsChart = ({ data }: TaskCompletionTrendsChartProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Task Completion Trends (Last 30 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(date) => format(new Date(date), 'MMM dd')}
            tick={{ fontSize: 12 }}
          />
          <YAxis />
          <Tooltip 
            labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
            content={({ active, payload, label }) => {
              if (!active || !payload) return null;
              return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                  <p className="font-semibold">{format(new Date(label), 'MMM dd, yyyy')}</p>
                  <p className="text-sm text-emerald-600">
                    Completed: {payload[0]?.value || 0}
                  </p>
                  <p className="text-sm text-red-600">
                    Overdue: {payload[1]?.value || 0}
                  </p>
                </div>
              );
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="completed" 
            stroke="#10B981" 
            strokeWidth={2}
            name="Completed Tasks"
            dot={{ r: 3 }}
          />
          <Line 
            type="monotone" 
            dataKey="overdue" 
            stroke="#EF4444" 
            strokeWidth={2}
            name="Overdue Tasks"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
