import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WorkspaceType, workspaceThemes } from '@/lib/workspaceTheme';

export type { WorkspaceType };

export interface WorkspaceHeaderProps {
  workspace: WorkspaceType;
  currentPage: string;
  backTo?: string;
  backLabel?: string;
}

export function WorkspaceHeader({ workspace, currentPage, backTo, backLabel }: WorkspaceHeaderProps) {
  const navigate = useNavigate();
  const theme = workspaceThemes[workspace];

  const handleBack = () => {
    navigate(backTo || theme.route);
  };

  const displayLabel = backLabel || theme.name;

  return (
    <div className={cn('w-full py-2 px-4', theme.barColor)}>
      <div className="container mx-auto flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className={cn('gap-2', theme.textColor, theme.hoverColor)}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-medium">Back to {displayLabel}</span>
        </Button>
        <span className={cn('text-sm font-medium', theme.textColor)}>
          {currentPage}
        </span>
      </div>
    </div>
  );
}
