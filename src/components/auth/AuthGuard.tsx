import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * AuthGuard wraps the Auth page and redirects authenticated users
 * to the main workspace dashboard (/dashboard).
 * Users can then navigate to role-specific dashboards via the role switcher.
 */
export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  // If user is already authenticated, redirect to main workspace
  if (user && roles.length > 0) {
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise, render the auth page
  return <>{children}</>;
};

