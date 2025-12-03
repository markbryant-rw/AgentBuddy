import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MoreVertical, 
  Lock, 
  Users, 
  Pencil, 
  Share2, 
  Copy, 
  Archive,
  Trash2,
  CheckCircle2,
  Clock,
  Flame
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface EnhancedProjectBoardCardProps {
  board: {
    id: string;
    title: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    is_shared: boolean;
    created_at: string;
    updated_at: string;
  };
  taskStats?: {
    total: number;
    completed: number;
    overdue: number;
  };
  assignees?: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
  onEdit?: () => void;
  onShare?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  dragHandleProps?: any;
}

export const EnhancedProjectBoardCard = ({
  board,
  taskStats = { total: 0, completed: 0, overdue: 0 },
  assignees = [],
  onEdit,
  onShare,
  onDuplicate,
  onArchive,
  onDelete,
  dragHandleProps,
}: EnhancedProjectBoardCardProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  const progress = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 0;

  const isRecentlyActive = () => {
    const hoursSinceUpdate = (Date.now() - new Date(board.updated_at).getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate < 24;
  };

  const handleCardClick = () => {
    navigate(`/projects/${board.id}`);
  };

  const handleMenuAction = (e: React.MouseEvent, action?: () => void) => {
    e.stopPropagation();
    action?.();
  };

  // PHASE 1: Prefetch board data on hover for instant navigation
  const prefetchBoardData = async () => {
    if (!user) return;

    // Prefetch lists for this board
    await queryClient.prefetchQuery({
      queryKey: ['task-lists', user.id, board.id],
      queryFn: async () => {
        const { data: teamMemberData } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .single();

        if (!teamMemberData) return [];

        const { data } = await supabase
          .from('task_lists' as any)
          .select('id, title, order_position, board_id, team_id, created_at, updated_at')
          .eq('team_id', teamMemberData.team_id)
          .eq('board_id', board.id)
          .order('order_position', { ascending: true });

        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch tasks for this board
    await queryClient.prefetchQuery({
      queryKey: ['tasks', board.id],
      queryFn: async () => {
        const { data: teamMemberData } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .single();

        if (!teamMemberData) return [];

        const { data: boardLists } = await supabase
          .from('task_lists' as any)
          .select('id')
          .eq('board_id', board.id);

        const listIds = (boardLists as any[])?.map((l: any) => l.id) || [];
        if (listIds.length === 0) return [];

        const { data } = await supabase
          .from('tasks')
          .select('id, title, description, status, priority, due_date, assigned_to, list_id, team_id, completed, created_at, updated_at')
          .eq('team_id', teamMemberData.team_id)
          .in('list_id', listIds)
          .is('transaction_id', null)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(50);

        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });
  };

  return (
    <Card
      className={cn(
        'group relative cursor-pointer transition-all duration-300 border-l-4',
        'hover:shadow-xl hover:scale-[1.02]',
        isHovered && 'shadow-lg'
      )}
      style={{ borderLeftColor: board.color || 'hsl(var(--primary))' }}
      onClick={handleCardClick}
      onMouseEnter={() => {
        setIsHovered(true);
        prefetchBoardData(); // PHASE 1: Prefetch on hover
      }}
      onMouseLeave={() => setIsHovered(false)}
      {...dragHandleProps}
    >
      {/* Hot Activity Badge */}
      {isRecentlyActive() && taskStats.overdue === 0 && taskStats.total > 0 && (
        <Badge 
          className="absolute -top-2 -right-2 bg-orange-500 text-white border-0 shadow-lg z-10"
          variant="secondary"
        >
          <Flame className="h-3 w-3 mr-1" />
          Hot
        </Badge>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          {/* Icon and Title */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className="text-3xl flex-shrink-0"
              style={{ color: board.color || 'hsl(var(--primary))' }}
            >
              {board.icon || '📋'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg leading-tight truncate group-hover:text-primary transition-colors">
                {board.title}
              </h3>
              {board.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {board.description}
                </p>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 flex-shrink-0 transition-opacity',
                  !isHovered && 'opacity-0 group-hover:opacity-100'
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => handleMenuAction(e, onEdit)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Board
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleMenuAction(e, onShare)}>
                <Share2 className="h-4 w-4 mr-2" />
                {board.is_shared ? 'Manage Sharing' : 'Share Board'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleMenuAction(e, onDuplicate)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => handleMenuAction(e, onArchive)}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => handleMenuAction(e, onDelete)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress Ring & Stats */}
        <div className="flex items-center gap-4">
          {/* Circular Progress */}
          <div className="relative h-16 w-16 flex-shrink-0">
            <svg className="transform -rotate-90 h-16 w-16">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                className="text-primary transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold">{progress}%</span>
            </div>
          </div>

          {/* Task Stats */}
          <div className="flex-1 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tasks</span>
              <span className="font-medium">{taskStats.total}</span>
            </div>
            <div className="flex items-center justify-between text-green-600">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </span>
              <span className="font-medium">{taskStats.completed}</span>
            </div>
            {taskStats.overdue > 0 && (
              <div className="flex items-center justify-between text-destructive">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Overdue
                </span>
                <span className="font-medium">{taskStats.overdue}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Badges & Avatars */}
        <div className="flex items-center justify-between pt-2 border-t">
          {/* Badges */}
          <div className="flex items-center gap-2">
            {!board.is_shared ? (
              <Badge variant="outline" className="text-xs">
                <Lock className="h-3 w-3 mr-1" />
                Solo
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Team
              </Badge>
            )}
          </div>

          {/* Assignees */}
          {assignees.length > 0 && (
            <div className="flex -space-x-2">
              {assignees.slice(0, 3).map((assignee, index) => (
                <Avatar key={assignee.id} className="h-7 w-7 border-2 border-background">
                  <AvatarImage src={assignee.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {assignee.full_name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignees.length > 3 && (
                <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium">+{assignees.length - 3}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
