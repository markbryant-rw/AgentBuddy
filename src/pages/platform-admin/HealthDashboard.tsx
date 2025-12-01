import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle, RefreshCw, User, Mail, UserX } from 'lucide-react';
import { useDataHealth } from '@/hooks/useDataHealth';
import { useUsersWithoutRoles } from '@/hooks/useUsersWithoutRoles';
import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AssignRoleDialog } from '@/components/platform-admin/AssignRoleDialog';

export default function HealthDashboard() {
  const { data: teamIssues = [], isLoading: isLoadingTeams, refetch: refetchTeams } = useDataHealth(null);
  const { data: usersWithoutRoles = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useUsersWithoutRoles();
  const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; name: string } | null>(null);

  const isLoading = isLoadingTeams || isLoadingUsers;
  const totalIssues = teamIssues.length + usersWithoutRoles.length;
  const hasIssues = totalIssues > 0;

  const handleAssignRole = (userId: string, email: string, name: string) => {
    setSelectedUser({ id: userId, email, name });
    setAssignRoleDialogOpen(true);
  };

  const handleRefresh = () => {
    refetchTeams();
    refetchUsers();
  };

  if (isLoading) {
    return (
      <div className="p-6">
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
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
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
              Platform-wide data integrity monitoring - {totalIssues} issue(s) found
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {!hasIssues ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-16 w-16 text-success mb-4" />
              <h3 className="text-lg font-semibold mb-2">All Systems Healthy</h3>
              <p className="text-sm text-muted-foreground">
                No data integrity issues detected across the platform
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserX className="h-5 w-5 text-orange-600" />
                      Users Without Roles
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">
                      {usersWithoutRoles.length}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Active users without system roles
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-warning/50 bg-warning/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      Team Assignment Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-warning">
                      {teamIssues.length}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Team membership problems
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Users Without Roles */}
              {usersWithoutRoles.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <UserX className="h-5 w-5 text-orange-600" />
                          Users Without Roles
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Active users who have not been assigned any system role
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                        {usersWithoutRoles.length} {usersWithoutRoles.length === 1 ? 'user' : 'users'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {usersWithoutRoles.map((user) => (
                          <div
                            key={user.user_id}
                            className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{user.full_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">{user.email}</span>
                                </div>
                                {!user.office_id && (
                                  <Badge variant="outline" className="text-xs">
                                    No Office Assigned
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleAssignRole(user.user_id, user.email, user.full_name)}
                            >
                              Assign Role
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Team Issues */}
              {teamIssues.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-warning" />
                          Team Assignment Issues
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Problems with team memberships and assignments
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {teamIssues.length} {teamIssues.length === 1 ? 'issue' : 'issues'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {teamIssues.map((issue, index) => (
                          <div
                            key={index}
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
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <AssignRoleDialog
          open={assignRoleDialogOpen}
          onOpenChange={setAssignRoleDialogOpen}
          userId={selectedUser.id}
          userEmail={selectedUser.email}
          userName={selectedUser.name}
        />
      )}
    </div>
  );
}
