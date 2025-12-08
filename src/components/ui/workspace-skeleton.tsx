import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';

type WorkspaceContext = 'platform-admin' | 'office-manager' | 'plan' | 'prospect' | 'transact' | 'operate' | 'grow' | 'engage' | 'default';

const workspaceGradients: Record<WorkspaceContext, string> = {
  'platform-admin': 'from-purple-500/20 via-violet-500/10 to-purple-500/5',
  'office-manager': 'from-teal-500/20 via-cyan-500/10 to-teal-500/5',
  'plan': 'from-blue-500/20 via-indigo-500/10 to-blue-500/5',
  'prospect': 'from-teal-500/20 via-cyan-500/10 to-teal-500/5',
  'transact': 'from-amber-500/20 via-orange-500/10 to-amber-500/5',
  'operate': 'from-purple-500/20 via-violet-500/10 to-purple-500/5',
  'grow': 'from-emerald-500/20 via-green-500/10 to-emerald-500/5',
  'engage': 'from-pink-500/20 via-rose-500/10 to-pink-500/5',
  'default': 'from-muted/60 via-muted/40 to-muted/20',
};

const workspaceBorders: Record<WorkspaceContext, string> = {
  'platform-admin': 'border-l-purple-500',
  'office-manager': 'border-l-teal-500',
  'plan': 'border-l-blue-500',
  'prospect': 'border-l-teal-500',
  'transact': 'border-l-amber-500',
  'operate': 'border-l-purple-500',
  'grow': 'border-l-emerald-500',
  'engage': 'border-l-pink-500',
  'default': 'border-l-primary',
};

function useWorkspaceContext(): WorkspaceContext {
  const location = useLocation();
  const path = location.pathname;
  
  if (path.startsWith('/platform-admin')) return 'platform-admin';
  if (path.startsWith('/office-manager')) return 'office-manager';
  if (path.includes('/plan') || path.includes('/kpi')) return 'plan';
  if (path.includes('/prospect') || path.includes('/appraisal')) return 'prospect';
  if (path.includes('/transact') || path.includes('/transaction') || path.includes('/stock')) return 'transact';
  if (path.includes('/operate') || path.includes('/daily-planner') || path.includes('/projects')) return 'operate';
  if (path.includes('/grow') || path.includes('/knowledge') || path.includes('/coach')) return 'grow';
  if (path.includes('/engage') || path.includes('/leaderboard')) return 'engage';
  
  return 'default';
}

interface SkeletonBaseProps {
  className?: string;
  workspace?: WorkspaceContext;
}

export function WorkspaceSkeleton({ className, workspace }: SkeletonBaseProps) {
  const autoWorkspace = useWorkspaceContext();
  const ws = workspace || autoWorkspace;
  
  return (
    <div 
      className={cn(
        'rounded-lg bg-gradient-to-br animate-pulse',
        workspaceGradients[ws],
        'skeleton-shimmer',
        className
      )}
    />
  );
}

interface WidgetSkeletonProps extends SkeletonBaseProps {
  showHeader?: boolean;
  showIcon?: boolean;
  rows?: number;
}

export function WidgetSkeleton({ 
  className, 
  workspace,
  showHeader = true,
  showIcon = true,
  rows = 3
}: WidgetSkeletonProps) {
  const autoWorkspace = useWorkspaceContext();
  const ws = workspace || autoWorkspace;
  
  return (
    <Card className={cn(
      'p-6 border-l-4 overflow-hidden',
      workspaceBorders[ws],
      className
    )}>
      {showHeader && (
        <div className="flex items-center gap-3 mb-4">
          {showIcon && (
            <div className={cn(
              'h-10 w-10 rounded-lg bg-gradient-to-br animate-pulse skeleton-shimmer',
              workspaceGradients[ws]
            )} />
          )}
          <div className="flex-1 space-y-2">
            <div className={cn(
              'h-4 w-32 rounded bg-gradient-to-r animate-pulse skeleton-shimmer',
              workspaceGradients[ws]
            )} />
            <div className={cn(
              'h-3 w-24 rounded bg-gradient-to-r animate-pulse skeleton-shimmer opacity-60',
              workspaceGradients[ws]
            )} />
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div 
            key={i}
            className={cn(
              'h-4 rounded bg-gradient-to-r animate-pulse skeleton-shimmer',
              workspaceGradients[ws],
              i === rows - 1 ? 'w-2/3' : 'w-full'
            )}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    </Card>
  );
}

interface StatCardSkeletonProps extends SkeletonBaseProps {
  count?: number;
}

export function StatCardSkeleton({ className, workspace, count = 1 }: StatCardSkeletonProps) {
  const autoWorkspace = useWorkspaceContext();
  const ws = workspace || autoWorkspace;
  
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card 
          key={i}
          className={cn(
            'p-6 border-l-4',
            workspaceBorders[ws],
            className
          )}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-3 flex-1">
              <div className={cn(
                'h-3 w-20 rounded bg-gradient-to-r animate-pulse skeleton-shimmer',
                workspaceGradients[ws]
              )} />
              <div className={cn(
                'h-8 w-16 rounded bg-gradient-to-r animate-pulse skeleton-shimmer',
                workspaceGradients[ws]
              )} />
              <div className={cn(
                'h-3 w-28 rounded bg-gradient-to-r animate-pulse skeleton-shimmer opacity-60',
                workspaceGradients[ws]
              )} />
            </div>
            <div className={cn(
              'h-12 w-12 rounded-xl bg-gradient-to-br animate-pulse skeleton-shimmer',
              workspaceGradients[ws]
            )} />
          </div>
        </Card>
      ))}
    </>
  );
}

