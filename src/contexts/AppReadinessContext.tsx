import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTeam } from '@/hooks/useTeam';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';

export type AppReadinessState = 
  | 'loading'
  | 'ready'
  | 'no_office'
  | 'no_profile'
  | 'error';

interface AppReadinessContextValue {
  state: AppReadinessState;
  profile: any;
  team: any;
  activeOffice: any;
  isReady: boolean;
}

const AppReadinessContext = createContext<AppReadinessContextValue | undefined>(undefined);

export const useAppReadiness = () => {
  const context = useContext(AppReadinessContext);
  if (!context) {
    throw new Error('useAppReadiness must be used within AppReadinessProvider');
  }
  return context;
};

export const AppReadinessProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { team, loading: teamLoading } = useTeam();
  const { activeOffice, isLoading: officeLoading, canSwitchOffices } = useOfficeSwitcher();

  // Determine the current state
  const getState = (): AppReadinessState => {
    // Still loading auth or core data
    if (authLoading || profileLoading || teamLoading || officeLoading) {
      logger.log('[AppReadiness] Still loading:', { authLoading, profileLoading, teamLoading, officeLoading });
      return 'loading';
    }

    // No user authenticated (should be caught by ProtectedRoute)
    if (!user) {
      logger.log('[AppReadiness] No user');
      return 'error';
    }

    // Profile didn't load
    if (!profile) {
      logger.log('[AppReadiness] No profile for user', user.id);
      return 'no_profile';
    }

    // Teams are optional - solo agents can use the platform
    // No need to block users without teams

    // Check if user needs an office (office managers and platform admins)
    const needsOffice = canSwitchOffices && !activeOffice;
    if (needsOffice) {
      logger.log('[AppReadiness] User can switch offices but has no active office');
      return 'no_office';
    }

    logger.log('[AppReadiness] Ready:', { profile: !!profile, team: !!team, activeOffice: !!activeOffice });
    return 'ready';
  };

  const state = getState();
  const isReady = state === 'ready';

  const value: AppReadinessContextValue = {
    state,
    profile,
    team,
    activeOffice,
    isReady,
  };

  return (
    <AppReadinessContext.Provider value={value}>
      {children}
    </AppReadinessContext.Provider>
  );
};

/**
 * AppReadinessGuard - Wraps content and shows appropriate UI based on readiness state
 */
export const AppReadinessGuard = ({ 
  children,
  fallback,
}: { 
  children: ReactNode;
  fallback?: {
    loading?: ReactNode;
    noOffice?: ReactNode;
    noProfile?: ReactNode;
    error?: ReactNode;
  };
}) => {
  const { state } = useAppReadiness();

  if (state === 'loading') {
    return fallback?.loading || (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (state === 'no_office') {
    return fallback?.noOffice || null;
  }

  if (state === 'no_profile') {
    return fallback?.noProfile || null;
  }

  if (state === 'error') {
    return fallback?.error || null;
  }

  return <>{children}</>;
};
