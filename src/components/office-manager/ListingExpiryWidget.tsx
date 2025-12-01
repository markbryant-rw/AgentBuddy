import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '@/hooks/useTransactions';
import { useMemo } from 'react';
import { calculateDaysUntilExpiry, getExpiryStatus } from '@/lib/listingExpiryUtils';

export function ListingExpiryWidget() {
  const navigate = useNavigate();
  const { transactions } = useTransactions();

  const expiryStats = useMemo(() => {
    const activeListings = transactions.filter(t => t.stage === 'live' || t.stage === 'signed');
    
    const critical = activeListings.filter(t => {
      const daysUntil = calculateDaysUntilExpiry(t.listing_expires_date);
      const status = getExpiryStatus(daysUntil);
      return status.status === 'critical';
    });

    const warning = activeListings.filter(t => {
      const daysUntil = calculateDaysUntilExpiry(t.listing_expires_date);
      const status = getExpiryStatus(daysUntil);
      return status.status === 'warning';
    });

    const expiringThisMonth = activeListings.filter(t => {
      const daysUntil = calculateDaysUntilExpiry(t.listing_expires_date);
      return daysUntil !== null && daysUntil >= 0 && daysUntil <= 30;
    });

    return {
      total: activeListings.length,
      critical: critical.length,
      warning: warning.length,
      expiringThisMonth: expiringThisMonth.length,
      criticalListings: critical.slice(0, 3), // Show top 3
    };
  }, [transactions]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-sm font-medium">Listing Expiry Overview</CardTitle>
          <CardDescription className="text-xs mt-1">Agency agreement status</CardDescription>
        </div>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critical Alert */}
        {expiryStats.critical > 0 && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">
                {expiryStats.critical} Critical Listing{expiryStats.critical !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Expiring within 7 days
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Warning</p>
            <p className="text-xl font-bold text-orange-600">{expiryStats.warning}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">This Month</p>
            <p className="text-xl font-bold">{expiryStats.expiringThisMonth}</p>
          </div>
        </div>

        {/* Critical Listings Preview */}
        {expiryStats.criticalListings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Critical Listings:</p>
            <div className="space-y-1.5">
              {expiryStats.criticalListings.map((listing) => {
                const daysUntil = calculateDaysUntilExpiry(listing.listing_expires_date);
                return (
                  <div 
                    key={listing.id}
                    className="flex items-center justify-between text-xs p-2 bg-muted/50 rounded"
                  >
                    <span className="truncate flex-1 mr-2">{listing.address}</span>
                    <Badge variant="destructive" className="text-xs flex-shrink-0">
                      {daysUntil}d
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/listing-expiry-report')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Full Report
        </Button>
      </CardContent>
    </Card>
  );
}
