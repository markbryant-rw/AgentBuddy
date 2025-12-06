import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Home, Calendar, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { useBeaconIntegration } from "@/hooks/useBeaconIntegration";
import { useTeam } from "@/hooks/useTeam";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

const IntegrationsTab = () => {
  const { team } = useTeam();
  const { user } = useAuth();
  const { members } = useTeamMembers();
  
  // Check if current user is team admin
  const currentMember = members.find(m => m.user_id === user?.id);
  const isTeamAdmin = currentMember?.access_level === 'admin';
  
  const { 
    isBeaconEnabled, 
    isLoadingSettings, 
    integrationSettings,
    toggleBeaconIntegration 
  } = useBeaconIntegration();

  const handleToggleBeacon = () => {
    toggleBeaconIntegration.mutate(!isBeaconEnabled);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connect external services to enhance your workflow
        </p>
      </div>

      {/* Beacon Integration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Beacon Property Reports</CardTitle>
                <CardDescription>
                  Generate professional property reports and track vendor engagement
                </CardDescription>
              </div>
            </div>
            {isLoadingSettings ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant={isBeaconEnabled ? "default" : "secondary"}>
                {isBeaconEnabled ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Not Connected
                  </span>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Beacon creates beautiful property reports that you can share with vendors. 
              Track when they open emails, view reports, and calculate propensity scores 
              to identify your hottest leads.
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>One-click report creation from appraisals</li>
              <li>Track email opens and report views</li>
              <li>Propensity scoring to identify hot leads</li>
              <li>Automatic engagement notifications</li>
            </ul>
          </div>

          {isTeamAdmin ? (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Enable for your team</p>
                {integrationSettings?.connected_at && (
                  <p className="text-xs text-muted-foreground">
                    Connected {format(new Date(integrationSettings.connected_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
              <Switch
                checked={isBeaconEnabled}
                onCheckedChange={handleToggleBeacon}
                disabled={toggleBeaconIntegration.isPending}
              />
            </div>
          ) : (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {isBeaconEnabled 
                  ? "Beacon is enabled for your team. Create reports from any appraisal."
                  : "Contact your team leader to enable Beacon for your team."}
              </p>
            </div>
          )}

          {isBeaconEnabled && (
            <Button variant="outline" size="sm" className="w-full" asChild>
              <a href="https://beacon.lovable.app" target="_blank" rel="noopener noreferrer">
                Open Beacon Dashboard
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Google Calendar Integration Card - Coming Soon */}
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Google Calendar</CardTitle>
                <CardDescription>
                  Sync transaction dates to your calendar
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline">Coming Soon</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Automatically sync key transaction dates, open homes, and appointments 
            with your Google Calendar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsTab;
