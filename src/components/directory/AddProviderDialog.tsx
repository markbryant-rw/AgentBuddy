import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProviderCRUD } from '@/hooks/directory/useProviderCRUD';
import { useProviderCategories } from '@/hooks/directory/useProviderCategories';
import { Loader2, Upload, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { resizeImage } from '@/lib/imageResize';
import { useDuplicateDetection } from '@/hooks/directory/useDuplicateDetection';
import { DuplicateWarningDialog } from './DuplicateWarningDialog';

interface AddProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddProviderDialog = ({ open, onOpenChange }: AddProviderDialogProps) => {
  const { data: categories = [] } = useProviderCategories();
  const { createProvider } = useProviderCRUD();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
    phone: '',
    email: '',
    website: '',
    notes: '',
    category_id: '',
    team_category_id: '',
    avatar_url: '',
    logo_url: '',
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingLogo, setIsExtractingLogo] = useState(false);
  const [duplicateCheckData, setDuplicateCheckData] = useState<any>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [proceedWithDuplicate, setProceedWithDuplicate] = useState(false);

  // Duplicate detection query
  const { data: duplicateMatch, isLoading: checkingDuplicate } = useDuplicateDetection(
    duplicateCheckData
  );

  // Handle duplicate detection results
  useEffect(() => {
    if (duplicateMatch && duplicateCheckData && !proceedWithDuplicate) {
      setShowDuplicateDialog(true);
    }
  }, [duplicateMatch, duplicateCheckData, proceedWithDuplicate]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
      toast({
        title: 'Processing image...',
        description: 'Resizing and optimizing your image',
      });

      const resizedBlob = await resizeImage(file);
      const fileName = `temp-${Date.now()}.jpg`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('provider-avatars')
        .upload(filePath, resizedBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('provider-avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: 'Success',
        description: 'Image uploaded successfully',
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
    
    if (!formData.full_name || (!formData.category_id && !formData.team_category_id)) {
      return;
    }

    // If we haven't checked for duplicates yet, do it now
    if (!duplicateCheckData && !proceedWithDuplicate) {
      setDuplicateCheckData({
        full_name: formData.full_name,
        company_name: formData.company_name,
        phone: formData.phone,
        email: formData.email,
      });
      return; // Wait for duplicate check
    }

    // If duplicate found and not proceeding yet
    if (duplicateMatch && !proceedWithDuplicate) {
      // Dialog will be shown by useEffect
      return;
    }

    const selectedCategory = categories.find(c => c.id === formData.category_id || c.id === formData.team_category_id);
    
    const shouldFlagForReview = 
      duplicateMatch?.matchType === 'high' || 
      duplicateMatch?.matchType === 'uncertain';

    await createProvider.mutateAsync({
      full_name: formData.full_name,
      company_name: formData.company_name || undefined,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      website: formData.website || undefined,
      notes: formData.notes || undefined,
      category_id: selectedCategory?.is_team_category ? undefined : formData.category_id || undefined,
      team_category_id: selectedCategory?.is_team_category ? formData.team_category_id || undefined : undefined,
      visibility_level: 'office',
      avatar_url: formData.avatar_url || undefined,
      logo_url: formData.logo_url || undefined,
      needs_review: shouldFlagForReview,
      duplicate_of: shouldFlagForReview ? duplicateMatch?.provider.id : undefined,
    });

    // Reset form and states
    setFormData({
      full_name: '',
      company_name: '',
      phone: '',
      email: '',
      website: '',
      notes: '',
      category_id: '',
      team_category_id: '',
      avatar_url: '',
      logo_url: '',
    });
    setDuplicateCheckData(null);
    setProceedWithDuplicate(false);
    
    onOpenChange(false);
  };

  const handleProceedWithDuplicate = () => {
    setProceedWithDuplicate(true);
    setShowDuplicateDialog(false);
    // Re-trigger submit
    const form = document.querySelector('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateDialog(false);
    setDuplicateCheckData(null);
    setProceedWithDuplicate(false);
  };

  const selectedCategoryId = formData.category_id || formData.team_category_id;
  const displayImage = formData.avatar_url || formData.logo_url;
  // Add cache busting to force image refresh
  const displayImageWithCache = displayImage ? `${displayImage}?t=${Date.now()}` : displayImage;
  const initials = formData.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'N';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Service Provider</DialogTitle>
          <DialogDescription>
            Add a new trusted tradesperson or professional contact to your directory
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="relative">
              <Avatar key={displayImageWithCache} className="h-24 w-24">
                <AvatarImage src={displayImageWithCache || undefined} alt={formData.full_name || 'New provider'} />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Smith"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Smith Plumbing Ltd"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={(value) => {
                const category = categories.find(c => c.id === value);
                if (category?.is_team_category) {
                  setFormData({ ...formData, category_id: '', team_category_id: value });
                } else {
                  setFormData({ ...formData, category_id: value, team_category_id: '' });
                }
              }}
              required
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="021 123 4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
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
              placeholder="https://smithplumbing.co.nz"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this provider..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProvider.isPending || checkingDuplicate}>
              {(createProvider.isPending || checkingDuplicate) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {checkingDuplicate ? 'Checking...' : 'Add Provider'}
            </Button>
          </div>
        </form>

        <DuplicateWarningDialog
          open={showDuplicateDialog}
          match={duplicateMatch}
          onCancel={handleCancelDuplicate}
          onProceed={handleProceedWithDuplicate}
        />
      </DialogContent>
    </Dialog>
  );
};
