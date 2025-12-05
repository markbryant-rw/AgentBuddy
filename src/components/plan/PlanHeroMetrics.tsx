import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useTeamQuarterlyAppraisals } from '@/hooks/useTeamQuarterlyAppraisals';
import { useTeamQuarterlyListingsSales } from '@/hooks/useTeamQuarterlyListingsSales';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, TrendingUp, CheckCircle2, AlertTriangle, Home } from 'lucide-react';
import { getQuarter, endOfQuarter, differenceInDays } from 'date-fns';
import { ListingsSalesChart } from './ListingsSalesChart';

export const PlanHeroMetrics = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { data: quarterlyAppraisals } = useTeamQuarterlyAppraisals(team?.id);
  const { data: listingsSalesData } = useTeamQuarterlyListingsSales(team?.id);

  // Calculate quarterly appraisals target (13 weeks * weekly target)
  const quarterlyAppraisalsTarget = 65; // Team quarterly target - TODO: fetch from team goals
  const appraisalsProgress = quarterlyAppraisals?.total || 0;
  const appraisalsPercentage = Math.min(100, (appraisalsProgress / quarterlyAppraisalsTarget) * 100);
  
  const currentQuarter = getQuarter(new Date());
  const quarterEndDate = endOfQuarter(new Date());
  const daysRemainingInQuarter = differenceInDays(quarterEndDate, new Date());

  // Calculate appraisals status
  const expectedAppraisalsByNow = (quarterlyAppraisalsTarget / 91) * (91 - daysRemainingInQuarter);
  const appraisalsStatus = 
    appraisalsProgress >= expectedAppraisalsByNow * 1.1 ? 'ahead' :
    appraisalsProgress >= expectedAppraisalsByNow * 0.85 ? 'ontrack' : 
    appraisalsProgress >= expectedAppraisalsByNow * 0.6 ? 'behind' : 'critical';

  // Calculate listings/sales status based on targets or reasonable defaults
  const totalListings = listingsSalesData?.totalListings || 0;
  const totalSales = listingsSalesData?.totalSales || 0;
  const listingsTarget = listingsSalesData?.listingsTarget || 15; // Default target
  const salesTarget = listingsSalesData?.salesTarget || 10; // Default target
  
  // Calculate expected progress based on time elapsed in quarter
  const quarterProgress = (91 - daysRemainingInQuarter) / 91;
  const expectedListings = listingsTarget * quarterProgress;
  const expectedSales = salesTarget * quarterProgress;
  
  const listingsSalesStatus = 
    (totalListings >= expectedListings * 1.1 && totalSales >= expectedSales * 0.9) ? 'ahead' :
    (totalListings >= expectedListings * 0.8 && totalSales >= expectedSales * 0.7) ? 'ontrack' :
    (totalListings >= expectedListings * 0.5 || totalSales >= expectedSales * 0.5) ? 'behind' : 'critical';

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ahead':
        return { 
          color: 'text-green-600 dark:text-green-400', 
          bg: 'bg-green-50 dark:bg-green-950/30',
          icon: TrendingUp,
          label: 'Ahead of Pace'
        };
      case 'ontrack':
        return { 
          color: 'text-blue-600 dark:text-blue-400', 
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          icon: CheckCircle2,
          label: 'On Track'
        };
      case 'behind':
        return { 
          color: 'text-amber-600 dark:text-amber-400', 
          bg: 'bg-amber-50 dark:bg-amber-950/30',
          icon: AlertTriangle,
          label: 'Behind Pace'
        };
      case 'critical':
        return { 
          color: 'text-red-600 dark:text-red-400', 
          bg: 'bg-red-50 dark:bg-red-950/30',
          icon: AlertTriangle,
          label: 'Critical'
        };
      default:
        return { 
          color: 'text-muted-foreground', 
          bg: 'bg-muted',
          icon: Target,
          label: 'Unknown'
        };
    }
  };

  const appraisalsStatusConfig = getStatusConfig(appraisalsStatus);
  const listingsSalesStatusConfig = getStatusConfig(listingsSalesStatus);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-fluid-lg mb-8">
      {/* Appraisals Progress */}
      <Card className="overflow-hidden">
        <CardContent className="p-fluid-lg">
          <div className="flex items-start justify-between mb-fluid-md">
            <div>
              <h3 className="text-fluid-lg font-semibold">Team Appraisals This Quarter</h3>
              <p className="text-fluid-sm text-muted-foreground">Q{currentQuarter} {new Date().getFullYear()}</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${appraisalsStatusConfig.bg}`}>
              <appraisalsStatusConfig.icon className={`h-4 w-4 ${appraisalsStatusConfig.color}`} />
              <span className={`text-xs font-medium ${appraisalsStatusConfig.color}`}>
                {appraisalsStatusConfig.label}
              </span>
            </div>
          </div>

          <div className="space-y-fluid-md">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-fluid-4xl font-bold">{appraisalsProgress}</span>
                  <span className="text-muted-foreground text-fluid-base">/ {quarterlyAppraisalsTarget}</span>
                </div>
                <span className="text-fluid-sm font-medium">{appraisalsPercentage.toFixed(0)}%</span>
              </div>
              <Progress value={appraisalsPercentage} className="h-3" />
            </div>

            <div className="flex items-center justify-between text-fluid-sm">
              <span className="text-muted-foreground">Days remaining in quarter</span>
              <span className="font-medium">{daysRemainingInQuarter}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listings & Sales Performance */}
      <Card className="overflow-hidden">
        <CardContent className="p-fluid-lg">
          <div className="flex items-start justify-between mb-fluid-sm">
            <div>
              <h3 className="text-fluid-lg font-semibold flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                Listings & Sales This Quarter
              </h3>
              <p className="text-fluid-sm text-muted-foreground">Q{currentQuarter} {new Date().getFullYear()} Performance</p>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${listingsSalesStatusConfig.bg}`}>
              <listingsSalesStatusConfig.icon className={`h-4 w-4 ${listingsSalesStatusConfig.color}`} />
              <span className={`text-xs font-medium ${listingsSalesStatusConfig.color}`}>
                {listingsSalesStatusConfig.label}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-baseline gap-1">
              <span className="text-fluid-2xl font-bold">{totalListings}</span>
              <span className="text-fluid-sm text-muted-foreground">Listings</span>
            </div>
            <span className="text-muted-foreground">•</span>
            <div className="flex items-baseline gap-1">
              <span className="text-fluid-2xl font-bold">{totalSales}</span>
              <span className="text-fluid-sm text-muted-foreground">Sales</span>
            </div>
            {(listingsSalesData?.listingsTarget || listingsSalesData?.salesTarget) && (
              <>
                <span className="text-muted-foreground ml-auto text-fluid-xs">
                  Target: {listingsTarget}L / {salesTarget}S
                </span>
              </>
            )}
          </div>

          {/* Chart */}
          <ListingsSalesChart 
            data={listingsSalesData?.weeklyData || []}
            listingsTarget={listingsSalesData?.listingsTarget}
            salesTarget={listingsSalesData?.salesTarget}
          />
        </CardContent>
      </Card>
    </div>
  );
};
