import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useProfile } from '@/hooks/useProfile';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, X } from 'lucide-react';

export const DiagnosticPanel = () => {
  const { user } = useAuth();
  const { team, loading: teamLoading, refreshTeam } = useTeam();
  const { profile, loading: profileLoading, refreshProfile } = useProfile();
  
  const handleRefresh = () => {
    refreshProfile();
    refreshTeam();
  };
  
  // Persistent collapsed state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('debug-panel-collapsed');
    return saved === 'true';
  });

  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    localStorage.setItem('debug-panel-collapsed', String(isCollapsed));
  }, [isCollapsed]);
  
  // Only show in development
  if (import.meta.env.PROD || isHidden) return null;

  // Minimized state - just a small pill
  if (isCollapsed) {
    return (
      <Button
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-4 right-4 z-40 h-10 px-3 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 border-yellow-300 text-yellow-900 dark:text-yellow-100 shadow-lg"
        variant="outline"
        size="sm"
      >
        <AlertCircle className="h-4 w-4 mr-2" />
        Debug
        <ChevronUp className="h-4 w-4 ml-2" />
      </Button>
    );
  }
  
  return (
    <Card className="fixed bottom-4 right-4 p-4 max-w-sm bg-yellow-50 dark:bg-yellow-950 border-yellow-300 shadow-lg z-40">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-5 w-5 text-yellow-600" />
        <h3 className="font-bold text-sm flex-1">Debug Info</h3>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          title="Refresh data"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </Button>
        <Button
          onClick={() => setIsCollapsed(true)}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button
          onClick={() => setIsHidden(true)}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          {user?.id ? (
            <CheckCircle className="h-3 w-3 text-green-600" />
          ) : (
            <AlertCircle className="h-3 w-3 text-red-600" />
          )}
          <span>User: {user?.id?.slice(0, 8) || '❌ Missing'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {user?.email ? (
            <CheckCircle className="h-3 w-3 text-green-600" />
          ) : (
            <AlertCircle className="h-3 w-3 text-red-600" />
          )}
          <span>Email: {user?.email || '❌ Missing'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {team?.id ? (
            <CheckCircle className="h-3 w-3 text-green-600" />
          ) : teamLoading ? (
            <AlertCircle className="h-3 w-3 text-yellow-600" />
          ) : (
            <AlertCircle className="h-3 w-3 text-red-600" />
          )}
          <span>Team: {teamLoading ? '⏳ Loading...' : team?.name || '❌ Missing'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {profile?.primary_team_id ? (
            <CheckCircle className="h-3 w-3 text-green-600" />
          ) : profileLoading ? (
            <AlertCircle className="h-3 w-3 text-yellow-600" />
          ) : (
            <AlertCircle className="h-3 w-3 text-red-600" />
          )}
          <span>Primary Team: {profileLoading ? '⏳ Loading...' : (profile?.primary_team_id?.slice(0, 8) || '❌ Missing')}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {profile?.office_id ? (
            <CheckCircle className="h-3 w-3 text-green-600" />
          ) : profileLoading ? (
            <AlertCircle className="h-3 w-3 text-yellow-600" />
          ) : (
            <AlertCircle className="h-3 w-3 text-red-600" />
          )}
          <span>Office: {profileLoading ? '⏳ Loading...' : (profile?.office_id?.slice(0, 8) || '❌ Missing')}</span>
        </div>
      </div>
    </Card>
  );
};
