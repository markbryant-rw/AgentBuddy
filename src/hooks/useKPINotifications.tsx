import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useKPINotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Check user preferences
    if (user) {
      supabase
        .from('profiles' as any)
        .select('kpi_notification_enabled')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setEnabled((data as any)?.kpi_notification_enabled ?? false);
        });
    }
  }, [user]);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  };

  const scheduleNotification = (hour: number = 17) => {
    if (permission !== 'granted' || !enabled) return;

    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, 0, 0, 0);

    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime.getTime() - now.getTime();

    setTimeout(() => {
      new Notification('Time to log your day! 📊', {
        body: "Keep your streak alive - log today's numbers",
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'kpi-daily-reminder',
      });

      // Schedule next day
      scheduleNotification(hour);
    }, timeUntilNotification);
  };

  const toggleNotifications = async (enable: boolean) => {
    if (enable && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    setEnabled(enable);

    if (user) {
      await supabase
        .from('profiles' as any)
        .update({ kpi_notification_enabled: enable })
        .eq('id', user.id);
    }

    if (enable) {
      scheduleNotification();
    }
  };

  return {
    permission,
    enabled,
    requestPermission,
    toggleNotifications,
    scheduleNotification,
  };
}
