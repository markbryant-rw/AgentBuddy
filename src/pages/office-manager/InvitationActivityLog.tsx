import { useState } from 'react';
import { useInvitationActivity } from '@/hooks/useInvitationActivity';
import { useOfficeTeamsUsers } from '@/hooks/useOfficeTeamsUsers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, 
  Mail, 
  UserPlus, 
  XCircle, 
  Clock, 
  RefreshCw,
  Download,
  Search,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function InvitationActivityLog() {
  const [activityType, setActivityType] = useState<string>('all');
  const [teamId, setTeamId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<string>('30');

  const { teams } = useOfficeTeamsUsers();
  
  const dateFrom = dateRange !== 'all' 
    ? new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000)
    : undefined;

  const { data: activities, isLoading } = useInvitationActivity({
    teamId: teamId === 'all' ? undefined : teamId,
    activityType: activityType === 'all' ? undefined : activityType,
    dateFrom,
    search: search || undefined,
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'sent':
      case 'reminder_sent':
        return <Mail className="h-4 w-4 text-purple-500" />;
      case 'accepted':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'revoked':
        return <XCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      created: 'Created',
      sent: 'Sent',
      reminder_sent: 'Reminder Sent',
      accepted: 'Accepted',
      failed: 'Failed',
      expired: 'Expired',
      revoked: 'Revoked',
    };
    return labels[type] || type;
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'accepted':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'revoked':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const exportToCSV = () => {
    if (!activities || activities.length === 0) return;

    const headers = ['Date', 'Type', 'Recipient Email', 'Actor', 'Team', 'Error Reason'];
    const rows = activities.map(activity => [
      format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm:ss'),
      getActivityLabel(activity.activity_type),
      activity.recipient_email,
      activity.actor?.full_name || 'System',
      activity.team?.name || 'None',
      activity.error_reason || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitation-activity-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const groupByDate = (activities: any[]) => {
    const groups: Record<string, any[]> = {};
    
    activities.forEach(activity => {
      const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold">Invitation Activity Log</h1>
          <p className="text-sm text-muted-foreground">
            Track all invitation-related activities and events
          </p>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        <Card className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Search Email</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-[180px]">
              <label className="text-sm font-medium mb-2 block">Activity Type</label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="reminder_sent">Reminder</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[180px]">
              <label className="text-sm font-medium mb-2 block">Team</label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[150px]">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={exportToCSV} disabled={!activities?.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </Card>

        <Card>
          <ScrollArea className="h-[calc(100vh-300px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !activities || activities.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No activity found matching your filters</p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {groupByDate(activities).map(([date, dateActivities]) => (
                  <div key={date}>
                    <h3 className="text-sm font-semibold mb-3 sticky top-0 bg-background py-2">
                      {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <div className="space-y-3 ml-4 border-l-2 border-border pl-4">
                      {dateActivities.map((activity) => (
                        <div
                          key={activity.id}
                          className="relative rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
                        >
                          <div className="absolute -left-[25px] top-4 bg-background p-1 rounded-full border">
                            {getActivityIcon(activity.activity_type)}
                          </div>
                          
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={getActivityColor(activity.activity_type)}>
                                  {getActivityLabel(activity.activity_type)}
                                </Badge>
                                <span className="text-sm font-medium truncate">
                                  {activity.recipient_email}
                                </span>
                              </div>
                              
                              <div className="text-sm text-muted-foreground space-y-1">
                                <p>
                                  By: <span className="font-medium">{activity.actor?.full_name || 'System'}</span>
                                  {activity.team && (
                                    <>
                                      {' • '}Team: <span className="font-medium">{activity.team.name}</span>
                                    </>
                                  )}
                                </p>
                                
                                {activity.error_reason && (
                                  <p className="text-destructive">
                                    Error: {activity.error_reason}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                              <p>{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}</p>
                              <p className="mt-1">{format(new Date(activity.created_at), 'h:mm a')}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
