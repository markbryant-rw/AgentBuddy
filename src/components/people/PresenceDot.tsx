import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

type PresenceStatus = 'active' | 'away' | 'offline' | 'focus';

interface PresenceDotProps {
  status: PresenceStatus;
  lastActive?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PresenceDot({ status, lastActive, size = 'md' }: PresenceDotProps) {
  const colors = {
    active: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-400',
    focus: 'bg-purple-500',
  };

  const labels = {
    active: 'Active now',
    away: 'Away',
    offline: 'Offline',
    focus: 'Focus mode',
  };

  const sizes = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const getLastActiveText = () => {
    if (!lastActive || status === 'active') return null;
    try {
      return `Last active ${formatDistanceToNow(new Date(lastActive), { addSuffix: true })}`;
    } catch {
      return null;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`${sizes[size]} rounded-full ${colors[status]} ${status === 'active' ? 'animate-pulse' : ''} ring-2 ring-background`} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{labels[status]}</p>
          {getLastActiveText() && (
            <p className="text-xs text-muted-foreground">{getLastActiveText()}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
