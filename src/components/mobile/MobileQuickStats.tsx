import { useTeam } from '@/hooks/useTeam';
import { useTeamQuarterlyAppraisals } from '@/hooks/useTeamQuarterlyAppraisals';
import { useTeamQuarterlyListingsSales } from '@/hooks/useTeamQuarterlyListingsSales';
import { usePlaybookQuarterlyGoals } from '@/hooks/usePlaybookQuarterlyGoals';
import { useAuth } from '@/hooks/useAuth';
import { Progress } from '@/components/ui/progress';

export function MobileQuickStats() {
  const { user } = useAuth();
  const { team } = useTeam();
  const { data: appraisals } = useTeamQuarterlyAppraisals(team?.id);
  const { data: listingsSales } = useTeamQuarterlyListingsSales(team?.id);
  const { data: goals } = usePlaybookQuarterlyGoals(user?.id || '');

  const appraisalTarget = goals?.appraisal_target || 65;
  const appraisalProgress = Math.min(100, ((appraisals?.total || 0) / appraisalTarget) * 100);

  const listingsTarget = listingsSales?.listingsTarget || 8;
  const salesTarget = listingsSales?.salesTarget || 6;
  const listingsProgress = Math.min(100, ((listingsSales?.totalListings || 0) / listingsTarget) * 100);
  const salesProgress = Math.min(100, ((listingsSales?.totalSales || 0) / salesTarget) * 100);

  return (
    <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        This Quarter
      </h3>

      {/* Appraisals */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Appraisals</span>
          <span className="text-muted-foreground">
            {appraisals?.total || 0}/{appraisalTarget}
          </span>
        </div>
        <Progress value={appraisalProgress} className="h-2" />
      </div>

      {/* Listings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Listings</span>
          <span className="text-muted-foreground">
            {listingsSales?.totalListings || 0}/{listingsTarget}
          </span>
        </div>
        <Progress value={listingsProgress} className="h-2 [&>div]:bg-blue-500" />
      </div>

      {/* Sales */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Sales</span>
          <span className="text-muted-foreground">
            {listingsSales?.totalSales || 0}/{salesTarget}
          </span>
        </div>
        <Progress value={salesProgress} className="h-2 [&>div]:bg-emerald-500" />
      </div>
    </div>
  );
}
