import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Moon, Sun, Monitor, Bell, BellOff } from 'lucide-react';
import { useTheme } from 'next-themes';

export const PreferencesCard = () => {
  const { preferences, updatePreferences, loading } = useUserPreferences();
  const { setTheme, theme: currentTheme } = useTheme();

  const handleThemeChange = (value: string) => {
    setTheme(value);
    updatePreferences({ theme: value as 'light' | 'dark' | 'system' });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-7 bg-muted rounded w-32 animate-pulse" />
          <div className="h-4 bg-muted rounded w-64 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferences</CardTitle>
        <CardDescription>Customize your experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div className="space-y-2">
          <Label>Theme</Label>
          <Select value={currentTheme || 'system'} onValueChange={handleThemeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Light
                </div>
              </SelectItem>
              <SelectItem value="dark">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Dark
                </div>
              </SelectItem>
              <SelectItem value="system">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  System
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Choose your preferred color theme
          </p>
        </div>

        {/* Notification Preferences */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-semibold">Notifications</Label>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Friend Check-ins</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when friends log their KPIs
              </p>
            </div>
            <Switch
              checked={preferences.notify_friend_checkin}
              onCheckedChange={(checked) =>
                updatePreferences({ notify_friend_checkin: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Conversation Shares</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when teammates share conversations
              </p>
            </div>
            <Switch
              checked={preferences.notify_conversation_share}
              onCheckedChange={(checked) =>
                updatePreferences({ notify_conversation_share: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive notifications via email
              </p>
            </div>
            <Switch
              checked={preferences.notify_email}
              onCheckedChange={(checked) =>
                updatePreferences({ notify_email: checked })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
