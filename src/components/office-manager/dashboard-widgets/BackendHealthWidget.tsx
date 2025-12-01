import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBackendHealth, HealthCheck } from '@/hooks/useBackendHealth';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, RefreshCw, Wrench } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export const BackendHealthWidget = () => {
  const { activeOffice } = useOfficeSwitcher();
  const { data: healthChecks, isLoading, refetch } = useBackendHealth(activeOffice?.id);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState<HealthCheck | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
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

  const criticalIssues = healthChecks?.filter(
    (check) => check.severity === 'critical' && check.issue_count > 0
  ) || [];
  const warningIssues = healthChecks?.filter(
    (check) => check.severity === 'warning' && check.issue_count > 0
  ) || [];
  const totalIssues = criticalIssues.length + warningIssues.length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Backend Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Backend Health
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {totalIssues === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">All Systems Operational</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">{totalIssues} Issues Detected</span>
            </div>
          )}

          {criticalIssues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-destructive">Critical Issues</h4>
              {criticalIssues.map((check) => (
                <div
                  key={check.check_name}
                  className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    {getSeverityIcon(check.severity)}
                    <div>
                      <p className="text-sm font-medium">{getCheckTitle(check.check_name)}</p>
                      <p className="text-xs text-muted-foreground">
                        {check.issue_count} issue{check.issue_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {['orphaned_profiles', 'expired_invitations', 'invalid_invitations'].includes(
                      check.check_name
                    ) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAutoFix(check.check_name)}
                        disabled={isFixing}
                      >
                        Auto-Fix
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedCheck(check)}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {warningIssues.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-yellow-600">Warnings</h4>
              {warningIssues.map((check) => (
                <div
                  key={check.check_name}
                  className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950"
                >
                  <div className="flex items-center gap-3">
                    {getSeverityIcon(check.severity)}
                    <div>
                      <p className="text-sm font-medium">{getCheckTitle(check.check_name)}</p>
                      <p className="text-xs text-muted-foreground">
                        {check.issue_count} issue{check.issue_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedCheck(check)}
                  >
                    Details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedCheck} onOpenChange={() => setSelectedCheck(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCheck && getSeverityIcon(selectedCheck.severity)}
              {selectedCheck && getCheckTitle(selectedCheck.check_name)}
            </DialogTitle>
            <DialogDescription>
              {selectedCheck?.issue_count} issue{selectedCheck?.issue_count !== 1 ? 's' : ''} found
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              {selectedCheck?.details?.map((detail: any, idx: number) => (
                <div
                  key={idx}
                  className="rounded-lg border bg-card p-3 text-sm"
                >
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {JSON.stringify(detail, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
