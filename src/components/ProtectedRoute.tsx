import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { checkRouteAccess } from '@/config/routePermissions';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, roles, loading } = useAuth();
  const location = useLocation();

  // Show loading state while authentication is being established
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

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Note: We removed the "empty roles" skeleton check because useAuth now guarantees
  // roles will always have at least a fallback role, preventing infinite skeleton states

  // Check if user has access to the current route
  const hasAccess = checkRouteAccess(location.pathname, roles || []);
  
  if (!hasAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
};
