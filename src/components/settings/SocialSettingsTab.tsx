import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSocialPreferences } from "@/hooks/useSocialPreferences";
import { useProfile } from "@/hooks/useProfile";
import { Input } from "@/components/ui/input";

const SocialSettingsTab = () => {
  const { preferences, updatePreferences, isUpdating } = useSocialPreferences();
  const { profile, updateProfile } = useProfile();

  const handleReflectionToggle = (enabled: boolean) => {
    updatePreferences({
      reflectionReminders: {
        ...preferences.reflectionReminders,
        enabled
      }
    });
  };

  const handleReflectionDayChange = (day: string) => {
    updatePreferences({
      reflectionReminders: {
        ...preferences.reflectionReminders,
        day: day as any
      }
    });
  };

  const handleReflectionTimeChange = (time: string) => {
    updatePreferences({
      reflectionReminders: {
        ...preferences.reflectionReminders,
        time
      }
    });
  };

  const handleDefaultVisibilityChange = (visibility: string) => {
    updatePreferences({
      defaultPostVisibility: visibility as any
    });
  };

  const handleBirthdayVisibilityChange = (visibility: string) => {
    // Update birthday_visibility in profiles table directly
    updateProfile({ birthday_visibility: visibility as any });
  };

  const handleNotificationToggle = (key: keyof typeof preferences.notifications, value: boolean) => {
    updatePreferences({
      notifications: {
        ...preferences.notifications,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Weekly Reflection Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Reflection Reminders</CardTitle>
          <CardDescription>
            Configure when you'd like to receive reminders to share your weekly reflection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reflection-enabled">Enable Reminders</Label>
              <p className="text-sm text-muted-foreground">
                You'll receive a notification to share your weekly reflection
              </p>
            </div>
            <Switch
              id="reflection-enabled"
              checked={preferences.reflectionReminders.enabled}
              onCheckedChange={handleReflectionToggle}
              disabled={isUpdating}
            />
          </div>

          {preferences.reflectionReminders.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reflection-day">Day of Week</Label>
                <Select
                  value={preferences.reflectionReminders.day}
                  onValueChange={handleReflectionDayChange}
                  disabled={isUpdating}
                >
                  <SelectTrigger id="reflection-day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="tuesday">Tuesday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="thursday">Thursday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                    <SelectItem value="saturday">Saturday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reflection-time">Time</Label>
                <Input
                  id="reflection-time"
                  type="time"
                  value={preferences.reflectionReminders.time}
                  onChange={(e) => handleReflectionTimeChange(e.target.value)}
                  disabled={isUpdating}
                />
                <p className="text-sm text-muted-foreground">
                  Time is shown in your local timezone
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Birthday Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>Birthday Visibility</CardTitle>
          <CardDescription>
            Control who can see your birthday and celebrate with you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.birthday && (
            <div className="text-sm text-muted-foreground mb-4">
              Your birthday: {new Date(profile.birthday).toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          )}

          <RadioGroup
            value={profile?.birthday_visibility || 'team_only'}
            onValueChange={handleBirthdayVisibilityChange}
            disabled={isUpdating}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="public" id="birthday-public" />
              <Label htmlFor="birthday-public" className="font-normal">
                <div>Public</div>
                <p className="text-sm text-muted-foreground">Everyone can see and celebrate</p>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="team_only" id="birthday-team" />
              <Label htmlFor="birthday-team" className="font-normal">
                <div>Team Only</div>
                <p className="text-sm text-muted-foreground">Only your team members</p>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="friends_only" id="birthday-friends" />
              <Label htmlFor="birthday-friends" className="font-normal">
                <div>Friends Only</div>
                <p className="text-sm text-muted-foreground">Only your friends</p>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="private" id="birthday-private" />
              <Label htmlFor="birthday-private" className="font-normal">
                <div>Private</div>
                <p className="text-sm text-muted-foreground">No birthday posts or celebrations</p>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Default Post Visibility */}
      <Card>
        <CardHeader>
          <CardTitle>Default Post Visibility</CardTitle>
          <CardDescription>
            Choose the default visibility for new posts you create
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="post-visibility">Default Visibility</Label>
            <Select
              value={preferences.defaultPostVisibility}
              onValueChange={handleDefaultVisibilityChange}
              disabled={isUpdating}
            >
              <SelectTrigger id="post-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="team_only">Team Only</SelectItem>
                <SelectItem value="friends_only">Friends Only</SelectItem>
                <SelectItem value="office_only">Office Only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              You can change this for each post when creating it
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose which notifications you'd like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Social Notifications */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Social Notifications</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-reactions" className="font-normal">
                New reactions on your posts
              </Label>
              <Switch
                id="notif-reactions"
                checked={preferences.notifications.postReactions}
                onCheckedChange={(val) => handleNotificationToggle('postReactions', val)}
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notif-comments" className="font-normal">
                New comments on your posts
              </Label>
              <Switch
                id="notif-comments"
                checked={preferences.notifications.postComments}
                onCheckedChange={(val) => handleNotificationToggle('postComments', val)}
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notif-mentions" className="font-normal">
                When you're mentioned in a post
              </Label>
              <Switch
                id="notif-mentions"
                checked={preferences.notifications.postMentions}
                onCheckedChange={(val) => handleNotificationToggle('postMentions', val)}
                disabled={isUpdating}
              />
            </div>
          </div>

          {/* Birthday Notifications */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Birthday Notifications</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-birthdays" className="font-normal">
                Team member birthdays
              </Label>
              <Switch
                id="notif-birthdays"
                checked={preferences.notifications.birthdayReminders}
                onCheckedChange={(val) => handleNotificationToggle('birthdayReminders', val)}
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notif-upcoming" className="font-normal">
                Upcoming birthday reminders (3 days before)
              </Label>
              <Switch
                id="notif-upcoming"
                checked={preferences.notifications.birthdayUpcoming}
                onCheckedChange={(val) => handleNotificationToggle('birthdayUpcoming', val)}
                disabled={isUpdating}
              />
            </div>
          </div>

          {/* Reflection Notifications */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Reflection Notifications</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="notif-reflection-reminder" className="font-normal">
                Weekly reflection reminders
              </Label>
              <Switch
                id="notif-reflection-reminder"
                checked={preferences.notifications.reflectionReminders}
                onCheckedChange={(val) => handleNotificationToggle('reflectionReminders', val)}
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notif-team-reflections" className="font-normal">
                Team member reflections
              </Label>
              <Switch
                id="notif-team-reflections"
                checked={preferences.notifications.teamReflections}
                onCheckedChange={(val) => handleNotificationToggle('teamReflections', val)}
                disabled={isUpdating}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialSettingsTab;
