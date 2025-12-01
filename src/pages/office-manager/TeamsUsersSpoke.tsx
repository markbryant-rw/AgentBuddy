import { useState } from 'react';
import { ArrowLeft, Plus, UserPlus, Download, Upload, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TeamsUsersOverview } from '@/components/office-manager/teams-users/TeamsUsersOverview';
import { TeamsSection } from '@/components/office-manager/teams-users/TeamsSection';
import { UsersSection } from '@/components/office-manager/teams-users/UsersSection';
import { SoloAgentsSection } from '@/components/office-manager/teams-users/SoloAgentsSection';
import { CreateTeamDialog } from '@/components/office-manager/CreateTeamDialog';
import { InviteTeamMemberDialog } from '@/components/office-manager/InviteTeamMemberDialog';
import { CSVUploadDialog } from '@/components/office-manager/csv-import/CSVUploadDialog';
import { ImportWaitingRoom } from '@/components/office-manager/csv-import/ImportWaitingRoom';
import { DataHealthDashboard } from '@/components/office-manager/DataHealthDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserImport } from '@/hooks/useUserImport';
import { useBulkInvite } from '@/hooks/useBulkInvite';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

export default function TeamsUsersSpoke() {
  const navigate = useNavigate();
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [inviteUserOpen, setInviteUserOpen] = useState(false);
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  const [waitingRoomOpen, setWaitingRoomOpen] = useState(false);
  const [inviteTeamContext, setInviteTeamContext] = useState<{ teamId: string; officeId: string } | null>(null);

  const { profile } = useProfile();
  const {
    isParsing,
    parsedUsers,
    stats,
    parseCSV,
    updateUser,
    removeUser,
    toggleSelection,
    selectAll,
    deselectAll,
    reset,
  } = useUserImport();

  const { bulkInvite, isInviting } = useBulkInvite();

  const handleFileSelected = async (file: File) => {
    if (!profile?.office_id) {
      toast.error('Office ID not found');
      return;
    }

    await parseCSV(file, profile.office_id);
    setCsvUploadOpen(false);
    setWaitingRoomOpen(true);
  };

  const handleInvite = async (users: typeof parsedUsers) => {
    try {
      await bulkInvite(users);
      reset();
      setWaitingRoomOpen(false);
    } catch (error) {
      console.error('Bulk invite error:', error);
    }
  };

  const handleWaitingRoomClose = (open: boolean) => {
    if (!open && !isInviting) {
      reset();
    }
    setWaitingRoomOpen(open);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/office-manager')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Teams & Users Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage all teams, users, and assignments in your office
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/office-manager/invitation-log')}>
            <History className="h-4 w-4 mr-2" />
            Invitation Log
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setCsvUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={() => setInviteUserOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
          <Button onClick={() => setCreateTeamOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <TeamsUsersOverview />

      {/* Main Content */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="users">All Users</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="solo">Solo Agents</TabsTrigger>
          <TabsTrigger value="health">Data Health</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UsersSection />
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <TeamsSection 
            onInviteToTeam={(teamId, officeId) => {
              setInviteTeamContext({ teamId, officeId });
              setInviteUserOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="solo" className="mt-6">
          <SoloAgentsSection />
        </TabsContent>

        <TabsContent value="health" className="mt-6">
          <DataHealthDashboard />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateTeamDialog open={createTeamOpen} onOpenChange={setCreateTeamOpen} />
      <InviteTeamMemberDialog 
        open={inviteUserOpen} 
        onOpenChange={(open) => {
          setInviteUserOpen(open);
          if (!open) setInviteTeamContext(null);
        }}
        officeId={inviteTeamContext?.officeId || profile?.office_id || ''}
        defaultTeamId={inviteTeamContext?.teamId}
      />
      <CSVUploadDialog
        open={csvUploadOpen}
        onOpenChange={setCsvUploadOpen}
        onFileSelected={handleFileSelected}
        isParsing={isParsing}
      />
      <ImportWaitingRoom
        open={waitingRoomOpen}
        onOpenChange={handleWaitingRoomClose}
        users={parsedUsers}
        stats={stats}
        onToggleSelection={toggleSelection}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onRemoveUser={removeUser}
        onEditUser={updateUser}
        onInvite={handleInvite}
        isInviting={isInviting}
      />
    </div>
  );
}
