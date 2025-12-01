import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useOfficeManagement } from '@/hooks/useOfficeManagement';

interface CreateOfficeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateOfficeDialog = ({ open, onOpenChange }: CreateOfficeDialogProps) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [brand, setBrand] = useState('');
  const [brandColor, setBrandColor] = useState('#000000');
  const [bio, setBio] = useState('');
  
  const { createOffice } = useOfficeManagement();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createOffice.mutateAsync({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
      brand: brand || undefined,
      brand_color: brandColor,
      bio: bio || undefined,
    });

    // Reset form
    setName('');
    setSlug('');
    setBrand('');
    setBrandColor('#000000');
    setBio('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Office</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Office Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sydney Office"
              required
            />
          </div>

          <div>
            <Label htmlFor="slug">Slug (URL-friendly)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="sydney-office"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank to auto-generate from name
            </p>
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

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createOffice.isPending}>
              {createOffice.isPending ? 'Creating...' : 'Create Office'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
