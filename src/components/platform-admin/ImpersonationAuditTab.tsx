import { useState } from 'react';
import { useImpersonationAudit, useImpersonationStats } from '@/hooks/useImpersonationAudit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, Users, Activity, Search } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { ImpersonationLog } from '@/hooks/useImpersonationAudit';

export const ImpersonationAuditTab = () => {
  const { data: logs = [], isLoading } = useImpersonationAudit();
  const { data: stats } = useImpersonationStats();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<ImpersonationLog | null>(null);

  const filteredLogs = logs.filter((log) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      log.admin_name.toLowerCase().includes(searchLower) ||
      log.admin_email.toLowerCase().includes(searchLower) ||
      log.target_name.toLowerCase().includes(searchLower) ||
      log.target_email.toLowerCase().includes(searchLower) ||
      log.reason.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSessions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Impersonated</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">
              {stats?.mostImpersonatedUser || 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Active Admin</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">
              {stats?.mostActiveAdmin || 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>
            Search and filter impersonation sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by admin, user, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Impersonated User</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No impersonation sessions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={log.admin_avatar || ''} />
                            <AvatarFallback>
                              {log.admin_name.split(' ').map((n) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{log.admin_name}</span>
                            <span className="text-xs text-muted-foreground">{log.admin_email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={log.target_avatar || ''} />
                            <AvatarFallback>
                              {log.target_name.split(' ').map((n) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{log.target_name}</span>
                            <span className="text-xs text-muted-foreground">{log.target_email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{log.reason}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(log.started_at), 'MMM d, yyyy HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {log.is_active
                            ? 'Ongoing'
                            : log.duration_minutes
                            ? `${log.duration_minutes} min`
                            : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.is_active ? 'default' : 'secondary'}>
                          {log.is_active ? 'Active' : 'Ended'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          {selectedLog && (
            <>
              <SheetHeader>
                <SheetTitle>Impersonation Session Details</SheetTitle>
                <SheetDescription>
                  Complete information about this session
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-2">Administrator</h3>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedLog.admin_avatar || ''} />
                      <AvatarFallback>
                        {selectedLog.admin_name.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedLog.admin_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedLog.admin_email}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Impersonated User</h3>
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedLog.target_avatar || ''} />
                      <AvatarFallback>
                        {selectedLog.target_name.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{selectedLog.target_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedLog.target_email}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Reason</h3>
                  <p className="text-sm p-3 rounded-lg border bg-muted/50">
                    {selectedLog.reason}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Started At</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedLog.started_at), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedLog.started_at), 'HH:mm:ss')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Ended At</h3>
                    {selectedLog.ended_at ? (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(selectedLog.ended_at), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(selectedLog.ended_at), 'HH:mm:ss')}
                        </p>
                      </>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </div>
                </div>

                {selectedLog.duration_minutes !== null && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Duration</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedLog.duration_minutes} minutes
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
