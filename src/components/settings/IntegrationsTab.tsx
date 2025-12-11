import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Home, ExternalLink, CheckCircle2, XCircle, Gift, CreditCard, AlertCircle } from "lucide-react";
import { useBeaconIntegration } from "@/hooks/useBeaconIntegration";
import { useBeaconSubscription } from "@/hooks/useBeaconSubscription";
import { useTeam } from "@/hooks/useTeam";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { GoogleCalendarCard } from "./GoogleCalendarCard";

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

  const { subscription, isLoading: isLoadingSubscription, isUnlimited } = useBeaconSubscription();

  const handleToggleBeacon = () => {
    toggleBeaconIntegration.mutate(!isBeaconEnabled);
  };

  // Render subscription status section
  const renderSubscriptionStatus = () => {
    if (isLoadingSubscription) {
      return (
        <div className="mt-3 p-3 bg-muted/50 rounded-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading subscription...</span>
        </div>
      );
    }

    // Founder Unlimited
    if (isUnlimited) {
      return (
        <div className="mt-3 p-3 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-500" />
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Founder Unlimited Access
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Unlimited reports • No credit limit • Thank you for being a founder!
          </p>
        </div>
      );
    }

    // Not connected
    if (subscription.subscriptionStatus === 'inactive' || !isBeaconEnabled) {
      return (
        <div className="mt-3 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium">$25/month includes 3 reports</p>
          <p className="text-xs text-muted-foreground">
            Credit packs from $2.50/report for more. Teams share credits across all members.
          </p>
        </div>
      );
    }

    // Has credits
    if (typeof subscription.creditsRemaining === 'number' && subscription.creditsRemaining > 0) {
      return (
        <div className="mt-3 p-3 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-teal-500" />
              <p className="text-sm font-semibold text-teal-700 dark:text-teal-400">
                {subscription.creditsRemaining} credits remaining
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="https://beacon.lovable.app/billing" target="_blank" rel="noopener noreferrer">
                Top Up Credits
              </a>
            </Button>
          </div>
          {subscription.planName && (
            <p className="text-xs text-muted-foreground mt-1">
              {subscription.planName} plan • Teams share credits across all members
            </p>
          )}
        </div>
      );
    }

    // No credits / expired
    return (
      <div className="mt-3 p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
              0 credits remaining
            </p>
          </div>
          <Button variant="default" size="sm" className="bg-gradient-to-r from-teal-500 to-cyan-500" asChild>
            <a href="https://beacon.lovable.app/billing" target="_blank" rel="noopener noreferrer">
              Upgrade Plan
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Purchase credits to continue creating reports
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connect external services to enhance your workflow
        </p>
      </div>

      {/* Google Calendar Integration */}
      <GoogleCalendarCard />

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
            {renderSubscriptionStatus()}
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
    </div>
  );
};

export default IntegrationsTab;
