import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Calendar, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { calculateDaysUntilExpiry } from '@/lib/listingExpiryUtils';

export const ListingExpiryWidget = () => {
  const navigate = useNavigate();
  const { activeOffice } = useOfficeSwitcher();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['office-expiry-stats', activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return null;

      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('agency_id', activeOffice.id);

      if (!teams) return null;

      const teamIds = teams.map(t => t.id);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('listing_expires_date, stage')
        .in('team_id', teamIds)
        .in('stage', ['signed', 'live'])
        .eq('archived', false);

      const total = transactions?.length || 0;
      
      let critical = 0;
      let warning = 0;
      let thisMonth = 0;

      transactions?.forEach(t => {
        if (!t.listing_expires_date) return;
        const days = calculateDaysUntilExpiry(t.listing_expires_date);
        if (days === null) return;
        
        if (days < 0 || days < 7) critical++;
        else if (days < 21) warning++;
        
        const expiryDate = new Date(t.listing_expires_date);
        const now = new Date();
        if (expiryDate.getMonth() === now.getMonth() && expiryDate.getFullYear() === now.getFullYear()) {
          thisMonth++;
        }
      });

      return { total, critical, warning, thisMonth };
    },
    enabled: !!activeOffice?.id,
    staleTime: 2 * 60 * 1000,
  });

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-lg border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background"
      onClick={() => navigate('/office-manager/listing-expiry')}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Listing Expiry
          </CardTitle>
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
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
                <p className="text-sm text-muted-foreground">Active Agreements</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Expiring This Month</p>
                  <p className="text-lg font-semibold">{stats?.thisMonth || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Warning Zone</p>
                  <p className="text-lg font-semibold">{stats?.warning || 0}</p>
                </div>
              </div>
            </div>
            {(stats?.critical || 0) > 0 && (
              <div className="mt-3 pt-3 border-t">
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {stats?.critical} critical alert(s)
                </Badge>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
