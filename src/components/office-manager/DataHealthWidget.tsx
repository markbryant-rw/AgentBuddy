import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDataHealth } from '@/hooks/useDataHealth';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';

export function DataHealthWidget() {
  const { activeOffice } = useOfficeSwitcher();
  const { data: issues = [], isLoading: loading, refetch } = useDataHealth(activeOffice?.id);
  const [repairing, setRepairing] = useState(false);

  const handleAutoRepair = async () => {
    setRepairing(true);
    try {
      const { data, error } = await supabase.rpc('auto_repair_team_assignments');
      
      if (error) throw error;
      
      const result = data as any;
      if (result && result.length > 0) {
        const repaired = result[0];
        toast.success(`Successfully repaired ${repaired.repaired_count} team assignment(s)`, {
          description: 'All team assignments have been corrected',
        });
        
        // Refresh issues
        await refetch();
      }
    } catch (error: any) {
      console.error('Error auto-repairing:', error);
      toast.error('Failed to repair team assignments', {
        description: error.message,
      });
    } finally {
      setRepairing(false);
    }
  };

  const criticalIssues = issues.filter(i => i.issue_type === 'missing_team_membership');
  const warningIssues = issues.filter(i => i.issue_type !== 'missing_team_membership');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {issues.length === 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              )}
              Data Health Monitor
            </CardTitle>
            <CardDescription>
              Automatic detection of team assignment issues
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : issues.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="font-medium text-green-900">All systems healthy</div>
              <div className="text-sm text-green-700">No team assignment issues detected</div>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {criticalIssues.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">
                    {criticalIssues.length} Critical Issue{criticalIssues.length > 1 ? 's' : ''}
                  </div>
                  <div className="text-sm mt-1">
                    Users with missing team memberships detected
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {warningIssues.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription>
                  <div className="font-medium text-amber-900">
                    {warningIssues.length} Warning{warningIssues.length > 1 ? 's' : ''}
                  </div>
                  <div className="text-sm text-amber-700 mt-1">
                    Minor team assignment inconsistencies detected
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <div className="text-sm font-medium">Detected Issues:</div>
              <div className="space-y-1">
                {issues.slice(0, 5).map((issue, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{issue.user_email}</div>
                      <div className="text-xs text-muted-foreground">
                        {issue.team_name} - {issue.description}
                      </div>
                    </div>
                    <Badge variant={issue.issue_type === 'missing_team_membership' ? 'destructive' : 'secondary'}>
                      {issue.issue_type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
                {issues.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center py-1">
                    +{issues.length - 5} more issue{issues.length - 5 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleAutoRepair}
              disabled={repairing}
              className="w-full"
            >
              {repairing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Repairing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Auto-Repair All Issues
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
