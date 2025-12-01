import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOfficeStats } from '@/hooks/useOfficeStats';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';

export const TeamOverviewWidget = () => {
  const navigate = useNavigate();
  const { activeOffice } = useOfficeSwitcher();
  const { officeData, loading } = useOfficeStats(activeOffice?.id);

  // Count unique users across all teams (users may be on multiple teams)
  const uniqueUserIds = new Set(
    officeData?.teams.flatMap(t => t.members.map(m => m.user_id)) || []
  );
  const totalMembers = uniqueUserIds.size;
  const totalTeams = officeData?.teams.length || 0;

  return (
    <Card 
      className="transition-all hover:shadow-lg cursor-pointer border-l-4 border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background"
      onClick={() => navigate('/office-manager/teams-users')}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Team & Users
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800">
                <Building2 className="h-6 w-6 mx-auto mb-2 text-indigo-600" />
                <p className="text-3xl font-bold text-indigo-600">{totalTeams}</p>
                <p className="text-sm text-muted-foreground">Teams</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800">
                <Users className="h-6 w-6 mx-auto mb-2 text-indigo-600" />
                <p className="text-3xl font-bold text-indigo-600">{totalMembers}</p>
                <p className="text-sm text-muted-foreground">Users</p>
              </div>
            </div>
            
            <p className="text-xs text-center text-muted-foreground mt-4">
              Click to manage teams & users
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
