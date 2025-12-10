import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/hooks/useTeam";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useAuth } from "@/hooks/useAuth";
import { Users, Building2, Copy, Check, Mail, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

// Helper to get display name and variant for roles
const getRoleDisplay = (role: string): { label: string; variant: 'default' | 'secondary' | 'outline' } | null => {
  switch (role) {
    case 'team_leader':
      return { label: 'Team Leader', variant: 'default' };
    case 'salesperson':
      return { label: 'Salesperson', variant: 'secondary' };
    case 'assistant':
      return { label: 'Assistant', variant: 'outline' };
    default:
      return null; // Hide platform_admin, office_manager in this context
  }
};

export const TeamManagementSection = () => {
  const { team } = useTeam();
  const { members, isLoading } = useTeamMembers();
  const { user, hasAnyRole } = useAuth();
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  
  const canManageTeam = hasAnyRole(['team_leader', 'platform_admin', 'office_manager']);

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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Team
          </CardTitle>
          <CardDescription>
            View your team information
          </CardDescription>
        </div>
        {canManageTeam && team && (
          <Button 
            variant="default" 
            size="sm"
            onClick={() => navigate('/team-management')}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Team
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {team ? (
          <div className="space-y-6">
            {/* Team Name */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{team.name}</h3>
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

            {/* Team Members */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Team Members ({members.length})
              </h4>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading members...</div>
              ) : members.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {members.map((member) => {
                    // Filter and map roles to display
                    const displayRoles = (member.roles || [])
                      .map(getRoleDisplay)
                      .filter(Boolean) as { label: string; variant: 'default' | 'secondary' | 'outline' }[];

                    return (
                      <div
                        key={member.id}
                        className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.avatar_url || ''} />
                          <AvatarFallback className="text-sm bg-primary/10 text-primary">
                            {member.full_name?.[0] || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {member.full_name || 'Unknown'}
                          </p>
                          {member.email && (
                            <a
                              href={`mailto:${member.email}`}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
                            >
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{member.email}</span>
                            </a>
                          )}
                          {displayRoles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {displayRoles.map((role, idx) => (
                                <Badge key={idx} variant={role.variant} className="text-xs">
                                  {role.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No team members found</p>
              )}
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
