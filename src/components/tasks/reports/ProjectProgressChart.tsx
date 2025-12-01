import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getStageColor } from "@/lib/stageColors";
import { AlertCircle } from "lucide-react";

interface ProjectProgressChartProps {
  data: Array<{
    id: string;
    title: string;
    stage: string;
    progress: number;
    overdueTasks: number;
  }>;
  onProjectClick?: (projectId: string) => void;
}

export const ProjectProgressChart = ({ data, onProjectClick }: ProjectProgressChartProps) => {
  const chartData = data.slice(0, 10); // Show top 10 projects

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Project Progress</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} />
          <YAxis 
            type="category" 
            dataKey="title" 
            width={150}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                  <p className="font-semibold">{data.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Stage: {getStageColor(data.stage).label}
                  </p>
                  <p className="text-sm">Progress: {data.progress}%</p>
                  {data.overdueTasks > 0 && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      {data.overdueTasks} overdue task{data.overdueTasks > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Bar 
            dataKey="progress" 
            radius={[0, 4, 4, 0]}
            onClick={(data) => onProjectClick?.(data.id)}
            className="cursor-pointer"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getStageColor(entry.stage).hex}
                opacity={entry.overdueTasks > 0 ? 0.7 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
