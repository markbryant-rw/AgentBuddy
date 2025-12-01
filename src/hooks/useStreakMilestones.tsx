import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface MilestoneData {
  title: string;
  description: string;
  confettiColors: string[];
  particleCount: number;
  spread: number;
}

const MILESTONES: Record<number, MilestoneData> = {
  7: {
    title: '🔥 7-Day Streak!',
    description: "You're on fire! A full week of consistency!",
    confettiColors: ['#ff6b6b', '#ffd93d', '#6bcf7f'],
    particleCount: 100,
    spread: 70,
  },
  14: {
    title: '💪 14-Day Streak!',
    description: 'Two weeks strong! Consistency is your superpower!',
    confettiColors: ['#4ecdc4', '#45b7d1', '#5f27cd'],
    particleCount: 150,
    spread: 90,
  },
  30: {
    title: '🏆 30-Day Streak!',
    description: "One month of excellence! You're unstoppable!",
    confettiColors: ['#f39c12', '#e74c3c', '#9b59b6'],
    particleCount: 200,
    spread: 120,
  },
  50: {
    title: '⭐ 50-Day Streak!',
    description: "Legendary commitment! You're an inspiration!",
    confettiColors: ['#f1c40f', '#e67e22', '#c0392b'],
    particleCount: 250,
    spread: 140,
  },
  100: {
    title: '🎖️ 100-Day Streak!',
    description: 'CENTURY MILESTONE! Absolutely phenomenal dedication!',
    confettiColors: ['#FFD700', '#FFA500', '#FF4500'],
    particleCount: 300,
    spread: 360,
  },
};

interface CelebratedMilestones {
  [milestone: number]: {
    celebrated: boolean;
    date: string;
    streakAtTime: number;
  };
}

const getCelebratedMilestonesKey = (userId: string) => `celebrated_milestones_${userId}`;

const getCelebratedMilestones = (userId: string): CelebratedMilestones => {
  try {
    const stored = localStorage.getItem(getCelebratedMilestonesKey(userId));
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveCelebratedMilestone = (userId: string, milestone: number, currentStreak: number) => {
  const milestones = getCelebratedMilestones(userId);
  milestones[milestone] = {
    celebrated: true,
    date: new Date().toISOString(),
    streakAtTime: currentStreak,
  };
  localStorage.setItem(getCelebratedMilestonesKey(userId), JSON.stringify(milestones));
};

const resetMilestonesIfStreakBroke = (userId: string, currentStreak: number) => {
  const milestones = getCelebratedMilestones(userId);
  let changed = false;

  // Clear celebrated milestones that are higher than current streak
  Object.keys(milestones).forEach((key) => {
    const milestone = parseInt(key);
    if (milestone > currentStreak) {
      delete milestones[milestone];
      changed = true;
    }
  });

  if (changed) {
    localStorage.setItem(getCelebratedMilestonesKey(userId), JSON.stringify(milestones));
  }
};

export const useStreakMilestones = () => {
  const { user } = useAuth();

  const triggerConfetti = useCallback((milestoneData: MilestoneData) => {
    const { confettiColors, particleCount, spread } = milestoneData;
    
    confetti({
      particleCount,
      spread,
      origin: { y: 0.6 },
      colors: confettiColors,
    });

    // For 30+ milestones, add a second burst
    if (particleCount >= 200) {
      setTimeout(() => {
        confetti({
          particleCount: particleCount / 2,
          spread: spread / 2,
          origin: { y: 0.5 },
          colors: confettiColors,
        });
      }, 250);
    }
  }, []);

  const celebrateMilestone = useCallback(async (milestone: number, currentStreak: number) => {
    if (!user) return;

    const milestoneData = MILESTONES[milestone];
    if (!milestoneData) return;

    // Trigger confetti first for immediate visual impact
    triggerConfetti(milestoneData);

    // Show toast after slight delay
    setTimeout(() => {
      toast.success(milestoneData.title, {
        description: milestoneData.description,
      });
    }, 300);

    // Save to localStorage
    saveCelebratedMilestone(user.id, milestone, currentStreak);

    // Create achievement post
    try {
      await supabase.from('social_posts' as any).insert({
        user_id: user.id,
        post_type: 'achievement',
        content: `Just hit a ${milestone}-day logging streak! 🔥 ${milestoneData.description}`,
        metadata: {
          achievement_type: 'streak',
          milestone_value: milestone,
          icon: '🔥'
        },
        visibility: 'team_only'
      });
    } catch (error) {
      console.error('Failed to create achievement post:', error);
    }
  }, [user, triggerConfetti]);

  const checkAndCelebrate = useCallback((currentStreak: number) => {
    if (!user || currentStreak === 0) return;

    // Reset milestones if streak broke and rebuilt
    resetMilestonesIfStreakBroke(user.id, currentStreak);

    const celebrated = getCelebratedMilestones(user.id);
    
    // Check milestones in descending order to celebrate the highest first
    const milestoneKeys = Object.keys(MILESTONES).map(Number).sort((a, b) => b - a);
    
    for (const milestone of milestoneKeys) {
      if (currentStreak >= milestone && !celebrated[milestone]?.celebrated) {
        celebrateMilestone(milestone, currentStreak);
        break; // Only celebrate one milestone at a time
      }
    }
  }, [user, celebrateMilestone]);

  return {
    checkAndCelebrate,
    celebrateMilestone,
  };
};
