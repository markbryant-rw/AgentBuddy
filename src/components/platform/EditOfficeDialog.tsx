import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOfficeManagement } from '@/hooks/useOfficeManagement';

interface EditOfficeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  office: {
    id: string;
    name: string;
    brand?: string | null;
    brand_color?: string | null;
    bio?: string | null;
  } | null;
}

export const EditOfficeDialog = ({ open, onOpenChange, office }: EditOfficeDialogProps) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [brandColor, setBrandColor] = useState('#000000');
  const [bio, setBio] = useState('');
  
  const { updateOffice, archiveOffice } = useOfficeManagement();

  useEffect(() => {
    if (office) {
      setName(office.name);
      setBrand(office.brand || '');
      setBrandColor(office.brand_color || '#000000');
      setBio(office.bio || '');
    }
  }, [office]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!office) return;

    await updateOffice.mutateAsync({
      id: office.id,
      name,
      brand: brand || undefined,
      brand_color: brandColor,
      bio: bio || undefined,
    });

    onOpenChange(false);
  };

  const handleArchive = async () => {
    if (!office) return;
    
    if (confirm('Are you sure you want to archive this office? Teams will remain but the office will be hidden.')) {
      await archiveOffice.mutateAsync(office.id);
      onOpenChange(false);
    }
  };

  if (!office) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Office</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Office Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Ray White, Harcourts, etc."
            />
          </div>

          <div>
            <Label htmlFor="brandColor">Brand Color</Label>
            <div className="flex gap-2">
              <Input
                id="brandColor"
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Description</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
          </div>

          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleArchive}
              disabled={archiveOffice.isPending}
            >
              Archive Office
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateOffice.isPending}>
                {updateOffice.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
