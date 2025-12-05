import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceType, getWorkspaceTheme } from '@/lib/workspaceTheme';

export interface StatCardProps {
  workspace: WorkspaceType;
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
}

export function StatCard({ workspace, icon: Icon, label, value, subValue }: StatCardProps) {
  const theme = getWorkspaceTheme(workspace);

  return (
    <Card className="relative overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-40', theme.gradient)} />
      <CardContent className="relative p-fluid-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-fluid-sm text-muted-foreground mb-1">{label}</p>
            <p className="text-fluid-2xl font-bold">{value}</p>
            {subValue && <p className="text-fluid-xs text-muted-foreground mt-1">{subValue}</p>}
          </div>
          <div className={cn('p-3 rounded-xl', theme.iconBg)}>
            <Icon className={cn('h-6 w-6', theme.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
