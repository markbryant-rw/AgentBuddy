import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Home, DollarSign, CheckCircle2, AlertTriangle } from 'lucide-react';
import { TeamAnalyticsSummary as SummaryType } from '@/hooks/useTeamMemberAnalytics';
import { cn } from '@/lib/utils';

interface TeamAnalyticsSummaryProps {
  summary: SummaryType;
  isLoading?: boolean;
}

export function TeamAnalyticsSummary({ summary, isLoading }: TeamAnalyticsSummaryProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const cards = [
    {
      label: 'Appraisals',
      value: summary.totalAppraisals,
      subValue: 'This quarter',
      icon: ClipboardList,
      gradient: 'from-teal-500/20 to-cyan-500/20',
      iconBg: 'bg-teal-500/10',
      iconColor: 'text-teal-600',
    },
    {
      label: 'Active Listings',
      value: summary.totalListings,
      subValue: formatCurrency(summary.totalPipelineValue),
      icon: Home,
      gradient: 'from-blue-500/20 to-indigo-500/20',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Sales',
      value: summary.totalSales,
      subValue: 'This quarter',
      icon: DollarSign,
      gradient: 'from-emerald-500/20 to-green-500/20',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Task Health',
      value: `${summary.taskHealthPercent}%`,
      subValue: summary.totalOverdueTasks > 0 
        ? `${summary.totalOverdueTasks} overdue` 
        : 'All on track',
      icon: summary.totalOverdueTasks > 0 ? AlertTriangle : CheckCircle2,
      gradient: summary.taskHealthPercent >= 80 
        ? 'from-emerald-500/20 to-green-500/20'
        : summary.taskHealthPercent >= 60 
          ? 'from-amber-500/20 to-orange-500/20'
          : 'from-red-500/20 to-rose-500/20',
      iconBg: summary.taskHealthPercent >= 80 
        ? 'bg-emerald-500/10'
        : summary.taskHealthPercent >= 60 
          ? 'bg-amber-500/10'
          : 'bg-red-500/10',
      iconColor: summary.taskHealthPercent >= 80 
        ? 'text-emerald-600'
        : summary.taskHealthPercent >= 60 
          ? 'text-amber-600'
          : 'text-red-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 w-20 bg-muted rounded" />
                <div className="h-8 w-16 bg-muted rounded" />
                <div className="h-3 w-24 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card 
            key={card.label}
            className="relative overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60', card.gradient)} />
            <CardContent className="relative p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-medium">{card.label}</p>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">{card.subValue}</p>
                </div>
                <div className={cn('p-2.5 rounded-xl', card.iconBg)}>
                  <Icon className={cn('h-5 w-5', card.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
