import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Flame, FileText, ListChecks, Rocket, Plus, AlertCircle, ArrowRight, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeroMetrics } from '@/components/playbook/HeroMetrics';
import { DailyCheckIn } from '@/components/playbook/DailyCheckIn';
import { MotivationalQuote } from '@/components/hub/MotivationalQuote';
import { WeatherWidget } from '@/components/hub/WeatherWidget';
import { DashboardQuickAccess } from '@/components/hub/DashboardQuickAccess';
import { useQuarterlyAppraisals } from '@/hooks/useQuarterlyAppraisals';
import { useTeamQuarterlyListingsSales } from '@/hooks/useTeamQuarterlyListingsSales';
import { usePlaybookQuarterlyGoals } from '@/hooks/usePlaybookQuarterlyGoals';
import { useWorkspaceStatuses } from '@/hooks/useWorkspaceStatuses';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTeam } from '@/hooks/useTeam';
import { useAppReadiness, AppReadinessGuard } from '@/contexts/AppReadinessContext';
import { NoOfficeConfigured } from '@/components/states/NoOfficeConfigured';
import { useState, useEffect, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDailyDigest } from '@/hooks/useDailyDigest';
import { DailyDigestModal } from '@/components/hub/DailyDigestModal';

const workspaces = [
  {
    id: 'plan',
    title: 'Plan',
    description: 'Quarterly planning, goal setting, and forecasting',
    icon: TrendingUp,
    route: '/plan-dashboard',
    gradient: 'from-blue-500/10 to-indigo-600/20',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    id: 'prospect',
    title: 'Prospect',
    description: 'Appraisal pipeline, warmth tracking, and action plans',
    icon: Flame,
    route: '/prospect-dashboard',
    gradient: 'from-teal-500/10 to-cyan-600/20',
    iconBg: 'bg-teal-100 dark:bg-teal-900/30',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
  {
    id: 'transact',
    title: 'Transact',
    description: 'Listing lifecycle and transaction coordination',
    icon: FileText,
    route: '/transact-dashboard',
    gradient: 'from-amber-500/10 to-orange-600/20',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'operate',
    title: 'Operate',
    description: 'Daily tasks, team coordination, and past sales intelligence',
    icon: ListChecks,
    route: '/operate-dashboard',
    gradient: 'from-purple-500/10 to-violet-600/20',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'grow',
    title: 'Grow',
    description: 'Skill development, knowledge base, and community',
    icon: Rocket,
    route: '/grow-dashboard',
    gradient: 'from-emerald-500/10 to-green-600/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'engage',
    title: 'Engage',
    description: 'Community connections, social feed, and service providers',
    icon: Users,
    route: '/engage-dashboard',
    gradient: 'from-pink-500/10 to-rose-600/20',
    iconBg: 'bg-pink-100 dark:bg-pink-900/30',
    iconColor: 'text-pink-600 dark:text-pink-400',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const { profile } = useProfile();
  const { team } = useTeam();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [clickedCard, setClickedCard] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { isReady } = useAppReadiness();
  const { shouldShow, handleDismiss, handleSnooze, handleOptOut } = useDailyDigest();
  
  // Fetch quarterly appraisals
  const { data: quarterlyAppraisals } = useQuarterlyAppraisals(user?.id || '');
  const { data: quarterlyGoals } = usePlaybookQuarterlyGoals(user?.id || '');
  const { data: workspaceStatuses } = useWorkspaceStatuses();
  
  // Fetch listings & sales data
  const { data: listingsSalesData } = useTeamQuarterlyListingsSales(team?.id);

  // Prefetch key workspaces so navigation feels instant
  useEffect(() => {
    const timer = setTimeout(() => {
      import('./OperateDashboard');
      import('./DailyPlanner');
    }, 500);
    return () => clearTimeout(timer);
  }, []);


  // Get first name from profile
  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const quarterlyAppraisalsTarget = quarterlyGoals?.appraisal_target || 65;

  const handleCardClick = (route: string, id: string) => {
    setClickedCard(id);
    startTransition(() => {
      navigate(route);
    });
  };

  return (
    <AppReadinessGuard
      fallback={{
        noOffice: <NoOfficeConfigured />,
      }}
    >
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-12">
        {/* Welcome Header with Weather */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 md:mb-8"
        >
          <div className={cn(
            "flex items-start justify-between",
            isMobile && "flex-col items-center text-center"
          )}>
            {/* Left side: Greeting + Quote */}
            <div className="flex-1">
              <h1 className={cn(
                "font-bold mb-2",
                isMobile ? "text-2xl" : "text-4xl"
              )}>
                {getGreeting()}, {firstName} 👋
              </h1>
              {!isMobile && <MotivationalQuote />}
            </div>

            {/* Right side: Weather Widget */}
            {!isMobile && <WeatherWidget />}
          </div>
        </motion.div>

        {/* Quick Access Bar */}
        <DashboardQuickAccess />

        {/* Hero Metrics */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-16"
          >
            <HeroMetrics
              quarterlyAppraisals={quarterlyAppraisals?.total || 0}
              quarterlyAppraisalsTarget={quarterlyAppraisalsTarget}
              highAppraisals={quarterlyAppraisals?.high || 0}
              mediumAppraisals={quarterlyAppraisals?.medium || 0}
              lowAppraisals={quarterlyAppraisals?.low || 0}
              totalListings={listingsSalesData?.totalListings || 0}
              totalSales={listingsSalesData?.totalSales || 0}
              listingsTarget={listingsSalesData?.listingsTarget}
              salesTarget={listingsSalesData?.salesTarget}
            />
          </motion.div>
        )}


        {/* What do you want to do? Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={cn(
            "text-center",
            isMobile ? "mb-6" : "mb-12"
          )}
        >
          <h2 className={cn(
            "font-bold mb-4",
            isMobile ? "text-xl" : "text-3xl"
          )}>
            What do you want to do?
          </h2>
          {!isMobile && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose your workspace to manage different aspects of your real estate business
            </p>
          )}
        </motion.div>

        {/* Workspace Cards Grid */}
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto",
          isMobile ? "gap-4" : "gap-6"
        )}>
          {workspaces.map((workspace, index) => {
            const status = workspaceStatuses?.[workspace.id];
            
            return (
              <motion.div
                key={workspace.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={cn(
                    "relative cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-primary/20 bg-gradient-to-br backdrop-blur-sm h-full",
                    workspace.gradient,
                    status?.hasAlert && "ring-2 ring-amber-500 ring-offset-2",
                    clickedCard === workspace.id && "opacity-70 scale-[0.98]",
                    isMobile ? "p-4" : "p-8"
                  )}
                  onClick={() => handleCardClick(workspace.route, workspace.id)}
                >
                  <div className={cn(
                    "flex flex-col items-center text-center",
                    isMobile ? "space-y-2" : "space-y-4"
                  )}>
                    <div className={cn(
                      "rounded-2xl transition-transform duration-300 group-hover:scale-110",
                      workspace.iconBg,
                      isMobile ? "p-3" : "p-6"
                    )}>
                      <workspace.icon className={cn(
                        workspace.iconColor,
                        isMobile ? "h-8 w-8" : "h-12 w-12"
                      )} />
                    </div>
                    
                    <div className="space-y-2">
                      <h2 className={cn(
                        "font-bold tracking-tight",
                        isMobile ? "text-lg" : "text-2xl"
                      )}>
                        {workspace.title}
                      </h2>
                      {!isMobile && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {workspace.description}
                        </p>
                      )}
                    </div>

                    {!isMobile && status && (
                      <div className={cn(
                        "text-sm font-medium flex items-center gap-2",
                        status.hasAlert ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                      )}>
                        {status.hasAlert && <AlertCircle className="h-4 w-4" />}
                        <span>{status.status}</span>
                      </div>
                    )}

                    {status?.hasAlert && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        Needs attention
                      </Badge>
                    )}

                    {!isMobile && (
                      <div className="pt-4">
                        <div className={`inline-flex items-center text-sm font-medium ${workspace.iconColor} group-hover:translate-x-1 transition-transform`}>
                          Open workspace →
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Daily Digest Modal */}
        <DailyDigestModal
          open={shouldShow}
          onDismiss={handleDismiss}
          onSnooze={handleSnooze}
          onOptOut={handleOptOut}
        />

        {/* Daily Check-In Dialog */}
        <DailyCheckIn
          open={checkInOpen}
          onOpenChange={setCheckInOpen}
          userId={user?.id || ''}
          onSuccess={() => {
            setCheckInOpen(false);
          }}
        />

        </div>
      </div>
    </AppReadinessGuard>
  );
}
