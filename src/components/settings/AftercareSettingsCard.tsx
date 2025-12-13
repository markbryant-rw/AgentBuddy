import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Heart, Calendar, Mail, Bell, Clock } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Badge } from '@/components/ui/badge';

const TASK_TYPES = [
  { id: 'phone_call', label: 'Phone Calls', description: 'Regular check-in calls' },
  { id: 'email', label: 'Emails', description: 'Email touchpoints' },
  { id: 'card', label: 'Cards', description: 'Physical cards (birthday, anniversary)' },
  { id: 'gift', label: 'Gifts', description: 'Thank you gifts and hampers' },
  { id: 'visit', label: 'Visits', description: 'In-person visits' },
  { id: 'review_request', label: 'Review Requests', description: 'Requests for testimonials' },
];

export function AftercareSettingsCard() {
  const { preferences, updatePreferences, isUpdating } = useNotificationPreferences();

  const reminderDays = preferences.aftercare_reminder_days ?? 3;
  const emailEnabled = preferences.aftercare_email_enabled ?? true;
  const calendarSync = preferences.aftercare_calendar_sync ?? true;
  const excludedTypes = preferences.aftercare_excluded_task_types ?? [];

  const handleReminderDaysChange = (value: number[]) => {
    updatePreferences({ aftercare_reminder_days: value[0] });
  };

  const handleExcludedTypeToggle = (typeId: string, checked: boolean) => {
    const newExcluded = checked
      ? excludedTypes.filter(t => t !== typeId)
      : [...excludedTypes, typeId];
    updatePreferences({ aftercare_excluded_task_types: newExcluded });
  };

  const getReminderPresetLabel = (days: number) => {
    if (days === 1) return 'Day before';
    if (days === 3) return '3 days (recommended)';
    if (days === 7) return '1 week';
    if (days === 14) return '2 weeks';
    return `${days} days`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/10 to-rose-500/10">
            <Heart className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Aftercare Settings</CardTitle>
            <CardDescription>
              Customize how aftercare tasks are scheduled and reminded
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reminder Timing */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label className="font-medium">Reminder Timing</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            How many days before an aftercare task is due should you receive a reminder?
          </p>
          <div className="space-y-3">
            <Slider
              value={[reminderDays]}
              onValueChange={handleReminderDaysChange}
              min={1}
              max={14}
              step={1}
              disabled={isUpdating}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 day</span>
              <Badge variant="secondary" className="text-xs">
                {getReminderPresetLabel(reminderDays)}
              </Badge>
              <span>14 days</span>
            </div>
          </div>
          {/* Quick preset buttons */}
          <div className="flex gap-2">
            {[1, 3, 7, 14].map(days => (
              <button
                key={days}
                onClick={() => handleReminderDaysChange([days])}
                disabled={isUpdating}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  reminderDays === days
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {days === 1 ? '1 day' : days === 7 ? '1 week' : `${days} days`}
              </button>
            ))}
          </div>
        </div>

        {/* Email Notifications */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="aftercare-email" className="font-medium">
                Anniversary Emails
              </Label>
            </div>
            <Switch
              id="aftercare-email"
              checked={emailEnabled}
              onCheckedChange={(checked) => updatePreferences({ aftercare_email_enabled: checked })}
              disabled={isUpdating}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Automatically send personalized anniversary emails to past clients on their settlement anniversaries.
          </p>
        </div>

        {/* Calendar Sync */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="aftercare-calendar" className="font-medium">
                Google Calendar Sync
              </Label>
            </div>
            <Switch
              id="aftercare-calendar"
              checked={calendarSync}
              onCheckedChange={(checked) => updatePreferences({ aftercare_calendar_sync: checked })}
              disabled={isUpdating}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Sync aftercare tasks to your Google Calendar for easy scheduling.
          </p>
        </div>

        {/* Task Type Opt-outs */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <Label className="font-medium">Task Types</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose which types of aftercare tasks you want to receive. Uncheck to opt-out.
          </p>
          <div className="grid gap-3 mt-3">
            {TASK_TYPES.map(type => {
              const isIncluded = !excludedTypes.includes(type.id);
              return (
                <div 
                  key={type.id} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`task-type-${type.id}`}
                    checked={isIncluded}
                    onCheckedChange={(checked) => handleExcludedTypeToggle(type.id, !!checked)}
                    disabled={isUpdating}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={`task-type-${type.id}`} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
