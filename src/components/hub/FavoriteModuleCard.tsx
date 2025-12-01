import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ModuleCategoryColor, MODULE_COLORS } from '@/lib/moduleColors';
import { useNavigate } from 'react-router-dom';

interface FavoriteModuleCardProps {
  icon: LucideIcon;
  title: string;
  route: string;
  categoryColor?: ModuleCategoryColor;
  badge?: number;
}

export const FavoriteModuleCard = ({
  icon: Icon,
  title,
  route,
  categoryColor = 'performance',
  badge,
}: FavoriteModuleCardProps) => {
  const navigate = useNavigate();
  const colors = MODULE_COLORS[categoryColor];

  const getBadgeTooltip = (moduleTitle: string, badgeValue: number) => {
    if (moduleTitle.includes('Pipeline')) return `${badgeValue} ${badgeValue === 1 ? 'opportunity' : 'opportunities'} this month`;
    if (moduleTitle.includes('Task')) return `${badgeValue} pending ${badgeValue === 1 ? 'task' : 'tasks'}`;
    if (moduleTitle.includes('Message')) return `${badgeValue} unread ${badgeValue === 1 ? 'message' : 'messages'}`;
    if (moduleTitle.includes('KPI')) return 'Log your daily KPIs';
    return `${badgeValue} items`;
  };

  return (
    <Card
      onClick={() => navigate(route)}
      className={cn(
        "relative flex flex-col items-center justify-center p-4 h-24",
        "hover:shadow-lg hover:scale-105 transition-all duration-200",
        "cursor-pointer group"
      )}
    >
      {badge !== undefined && badge > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {badge > 99 ? '99+' : badge}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getBadgeTooltip(title, badge)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <div className={cn(
        "p-2 rounded-lg mb-2",
        colors.iconBg
      )}>
        <Icon className={cn("h-6 w-6", colors.text)} />
      </div>

      <p className="text-xs font-medium text-center line-clamp-2">
        {title}
      </p>
    </Card>
  );
};
