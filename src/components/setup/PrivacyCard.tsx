import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Shield, Eye, TrendingUp } from 'lucide-react';

export const PrivacyCard = () => {
  const { preferences, updatePreferences, loading } = useUserPreferences();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-7 bg-muted rounded w-32 animate-pulse" />
          <div className="h-4 bg-muted rounded w-64 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded animate-pulse" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Privacy Settings
        </CardTitle>
        <CardDescription>Control who can see your information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Visibility */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <Label>Profile Visibility</Label>
          </div>
          <Select
            value={preferences.profile_visibility}
            onValueChange={(value: 'public' | 'friends' | 'private') =>
              updatePreferences({ profile_visibility: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public - Everyone can view</SelectItem>
              <SelectItem value="friends">Friends Only</SelectItem>
              <SelectItem value="private">Private - Only me</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Control who can see your profile information
          </p>
        </div>

        {/* Stats Visibility */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <Label>Performance Stats Visibility</Label>
          </div>
          <Select
            value={preferences.stats_visibility}
            onValueChange={(value: 'public' | 'friends' | 'private') =>
              updatePreferences({ stats_visibility: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public - Everyone can view</SelectItem>
              <SelectItem value="friends">Friends Only</SelectItem>
              <SelectItem value="private">Private - Only me</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Control who can see your KPIs and performance data
          </p>
        </div>

        {/* Leaderboard Participation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="space-y-0.5">
            <Label>Leaderboard Participation</Label>
            <p className="text-xs text-muted-foreground">
              Appear on global and friend leaderboards
            </p>
          </div>
          <Switch
            checked={preferences.leaderboard_participation}
            onCheckedChange={(checked) =>
              updatePreferences({ leaderboard_participation: checked })
            }
          />
        </div>

        <div className="p-4 bg-muted/50 rounded-lg border">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Your team members can always view your performance data. 
            These settings only affect visibility to friends and other users outside your team.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
