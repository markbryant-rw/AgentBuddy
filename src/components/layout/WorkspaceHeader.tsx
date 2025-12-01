import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type WorkspaceType = 'prospect' | 'operate' | 'transact' | 'grow';

interface WorkspaceConfig {
  name: string;
  route: string;
  barColor: string;
  textColor: string;
  hoverColor: string;
}

const workspaceConfigs: Record<WorkspaceType, WorkspaceConfig> = {
  prospect: {
    name: 'PROSPECT',
    route: '/prospect-dashboard',
    barColor: 'bg-purple-500/10 dark:bg-purple-500/20 border-b border-purple-500/20',
    textColor: 'text-purple-700 dark:text-purple-300',
    hoverColor: 'hover:bg-purple-500/20',
  },
  operate: {
    name: 'OPERATE',
    route: '/operate-dashboard',
    barColor: 'bg-blue-500/10 dark:bg-blue-500/20 border-b border-blue-500/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    hoverColor: 'hover:bg-blue-500/20',
  },
  transact: {
    name: 'TRANSACT',
    route: '/transact-dashboard',
    barColor: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-b border-emerald-500/20',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    hoverColor: 'hover:bg-emerald-500/20',
  },
  grow: {
    name: 'GROW',
    route: '/grow-dashboard',
    barColor: 'bg-orange-500/10 dark:bg-orange-500/20 border-b border-orange-500/20',
    textColor: 'text-orange-700 dark:text-orange-300',
    hoverColor: 'hover:bg-orange-500/20',
  },
};

interface WorkspaceHeaderProps {
  workspace: WorkspaceType;
  currentPage: string;
}

export function WorkspaceHeader({ workspace, currentPage }: WorkspaceHeaderProps) {
  const navigate = useNavigate();
  const config = workspaceConfigs[workspace];

  return (
    <div className={cn('w-full py-2 px-4', config.barColor)}>
      <div className="container mx-auto flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(config.route)}
          className={cn('gap-2', config.textColor, config.hoverColor)}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-medium">Back to {config.name}</span>
        </Button>
        <span className={cn('text-sm font-medium', config.textColor)}>
          {currentPage}
        </span>
      </div>
    </div>
  );
}
