import { useBackendHealth, HealthCheck } from '@/hooks/useBackendHealth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, RefreshCw, Wrench, Activity } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function PlatformAdminHealthDashboard() {
  const { data: healthChecks, isLoading, refetch } = useBackendHealth(null); // null = global view
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<HealthCheck | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({
      title: 'Health check refreshed',
      description: 'System health data has been updated.',
    });
  };

  const handleAutoFix = async (checkName: string) => {
    setIsFixing(true);
    try {
      const actionMap: Record<string, string> = {
        orphaned_profiles: 'archive_orphaned_profiles',
        expired_invitations: 'expire_old_invitations',
        invalid_invitations: 'remove_invalid_invitations',
      };

      const action = actionMap[checkName];
      if (!action) {
        toast({
          title: 'Auto-fix not available',
          description: 'This issue requires manual intervention.',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('fix-backend-health', {
        body: { action },
      });

      if (error) throw error;

      toast({
        title: 'Auto-fix completed',
        description: `Successfully fixed ${data.archived || data.expired || data.removed || 0} issues.`,
      });

      await refetch();
      queryClient.invalidateQueries({ queryKey: ['backend-health'] });
    } catch (error: any) {
      toast({
        title: 'Auto-fix failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsFixing(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, any> = {
      critical: 'destructive',
      warning: 'default',
      info: 'secondary',
      ok: 'secondary',
    };
    return (
      <Badge variant={variants[severity]}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getCheckTitle = (checkName: string) => {
    const titles: Record<string, string> = {
      orphaned_profiles: 'Orphaned Profiles',
      duplicate_emails: 'Duplicate Emails',
      invalid_invitations: 'Invalid Invitations',
      users_without_roles: 'Users Without Roles',
      expired_invitations: 'Expired Invitations',
      cross_office_assignments: 'Cross-Office Assignments',
      orphaned_team_members: 'Orphaned Team Members',
    };
    return titles[checkName] || checkName;
  };

  const getCheckDescription = (checkName: string) => {
    const descriptions: Record<string, string> = {
      orphaned_profiles: 'User profiles without corresponding authentication accounts',
      duplicate_emails: 'Multiple active profiles with the same email address',
      invalid_invitations: 'Invitations referencing non-existent teams or offices',
      users_without_roles: 'Active users who have not been assigned any system role',
      expired_invitations: 'Pending invitations that have passed their expiration date',
      cross_office_assignments: 'Users assigned to teams in different offices',
      orphaned_team_members: 'Team membership records with missing users or teams',
    };
    return descriptions[checkName] || '';
  };

  const criticalIssues = healthChecks?.filter(
    (check) => check.severity === 'critical' && check.issue_count > 0
  ) || [];
  const warningIssues = healthChecks?.filter(
    (check) => check.severity === 'warning' && check.issue_count > 0
  ) || [];
  const infoIssues = healthChecks?.filter(
    (check) => check.severity === 'info' && check.issue_count > 0
  ) || [];

  const totalIssues = criticalIssues.length + warningIssues.length + infoIssues.length;
  const healthScore = healthChecks 
    ? Math.round(((healthChecks.length - totalIssues) / healthChecks.length) * 100)
    : 100;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Global Health Dashboard</h1>
          <p className="text-muted-foreground">
            System-wide data integrity and health monitoring
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Health Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthScore}%</div>
            <p className="text-xs text-muted-foreground">
              {totalIssues === 0 ? 'All systems healthy' : `${totalIssues} issue${totalIssues > 1 ? 's' : ''} detected`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalIssues.length}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{warningIssues.length}</div>
            <p className="text-xs text-muted-foreground">Should be reviewed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Info</CardTitle>
            <Info className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{infoIssues.length}</div>
            <p className="text-xs text-muted-foreground">Informational items</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Issues Section */}
      {criticalIssues.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Critical Issues
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {criticalIssues.map((check) => (
              <Card key={check.check_name} className="border-destructive">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(check.severity)}
                      <CardTitle className="text-base">{getCheckTitle(check.check_name)}</CardTitle>
                    </div>
                    {getSeverityBadge(check.severity)}
                  </div>
                  <CardDescription>{getCheckDescription(check.check_name)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold text-destructive">
                    {check.issue_count} issue{check.issue_count > 1 ? 's' : ''}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCheck(check)}
                    >
                      View Details
                    </Button>
                    {['orphaned_profiles', 'expired_invitations', 'invalid_invitations'].includes(check.check_name) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleAutoFix(check.check_name)}
                        disabled={isFixing}
                      >
                        <Wrench className="h-3 w-3 mr-1" />
                        Auto-Fix
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Warning Issues Section */}
      {warningIssues.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Warnings
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {warningIssues.map((check) => (
              <Card key={check.check_name} className="border-yellow-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(check.severity)}
                      <CardTitle className="text-base">{getCheckTitle(check.check_name)}</CardTitle>
                    </div>
                    {getSeverityBadge(check.severity)}
                  </div>
                  <CardDescription>{getCheckDescription(check.check_name)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold text-yellow-600">
                    {check.issue_count} issue{check.issue_count > 1 ? 's' : ''}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCheck(check)}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Info Issues Section */}
      {infoIssues.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            Informational
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {infoIssues.map((check) => (
              <Card key={check.check_name} className="border-blue-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(check.severity)}
                      <CardTitle className="text-base">{getCheckTitle(check.check_name)}</CardTitle>
                    </div>
                    {getSeverityBadge(check.severity)}
                  </div>
                  <CardDescription>{getCheckDescription(check.check_name)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold text-blue-600">
                    {check.issue_count} item{check.issue_count > 1 ? 's' : ''}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCheck(check)}
                    >
                      View Details
                    </Button>
                    {check.check_name === 'expired_invitations' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAutoFix(check.check_name)}
                        disabled={isFixing}
                      >
                        <Wrench className="h-3 w-3 mr-1" />
                        Auto-Fix
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Clear Message */}
      {totalIssues === 0 && (
        <Card className="border-green-500">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-2xl font-semibold mb-2">All Systems Healthy</h3>
            <p className="text-muted-foreground text-center">
              No data integrity issues detected. Your system is running smoothly.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedCheck} onOpenChange={() => setSelectedCheck(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCheck && getSeverityIcon(selectedCheck.severity)}
              {selectedCheck && getCheckTitle(selectedCheck.check_name)}
            </DialogTitle>
            <DialogDescription>
              {selectedCheck && getCheckDescription(selectedCheck.check_name)}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-2">
              {selectedCheck && selectedCheck.details && Array.isArray(selectedCheck.details) ? (
                selectedCheck.details.map((detail: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 rounded-lg border bg-muted/50 text-sm"
                  >
                    <pre className="whitespace-pre-wrap font-mono text-xs">
                      {JSON.stringify(detail, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No detailed information available.</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
