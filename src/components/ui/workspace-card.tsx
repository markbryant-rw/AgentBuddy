import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { WorkspaceType, getWorkspaceTheme } from '@/lib/workspaceTheme';

export interface WorkspaceCardStat {
  label: string;
  value: string | number;
  alert?: boolean;
}

export interface WorkspaceCardProps {
  workspace: WorkspaceType;
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
  stats: WorkspaceCardStat[];
  comingSoon?: boolean;
  onClick?: () => void;
}

export function WorkspaceCard({
  workspace,
  title,
  description,
  icon: Icon,
  route,
  stats,
  comingSoon = false,
  onClick,
}: WorkspaceCardProps) {
  const navigate = useNavigate();
  const [isFlipped, setIsFlipped] = useState(false);
  const theme = getWorkspaceTheme(workspace);

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (comingSoon) {
      setIsFlipped(!isFlipped);
    } else {
      navigate(route);
    }
  };

  return (
    <div className="perspective-1000 h-[280px]" style={{ perspective: '1000px' }}>
      <motion.div
        className="relative w-full h-full"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front Side */}
        <Card
          className={cn(
            'absolute inset-0 group overflow-hidden cursor-pointer',
            'hover:shadow-xl transition-all duration-300 hover:scale-[1.02]',
            'border-l-4',
            theme.borderColor,
            comingSoon && 'opacity-90'
          )}
          style={{ backfaceVisibility: 'hidden' }}
          onClick={handleClick}
        >
          <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60', theme.gradient)} />

          <div className="relative p-fluid-lg h-full flex flex-col">
            {/* Icon & Title */}
            <div className="flex items-start justify-between mb-fluid-md">
              <div className="flex items-center gap-fluid-md">
                <div className={cn('p-3 rounded-lg', theme.iconBg)}>
                  <Icon className={cn('h-icon-md w-icon-md', theme.iconColor)} />
                </div>
                <div>
                  <h3 className="text-fluid-xl font-bold">{title}</h3>
                  <p className="text-fluid-sm text-muted-foreground">{description}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-fluid-sm pt-fluid-md border-t flex-1">
              {stats.map((stat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="text-fluid-xs text-muted-foreground">{stat.label}</div>
                  <div
                    className={cn(
                      'text-fluid-lg font-bold',
                      stat.alert && 'text-orange-600 dark:text-orange-400'
                    )}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* View Indicator */}
            <div className="flex items-center justify-center text-fluid-sm text-muted-foreground group-hover:text-primary transition-colors mt-auto pt-fluid-sm">
              <span>{comingSoon ? 'Coming Soon' : 'Click to view'}</span>
              <ArrowRight className="ml-2 h-icon-sm w-icon-sm group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Card>

        {/* Back Side (Coming Soon) */}
        {comingSoon && (
          <Card
            className={cn(
              'absolute inset-0 overflow-hidden cursor-pointer',
              'border-l-4',
              theme.borderColor
            )}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
            onClick={handleClick}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-60', theme.gradient)} />
            <CardContent className="relative h-full flex flex-col items-center justify-center text-center p-fluid-lg">
              <div className={cn('p-fluid-md rounded-xl mb-fluid-md', theme.iconBg)}>
                <Icon className={cn('h-icon-xl w-icon-xl', theme.iconColor)} />
              </div>
              <h3 className="text-fluid-2xl font-bold mb-2">{title}</h3>
              <p className="text-fluid-lg text-muted-foreground mb-fluid-md">Coming Soon</p>
              <p className="text-fluid-sm text-muted-foreground">
                We're working hard to bring you this feature. Stay tuned!
              </p>
              <p className="text-fluid-xs text-muted-foreground/60 mt-fluid-lg">
                Click anywhere to flip back
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
