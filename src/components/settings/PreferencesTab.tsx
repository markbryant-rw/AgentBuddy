import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Palette, Zap, TreePine, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { COMMON_TIMEZONES, DEFAULT_TIMEZONE, getBrowserTimezone } from '@/lib/timezoneUtils';
import { useState, useEffect } from 'react';
import { NotificationPreferencesCard } from './NotificationPreferencesCard';
import { AftercareSettingsCard } from './AftercareSettingsCard';

export default function PreferencesTab() {
  const { currentTheme, setTheme, availableThemes } = useTheme();
  const { profile, updateProfile } = useProfile();
  const [selectedTimezone, setSelectedTimezone] = useState(profile?.timezone || DEFAULT_TIMEZONE);

  // Sync with profile timezone when loaded
  useEffect(() => {
    if (profile?.timezone) {
      setSelectedTimezone(profile.timezone);
    }
  }, [profile?.timezone]);

  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone);
    updateProfile({ timezone });
  };

  const browserTimezone = getBrowserTimezone();

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Theme
          </CardTitle>
          <CardDescription>
            Choose your personal theme. This preference is saved to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {availableThemes.map((theme) => {
              const isActive = currentTheme.id === theme.id;
              const isCyberpunk = theme.id === 'cyberpunk';
              const isChristmas = theme.id === 'christmas';
              const isSpecial = isCyberpunk || isChristmas;

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

          {/* Info about special themes */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">💡 Pro tip:</span> Special themes like{' '}
              <span className="text-cyan-600 font-medium">Cyberpunk</span> and{' '}
              <span className="text-red-600 font-medium">Christmas</span> include 
              animated effects and unique visual treatments. Perfect for adding some 
              personality to your workspace!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Future preferences placeholder */}
      {/* Timezone Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Timezone
          </CardTitle>
          <CardDescription>
            Set your local timezone for accurate task scheduling and due dates.
            {browserTimezone !== selectedTimezone && (
              <span className="block mt-1 text-amber-600">
                Your browser timezone is {browserTimezone}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            This affects how recurring tasks and due dates are calculated for your Daily Planner.
          </p>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <NotificationPreferencesCard />

      {/* Aftercare Settings */}
      <AftercareSettingsCard />
    </div>
  );
}
