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
import { useSettlementCelebrations } from '@/hooks/useSettlementCelebrations';
import { useAnniversaryTouchpoints } from '@/hooks/useAnniversaryTouchpoints';
import { supabase } from '@/integrations/supabase/client';
import {
  Sunrise,
  Target,
  AlertCircle,
  CheckCircle2,
  Clock,
  Flame,
  FileText,
  BellOff,
  AlertTriangle,
  TrendingUp,
  PartyPopper,
  Phone,
  Calendar,
  Home,
  Heart,
  Gift,
} from 'lucide-react';
import { TeamAppraisalLeaderboard } from './TeamAppraisalLeaderboard';
import { format, startOfWeek, endOfWeek, addDays, differenceInDays, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { formatCurrencyFull } from '@/lib/currencyUtils';

interface DailyDigestModalProps {
  open: boolean;
  onDismiss: () => void;
  onSnooze: () => void;
  onOptOut: () => void;
}

interface SettlementDetail {
  id: string;
  address: string;
  settlement_date: string;
  vendor_names: string | null;
  client_name: string | null;
  isToday: boolean;
}

interface OverdueTaskDetail {
  id: string;
  title: string;
  due_date: string;
  daysOverdue: number;
  address: string | null;
  context: string;
}

interface MissedFollowup {
  id: string;
  address: string;
  vendor_name: string | null;
  next_follow_up: string;
  daysOverdue: number;
}

export const DailyDigestModal = ({ open, onDismiss, onSnooze, onOptOut }: DailyDigestModalProps) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { updatePreferences } = useUserPreferences();
  const { data: hotLeads } = useOvernightHotLeads();

  const [teamId, setTeamId] = useState<string | null>(null);
  const { data: settlementCelebrations } = useSettlementCelebrations(teamId || undefined);
  const { data: anniversaryTouchpoints } = useAnniversaryTouchpoints();
  const [weeklyAppraisals, setWeeklyAppraisals] = useState(0);
  const [activeTransactions, setActiveTransactions] = useState(0);
  const [expiringListings, setExpiringListings] = useState(0);
  
  // Enhanced detailed state
  const [settlementDetails, setSettlementDetails] = useState<SettlementDetail[]>([]);
  const [overdueTaskDetails, setOverdueTaskDetails] = useState<OverdueTaskDetail[]>([]);
  const [dueTodayTaskDetails, setDueTodayTaskDetails] = useState<OverdueTaskDetail[]>([]);
  const [missedFollowups, setMissedFollowups] = useState<MissedFollowup[]>([]);

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
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        // Get team ID
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (teamMember?.team_id) {
          setTeamId(teamMember.team_id);

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

          // Settlement details (next 7 days) - ENHANCED
          const { data: settlements } = await supabase
            .from('transactions')
            .select('id, address, settlement_date, vendor_names, client_name')
            .eq('team_id', teamMember.team_id)
            .in('stage', ['unconditional', 'contract'])
            .gte('settlement_date', todayStr)
            .lte('settlement_date', format(nextWeek, 'yyyy-MM-dd'))
            .order('settlement_date', { ascending: true });

          if (settlements) {
            setSettlementDetails(settlements.map(s => ({
              id: s.id,
              address: s.address,
              settlement_date: s.settlement_date,
              vendor_names: typeof s.vendor_names === 'string' ? s.vendor_names : Array.isArray(s.vendor_names) ? s.vendor_names.join(', ') : null,
              client_name: s.client_name,
              isToday: s.settlement_date === todayStr
            })));
          }

          // Expiring listings (within 30 days)
          const { count: expiringCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamMember.team_id)
            .in('stage', ['live', 'contract'])
            .lte('listing_expiry', format(thirtyDaysLater, 'yyyy-MM-dd'));

          setExpiringListings(expiringCount || 0);

          // Missed appraisal follow-ups - NEW
          const { data: missedFollowupsData } = await supabase
            .from('logged_appraisals')
            .select('id, address, vendor_name, next_follow_up')
            .eq('agent_id', user.id)
            .lt('next_follow_up', todayStr)
            .is('outcome', null)
            .order('next_follow_up', { ascending: true })
            .limit(5);

          if (missedFollowupsData) {
            setMissedFollowups(missedFollowupsData.map(f => ({
              ...f,
              daysOverdue: differenceInDays(today, new Date(f.next_follow_up))
            })));
          }
        }

        // Overdue tasks with details - ENHANCED
        const { data: overdueTasks } = await supabase
          .from('tasks')
          .select(`
            id, title, due_date, transaction_id, appraisal_id,
            transactions(address),
            logged_appraisals(address)
          `)
          .eq('assigned_to', user.id)
          .eq('completed', false)
          .lt('due_date', todayStr)
          .order('due_date', { ascending: true })
          .limit(10);

        if (overdueTasks) {
          // Group by address/context
          const grouped = overdueTasks.map(task => {
            const transactions = task.transactions as { address: string } | null;
            const appraisals = task.logged_appraisals as { address: string } | null;
            const address = transactions?.address || appraisals?.address || null;
            const context = task.transaction_id ? 'transaction' : task.appraisal_id ? 'appraisal' : 'general';
            
            return {
              id: task.id,
              title: task.title,
              due_date: task.due_date,
              daysOverdue: differenceInDays(today, new Date(task.due_date)),
              address,
              context
            };
          });
          setOverdueTaskDetails(grouped);
        }

        // Tasks due today with details
        const { data: todayTasks } = await supabase
          .from('tasks')
          .select(`
            id, title, due_date, transaction_id, appraisal_id,
            transactions(address),
            logged_appraisals(address)
          `)
          .eq('assigned_to', user.id)
          .eq('completed', false)
          .eq('due_date', todayStr)
          .order('created_at', { ascending: true })
          .limit(5);

        if (todayTasks) {
          const mapped = todayTasks.map(task => {
            const transactions = task.transactions as { address: string } | null;
            const appraisals = task.logged_appraisals as { address: string } | null;
            const address = transactions?.address || appraisals?.address || null;
            const context = task.transaction_id ? 'transaction' : task.appraisal_id ? 'appraisal' : 'general';
            
            return {
              id: task.id,
              title: task.title,
              due_date: task.due_date,
              daysOverdue: 0,
              address,
              context
            };
          });
          setDueTodayTaskDetails(mapped);
        }

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

  const hasUrgentItems = overdueTaskDetails.length > 0 || dueTodayTaskDetails.length > 0;
  const hasHotLeads = (hotLeads?.length || 0) > 0;
  const hasMissedFollowups = missedFollowups.length > 0;
  const hasSettlementCelebrations = (settlementCelebrations?.length || 0) > 0;
  const hasAnniversaryTouchpoints = (anniversaryTouchpoints?.length || 0) > 0;
  const pendingAnniversaryTouchpoints = anniversaryTouchpoints?.filter(t => !t.completed) || [];
  const todaySettlements = settlementDetails.filter(s => s.isToday);
  const thisWeekSettlements = settlementDetails.filter(s => !s.isToday);

  // Trigger confetti for settlement celebrations
  useEffect(() => {
    if (open && hasSettlementCelebrations) {
      const timer = setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.3 },
          colors: ['#10b981', '#14b8a6', '#22c55e', '#84cc16', '#fbbf24'],
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [open, hasSettlementCelebrations]);

  // Group overdue tasks by address
  const groupedOverdueTasks = overdueTaskDetails.reduce((acc, task) => {
    const key = task.address || 'General Tasks';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, OverdueTaskDetail[]>);

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
                {/* Settlement TODAY Alert - Only show if settling today */}
                {todaySettlements.length > 0 && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="p-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 shadow-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <PartyPopper className="h-6 w-6" />
                        <h3 className="font-bold text-lg">🎉 Settling TODAY!</h3>
                      </div>
                      <div className="space-y-2">
                        {todaySettlements.map(settlement => (
                          <div key={settlement.id} className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4" />
                              <span className="font-medium">{settlement.address}</span>
                            </div>
                            {(settlement.vendor_names || settlement.client_name) && (
                              <span className="text-emerald-100 text-sm">
                                for {settlement.vendor_names || settlement.client_name}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}

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

                {/* Stock at a Glance - Enhanced with settlement details */}
                <Card className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <h3 className="font-bold">Stock at a Glance</h3>
                  </div>

                  <div className="flex items-center gap-6 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">{activeTransactions}</span>
                      <span className="text-muted-foreground">Active</span>
                    </div>
                    <div className="h-6 w-px bg-border" />
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{settlementDetails.length}</span>
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

                  {/* This Week Settlements List */}
                  {thisWeekSettlements.length > 0 && (
                    <div className="border-t border-green-200 dark:border-green-800 pt-3 mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Coming up this week:
                      </p>
                      <div className="space-y-1">
                        {thisWeekSettlements.slice(0, 3).map(settlement => (
                          <div key={settlement.id} className="flex items-center justify-between text-sm">
                            <span className="truncate flex-1">{settlement.address}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {format(new Date(settlement.settlement_date), 'EEE, MMM d')}
                            </Badge>
                          </div>
                        ))}
                        {thisWeekSettlements.length > 3 && (
                          <p className="text-xs text-muted-foreground">+{thisWeekSettlements.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Team Leaderboard */}
                <Card className="p-5 bg-gradient-to-br from-amber-50/80 to-yellow-50/80 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800 backdrop-blur-sm">
                  <TeamAppraisalLeaderboard />
                </Card>

                {/* Settlement Celebrations - This Week */}
                {hasSettlementCelebrations && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="p-5 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 dark:from-pink-950/30 dark:via-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800 relative overflow-hidden">
                      <div className="absolute top-0 right-0 text-6xl opacity-10">🎉</div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
                          <PartyPopper className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold">🎊 Settlement Celebrations!</h3>
                          <p className="text-sm text-muted-foreground">Who settled this week</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {settlementCelebrations?.slice(0, 5).map(celebration => (
                          <div key={celebration.id} className="flex items-center justify-between bg-white/60 dark:bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                              <div className="text-2xl">🏠</div>
                              <div>
                                <p className="font-medium">{celebration.address}</p>
                                <p className="text-sm text-muted-foreground">
                                  {celebration.vendor_name} • {celebration.agent_name || 'Team'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0">
                                {celebration.sale_price ? formatCurrencyFull(celebration.sale_price) : 'Settled'}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(celebration.settlement_date), 'EEE, MMM d')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                )}

                {/* Anniversary Touchpoints This Week */}
                {pendingAnniversaryTouchpoints.length > 0 && (
                  <Card className="p-5 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border-rose-200 dark:border-rose-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                        <Heart className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold">💝 Anniversary Touchpoints</h3>
                        <p className="text-sm text-muted-foreground">Nurture these relationships this week</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {pendingAnniversaryTouchpoints.slice(0, 4).map(touchpoint => (
                        <div key={touchpoint.id} className="flex items-center justify-between bg-white/60 dark:bg-white/10 rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-sm font-bold text-rose-600">
                              {touchpoint.aftercare_year || '•'}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{touchpoint.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {touchpoint.address} • {touchpoint.vendor_name}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(touchpoint.due_date), 'EEE, MMM d')}
                          </Badge>
                        </div>
                      ))}
                      {pendingAnniversaryTouchpoints.length > 4 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{pendingAnniversaryTouchpoints.length - 4} more touchpoints
                        </p>
                      )}
                    </div>
                  </Card>
                )}

                {/* Urgent Attention & Hot Leads Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Urgent Attention - Enhanced with details */}
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
                      <div className="space-y-3">
                        {/* Overdue Tasks - Grouped */}
                        {overdueTaskDetails.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                              <AlertCircle className="h-4 w-4" />
                              <span className="font-medium">{overdueTaskDetails.length} overdue {overdueTaskDetails.length === 1 ? 'task' : 'tasks'}</span>
                            </div>
                            <div className="space-y-1 ml-6">
                              {Object.entries(groupedOverdueTasks).slice(0, 3).map(([address, tasks]) => (
                                <div key={address} className="text-sm text-red-700 dark:text-red-300">
                                  <span className="font-medium">{address}:</span>{' '}
                                  <span className="text-red-600/80 dark:text-red-400/80">
                                    {tasks.length} task{tasks.length > 1 ? 's' : ''} ({tasks[0].title}{tasks.length > 1 ? '...' : ''})
                                  </span>
                                </div>
                              ))}
                              {Object.keys(groupedOverdueTasks).length > 3 && (
                                <p className="text-xs text-red-500">+{Object.keys(groupedOverdueTasks).length - 3} more properties</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Due Today Tasks */}
                        {dueTodayTaskDetails.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                              <Clock className="h-4 w-4" />
                              <span className="font-medium">{dueTodayTaskDetails.length} due today</span>
                            </div>
                            <div className="space-y-1 ml-6">
                              {dueTodayTaskDetails.slice(0, 3).map(task => (
                                <div key={task.id} className="text-sm text-amber-700 dark:text-amber-300">
                                  • {task.title} {task.address && <span className="text-amber-600/70">- {task.address}</span>}
                                </div>
                              ))}
                              {dueTodayTaskDetails.length > 3 && (
                                <p className="text-xs text-amber-500">+{dueTodayTaskDetails.length - 3} more</p>
                              )}
                            </div>
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

                {/* Missed Follow-ups - NEW Section */}
                {hasMissedFollowups && (
                  <Card className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Phone className="h-5 w-5 text-purple-500" />
                      <h3 className="font-bold">Missed Follow-ups</h3>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs">
                        Needs attention
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      You scheduled these follow-ups but haven't contacted yet:
                    </p>
                    <div className="space-y-2">
                      {missedFollowups.map(followup => (
                        <div key={followup.id} className="flex items-center justify-between text-sm bg-purple-100/50 dark:bg-purple-900/20 rounded-lg p-2">
                          <div className="flex-1">
                            <span className="font-medium">{followup.address}</span>
                            {followup.vendor_name && (
                              <span className="text-purple-600 dark:text-purple-400"> ({followup.vendor_name})</span>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2 text-xs border-purple-300 text-purple-700 dark:text-purple-300">
                            {followup.daysOverdue} {followup.daysOverdue === 1 ? 'day' : 'days'} overdue
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

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
