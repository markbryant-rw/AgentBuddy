import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/hooks/useTeam";
import { useProfile } from "@/hooks/useProfile";
import { Users, Building2, UserPlus, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TeamManagementSection = () => {
  const { team } = useTeam();
  const { profile } = useProfile();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Current Team */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Team
          </CardTitle>
          <CardDescription>
            Your active team and membership details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {team ? (
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{team.name}</h3>
                  <Badge variant="default">Team Member</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {team.bio || "No team description"}
                </p>
              </div>
              <Button variant="outline" onClick={() => navigate("/team-management")}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Team
              </Button>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>You are not currently assigned to a team</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Details */}
      {team && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Team Information
            </CardTitle>
            <CardDescription>
              Details about your team configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Team Code</p>
                  <p className="text-base font-mono mt-1">{team.team_code}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Financial Year</p>
                  <p className="text-base mt-1">
                    {team.uses_financial_year 
                      ? `Starts Month ${team.financial_year_start_month}`
                      : "Calendar Year"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-base mt-1">
                  {new Date(team.created_at).toLocaleDateString('en-NZ', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium mb-1">Need to manage team members?</h3>
              <p className="text-sm text-muted-foreground">
                Invite new members, manage roles, and configure team settings
              </p>
            </div>
            <Button onClick={() => navigate("/invite")}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Members
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
