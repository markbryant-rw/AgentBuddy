import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Home, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RoleBadge } from '@/components/RoleBadge';
import type { AppRole } from '@/lib/rbac';

export default function AccessDenied() {
  const navigate = useNavigate();
  const { roles, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
                <Lock className="h-10 w-10 text-primary" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-5 w-5 text-primary/60" />
              </div>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-semibold">Almost There!</CardTitle>
            <CardDescription className="text-base mt-2">
              This page isn't available with your current role
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-sm font-medium text-foreground mb-3">Your current role{roles.length > 1 ? 's' : ''}:</p>
            <div className="flex flex-wrap gap-2">
              {roles.length > 0 ? (
                roles.map((role) => (
                  <RoleBadge key={role} role={role as AppRole} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No roles assigned yet</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
              size="lg"
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button 
              onClick={signOut}
              variant="outline" 
              className="w-full"
              size="lg"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Need access? Contact your team administrator
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
