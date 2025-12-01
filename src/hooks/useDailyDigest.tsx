import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useUserPreferences } from './useUserPreferences';

export const useDailyDigest = () => {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!user || !preferences) return;

    // Check if user has opted out
    if (!preferences.show_daily_digest) {
      setShouldShow(false);
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();

    // Only show after 6:00 AM
    if (currentHour < 6) {
      setShouldShow(false);
      return;
    }

    // Check snooze status
    const snoozeUntilStr = localStorage.getItem('dailyDigest_snoozeUntil');
    if (snoozeUntilStr) {
      const snoozeUntil = new Date(snoozeUntilStr);
      if (now < snoozeUntil) {
        setShouldShow(false);
        return;
      } else {
        // Snooze expired, clear it
        localStorage.removeItem('dailyDigest_snoozeUntil');
      }
    }

    // Get today's date in local timezone (YYYY-MM-DD)
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Check last dismissed date using local timezone
    const lastDismissedStr = localStorage.getItem('dailyDigest_lastDismissed');
    if (lastDismissedStr) {
      const lastDismissed = new Date(lastDismissedStr);
      const lastDismissedDateStr = `${lastDismissed.getFullYear()}-${String(lastDismissed.getMonth() + 1).padStart(2, '0')}-${String(lastDismissed.getDate()).padStart(2, '0')}`;
      
      if (lastDismissedDateStr === todayStr) {
        setShouldShow(false);
        return;
      }
    }

    // Check last shown date
    const lastShownStr = localStorage.getItem('dailyDigest_lastShown');
    if (lastShownStr === todayStr) {
      setShouldShow(false);
      return;
    }

    // Show the modal for the first time today
    setShouldShow(true);
  }, [user, preferences]);

  const handleDismiss = () => {
    const now = new Date();
    // Use local timezone for date string (YYYY-MM-DD)
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Set localStorage to prevent showing again today
    localStorage.setItem('dailyDigest_lastShown', todayStr);
    
    // Store full timestamp for verification (will be converted to local date when checking)
    localStorage.setItem('dailyDigest_lastDismissed', now.toISOString());
    
    setShouldShow(false);
  };

  const handleSnooze = () => {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + 1);
    localStorage.setItem('dailyDigest_snoozeUntil', snoozeUntil.toISOString());
    setShouldShow(false);
  };

  const handleOptOut = async () => {
    // This will be handled by the modal component to update preferences
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    localStorage.setItem('dailyDigest_lastShown', todayStr);
    setShouldShow(false);
  };

  return {
    shouldShow,
    handleDismiss,
    handleSnooze,
    handleOptOut,
  };
};
