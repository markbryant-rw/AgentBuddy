import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlaybookQuarterlyGoals } from '@/hooks/usePlaybookQuarterlyGoals';
import { useQuarterlyAppraisals } from '@/hooks/useQuarterlyAppraisals';
import { useTeamQuarterlyListingsSales } from '@/hooks/useTeamQuarterlyListingsSales';
import { useTeam } from '@/hooks/useTeam';
import { HeroMetrics } from '@/components/playbook/HeroMetrics';
import { DailyCheckIn } from '@/components/playbook/DailyCheckIn';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, TrendingUp, Calendar, ListTodo, Flame, FileText, TrendingUpIcon, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

export default function PlaybookDashboard() {
  const { user } = useAuth();
  const { team } = useTeam();
  const navigate = useNavigate();
  const [checkInOpen, setCheckInOpen] = useState(false);

  const { data: playbookGoals } = usePlaybookQuarterlyGoals(user?.id || '');
  const { data: quarterlyAppraisals, refetch: refetchAppraisals } = useQuarterlyAppraisals(user?.id || '');
  const { data: listingsSalesData } = useTeamQuarterlyListingsSales(team?.id);

  const quarterlyTarget = (playbookGoals && typeof playbookGoals === 'object' && 'appraisals_target' in playbookGoals)
    ? playbookGoals.appraisals_target || 40
    : 40;

  const handleCheckInSuccess = () => {
    refetchAppraisals();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">The Playbook</h1>
            <p className="text-muted-foreground">
              Week of {format(new Date(), 'MMM d')} - Your Performance Dashboard
            </p>
          </div>
          <Button 
            size="lg"
            onClick={() => setCheckInOpen(true)}
            className="h-12 px-8 text-lg font-semibold"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Daily Check-In
          </Button>
        </div>

        {/* Hero Metrics */}
        <HeroMetrics
          quarterlyAppraisals={quarterlyAppraisals?.total || 0}
          quarterlyAppraisalsTarget={quarterlyTarget}
          highAppraisals={quarterlyAppraisals?.high || 0}
          mediumAppraisals={quarterlyAppraisals?.medium || 0}
          lowAppraisals={quarterlyAppraisals?.low || 0}
          totalListings={listingsSalesData?.totalListings || 0}
          totalSales={listingsSalesData?.totalSales || 0}
          listingsSalesWeeklyData={listingsSalesData?.weeklyData || []}
          listingsTarget={listingsSalesData?.listingsTarget}
          salesTarget={listingsSalesData?.salesTarget}
        />

        {/* Action Items Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-red-500"
              onClick={() => navigate('/prospect-dashboard')}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <Flame className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">High Intent Appraisals</h3>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                    {quarterlyAppraisals?.high || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Ready to convert</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-blue-500"
              onClick={() => navigate('/daily-planner')}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Today's Planner</h3>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    View Schedule
                  </p>
                  <p className="text-sm text-muted-foreground">Plan your day</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card 
              className="p-6 cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-green-500"
              onClick={() => navigate('/tasks')}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <ListTodo className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Priority Tasks</h3>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                    View Tasks
                  </p>
                  <p className="text-sm text-muted-foreground">High priority items</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* The Big 5 Navigation */}
        <div>
          <h2 className="text-2xl font-bold mb-4">The Big 5</h2>
          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: TrendingUpIcon, title: 'Business Planning', desc: 'Quarterly goals & performance', route: '/kpi-tracker', badge: null },
              { icon: Flame, title: 'Appraisal Pipeline', desc: `${quarterlyAppraisals?.total || 0} appraisals | ${quarterlyAppraisals?.high || 0} high intent`, route: '/prospect-dashboard', badge: '⭐' },
              { icon: FileText, title: 'Listing Lifecycle', desc: 'Active deals & vendor reports', route: '/transaction-management', badge: null },
              { icon: ListTodo, title: 'Operations Hub', desc: 'Tasks, notes, and knowledge base', route: '/tasks', badge: null },
              { icon: Rocket, title: 'Growth Center', desc: 'Training & development', route: '/coaches-corner', badge: null },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="p-6 cursor-pointer hover:shadow-md transition-all group"
                  onClick={() => navigate(item.route)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        {item.badge && (
                          <span className="text-xs">{item.badge}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <DailyCheckIn
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        userId={user?.id || ''}
        onSuccess={handleCheckInSuccess}
      />
    </div>
  );
}
