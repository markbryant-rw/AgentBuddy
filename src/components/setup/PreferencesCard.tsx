import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Bell, Check, Palette, Zap, TreePine } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export const PreferencesCard = () => {
  const { preferences, updatePreferences, loading } = useUserPreferences();
  const { currentTheme, setTheme, availableThemes } = useTheme();

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
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Preferences
        </CardTitle>
        <CardDescription>Customize your experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div className="space-y-3">
          <Label>Theme</Label>
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
