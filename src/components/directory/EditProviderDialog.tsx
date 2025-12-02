import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProviderCategories } from '@/hooks/directory/useProviderCategories';
import { useProviderCRUD } from '@/hooks/directory/useProviderCRUD';
import { ServiceProvider } from '@/hooks/directory/useServiceProviders';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resizeImage } from '@/lib/imageResize';

interface EditProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: ServiceProvider;
}

export const EditProviderDialog = ({ open, onOpenChange, provider }: EditProviderDialogProps) => {
  const { data: categories } = useProviderCategories();
  const { updateProvider } = useProviderCRUD();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: provider.full_name,
    company_name: provider.company_name || '',
    phone: provider.phone || '',
    email: provider.email || '',
    website: provider.website || '',
    notes: provider.notes || '',
    category_id: provider.category_id || '',
    team_category_id: provider.team_category_id || '',
    avatar_url: provider.avatar_url || '',
    logo_url: provider.logo_url || '',
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingLogo, setIsExtractingLogo] = useState(false);

  // Reset form data when dialog opens or provider changes
  useEffect(() => {
    if (open) {
      setFormData({
        full_name: provider.full_name,
        company_name: provider.company_name || '',
        phone: provider.phone || '',
        email: provider.email || '',
        website: provider.website || '',
        notes: provider.notes || '',
        category_id: provider.category_id || '',
        team_category_id: provider.team_category_id || '',
        avatar_url: provider.avatar_url || '',
        logo_url: provider.logo_url || '',
      });
    }
  }, [open, provider]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      // Show processing toast
      toast({
        title: 'Processing image...',
        description: 'Resizing and optimizing your image',
      });

      // Resize and optimize the image
      const resizedBlob = await resizeImage(file);
      
      const fileName = `${provider.id}-${Date.now()}.jpg`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('provider-avatars')
        .upload(filePath, resizedBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('provider-avatars')
        .getPublicUrl(filePath);

      // Auto-save avatar to database immediately
      await updateProvider.mutateAsync({
        id: provider.id,
        full_name: provider.full_name,
        company_name: provider.company_name || null,
        phone: provider.phone || null,
        email: provider.email || null,
        website: provider.website || null,
        notes: provider.notes || null,
        category_id: provider.category_id || null,
        visibility_level: provider.visibility_level as 'office' | 'team' | 'private',
      });

      toast({
        title: 'Success',
        description: 'Avatar updated successfully',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Failed to upload image',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtractLogo = async () => {
    if (!formData.website) {
      toast({
        title: 'No website URL',
        description: 'Please enter a website URL first',
        variant: 'destructive',
      });
      return;
    }

    setIsExtractingLogo(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-website-logo', {
        body: { websiteUrl: formData.website },
      });

      if (error) throw error;

      if (data?.logoUrl) {
        setFormData(prev => ({ ...prev, logo_url: data.logoUrl }));
        toast({
          title: 'Logo extracted',
          description: 'Company logo found and set',
        });
      } else {
        toast({
          title: 'No logo found',
          description: 'Could not find a logo on the website',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Logo extraction error:', error);
      toast({
        title: 'Extraction failed',
        description: 'Failed to extract logo from website',
        variant: 'destructive',
      });
    } finally {
      setIsExtractingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateProvider.mutateAsync({
        id: provider.id,
        full_name: formData.full_name,
        company_name: formData.company_name || null,
        phone: formData.phone || null,
        email: formData.email || null,
        website: formData.website || null,
        notes: formData.notes || null,
        category_id: formData.category_id || null,
        visibility_level: 'office',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error updating provider:', error);
    }
  };

  const displayImage = formData.avatar_url || formData.logo_url;
  // Add cache busting to force image refresh
  const displayImageWithCache = displayImage ? `${displayImage}?t=${Date.now()}` : displayImage;
  const initials = formData.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Provider</DialogTitle>
          <DialogDescription>
            Update the provider's information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="relative">
              <Avatar key={displayImageWithCache} className="h-24 w-24">
                <AvatarImage src={displayImageWithCache || undefined} alt={formData.full_name} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload Image
              </Button>
              {formData.website && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleExtractLogo}
                  disabled={isExtractingLogo}
                >
                  {isExtractingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Extract Logo
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Enter contact name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name">Company</Label>
            <Input
              id="company_name"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="Enter company name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id || formData.team_category_id}
              onValueChange={(value) => {
                const selectedCategory = categories?.find(c => c.id === value);
                if (selectedCategory?.is_team_category) {
                  setFormData({ ...formData, team_category_id: value, category_id: '' });
                } else {
                  setFormData({ ...formData, category_id: value, team_category_id: '' });
                }
              }}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes or additional information"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProvider.isPending}>
              {updateProvider.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Provider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
