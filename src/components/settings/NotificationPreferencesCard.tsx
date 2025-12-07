import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Bell, Mail, Users, Home, CheckSquare, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function NotificationPreferencesCard() {
  const { preferences, isLoading, updatePreferences, isUpdating } = useNotificationPreferences();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const notificationTypes = [
    {
      key: 'notify_team_member_joined' as const,
      label: 'Team member joined',
      description: 'When a new member joins your team',
      icon: Users,
    },
    {
      key: 'notify_listing_stage_signed' as const,
      label: 'Listing signed',
      description: 'When a listing agreement is signed',
      icon: Home,
    },
    {
      key: 'notify_listing_stage_live' as const,
      label: 'Listing goes live',
      description: 'When a listing becomes active on market',
      icon: Home,
    },
    {
      key: 'notify_listing_stage_contract' as const,
      label: 'Under contract',
      description: 'When a property goes under contract',
      icon: Home,
    },
    {
      key: 'notify_listing_stage_unconditional' as const,
      label: 'Unconditional',
      description: 'When a deal goes unconditional',
      icon: Home,
    },
    {
      key: 'notify_listing_stage_settled' as const,
      label: 'Settled',
      description: 'When a property settlement completes',
      icon: Home,
    },
    {
      key: 'notify_task_assigned' as const,
      label: 'Task assigned',
      description: 'When a task is assigned to you',
      icon: CheckSquare,
    },
    {
      key: 'notify_task_due_soon' as const,
      label: 'Task due soon',
      description: 'Reminder when tasks are approaching due date',
      icon: Clock,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
        <CardDescription>
          Control which notifications you receive in-app and via email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* In-App Notifications */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-semibold">In-App Notifications</Label>
          </div>

          <div className="space-y-3 pl-6">
            {notificationTypes.map((type) => (
              <div key={type.key} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm">{type.label}</Label>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
                <Switch
                  checked={preferences[type.key]}
                  onCheckedChange={(checked) => updatePreferences({ [type.key]: checked })}
                  disabled={isUpdating}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-semibold">Push Notifications</Label>
              <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            Browser push notifications will be available in a future update.
          </p>
        </div>

        {/* Email Digest */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-semibold">Email Digest</Label>
          </div>

          <div className="space-y-4 pl-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Enable email digest</Label>
                <p className="text-xs text-muted-foreground">
                  Receive a summary of unread notifications
                </p>
              </div>
              <Switch
                checked={preferences.email_digest_enabled}
                onCheckedChange={(checked) => updatePreferences({ email_digest_enabled: checked })}
                disabled={isUpdating}
              />
            </div>

            {preferences.email_digest_enabled && (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Frequency</Label>
                    <p className="text-xs text-muted-foreground">
                      How often to send digest emails
                    </p>
                  </div>
                  <Select
                    value={preferences.email_digest_frequency}
                    onValueChange={(value: 'daily' | 'weekly' | 'none') => 
                      updatePreferences({ email_digest_frequency: value })
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="none">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Delivery time</Label>
                    <p className="text-xs text-muted-foreground">
                      When to send the digest (your local time)
                    </p>
                  </div>
                  <Select
                    value={String(preferences.email_digest_hour)}
                    onValueChange={(value) => 
                      updatePreferences({ email_digest_hour: parseInt(value) })
                    }
                    disabled={isUpdating}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