interface TableSkeletonProps extends SkeletonBaseProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ className, workspace, rows = 5, columns = 4 }: TableSkeletonProps) {
  const autoWorkspace = useWorkspaceContext();
  const ws = workspace || autoWorkspace;
  
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header row */}
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div 
            key={i}
            className={cn(
              'h-4 rounded bg-gradient-to-r animate-pulse skeleton-shimmer flex-1',
              workspaceGradients[ws]
            )}
          />
        ))}
      </div>
      
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex}
          className="flex gap-4 py-2"
          style={{ animationDelay: `${rowIndex * 0.05}s` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex}
              className={cn(
                'h-4 rounded bg-gradient-to-r animate-pulse skeleton-shimmer flex-1',
                workspaceGradients[ws],
                colIndex === 0 ? 'w-1/4' : ''
              )}
              style={{ animationDelay: `${(rowIndex * columns + colIndex) * 0.02}s` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface GridSkeletonProps extends SkeletonBaseProps {
  count?: number;
  columns?: 2 | 3 | 4;
}

export function GridSkeleton({ className, workspace, count = 4, columns = 4 }: GridSkeletonProps) {
  const autoWorkspace = useWorkspaceContext();
  const ws = workspace || autoWorkspace;
  
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };
  
  const staggerClasses = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6'];
  
  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <WidgetSkeleton 
          key={i} 
          workspace={ws}
          className={cn('animate-card-enter', staggerClasses[i % staggerClasses.length])}
        />
      ))}
    </div>
  );
}

// Activity/metrics skeleton for dashboard widgets
export function ActivitySkeleton({ className, workspace }: SkeletonBaseProps) {
  const autoWorkspace = useWorkspaceContext();
  const ws = workspace || autoWorkspace;
  
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          'h-5 w-5 rounded bg-gradient-to-br animate-pulse skeleton-shimmer',
          workspaceGradients[ws]
        )} />
        <div className={cn(
          'h-5 w-32 rounded bg-gradient-to-r animate-pulse skeleton-shimmer',
          workspaceGradients[ws]
        )} />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="text-center space-y-2">
            <div className={cn(
              'h-5 w-5 mx-auto rounded bg-gradient-to-br animate-pulse skeleton-shimmer',
              workspaceGradients[ws]
            )} />
            <div className={cn(
              'h-6 w-12 mx-auto rounded bg-gradient-to-r animate-pulse skeleton-shimmer',
              workspaceGradients[ws]
            )} />
            <div className={cn(
              'h-3 w-16 mx-auto rounded bg-gradient-to-r animate-pulse skeleton-shimmer opacity-60',
              workspaceGradients[ws]
            )} />
          </div>
        ))}
      </div>
    </Card>
  );
}

// Chart skeleton
export function ChartSkeleton({ className, workspace }: SkeletonBaseProps) {
  const autoWorkspace = useWorkspaceContext();
  const ws = workspace || autoWorkspace;
  
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          'h-5 w-32 rounded bg-gradient-to-r animate-pulse skeleton-shimmer',
          workspaceGradients[ws]
        )} />
      </div>
      
      <div className="flex items-end gap-2 h-32">
        {[40, 65, 45, 80, 55, 70, 60].map((height, i) => (
          <div 
            key={i}
            className={cn(
              'flex-1 rounded-t bg-gradient-to-t animate-pulse skeleton-shimmer',
              workspaceGradients[ws]
            )}
            style={{ 
              height: `${height}%`,
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
    </Card>
  );
}
