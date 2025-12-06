import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTeam } from "@/hooks/useTeam";
import { Users, Building2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const TeamManagementSection = () => {
  const { team } = useTeam();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (team?.team_code) {
      navigator.clipboard.writeText(team.team_code);
      setCopied(true);
      toast.success("Team code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Your Team
        </CardTitle>
        <CardDescription>
          View your team information
        </CardDescription>
      </CardHeader>
      <CardContent>
        {team ? (
          <div className="space-y-4">
            {/* Team Name & Badge */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{team.name}</h3>
                  <Badge variant="secondary">Team Member</Badge>
                </div>
                {team.bio && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {team.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Team Code */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Team Code</p>
                  <p className="font-mono text-lg font-bold mt-1">{team.team_code}</p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="p-2 hover:bg-muted rounded-md transition-colors"
                  title="Copy team code"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share this code with others to help them join your team
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>You are not currently assigned to a team</p>
            <p className="text-sm mt-1">Contact your administrator to be added to a team</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
