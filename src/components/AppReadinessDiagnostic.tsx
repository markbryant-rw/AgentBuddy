import { useAppReadiness } from '@/contexts/AppReadinessContext';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTeam } from '@/hooks/useTeam';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

export const AppReadinessDiagnostic = () => {
  const { state, isReady } = useAppReadiness();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { team, loading: teamLoading } = useTeam();
  const { activeOffice, isLoading: officeLoading } = useOfficeSwitcher();

  const getStateColor = (state: string) => {
    switch (state) {
      case 'ready': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'loading': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'no_team':
      case 'no_office':
      case 'no_profile': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'error': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'ready': return <CheckCircle2 className="w-4 h-4" />;
      case 'loading': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'no_team':
      case 'no_office':
      case 'no_profile': return <AlertCircle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">App Readiness</CardTitle>
          <Badge className={getStateColor(state)}>
            <div className="flex items-center gap-1">
              {getStateIcon(state)}
              <span className="uppercase text-xs">{state.replace('_', ' ')}</span>
            </div>
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Debug: Data context status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Auth:</span>
          <span className="font-medium">
            {authLoading ? '⏳ Loading...' : user ? '✓ Logged in' : '✗ No user'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Profile:</span>
          <span className="font-medium">
            {profileLoading ? '⏳ Loading...' : profile ? '✓ Loaded' : '✗ Missing'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Team ID:</span>
          <span className="font-medium font-mono text-xs">
            {teamLoading ? '⏳' : profile?.primary_team_id ? profile.primary_team_id.slice(0, 8) : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Team Data:</span>
          <span className="font-medium">
            {teamLoading ? '⏳ Loading...' : team ? '✓ Loaded' : '✗ None'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Office:</span>
          <span className="font-medium">
            {officeLoading ? '⏳ Loading...' : activeOffice ? '✓ Selected' : '—'}
          </span>
        </div>
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-semibold">Ready:</span>
            <span className="font-bold">
              {isReady ? '✓ YES' : '✗ NO'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
