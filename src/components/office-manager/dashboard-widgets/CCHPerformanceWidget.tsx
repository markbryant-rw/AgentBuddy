import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, AlertCircle, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useOfficeStats } from '@/hooks/useOfficeStats';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';

export const CCHPerformanceWidget = () => {
  const navigate = useNavigate();
  const { activeOffice } = useOfficeSwitcher();
  const { officeData, loading } = useOfficeStats(activeOffice?.id);

  const totalCCH = officeData?.teams.reduce((sum, t) => sum + t.teamCCH, 0) || 0;
  const avgCCH = officeData?.teams.reduce((sum, t) => sum + t.avgCCH, 0) / (officeData?.teams.length || 1) || 0;
  const topTeam = officeData?.teams[0]; // Already sorted by avgCCH

  return (
    <Card 
      className="cursor-pointer transition-all hover:shadow-lg border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-background"
      onClick={() => navigate('/office-manager/performance')}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            CCH Performance
          </CardTitle>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            {totalCCH.toFixed(1)}
          </Badge>
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
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold">{totalCCH.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Total CCH This Week</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-sm font-medium">Avg per Team</p>
                  <p className="text-lg font-semibold">{avgCCH.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">Top Team</p>
                  <p className="text-sm text-muted-foreground truncate max-w-[120px]">
                    {topTeam?.name || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            {(officeData?.teams.filter(t => t.avgCCH < 10).length || 0) > 0 && (
              <div className="mt-3 pt-3 border-t">
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {officeData?.teams.filter(t => t.avgCCH < 10).length} team(s) below target
                </Badge>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
