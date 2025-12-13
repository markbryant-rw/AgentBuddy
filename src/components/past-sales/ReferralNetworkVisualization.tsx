import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PastSale } from '@/hooks/usePastSales';
import { Users, ArrowRight, DollarSign, TrendingUp } from 'lucide-react';
import { formatCurrencyFull } from '@/lib/currencyUtils';
import { cn } from '@/lib/utils';

interface ReferralNetworkVisualizationProps {
  pastSales: PastSale[];
}

interface ReferralConnection {
  sourceId: string;
  sourceAddress: string;
  sourceVendor: string;
  targetId: string;
  targetAddress: string;
  targetVendor: string;
  targetSalePrice: number;
}

interface ReferralStats {
  totalReferrals: number;
  totalReferralValue: number;
  topReferrers: {
    id: string;
    address: string;
    vendorName: string;
    referralCount: number;
    referralValue: number;
  }[];
}

const ReferralNetworkVisualization = ({ pastSales }: ReferralNetworkVisualizationProps) => {
  // Find referral connections - sales where lead_source is 'referral' and has referral_source_id
  const { connections, stats } = useMemo(() => {
    const referralSales = pastSales.filter(sale => 
      sale.lead_source === 'referral' && (sale as any).referral_source_id
    );

    const connections: ReferralConnection[] = [];
    const referrerMap = new Map<string, { count: number; value: number; sale: PastSale }>();

    referralSales.forEach(sale => {
      const sourceSale = pastSales.find(s => s.id === (sale as any).referral_source_id);
      if (sourceSale) {
        const sourceVendor = `${sourceSale.vendor_details?.primary?.first_name || ''} ${sourceSale.vendor_details?.primary?.last_name || ''}`.trim() || 'Unknown';
        const targetVendor = `${sale.vendor_details?.primary?.first_name || ''} ${sale.vendor_details?.primary?.last_name || ''}`.trim() || 'Unknown';

        connections.push({
          sourceId: sourceSale.id,
          sourceAddress: sourceSale.address,
          sourceVendor,
          targetId: sale.id,
          targetAddress: sale.address,
          targetVendor,
          targetSalePrice: sale.sale_price || 0,
        });

        // Track referrer stats
        const existing = referrerMap.get(sourceSale.id);
        if (existing) {
          existing.count += 1;
          existing.value += sale.sale_price || 0;
        } else {
          referrerMap.set(sourceSale.id, {
            count: 1,
            value: sale.sale_price || 0,
            sale: sourceSale,
          });
        }
      }
    });

    // Also check for referral partners marked in vendor_details
    const referralPartners = pastSales.filter(sale => 
      sale.vendor_details?.primary?.is_referral_partner
    );

    const topReferrers = Array.from(referrerMap.entries())
      .map(([id, data]) => ({
        id,
        address: data.sale.address,
        vendorName: `${data.sale.vendor_details?.primary?.first_name || ''} ${data.sale.vendor_details?.primary?.last_name || ''}`.trim() || 'Unknown',
        referralCount: data.count,
        referralValue: data.value,
      }))
      .sort((a, b) => b.referralValue - a.referralValue)
      .slice(0, 5);

    const stats: ReferralStats = {
      totalReferrals: connections.length,
      totalReferralValue: connections.reduce((sum, c) => sum + c.targetSalePrice, 0),
      topReferrers,
    };

    return { connections, stats, referralPartners };
  }, [pastSales]);

  if (connections.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Referral Network</h3>
            <p className="text-sm text-muted-foreground">Track connections between your past sales</p>
          </div>
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No referral connections yet</p>
          <p className="text-sm mt-1">
            Mark vendors as referral partners and link new sales to their source referral
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">Referral Network</h3>
            <p className="text-sm text-muted-foreground">
              {stats.totalReferrals} referral{stats.totalReferrals !== 1 ? 's' : ''} tracked
            </p>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">
          <DollarSign className="h-3 w-3 mr-1" />
          {formatCurrencyFull(stats.totalReferralValue)} value
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.totalReferrals}
          </div>
          <p className="text-sm text-muted-foreground">Total Referrals</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrencyFull(stats.totalReferralValue)}
          </div>
          <p className="text-sm text-muted-foreground">Referral Value</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.topReferrers.length}
          </div>
          <p className="text-sm text-muted-foreground">Active Referrers</p>
        </div>
      </div>

      {/* Top Referrers */}
      {stats.topReferrers.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Top Referrers
          </h4>
          <div className="space-y-2">
            {stats.topReferrers.map((referrer, index) => (
              <div
                key={referrer.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  index === 0 && "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border border-amber-200 dark:border-amber-800",
                  index > 0 && "bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                    index === 0 ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{referrer.vendorName}</p>
                    <p className="text-xs text-muted-foreground">{referrer.address}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary">
                    {referrer.referralCount} referral{referrer.referralCount !== 1 ? 's' : ''}
                  </Badge>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrencyFull(referrer.referralValue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Flow */}
      <div>
        <h4 className="font-medium text-sm text-muted-foreground mb-3">Referral Connections</h4>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {connections.map((connection, index) => (
            <div
              key={`${connection.sourceId}-${connection.targetId}`}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
            >
              {/* Source */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{connection.sourceVendor}</p>
                <p className="text-xs text-muted-foreground truncate">{connection.sourceAddress}</p>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 flex items-center gap-1 text-purple-500">
                <div className="h-px w-4 bg-purple-300" />
                <ArrowRight className="h-4 w-4" />
                <div className="h-px w-4 bg-purple-300" />
              </div>

              {/* Target */}
              <div className="flex-1 min-w-0 text-right">
                <p className="font-medium text-sm truncate">{connection.targetVendor}</p>
                <p className="text-xs text-muted-foreground truncate">{connection.targetAddress}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {formatCurrencyFull(connection.targetSalePrice)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default ReferralNetworkVisualization;
