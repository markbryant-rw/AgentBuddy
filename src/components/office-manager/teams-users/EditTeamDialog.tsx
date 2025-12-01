import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTeamCRUD } from '@/hooks/useTeamCRUD';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface EditTeamDialogProps {
  team: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditTeamDialog = ({ team, open, onOpenChange }: EditTeamDialogProps) => {
  const [name, setName] = useState(team.name);
  const [bio, setBio] = useState(team.bio || '');
  const { updateTeam, regenerateTeamCode } = useTeamCRUD();

  useEffect(() => {
    setName(team.name);
    setBio(team.bio || '');
  }, [team]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTeam.mutateAsync({
      id: team.id,
      name,
      bio,
    });
    onOpenChange(false);
  };

  const handleRegenerateCode = async () => {
    if (confirm('Are you sure you want to regenerate the team code? The old code will no longer work.')) {
      await regenerateTeamCode.mutateAsync(team.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>Update team information</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Team Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Description</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Team Code</Label>
            <div className="flex gap-2">
              <Input
                value={team.team_code}
                readOnly
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRegenerateCode}
                disabled={regenerateTeamCode.isPending}
                title="Regenerate team code"
              >
                {regenerateTeamCode.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Team members use this code to join the team
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateTeam.isPending}>
              {updateTeam.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
