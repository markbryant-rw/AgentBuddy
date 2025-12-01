import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, FolderOpen, AlertCircle, TrendingUp } from "lucide-react";
import { ProgressRing } from "@/components/ProgressRing";

interface SummaryCardsProps {
  activeProjects: number;
  completedProjectsThisMonth: number;
  totalTasksCompleted: number;
  overdueTasksCount: number;
  avgProjectCompletion: number;
}

export const SummaryCards = ({
  activeProjects,
  completedProjectsThisMonth,
  totalTasksCompleted,
  overdueTasksCount,
  avgProjectCompletion,
}: SummaryCardsProps) => {
  const cards = [
    {
      title: "Active Projects",
      value: activeProjects,
      icon: FolderOpen,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Completed Projects",
      subtitle: "This Month",
      value: completedProjectsThisMonth,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      title: "Tasks Completed",
      value: totalTasksCompleted,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Overdue Tasks",
      value: overdueTasksCount,
      icon: AlertCircle,
      color: overdueTasksCount > 0 ? "text-red-600" : "text-gray-400",
      bgColor: overdueTasksCount > 0 ? "bg-red-100" : "bg-gray-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                )}
                <p className="text-3xl font-bold mt-2">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
      
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Avg Completion</p>
            <p className="text-3xl font-bold mt-2">{avgProjectCompletion}%</p>
          </div>
          <div className="flex items-center justify-center">
            <ProgressRing
              progress={avgProjectCompletion}
              size={48}
              strokeWidth={4}
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
