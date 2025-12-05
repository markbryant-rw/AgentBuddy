import { cn } from '@/lib/utils';
import { WorkspaceType, getWorkspaceTheme } from '@/lib/workspaceTheme';

interface LoadingSkeletonProps {
  workspace?: WorkspaceType;
  variant?: 'card' | 'stat' | 'row' | 'text';
  className?: string;
}

export function LoadingSkeleton({ 
  workspace, 
  variant = 'card',
  className 
}: LoadingSkeletonProps) {
  const theme = workspace ? getWorkspaceTheme(workspace) : null;

  const baseClasses = 'animate-pulse rounded-lg';
  
  const variantClasses = {
    card: 'h-32 w-full',
    stat: 'h-24 w-full',
    row: 'h-12 w-full',
    text: 'h-4 w-3/4',
  };

  return (
    <div 
      className={cn(
        baseClasses,
        variantClasses[variant],
        theme ? `bg-gradient-to-r ${theme.gradient} opacity-30` : 'bg-muted',
        'skeleton-shimmer',
        className
      )}
    />
  );
}

export function LoadingStatCards({ workspace, count = 4 }: { workspace: WorkspaceType; count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingSkeleton key={i} workspace={workspace} variant="stat" />
      ))}
    </div>
  );
}

export function LoadingWorkspaceCards({ count = 4 }: { count?: number }) {
  const workspaces: WorkspaceType[] = ['plan', 'prospect', 'transact', 'operate'];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingSkeleton 
          key={i} 
          workspace={workspaces[i % workspaces.length]} 
          variant="card" 
        />
      ))}
    </div>
  );
}
