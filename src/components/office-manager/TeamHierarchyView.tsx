import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTeamHierarchy } from '@/hooks/useTeamHierarchy';
import { EditTeamDialog } from './EditTeamDialog';
import { Users, Loader2, Building2, Settings } from 'lucide-react';

interface TeamHierarchyViewProps {
  officeId?: string;
}

export function TeamHierarchyView({ officeId }: TeamHierarchyViewProps) {
  const { data: teams, isLoading } = useTeamHierarchy(officeId);
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string } | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Teams Found</h3>
          <p className="text-sm text-muted-foreground text-center">
            {officeId 
              ? 'This office has no teams yet. Create a team to get started.' 
              : 'Select an office to view teams'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {teams.map((team) => (
          <Card 
            key={team.id} 
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
            onClick={() => setSelectedTeam({ id: team.id, name: team.name })}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {team.agencies?.logo_url ? (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={team.agencies.logo_url} alt={team.agencies.name} />
                      <AvatarFallback>{team.agencies.name[0]}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <CardDescription>
                      {team.agencies?.name || 'No office assigned'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTeam({ id: team.id, name: team.name });
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {team.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members yet</p>
              ) : (
                team.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {member.profiles?.full_name?.[0] || member.profiles?.email?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {member.profiles?.full_name || member.profiles?.email || 'Unknown'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
          </Card>
        ))}
      </div>

      {selectedTeam && officeId && (
        <EditTeamDialog
          open={!!selectedTeam}
          onOpenChange={(open) => !open && setSelectedTeam(null)}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          officeId={officeId}
        />
      )}
    </>
  );
}
