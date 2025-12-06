import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useProfile } from '@/hooks/useProfile';
import { Bell, Check, Palette, Zap, TreePine, Shield, Cake } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export const PreferencesCard = () => {
  const { preferences, updatePreferences, loading: prefsLoading } = useUserPreferences();
  const { profile, updateProfile, loading: profileLoading } = useProfile();
  const { currentTheme, setTheme, availableThemes } = useTheme();

  const loading = prefsLoading || profileLoading;

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

  const handleBirthdayVisibilityChange = (value: string) => {
    updateProfile({ birthday_visibility: value });
  };

  const currentBirthdayVisibility = profile?.birthday_visibility || 'team_only';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Preferences
        </CardTitle>
        <CardDescription>Customize your experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Theme Selection */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Theme</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {availableThemes.map((theme) => {
              const isActive = currentTheme.id === theme.id;
              const isCyberpunk = theme.id === 'cyberpunk';
              const isChristmas = theme.id === 'christmas';

              return (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className={cn(
                    "relative p-3 rounded-xl border-2 transition-all duration-200 text-left",
                    "hover:shadow-md hover:-translate-y-0.5",
                    isActive 
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                      : "border-border hover:border-primary/50",
                    isCyberpunk && "hover:shadow-cyan-500/20",
                    isChristmas && "hover:shadow-red-500/20"
                  )}
                >
                  {/* Special badges */}
                  {isCyberpunk && (
                    <Badge 
                      className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0 bg-gradient-to-r from-pink-500 to-cyan-400 text-white border-0"
                    >
                      <Zap className="h-2.5 w-2.5 mr-0.5" />
                      EXTREME
                    </Badge>
                  )}
                  {isChristmas && (
                    <Badge 
                      className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0 bg-gradient-to-r from-red-600 via-green-600 to-yellow-500 text-white border-0"
                    >
                      <TreePine className="h-2.5 w-2.5 mr-0.5" />
                      FESTIVE
                    </Badge>
                  )}

                  {/* Color swatches */}
                  <div className="flex gap-1 mb-2">
                    <div 
                      className="h-4 w-4 rounded-full border border-white/50 shadow-sm"
                      style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
                    />
                    <div 
                      className="h-4 w-4 rounded-full border border-white/50 shadow-sm"
                      style={{ backgroundColor: `hsl(${theme.colors.accent})` }}
                    />
                    <div 
                      className="h-4 w-4 rounded-full border border-white/50 shadow-sm"
                      style={{ backgroundColor: `hsl(${theme.colors.success})` }}
                    />
                  </div>

                  {/* Theme name */}
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      isCyberpunk && "text-cyan-600",
                      isChristmas && "text-red-600"
                    )}>
                      {theme.name}
                    </span>
                    {isActive && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                    {theme.description}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Choose your preferred visual theme. Special themes include animated effects!
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
              <Label>Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive important updates via email
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

        {/* Privacy Settings */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-semibold">Privacy</Label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Cake className="h-4 w-4 text-muted-foreground" />
              <Label>Birthday Visibility</Label>
            </div>
            <RadioGroup
              value={currentBirthdayVisibility}
              onValueChange={handleBirthdayVisibilityChange}
              className="grid grid-cols-3 gap-2"
            >
              <Label
                htmlFor="birthday-public"
                className={cn(
                  "flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors",
                  currentBirthdayVisibility === 'public' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="public" id="birthday-public" className="sr-only" />
                <span className="text-sm">Everyone</span>
              </Label>
              <Label
                htmlFor="birthday-team"
                className={cn(
                  "flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors",
                  currentBirthdayVisibility === 'team_only'
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="team_only" id="birthday-team" className="sr-only" />
                <span className="text-sm">Team Only</span>
              </Label>
              <Label
                htmlFor="birthday-private"
                className={cn(
                  "flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors",
                  currentBirthdayVisibility === 'private' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="private" id="birthday-private" className="sr-only" />
                <span className="text-sm">Only Me</span>
              </Label>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Control who can see your birthday on your profile
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
