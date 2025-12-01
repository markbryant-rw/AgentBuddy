import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Phone, Home, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FriendStatsCardProps {
  friend: {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    today_calls: number;
    today_appraisals: number;
    today_cch: number;
    week_calls: number;
    week_appraisals: number;
    week_cch: number;
    current_streak: number;
  };
  myStats?: {
    today_cch: number;
    week_cch: number;
  } | null;
}

export const FriendStatsCard = ({ friend, myStats }: FriendStatsCardProps) => {
  const cchDifference = myStats ? friend.week_cch - myStats.week_cch : 0;
  const isAhead = cchDifference > 0;
  const isSame = cchDifference === 0;

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={friend.avatar_url || undefined} />
            <AvatarFallback>{friend.full_name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{friend.full_name}</h3>
            {friend.current_streak > 0 && (
              <Badge variant="secondary" className="mt-1">
                🔥 {friend.current_streak} day streak
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">TODAY</h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-accent/50">
              <Phone className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{friend.today_calls}</p>
              <p className="text-xs text-muted-foreground">Calls</p>
            </div>
            <div className="p-2 rounded-lg bg-accent/50">
              <Home className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{friend.today_appraisals}</p>
              <p className="text-xs text-muted-foreground">Appraisals</p>
            </div>
            <div className="p-2 rounded-lg bg-primary/10">
              <p className="text-lg font-bold text-primary">{friend.today_cch.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">CCH</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">THIS WEEK</h4>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span>📞 {friend.week_calls}</span>
              <span>🏠 {friend.week_appraisals}</span>
            </div>
            <div className="font-bold text-lg text-primary">
              ⚡ {friend.week_cch.toFixed(1)} CCH
            </div>
          </div>
        </div>

        {myStats && (
          <div className={`p-2 rounded-lg border ${
            isAhead ? 'bg-destructive/10 border-destructive/20' : 
            isSame ? 'bg-accent/50' : 
            'bg-primary/10 border-primary/20'
          }`}>
            <div className="flex items-center justify-center gap-2 text-sm">
              {isAhead ? (
                <>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-destructive font-medium">
                    They're ahead by {Math.abs(cchDifference).toFixed(1)} CCH
                  </span>
                </>
              ) : isSame ? (
                <>
                  <Minus className="h-4 w-4" />
                  <span className="font-medium">You're tied!</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-primary font-medium">
                    You're ahead by {Math.abs(cchDifference).toFixed(1)} CCH
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
