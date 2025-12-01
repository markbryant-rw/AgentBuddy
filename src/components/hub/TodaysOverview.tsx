import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, MessageSquare, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { NotificationBanner } from '@/components/NotificationBanner';

interface TodaysOverviewProps {
  userName: string;
  todaysTasks: number;
  unreadMessages: number;
  dailyCCH: number;
  dailyCCHTarget: number;
  newLeads: number;
  needsReview?: boolean;
  actionButtons?: React.ReactNode;
  onReviewCompleted?: () => void;
  onTasksClick?: () => void;
  onMessagesClick?: () => void;
  onCCHClick?: () => void;
  onLeadsClick?: () => void;
}

export const TodaysOverview = ({
  userName,
  todaysTasks,
  unreadMessages,
  dailyCCH,
  dailyCCHTarget,
  newLeads,
  needsReview = false,
  actionButtons,
  onReviewCompleted,
  onTasksClick,
  onMessagesClick,
  onCCHClick,
  onLeadsClick,
}: TodaysOverviewProps) => {
  const firstName = userName.split(' ')[0] || 'there';
  const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening';
  const cchProgress = dailyCCHTarget > 0 ? (dailyCCH / dailyCCHTarget) * 100 : 0;
  
  const MOTIVATIONAL_QUOTES = [
    "Every call is a chance to change someone's life. Make it count!",
    "Listings don't find themselves. Get out there and make it happen!",
    "Your next deal is just one conversation away.",
    "Success in real estate is built one relationship at a time.",
    "Today's prospecting is tomorrow's commission.",
    "The phone won't ring itself. Time to dial!",
    "Great agents don't wait for opportunities—they create them.",
    "Every 'no' brings you closer to a 'yes'. Keep going!",
    "Consistency beats talent. Show up today.",
    "Your sphere is your superpower. Use it!",
    "Fortune favors the follow-up. Stay persistent.",
    "The market rewards those who take action.",
    "Your effort today is your equity tomorrow.",
    "Doors open when you knock. Start dialing!",
    "The best time to call was yesterday. The next best time is now.",
    "Every contact is a potential contract.",
    "Your energy is your brand. Bring it!",
    "Small daily actions create massive results.",
    "Be so good they can't ignore you.",
    "The hustle you put in today pays dividends tomorrow.",
  ];

  const getDailyQuote = () => {
    // Use date as seed for consistent daily rotation
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const index = dayOfYear % MOTIVATIONAL_QUOTES.length;
    return MOTIVATIONAL_QUOTES[index];
  };
  
  const getMotivationalMessage = () => {
    if (cchProgress >= 100) return "🎉 Target smashed! Keep the momentum going!";
    if (cchProgress >= 80) return `You're ${Math.round(cchProgress)}% to your daily target — keep the momentum going!`;
    if (cchProgress >= 50) return "Great progress! You're on track for today.";
    return getDailyQuote();
  };

  return (
    <Card className="overflow-hidden relative border-none shadow-lg">
      {/* Enhanced Gradient Background with Blob */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-yellow-500/5 to-green-500/10" />
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl" />
      
      <CardContent className="relative p-6 md:p-8">
        <div className="space-y-6">
          {/* Greeting with Action Buttons */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Good {timeOfDay}, {firstName} 👋
              </h2>
              <p className="text-muted-foreground text-base mb-1">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-sm font-medium text-primary">
                {getMotivationalMessage()}
              </p>
            </div>
            
            {/* Action Buttons - Right Side */}
            {actionButtons && (
              <div className="flex items-center gap-2">
                {actionButtons}
              </div>
            )}
          </div>

          {/* Enhanced Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Tasks */}
            <div 
              onClick={onTasksClick}
              className="group relative p-4 bg-white dark:bg-card rounded-xl border-2 border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  {todaysTasks > 0 && (
                    <Badge variant="destructive" className="h-5 px-2 text-xs animate-pulse">Due</Badge>
                  )}
                </div>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{todaysTasks}</p>
                <p className="text-xs text-muted-foreground font-medium">Tasks Due</p>
              </div>
            </div>

            {/* Messages */}
            <div 
              onClick={onMessagesClick}
              className="group relative p-4 bg-white dark:bg-card rounded-xl border-2 border-yellow-100 dark:border-yellow-900/30 hover:border-yellow-300 dark:hover:border-yellow-700 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                    <MessageSquare className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  {unreadMessages > 0 && (
                    <Badge className="h-5 px-2 text-xs bg-yellow-500 hover:bg-yellow-600">{unreadMessages}</Badge>
                  )}
                </div>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">{unreadMessages}</p>
                <p className="text-xs text-muted-foreground font-medium">Unread</p>
              </div>
            </div>

            {/* CCH */}
            <div 
              onClick={onCCHClick}
              className="group relative p-4 bg-white dark:bg-card rounded-xl border-2 border-red-100 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-700 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  {cchProgress >= 100 && (
                    <Badge className="h-5 px-2 text-xs bg-green-500 hover:bg-green-600">✓</Badge>
                  )}
                </div>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                  {dailyCCH.toFixed(1)}
                  <span className="text-sm text-muted-foreground ml-1">/ {dailyCCHTarget.toFixed(1)}</span>
                </p>
                <p className="text-xs text-muted-foreground font-medium">CCH Today</p>
              </div>
            </div>

            {/* This Month's Opportunities */}
            <div 
              onClick={onLeadsClick}
              className="group relative p-4 bg-white dark:bg-card rounded-xl border-2 border-green-100 dark:border-green-900/30 hover:border-green-300 dark:hover:border-green-700 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{newLeads}</p>
                <p className="text-xs text-muted-foreground font-medium">This Month's Opportunities</p>
              </div>
            </div>
          </div>

          {/* Action Badges */}
          {(todaysTasks > 0 || unreadMessages > 0) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
              {todaysTasks > 0 && (
                <Badge variant="outline" className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                  {todaysTasks} task{todaysTasks !== 1 ? 's' : ''} need attention
                </Badge>
              )}
              {unreadMessages > 0 && (
                <Badge variant="outline" className="bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                  {unreadMessages} unread message{unreadMessages !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}

          {/* System-wide notification banner */}
          <NotificationBanner />
        </div>
      </CardContent>
    </Card>
  );
};
