import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface WorkloadDistributionChartProps {
  data: Array<{
    userId: string;
    assigned: number;
    completed: number;
    overdue: number;
  }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6'];

export const WorkloadDistributionChart = ({ data }: WorkloadDistributionChartProps) => {
  const { data: profiles } = useQuery({
    queryKey: ["profiles-workload", data.map(d => d.userId)],
    queryFn: async () => {
      const userIds = data.map(d => d.userId);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      return profileData || [];
    },
    enabled: data.length > 0,
  });

  const chartData = data.map((item, index) => {
    const profile = profiles?.find(p => p.id === item.userId);
    return {
      name: profile?.full_name || profile?.email || 'Unknown',
      value: item.assigned,
      ...item,
    };
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Workload Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                  <p className="font-semibold">{data.name}</p>
                  <p className="text-sm">Total Assigned: {data.assigned}</p>
                  <p className="text-sm text-emerald-600">Completed: {data.completed}</p>
                  <p className="text-sm text-red-600">Overdue: {data.overdue}</p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
};
