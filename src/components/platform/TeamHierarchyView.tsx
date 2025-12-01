import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useTeamHierarchy } from '@/hooks/useTeamHierarchy';
import { Users, Building2, Settings, UserPlus, Edit } from 'lucide-react';
import { useState } from 'react';
import { ManageTeamMembersDialog } from './ManageTeamMembersDialog';
import { AddUserToTeamDialog } from './AddUserToTeamDialog';
import { EditTeamDialog } from './EditTeamDialog';

export const TeamHierarchyView = () => {
  const { data: teams, isLoading } = useTeamHierarchy();
  const [selectedTeam, setSelectedTeam] = useState<typeof teams[0] | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editTeamDialogOpen, setEditTeamDialogOpen] = useState(false);

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading teams...</div>;
  }

  if (!teams || teams.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No teams found</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setAddUserDialogOpen(true)} size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User to Team
        </Button>
      </div>
      
      <Accordion type="multiple" className="space-y-4">
        {teams.map((team) => (
          <AccordionItem key={team.id} value={team.id} className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3 flex-1">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-semibold">{team.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {team.agencies?.name || 'No Office'}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2 mr-2">
                  <Badge variant="secondary">
                    {team.members.length} members
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTeam(team);
                      setManageDialogOpen(true);
                    }}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2 mt-2">
                {team.members.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={member.profiles.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.profiles.full_name?.[0] || member.profiles.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {member.profiles.full_name || 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {member.profiles.email}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {selectedTeam && (
        <>
          <ManageTeamMembersDialog
            open={manageDialogOpen}
            onOpenChange={setManageDialogOpen}
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
            members={selectedTeam.members}
          />
          
          <EditTeamDialog
            open={editTeamDialogOpen}
            onOpenChange={setEditTeamDialogOpen}
            team={selectedTeam}
          />
        </>
      )}

      <AddUserToTeamDialog
        open={addUserDialogOpen}
        onOpenChange={setAddUserDialogOpen}
      />
    </>
  );
};
