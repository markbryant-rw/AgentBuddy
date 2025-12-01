import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { useKBImageUpload } from "@/hooks/useKBImageUpload";
import { Upload, X } from "lucide-react";

interface PlaybookMetadataFormProps {
  initialData?: {
    title: string;
    description: string;
    category_id: string;
    cover_image?: string;
    estimated_minutes?: number;
    roles?: string[];
    tags?: string[];
    is_published: boolean;
  };
  onChange: (data: any) => void;
  presetCategoryId?: string;
}

export function PlaybookMetadataForm({ initialData, onChange, presetCategoryId }: PlaybookMetadataFormProps) {
  const { categories } = useKnowledgeBase();
  const { uploadImage, uploading } = useKBImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState(initialData || {
    title: '',
    description: '',
    category_id: presetCategoryId || '',
    cover_image: '',
    is_published: false
  });

  useEffect(() => {
    onChange(formData);
  }, [formData, onChange]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file, 'playbook');
    if (url) {
      setFormData({ ...formData, cover_image: url });
    }
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., New Listing Onboarding Process"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief overview of what this playbook covers..."
          rows={3}
        />
      </div>

      {!presetCategoryId && (
        <div className="space-y-2">
          <Label htmlFor="category">Library *</Label>
          <Select 
            value={formData.category_id} 
            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a library" />
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
      )}

      <div className="space-y-2">
        <Label>Cover Image</Label>
        {formData.cover_image ? (
          <div className="relative">
            <img 
              src={formData.cover_image} 
              alt="Cover" 
              className="w-full h-48 object-cover rounded-lg"
            />
            <Button
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={() => setFormData({ ...formData, cover_image: '' })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="cover-upload"
              disabled={uploading}
            />
            <label htmlFor="cover-upload" className="cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {uploading ? 'Uploading...' : 'Click to upload cover image'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WEBP or GIF (max 5MB)
              </p>
            </label>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label htmlFor="publish">Publish Playbook</Label>
          <p className="text-sm text-muted-foreground">Make this playbook visible to your team</p>
        </div>
        <Switch
          id="publish"
          checked={formData.is_published}
          onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
        />
      </div>
    </div>
  );
}
