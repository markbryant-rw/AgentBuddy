import { Flame } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
}

export const StreakBadge = ({ currentStreak, longestStreak }: StreakBadgeProps) => {
  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            <div>
              <div className="text-2xl font-bold text-foreground">
                {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
              </div>
              <div className="text-xs text-muted-foreground">
                Longest: {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
