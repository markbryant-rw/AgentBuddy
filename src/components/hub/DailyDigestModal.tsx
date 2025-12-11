import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTeamQuarterlyAppraisals } from '@/hooks/useTeamQuarterlyAppraisals';
import { useTeamQuarterlyListingsSales } from '@/hooks/useTeamQuarterlyListingsSales';
import { useOvernightHotLeads } from '@/hooks/useOvernightHotLeads';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { supabase } from '@/integrations/supabase/client';
import {
  Sunrise,
  Target,
  AlertCircle,
  CheckCircle2,
  Clock,
  Flame,
  FileText,
  Trophy,
  BellOff,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { TeamAppraisalLeaderboard } from './TeamAppraisalLeaderboard';
import { format, startOfWeek, endOfWeek, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface DailyDigestModalProps {
  open: boolean;
  onDismiss: () => void;
  onSnooze: () => void;
  onOptOut: () => void;
}

export const DailyDigestModal = ({ open, onDismiss, onSnooze, onOptOut }: DailyDigestModalProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { updatePreferences } = useUserPreferences();
  const { data: hotLeads } = useOvernightHotLeads();

  const [teamId, setTeamId] = useState<string | null>(null);
  const [weeklyAppraisals, setWeeklyAppraisals] = useState(0);
  const [upcomingSettlements, setUpcomingSettlements] = useState(0);
  const [expiringListings, setExpiringListings] = useState(0);
  const [activeTransactions, setActiveTransactions] = useState(0);
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [dueTodayTasks, setDueTodayTasks] = useState(0);

  // Team-based quarterly appraisals (shows team totals, not just personal)
  const { data: quarterlyAppraisals } = useTeamQuarterlyAppraisals(teamId || undefined);
  const { data: listingsSalesData } = useTeamQuarterlyListingsSales(teamId || undefined);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const currentTime = format(new Date(), 'EEEE, MMMM d, yyyy');

  // Fetch additional data
  useEffect(() => {
    if (!user || !open) return;

    const fetchAdditionalData = async () => {
      try {
        // Get team ID
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (teamMember?.team_id) {
          setTeamId(teamMember.team_id);

          const today = new Date();
          const weekStart = startOfWeek(today, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
          const nextWeek = addDays(today, 7);
          const thirtyDaysLater = addDays(today, 30);

          // Weekly appraisals count
          const { count: weekAppraisalsCount } = await supabase
            .from('logged_appraisals')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamMember.team_id)
            .in('stage', ['MAP', 'LAP'])
            .gte('appraisal_date', format(weekStart, 'yyyy-MM-dd'))
            .lte('appraisal_date', format(weekEnd, 'yyyy-MM-dd'));

          setWeeklyAppraisals(weekAppraisalsCount || 0);

          // Active transactions
          const { count: activeCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamMember.team_id)
            .in('stage', ['signed', 'live', 'contract', 'unconditional']);

          setActiveTransactions(activeCount || 0);

          // Upcoming settlements (next 7 days)
          const { count: settlementsCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamMember.team_id)
            .in('stage', ['unconditional', 'contract'])
            .gte('settlement_date', format(today, 'yyyy-MM-dd'))
            .lte('settlement_date', format(nextWeek, 'yyyy-MM-dd'));

          setUpcomingSettlements(settlementsCount || 0);

          // Expiring listings (within 30 days)
          const { count: expiringCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamMember.team_id)
            .in('stage', ['live', 'contract'])
            .lte('listing_expiry', format(thirtyDaysLater, 'yyyy-MM-dd'));

          setExpiringListings(expiringCount || 0);
        }

        // Overdue tasks
        const { count: overdueCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', user.id)
          .eq('completed', false)
          .lt('due_date', format(new Date(), 'yyyy-MM-dd'));

        setOverdueTasks(overdueCount || 0);

        // Tasks due today
        const { count: todayCount } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', user.id)
          .eq('completed', false)
          .eq('due_date', format(new Date(), 'yyyy-MM-dd'));

        setDueTodayTasks(todayCount || 0);
      } catch (error) {
        console.error('Error fetching digest data:', error);
      }
    };

    fetchAdditionalData();
  }, [user, open]);

  // Calculate metrics
  const quarterlyAppraisalsTarget = quarterlyAppraisals?.monthlyPace 
    ? Math.round(quarterlyAppraisals.monthlyPace * 3) 
    : 65;
  const appraisalsProgress = quarterlyAppraisalsTarget > 0 
    ? ((quarterlyAppraisals?.total || 0) / quarterlyAppraisalsTarget) * 100 
    : 0;

  const listingsTarget = listingsSalesData?.listingsTarget || 8;
  const salesTarget = listingsSalesData?.salesTarget || 6;
  const listingsProgress = listingsTarget > 0 
    ? ((listingsSalesData?.totalListings || 0) / listingsTarget) * 100 
    : 0;
  const salesProgress = salesTarget > 0 
    ? ((listingsSalesData?.totalSales || 0) / salesTarget) * 100 
    : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleOptOutClick = async () => {
    try {
      await updatePreferences({ show_daily_digest: false });
      onOptOut();
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const hasUrgentItems = overdueTasks > 0 || dueTodayTasks > 0;
  const hasHotLeads = (hotLeads?.length || 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onDismiss}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hero Header - Compact */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white">
                    <Sunrise className="h-8 w-8" />
                    <div>
                      <h2 className="text-2xl font-bold">{getGreeting()}, {firstName}!</h2>
                      <p className="text-indigo-100 text-sm">{currentTime}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Your Progress Section - 3 Columns */}
                <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="font-bold">Your Progress</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Appraisals */}
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {quarterlyAppraisals?.total || 0}
                        <span className="text-lg text-muted-foreground font-normal"> / {quarterlyAppraisalsTarget}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Quarterly Appraisals</p>
                      <div className="mt-2">
                        <Progress value={appraisalsProgress} className="h-2" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {weeklyAppraisals} this week
                      </p>
                    </div>

                    {/* Listings */}
                    <div className="text-center">
                      <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                        {listingsSalesData?.totalListings || 0}
                        <span className="text-lg text-muted-foreground font-normal"> / {listingsTarget}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Quarterly Listings</p>
                      <div className="mt-2">
                        <Progress value={listingsProgress} className="h-2 [&>div]:bg-emerald-500" />
                      </div>
                    </div>

                    {/* Sales */}
                    <div className="text-center">
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                        {listingsSalesData?.totalSales || 0}
                        <span className="text-lg text-muted-foreground font-normal"> / {salesTarget}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Quarterly Sales</p>
                      <div className="mt-2">
                        <Progress value={salesProgress} className="h-2 [&>div]:bg-amber-500" />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Stock at a Glance */}
                <Card className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-bold">Stock at a Glance</h3>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">{activeTransactions}</span>
                      <span className="text-muted-foreground">Active</span>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{upcomingSettlements}</span>
                      <span className="text-muted-foreground">Settlements This Week</span>
                    </div>
                    {expiringListings > 0 && (
                      <>
                        <div className="h-6 w-px bg-border" />
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{expiringListings}</span>
                          <span className="text-muted-foreground">Expiring Soon</span>
                        </div>
                      </>
                    )}
                  </div>
                </Card>

                {/* Team Leaderboard */}
                <Card className="p-5 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800 backdrop-blur-sm">
                  <TeamAppraisalLeaderboard />
                </Card>

                {/* Urgent Attention & Hot Leads Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Urgent Attention */}
                  <Card className={`p-5 ${hasUrgentItems ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 border-red-200 dark:border-red-800' : 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {hasUrgentItems ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      <h3 className="font-bold">Urgent Attention</h3>
                    </div>

                    {hasUrgentItems ? (
                      <div className="space-y-2">
                        {overdueTasks > 0 && (
                          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium">{overdueTasks} overdue {overdueTasks === 1 ? 'task' : 'tasks'}</span>
                          </div>
                        )}
                        {dueTodayTasks > 0 && (
                          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">{dueTodayTasks} due today</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">All caught up!</span>
                      </div>
                    )}
                  </Card>

                  {/* Hot Leads */}
                  <Card className={`p-5 ${hasHotLeads ? 'bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800' : 'bg-muted/30 border-muted'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className={`h-5 w-5 ${hasHotLeads ? 'text-orange-500' : 'text-muted-foreground'}`} />
                      <h3 className="font-bold">Hot Leads</h3>
                      {hasHotLeads && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs">
                          Last 24h
                        </Badge>
                      )}
                    </div>

                    {hasHotLeads ? (
                      <div className="space-y-2">
                        {hotLeads?.slice(0, 3).map((lead) => (
                          <div key={lead.id} className="flex items-center justify-between text-sm">
                            <span className="truncate flex-1">{lead.address}</span>
                            <Badge variant="outline" className="ml-2 text-xs bg-orange-100/50 border-orange-300 text-orange-700">
                              {lead.propensityScore}%
                            </Badge>
                          </div>
                        ))}
                        {(hotLeads?.length || 0) > 3 && (
                          <p className="text-xs text-muted-foreground">+{(hotLeads?.length || 0) - 3} more</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No hot leads in the last 24 hours</p>
                    )}
                  </Card>
                </div>

                <Separator />

                {/* Action Buttons - Simplified */}
                <div className="flex items-center justify-between">
                  <Button
                    onClick={handleOptOutClick}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <BellOff className="mr-2 h-4 w-4" />
                    Don't show again
                  </Button>

                  <Button
                    onClick={onDismiss}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
