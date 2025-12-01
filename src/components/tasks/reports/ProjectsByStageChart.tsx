import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { STAGE_COLORS } from "@/lib/stageColors";

interface ProjectsByStageChartProps {
  data: Record<string, any[]>;
}

export const ProjectsByStageChart = ({ data }: ProjectsByStageChartProps) => {
  const chartData = Object.entries(data).map(([stage, projects]) => ({
    stage: STAGE_COLORS[stage as keyof typeof STAGE_COLORS]?.label || stage,
    count: projects.length,
    color: STAGE_COLORS[stage as keyof typeof STAGE_COLORS]?.hex || '#6B7280',
  }));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Projects by Lifecycle Stage</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="stage" />
          <YAxis />
          <Tooltip 
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                  <p className="font-semibold">{data.stage}</p>
                  <p className="text-sm">Projects: {data.count}</p>
                </div>
              );
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <rect key={`bar-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
