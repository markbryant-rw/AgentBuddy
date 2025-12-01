import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Building2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';

export const StockBoardWidget = () => {
  const navigate = useNavigate();
  const { activeOffice } = useOfficeSwitcher();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['office-stock-stats', activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return null;

      // Get all teams in this office
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('agency_id', activeOffice.id);

      if (!teams) return null;

      const teamIds = teams.map(t => t.id);

      // Get transactions for all teams
      const { data: transactions } = await supabase
        .from('transactions')
        .select('stage, live_date')
        .in('team_id', teamIds)
        .eq('archived', false);

      const total = transactions?.length || 0;
      const signed = transactions?.filter(t => t.stage === 'signed').length || 0;
      const live = transactions?.filter(t => t.stage === 'live').length || 0;
      const contract = transactions?.filter(t => t.stage === 'contract').length || 0;
      
      // Calculate 70+ DOM
      const now = new Date();
      const longDOM = transactions?.filter(t => {
        if (!t.live_date) return false;
        const liveDate = new Date(t.live_date);
        const days = Math.floor((now.getTime() - liveDate.getTime()) / (1000 * 60 * 60 * 24));
        return days >= 70;
      }).length || 0;

      return { total, signed, live, contract, longDOM };
    },
    enabled: !!activeOffice?.id,
    staleTime: 2 * 60 * 1000,
  });

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-lg border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-background"
      onClick={() => navigate('/office-manager/stock-board')}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-600" />
            Stock Board
          </CardTitle>
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            {stats?.total || 0}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold">{stats?.total || 0}</p>
                <p className="text-sm text-muted-foreground">Active Listings</p>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Signed</p>
                  <p className="text-lg font-semibold">{stats?.signed || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Live</p>
                  <p className="text-lg font-semibold">{stats?.live || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Contract</p>
                  <p className="text-lg font-semibold">{stats?.contract || 0}</p>
                </div>
              </div>
            </div>
            {(stats?.longDOM || 0) > 0 && (
              <div className="mt-3 pt-3 border-t">
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats?.longDOM} listing(s) 70+ days
                </Badge>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
