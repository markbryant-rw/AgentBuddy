import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { resizeImage, RESIZE_PRESETS } from '@/lib/imageResize';

export const UserProfileCard = () => {
  const { profile, updateProfile, uploadAvatar, loading } = useProfile();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editBirthdayVisibility, setEditBirthdayVisibility] = useState<'team_only' | 'friends_only' | 'public' | 'private'>('team_only');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading || !profile) {
    return (
      <Card className="p-8 mb-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-muted rounded-full animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-muted rounded w-48 animate-pulse" />
            <div className="h-4 bg-muted rounded w-64 animate-pulse" />
          </div>
        </div>
      </Card>
    );
  }

  const handleOpenEdit = () => {
    setEditName(profile.full_name || '');
    setEditBirthday(profile.birthday || '');
    setEditBirthdayVisibility(profile.birthday_visibility || 'team_only');
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('Name is required');
      return;
    }

    if (editName.length > 100) {
      toast.error('Name must be less than 100 characters');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        full_name: editName.trim(),
        birthday: editBirthday || null,
        birthday_visibility: editBirthday ? editBirthdayVisibility : null,
      });
      setIsEditDialogOpen(false);
    } catch (error) {
      // Error already handled in useProfile
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      // Resize image using avatar preset
      const resizedBlob = await resizeImage(file, RESIZE_PRESETS.avatar);
      const resizedFile = new File([resizedBlob], file.name, { type: resizedBlob.type });
      await uploadAvatar(resizedFile);
    } catch (error) {
      // Error already handled in useProfile
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <Card className="p-8 mb-6 bg-gradient-to-br from-background to-muted/20">
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || 'User'} />
            <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
          <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Upload className="w-6 h-6 text-white" />
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold">{profile.full_name || 'No name set'}</h2>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleOpenEdit}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Your Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="John Smith"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthday">Birthday (Optional)</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={editBirthday}
                      onChange={(e) => setEditBirthday(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                    />
                    {editBirthday && (
                      <div className="space-y-2">
                        <Label htmlFor="birthday-visibility">Who can celebrate?</Label>
                        <Select value={editBirthdayVisibility} onValueChange={(v: any) => setEditBirthdayVisibility(v)}>
                          <SelectTrigger id="birthday-visibility">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="team_only">Team Only</SelectItem>
                            <SelectItem value="friends_only">Friends Only</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="private">Private (No Celebrations)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
          </div>
          
          <p className="text-muted-foreground text-lg">{profile.email}</p>
        </div>
      </div>
    </Card>
  );
};
