import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { AppRole } from '@/lib/rbac';
import { logger } from '@/lib/logger';

const FALLBACK_ROLE: AppRole = 'salesperson';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  activeRole: AppRole | null;
  availableRoles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isInRoleMode: (role: AppRole) => boolean;
  isPlatformAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  viewAsUser: User | null;
  isViewingAs: boolean;
  startViewingAs: (userId: string, reason?: string) => Promise<void>;
  stopViewingAs: () => void;
  actualAdmin: User | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  roles: [],
  activeRole: null,
  availableRoles: [],
  hasRole: () => false,
  hasAnyRole: () => false,
  isInRoleMode: () => false,
  isPlatformAdmin: false,
  loading: true,
  signOut: async () => {},
  viewAsUser: null,
  isViewingAs: false,
  startViewingAs: async () => {},
  stopViewingAs: () => {},
  actualAdmin: null,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRole] = useState<AppRole | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewAsUser, setViewAsUser] = useState<User | null>(null);
  const [actualAdmin, setActualAdmin] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isViewingAs = viewAsUser !== null;

  const hasRole = (role: AppRole): boolean => roles?.includes(role) ?? false;
  const hasAnyRole = (checkRoles: AppRole[]): boolean => checkRoles.some(role => roles?.includes(role) ?? false);
  const isInRoleMode = (role: AppRole): boolean => activeRole === role;

  const fetchUserRoles = async (userId: string) => {
    try {
      // Direct query without timeout wrapper - let database handle it
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .is('revoked_at', null);

      if (error) {
        logger.error('[useAuth] Error fetching user roles, applying fallback role', error);
        setRoles([FALLBACK_ROLE]);
        setIsPlatformAdmin(false);
        setActiveRole(FALLBACK_ROLE);
        return;
      }

      const userRoles = data?.map(r => r.role as AppRole) || [];

      if (!userRoles.length) {
        logger.warn('[useAuth] No roles found for user, applying fallback role');
        setRoles([FALLBACK_ROLE]);
        setIsPlatformAdmin(false);
        setActiveRole(FALLBACK_ROLE);
        return;
      }

      setRoles(userRoles);
      setIsPlatformAdmin(userRoles.includes('platform_admin'));
      
      // Fetch active role
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('active_role')
        .eq('id', userId)
        .maybeSingle();
        
      if (profileData && !profileError) {
        setActiveRole(profileData.active_role as AppRole | null);
      } else {
        // If no active_role stored yet, default to the first available role
        setActiveRole(userRoles[0] as AppRole);
      }
    } catch (error) {
      console.error('[useAuth] Error in fetchUserRoles, applying fallback role:', error instanceof Error ? error.message : 'Unknown error');
      setRoles([FALLBACK_ROLE]);
      setIsPlatformAdmin(false);
      setActiveRole(FALLBACK_ROLE);
    }
  };

  useEffect(() => {
    // Check for existing "View As" session in localStorage
    const storedViewAs = localStorage.getItem('viewAsUserId');

    // Set up auth state listener with a synchronous callback (no Supabase calls here)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        const realUser = session?.user ?? null;

        if (realUser) {
          setActualAdmin(prev => prev ?? realUser);

          // Only override user when not currently viewing as someone else
          if (!viewAsUser) {
            setUser(realUser);
          }
        } else {
          // Clear auth-dependent state when no user is present
          setUser(null);
          setActualAdmin(null);
          setRoles([]);
          setActiveRole(null);
          setIsPlatformAdmin(false);
        }
      }
    );

    // Initial session check so we know whether a user is already signed in
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        setSession(session);
        const realUser = session?.user ?? null;

        if (realUser) {
          setActualAdmin(realUser);

          // Restore "View As" session if it exists
          if (storedViewAs) {
            try {
              await startViewingAs(storedViewAs);
            } catch (error) {
              console.error('Failed to restore view-as session:', error instanceof Error ? error.message : 'Unknown error');
              localStorage.removeItem('viewAsUserId');
              setUser(realUser);
            }
          } else {
            setUser(realUser);
          }
        } else {
          setUser(null);
        }
      })
      .catch((error) => {
        console.error('[useAuth] Error in initial session check:', error);
      })
      .finally(() => {
        // Mark that we've completed the initial auth check (user or not)
        setAuthInitialized(true);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Once auth has been initialised, load roles (or clear them) and resolve loading state
  useEffect(() => {
    const realUser = session?.user ?? null;

    // Don't change anything until we've completed the initial auth check
    if (!authInitialized) {
      return;
    }

    if (!realUser) {
      // No authenticated user – ensure all auth-dependent state is reset
      setRoles([]);
      setIsPlatformAdmin(false);
      setActiveRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadRoles = async () => {
      try {
        await fetchUserRoles(realUser.id);
      } catch (error) {
        console.error('[useAuth] Error loading roles:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [authInitialized, session?.user?.id]);

  // Add Esc key listener to exit View As mode
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isViewingAs) {
        stopViewingAs();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isViewingAs]);

  const startViewingAs = async (userId: string, reason?: string) => {
    try {
      // Call the edge function to log impersonation
      const { data: impersonationData, error: impersonationError } = await supabase.functions.invoke('start-impersonation', {
        body: { targetUserId: userId, reason: reason || 'No reason provided' },
      });

      if (impersonationError) throw impersonationError;

      // Fetch target user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Fetch target user roles
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('access_level')
        .eq('user_id', userId)
        .single();

      // Create synthetic User object
      const syntheticUser: User = {
        id: profile.id,
        email: profile.email || '',
        app_metadata: {},
        user_metadata: {
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User;

      setViewAsUser(syntheticUser);
      setUser(syntheticUser);
      
      // Keep platform admin true for the actual admin viewing as another user
      setIsPlatformAdmin(true);

      // Store in localStorage for persistence
      localStorage.setItem('viewAsUserId', userId);
      
      // Wait for React to process state updates before invalidating cache
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['team'] });
        queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      }, 100);
    } catch (error) {
      console.error('Error starting view-as:', error);
      throw error;
    }
  };

  const stopViewingAs = async () => {
    if (!actualAdmin) return;
    
    setViewAsUser(null);
    setUser(actualAdmin);
    localStorage.removeItem('viewAsUserId');
    
    // Wait for React to process state updates before invalidating cache
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['active-role'] });
    }, 100);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsPlatformAdmin(false);
    setViewAsUser(null);
    setActualAdmin(null);
    localStorage.removeItem('viewAsUserId');
    navigate('/auth');
  };

  // Use viewAsUser if viewing, otherwise use actual user
  const effectiveUser = viewAsUser || user;

  return (
    <AuthContext.Provider value={{ 
      user: effectiveUser, 
      session,
      roles,
      activeRole,
      availableRoles: roles,
      hasRole,
      hasAnyRole,
      isInRoleMode,
      isPlatformAdmin, 
      loading,
      signOut,
      viewAsUser,
      isViewingAs,
      startViewingAs,
      stopViewingAs,
      actualAdmin: actualAdmin || user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
