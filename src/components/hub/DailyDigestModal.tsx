import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCCH } from '@/hooks/useCCH';
import { useQuarterlyAppraisals } from '@/hooks/useQuarterlyAppraisals';
import { useWorkspaceStatuses } from '@/hooks/useWorkspaceStatuses';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { supabase } from '@/integrations/supabase/client';
import {
  Sunrise,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Flame,
  FileText,
  Plus,
  Phone,
  Home as HomeIcon,
  ListChecks,
  ArrowRight,
  X,
  Bell,
  BellOff,
} from 'lucide-react';
import { format, startOfWeek, addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface DailyDigestModalProps {
  open: boolean;
  onDismiss: () => void;
  onSnooze: () => void;
  onOptOut: () => void;
}

export const DailyDigestModal = ({ open, onDismiss, onSnooze, onOptOut }: DailyDigestModalProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { updatePreferences } = useUserPreferences();
  const { weeklyCCH, weeklyCCHTarget, dailyCCHTarget, weeklyBreakdown } = useCCH();
  const { data: quarterlyAppraisals } = useQuarterlyAppraisals(user?.id || '');
  const { data: workspaceStatuses } = useWorkspaceStatuses();

  const [hotLeads, setHotLeads] = useState(0);
  const [upcomingSettlements, setUpcomingSettlements] = useState(0);
  const [expiringListings, setExpiringListings] = useState(0);
  const [underContractCount, setUnderContractCount] = useState(0);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const currentTime = format(new Date(), 'EEEE, MMMM d, yyyy · h:mm a');

  // Fetch additional data
  useEffect(() => {
    if (!user || !open) return;

    const fetchAdditionalData = async () => {
      try {
        // Hot leads (warmth = hot)
        const { count: hotCount } = await (supabase as any)
          .from('logged_appraisals')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id)
          .eq('outcome', 'In Progress')
          .in('stage', ['MAP', 'LAP']);

        setHotLeads(hotCount || 0);

        // Get team ID
        const { data: teamMember } = await (supabase as any)
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (teamMember?.team_id) {
          // Upcoming settlements (next 7 days)
          const today = new Date();
          const nextWeek = addDays(today, 7);

          const { count: settlementsCount } = await (supabase as any)
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamMember.team_id)
            .eq('stage', 'settled')
            .gte('settlement_date', format(today, 'yyyy-MM-dd'))
            .lte('settlement_date', format(nextWeek, 'yyyy-MM-dd'));

          setUpcomingSettlements(settlementsCount || 0);

          // Expiring listings (within 30 days)
          const thirtyDaysLater = addDays(today, 30);

          const { count: expiringCount } = await (supabase as any)
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamMember.team_id)
            .neq('stage', 'settled')
            .lte('listing_expiry', format(thirtyDaysLater, 'yyyy-MM-dd'));

          setExpiringListings(expiringCount || 0);

          // Under contract yesterday (for celebration)
          const yesterday = addDays(today, -1);
          const { count: underContractYesterday } = await (supabase as any)
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamMember.team_id)
            .eq('stage', 'signed')
            .gte('created_at', format(yesterday, 'yyyy-MM-dd'))
            .lt('created_at', format(today, 'yyyy-MM-dd'));

          setUnderContractCount(underContractYesterday || 0);
        }
      } catch (error) {
        console.error('Error fetching digest data:', error);
      }
    };

    fetchAdditionalData();
  }, [user, open]);

  // Calculate metrics
  const cchProgress = weeklyCCHTarget > 0 ? (weeklyCCH / weeklyCCHTarget) * 100 : 0;
  const cchRemaining = Math.max(0, weeklyCCHTarget - weeklyCCH);
  const quarterlyAppraisalsTarget = 65; // Default target
  const appraisalsProgress = quarterlyAppraisalsTarget > 0 
    ? ((quarterlyAppraisals?.total || 0) / quarterlyAppraisalsTarget) * 100 
    : 0;

  const openTasks = workspaceStatuses?.operate?.count || 0;
  const overdueTasks = workspaceStatuses?.operate?.overdueCount || 0;
  const activeTransactions = workspaceStatuses?.transact?.count || 0;

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

  return (
    <Dialog open={open} onOpenChange={onDismiss}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hero Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 text-white mb-2">
                    <Sunrise className="h-10 w-10" />
                    <div>
                      <h2 className="text-3xl font-bold">{getGreeting()}, {firstName}!</h2>
                      <p className="text-indigo-100 text-sm">{currentTime}</p>
                    </div>
                  </div>
                  <p className="text-white/90 text-lg mt-4">Here's your Daily Digest</p>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Today's Targets Section */}
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-xl font-bold">Today's Targets</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Weekly CCH Progress */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Weekly CCH Progress</span>
                        <span className="text-lg font-bold">
                          {weeklyCCH.toFixed(1)} / {weeklyCCHTarget.toFixed(1)} hrs
                        </span>
                      </div>
                      <Progress value={cchProgress} className="h-3" />
                      {cchProgress >= 100 ? (
                        <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Target exceeded! 🎯</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-2 text-amber-600 dark:text-amber-400">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Need {cchRemaining.toFixed(1)} hrs this week ⚡
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Daily Target Remaining */}
                    <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Daily Target Remaining</span>
                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {dailyCCHTarget.toFixed(1)} hrs
                        </span>
                      </div>
                    </div>

                    {/* Quarterly Appraisals */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-muted-foreground">Quarterly Appraisals</span>
                        <span className="text-lg font-bold">
                          {quarterlyAppraisals?.total || 0} / {quarterlyAppraisalsTarget}
                        </span>
                      </div>
                      <Progress value={appraisalsProgress} className="h-3" />
                      <p className="text-sm text-muted-foreground mt-2">
                        ↑ {weeklyBreakdown.appraisals} this week
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Active Listings Section */}
                <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                    <h3 className="text-xl font-bold">Stock at a Glance</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <span className="text-xl font-bold text-green-600 dark:text-green-400">
                          {activeTransactions}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Active</p>
                        <p className="font-semibold">Transactions</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {upcomingSettlements}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Settlements</p>
                        <p className="font-semibold">This Week</p>
                      </div>
                    </div>

                    {expiringListings > 0 && (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{expiringListings} Listings</p>
                          <p className="font-semibold text-amber-600 dark:text-amber-400">Expiring Soon</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Tasks & Pipeline in a Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tasks Section */}
                  <Card className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3 mb-4">
                      <ListChecks className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      <h3 className="text-lg font-bold">Your Tasks</h3>
                    </div>

                    {overdueTasks > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                          <AlertCircle className="h-5 w-5" />
                          <span className="font-bold">{overdueTasks} overdue tasks</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{openTasks} total open tasks</p>
                      </div>
                    ) : openTasks > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <span className="font-bold">{openTasks} open tasks</span>
                        </div>
                        <p className="text-sm text-muted-foreground">All on track!</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">All tasks complete ✅</span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => {
                        onDismiss();
                        navigate('/operate-dashboard');
                      }}
                    >
                      View All Tasks <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Card>

                  {/* Pipeline Highlights */}
                  <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-3 mb-4">
                      <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                      <h3 className="text-lg font-bold">Pipeline Activity</h3>
                    </div>

                    <div className="space-y-3">
                      {hotLeads > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">🔥 HOT appraisals</span>
                          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                            {hotLeads} need follow-up
                          </Badge>
                        </div>
                      )}

                      {underContractCount > 0 && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {underContractCount} moved to "Under Contract" yesterday 🎉
                          </span>
                        </div>
                      )}

                      {hotLeads === 0 && underContractCount === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Time to heat up your pipeline! 🔥
                        </p>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full"
                      onClick={() => {
                        onDismiss();
                        navigate('/prospect-dashboard');
                      }}
                    >
                      View Pipeline <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Card>
                </div>

                {/* Quick Actions Bar */}
                <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10">
                  <h4 className="text-sm font-semibold mb-3 text-center">Quick Actions</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        onDismiss();
                        navigate('/plan-dashboard');
                      }}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Log Call
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        onDismiss();
                        navigate('/prospect-dashboard');
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Appraisal
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        onDismiss();
                        navigate('/transact-dashboard');
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Stock
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        onDismiss();
                        navigate('/prospect-dashboard');
                      }}
                    >
                      <HomeIcon className="mr-2 h-4 w-4" />
                      View Pipeline
                    </Button>
                  </div>
                </Card>

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                  <div className="flex gap-3">
                    <Button
                      onClick={onDismiss}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                    >
                      Got it, let's go! 🚀
                    </Button>
                    <Button
                      onClick={onSnooze}
                      variant="outline"
                      className="flex-1"
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Remind me in 1 hour
                    </Button>
                  </div>

                  <Button
                    onClick={handleOptOutClick}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <BellOff className="mr-2 h-4 w-4" />
                    Don't show me this again
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
