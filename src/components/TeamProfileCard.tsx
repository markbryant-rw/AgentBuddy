import { useState } from 'react';
import { useTeam } from '@/hooks/useTeam';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Upload, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { resizeImage, RESIZE_PRESETS } from '@/lib/imageResize';

export const TeamProfileCard = () => {
  const { team, updateTeam, uploadLogo, loading } = useTeam();
  const { isPlatformAdmin } = useAuth();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Profile</CardTitle>
          <CardDescription>Manage your team information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!team) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Profile</CardTitle>
          <CardDescription>You're not part of a team yet</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You can create a new team or join an existing one by using a team code.
          </p>
          <p className="text-sm text-muted-foreground">
            Contact your administrator or use the signup flow to create a team.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleOpenEdit = () => {
    setEditName(team.name);
    setEditBio(team.bio || '');
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('Team name is required');
      return;
    }

    if (editName.length > 100) {
      toast.error('Team name must be less than 100 characters');
      return;
    }

    if (editBio.length > 500) {
      toast.error('Bio must be less than 500 characters');
      return;
    }

    setSaving(true);
    try {
      await updateTeam({
        name: editName.trim(),
        bio: editBio.trim() || null,
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      // Error already handled in useTeam
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (10MB max before resizing)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setUploading(true);
    try {
      // Resize image using logo preset
      const resizedBlob = await resizeImage(file, RESIZE_PRESETS.logo);
      const resizedFile = new File([resizedBlob], file.name, { type: resizedBlob.type });
      await uploadLogo(resizedFile);
    } catch (error) {
      // Error already handled in useTeam
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const copyTeamCode = () => {
    if (team?.team_code) {
      navigator.clipboard.writeText(team.team_code);
      setCopied(true);
      toast.success('Team code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="p-8 mb-6 bg-gradient-to-br from-background to-muted/20">
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
            <AvatarImage src={team.logo_url || undefined} alt={team.name} />
            <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
              {getInitials(team.name)}
            </AvatarFallback>
          </Avatar>
          {isPlatformAdmin && (
            <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Upload className="w-6 h-6 text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold">{team.name}</h2>
            {isPlatformAdmin && (
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleOpenEdit}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Team Profile</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Team Name *</Label>
                      <Input
                        id="name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="My Team"
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Team Bio</Label>
                      <Textarea
                        id="bio"
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Tell us about your team..."
                        maxLength={500}
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {editBio.length}/500 characters
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(false)}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          {team.team_code && (
            <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Team Code</p>
                <p className="font-mono font-bold text-lg">{team.team_code}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyTeamCode}
                className="ml-2"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
          
          {team.bio && (
            <p className="text-muted-foreground text-lg mb-2">{team.bio}</p>
          )}
        </div>
      </div>
    </Card>
  );
};
