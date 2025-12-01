import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Gavel, Calendar, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { format, isWithinInterval, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export const UpcomingAuctionsWidget = () => {
  const navigate = useNavigate();
  const { activeOffice } = useOfficeSwitcher();

  const { data: auctions = [], isLoading } = useQuery({
    queryKey: ['upcoming-auctions', activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return [];

      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('agency_id', activeOffice.id);

      if (!teams) return [];

      const teamIds = teams.map(t => t.id);
      const now = new Date();
      const twoWeeks = addDays(now, 14);

      const { data, error } = await supabase
        .from('transactions')
        .select('id, address, suburb, auction_deadline_date, stage')
        .in('team_id', teamIds)
        .not('auction_deadline_date', 'is', null)
        .eq('archived', false)
        .gte('auction_deadline_date', now.toISOString().split('T')[0])
        .lte('auction_deadline_date', twoWeeks.toISOString().split('T')[0])
        .order('auction_deadline_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeOffice?.id,
    staleTime: 2 * 60 * 1000,
  });

  const nextWeek = auctions.filter(a => {
    if (!a.auction_deadline_date) return false;
    const auctionDate = new Date(a.auction_deadline_date);
    return isWithinInterval(auctionDate, {
      start: new Date(),
      end: addDays(new Date(), 7),
    });
  }).length;

  const getDaysUntil = (date: string) => {
    const days = Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <Card 
      className="transition-all hover:shadow-lg cursor-pointer border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-background"
      onClick={() => navigate('/office-manager/stock-board')}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Gavel className="h-5 w-5 text-purple-600" />
            Upcoming Auctions
          </CardTitle>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            {auctions.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
          </div>
        ) : auctions.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Gavel className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No auctions in next 2 weeks</p>
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Next 7 Days</span>
                <span className="text-2xl font-bold text-purple-600">{nextWeek}</span>
              </div>
            </div>
            
            <div className="space-y-2">
              {auctions.slice(0, 3).map((auction) => {
                const daysUntil = getDaysUntil(auction.auction_deadline_date!);
                return (
                  <div key={auction.id} className="flex items-start gap-2 p-2 rounded border border-border/50 hover:bg-muted/50 transition-colors">
                    <Calendar className={`h-4 w-4 mt-0.5 ${daysUntil <= 3 ? 'text-red-500' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{auction.address}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{auction.suburb}</span>
                        <span>•</span>
                        <span className={daysUntil <= 3 ? 'text-red-600 font-semibold' : ''}>
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {auctions.length > 3 && (
              <p className="text-xs text-center text-muted-foreground mt-3">
                +{auctions.length - 3} more auction(s)
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
