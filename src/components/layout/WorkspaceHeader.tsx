import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WorkspaceType, workspaceThemes } from '@/lib/workspaceTheme';

export type { WorkspaceType };

interface WorkspaceHeaderProps {
  workspace: WorkspaceType;
  currentPage: string;
}

export function WorkspaceHeader({ workspace, currentPage }: WorkspaceHeaderProps) {
  const navigate = useNavigate();
  const theme = workspaceThemes[workspace];

  return (
    <div className={cn('w-full py-2 px-4', theme.barColor)}>
      <div className="container mx-auto flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(theme.route)}
          className={cn('gap-2', theme.textColor, theme.hoverColor)}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-medium">Back to {theme.name}</span>
        </Button>
        <span className={cn('text-sm font-medium', theme.textColor)}>
          {currentPage}
        </span>
      </div>
    </div>
  );
}
