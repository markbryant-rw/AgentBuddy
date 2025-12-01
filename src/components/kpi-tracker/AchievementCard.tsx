import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// Move static data outside component
const rarityColors: Record<string, string> = {
  rare: 'from-blue-500 to-purple-500',
  legendary: 'from-yellow-500 to-orange-500',
};

interface AchievementCardProps {
  icon: string;
  title: string;
  description: string;
  earnedAt: string;
  rarity?: string;
  progress?: { current: number; total: number };
}

const AchievementCardComponent = ({
  icon,
  title,
  description,
  earnedAt,
  rarity,
  progress,
}: AchievementCardProps) => {
  const handleShare = () => {
    const text = `🎉 I just unlocked the "${title}" achievement in the KPI Tracker! ${icon}`;
    
    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    }
  };

  return (
    <Card className={`p-6 relative overflow-hidden ${rarity ? 'border-2' : ''}`}>
      {rarity && (
        <div className={`absolute inset-0 bg-gradient-to-br ${rarityColors[rarity]} opacity-5`} />
      )}
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl">{icon}</div>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{description}</p>

        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            Earned {format(new Date(earnedAt), 'MMM d, yyyy')}
          </div>
          {rarity && (
            <Badge variant="secondary" className="text-xs capitalize">
              {rarity}
            </Badge>
          )}
        </div>

        {progress && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span>Progress to next</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export const AchievementCard = memo(AchievementCardComponent);
