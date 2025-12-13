import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { MobileQuickStats } from '@/components/mobile/MobileQuickStats';
import { MobileTaskPreview } from '@/components/mobile/MobileTaskPreview';
import { MobileBottomNav } from '@/components/mobile/MobileBottomNav';
import { useState } from 'react';
import AppraisalDetailDialog from '@/components/appraisals/AppraisalDetailDialog';

export default function MobileDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [showLogAppraisal, setShowLogAppraisal] = useState(false);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const today = new Date().toLocaleDateString('en-NZ', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 pt-8 pb-4"
      >
        <h1 className="text-2xl font-bold">
          {getGreeting()}, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-5 mb-6"
      >
        <MobileQuickStats />
      </motion.div>

      {/* Big Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-5 mb-6"
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Log Appraisal Button */}
          <button
            onClick={() => setShowLogAppraisal(true)}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-600/30 border border-teal-500/30 hover:border-teal-400/50 transition-all active:scale-95"
          >
            <div className="p-4 rounded-xl bg-teal-500/20">
              <Plus className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="text-base font-semibold">Log Appraisal</span>
          </button>

          {/* Tasks Button */}
          <button
            onClick={() => navigate('/daily-planner')}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-violet-600/30 border border-purple-500/30 hover:border-purple-400/50 transition-all active:scale-95 relative"
          >
            <div className="p-4 rounded-xl bg-purple-500/20">
              <CheckSquare className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-base font-semibold">Tasks</span>
          </button>
        </div>
      </motion.div>

      {/* Today's Tasks Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="px-5"
      >
        <MobileTaskPreview />
      </motion.div>

      {/* Bottom Navigation */}
      <MobileBottomNav onLogAppraisal={() => setShowLogAppraisal(true)} />

      {/* Log Appraisal Dialog */}
      <AppraisalDetailDialog
        open={showLogAppraisal}
        onOpenChange={setShowLogAppraisal}
        appraisal={null}
        isNew
      />
    </div>
  );
}
