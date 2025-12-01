import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { DailyCheckIn } from '@/components/playbook/DailyCheckIn';

interface LoggingReminderProps {
  hasLoggedToday?: boolean;
}

export function LoggingReminder({ hasLoggedToday = false }: LoggingReminderProps) {
  const [show, setShow] = useState(false);
  const [dailyCheckInOpen, setDailyCheckInOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
      
      // Show reminder at 5pm (17:00) on weekdays (Mon-Fri)
      const isWeekday = day >= 1 && day <= 5;
      if (hour === 17 && isWeekday) {
        const dismissed = sessionStorage.getItem('kpi-reminder-dismissed');
        const dismissedDate = sessionStorage.getItem('kpi-reminder-dismissed-date');
        const today = now.toDateString();
        
        // Reset dismissal if it's a new day
        if (dismissedDate !== today) {
          sessionStorage.removeItem('kpi-reminder-dismissed');
          sessionStorage.removeItem('kpi-reminder-dismissed-date');
        }
        
        if (!dismissed && !hasLoggedToday) {
          setShow(true);
        }
      }
      
      // Auto-hide at midnight
      if (hour === 0) {
        setShow(false);
        sessionStorage.removeItem('kpi-reminder-dismissed');
        sessionStorage.removeItem('kpi-reminder-dismissed-date');
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [hasLoggedToday]);

  // Auto-dismiss when user logs their KPIs
  useEffect(() => {
    if (hasLoggedToday && show) {
      setShow(false);
    }
  }, [hasLoggedToday, show]);

  const handleDismiss = () => {
    setShow(false);
    const today = new Date().toDateString();
    sessionStorage.setItem('kpi-reminder-dismissed', 'true');
    sessionStorage.setItem('kpi-reminder-dismissed-date', today);
  };

  const handleLogNow = () => {
    handleDismiss();
    setDailyCheckInOpen(true);
  };

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md mx-4"
          >
            <div className="bg-primary text-primary-foreground p-4 rounded-lg shadow-2xl flex items-center gap-3">
              <Bell className="h-5 w-5 animate-pulse" />
              <div className="flex-1">
                <h4 className="font-semibold">Time to log your day! 📊</h4>
                <p className="text-sm opacity-90">Keep your streak alive - log today's numbers</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleLogNow}
                >
                  Log Now
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="hover:bg-primary-foreground/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DailyCheckIn
        open={dailyCheckInOpen}
        onOpenChange={setDailyCheckInOpen}
        userId={user?.id || ''}
        onSuccess={() => {
          // Refresh will happen automatically
        }}
      />
    </>
  );
}
