import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, Calendar, Target, TrendingUp } from "lucide-react";

interface PastSalesStatsBarProps {
  analytics: {
    totalSalesValue: number;
    averageSalePrice: number;
    averageDaysOnMarket: number;
    appraisalAccuracy: number;
  };
}

const PastSalesStatsBar = ({ analytics }: PastSalesStatsBarProps) => {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const stats = [
    {
      label: "Total Sales Value",
      value: formatCurrency(analytics.totalSalesValue),
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      label: "Avg Sale Price",
      value: formatCurrency(analytics.averageSalePrice),
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      label: "Avg Days on Market",
      value: `${Math.round(analytics.averageDaysOnMarket)} days`,
      icon: Calendar,
      color: "text-orange-600",
    },
    {
      label: "Appraisal Accuracy",
      value: `${analytics.appraisalAccuracy.toFixed(0)}%`,
      icon: Target,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default PastSalesStatsBar;