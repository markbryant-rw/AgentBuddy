import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle, RefreshCw, User, Mail } from 'lucide-react';
import { useDataHealth } from '@/hooks/useDataHealth';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function DataHealthDashboard() {
  const { activeOffice } = useOfficeSwitcher();
  const { data: issues = [], isLoading, refetch } = useDataHealth(activeOffice?.id);
  const [repairing, setRepairing] = useState(false);

  const handleAutoRepair = async () => {
    setRepairing(true);
    try {
      const { data, error } = await supabase.rpc('auto_repair_team_assignments');
      
      if (error) throw error;
      
      const result = data as any;
      if (result && result.length > 0) {
        const repaired = result[0];
        toast.success(`Successfully repaired ${repaired.repaired_count} issue(s)`, {
          description: 'All team assignments have been corrected',
        });
        
        await refetch();
      } else {
        toast.info('No issues found to repair');
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

  const getIssueTypeLabel = (issueType: string) => {
    switch (issueType) {
      case 'missing_team_membership':
        return 'Missing Team Membership';
      case 'missing_primary_team':
        return 'Missing Primary Team';
      case 'invitation_mismatch':
        return 'Invitation Mismatch';
      default:
        return issueType;
    }
  };

  const getIssueTypeDescription = (issueType: string) => {
    switch (issueType) {
      case 'missing_team_membership':
        return 'User has a primary team set but is not a member of that team';
      case 'missing_primary_team':
        return 'User is a team member but has no primary team set';
      case 'invitation_mismatch':
        return 'User accepted invitation but is not in the team';
      default:
        return '';
    }
  };

  const getIssueTypeSeverity = (issueType: string) => {
    switch (issueType) {
      case 'missing_team_membership':
        return 'critical';
      case 'missing_primary_team':
        return 'warning';
      case 'invitation_mismatch':
        return 'warning';
      default:
        return 'warning';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Health Dashboard</CardTitle>
          <CardDescription>Checking data integrity...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalIssues = issues.filter(i => getIssueTypeSeverity(i.issue_type) === 'critical');
  const warningIssues = issues.filter(i => getIssueTypeSeverity(i.issue_type) === 'warning');
  const hasIssues = issues.length > 0;

  // Group issues by type
  const issuesByType = issues.reduce((acc, issue) => {
    if (!acc[issue.issue_type]) {
      acc[issue.issue_type] = [];
    }
    acc[issue.issue_type].push(issue);
    return acc;
  }, {} as Record<string, typeof issues>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            {hasIssues ? (
              <AlertTriangle className="h-5 w-5 text-warning" />
            ) : (
              <CheckCircle className="h-5 w-5 text-success" />
            )}
            Data Health Dashboard
          </CardTitle>
          <CardDescription>
            {activeOffice 
              ? `Monitoring ${activeOffice.name} - ${issues.length} issue(s) found`
              : 'Select an office to monitor data health'
            }
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {hasIssues && (
            <Button
              size="sm"
              onClick={handleAutoRepair}
              disabled={repairing}
            >
              {repairing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Repairing...
                </>
              ) : (
                'Auto-Repair All'
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasIssues ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-16 w-16 text-success mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Systems Healthy</h3>
            <p className="text-sm text-muted-foreground">
              No data integrity issues detected for this office
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    Critical Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-destructive">
                    {criticalIssues.length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Require immediate attention
                  </p>
                </CardContent>
              </Card>

              <Card className="border-warning/50 bg-warning/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-warning">
                    {warningIssues.length}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Should be addressed soon
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Issues by Type */}
            <div className="space-y-4">
              {Object.entries(issuesByType).map(([issueType, typeIssues]) => (
                <Card key={issueType}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {getIssueTypeSeverity(issueType) === 'critical' ? (
                            <AlertCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-warning" />
                          )}
                          {getIssueTypeLabel(issueType)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {getIssueTypeDescription(issueType)}
                        </CardDescription>
                      </div>
                      <Badge variant={getIssueTypeSeverity(issueType) === 'critical' ? 'destructive' : 'secondary'}>
                        {typeIssues.length} {typeIssues.length === 1 ? 'issue' : 'issues'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {typeIssues.map((issue, index) => (
                          <div
                            key={issue.user_email}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm font-medium">{issue.user_email}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Team: <span className="font-medium">{issue.team_name}</span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {issue.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
