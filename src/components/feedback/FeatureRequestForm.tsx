import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileUploadArea } from './FileUploadArea';
import { useFeatureRequests } from '@/hooks/useFeatureRequests';

interface FeatureRequestFormProps {
  title?: string;
  setTitle?: (value: string) => void;
  description?: string;
  setDescription?: (value: string) => void;
  files?: File[];
  setFiles?: (value: File[]) => void;
  onSuccess?: () => void;
}

export const FeatureRequestForm = ({
  title: propTitle,
  setTitle: propSetTitle,
  description: propDescription,
  setDescription: propSetDescription,
  files: propFiles,
  setFiles: propSetFiles,
  onSuccess,
}: FeatureRequestFormProps) => {
  // Use local state if props not provided (standalone form)
  const [localTitle, localSetTitle] = useState('');
  const [localDescription, localSetDescription] = useState('');
  const [localFiles, localSetFiles] = useState<File[]>([]);

  const { submitRequest, isSubmitting } = useFeatureRequests();

  // Use props or local state
  const title = propTitle !== undefined ? propTitle : localTitle;
  const setTitle = propSetTitle || localSetTitle;
  const description = propDescription !== undefined ? propDescription : localDescription;
  const setDescription = propSetDescription || localSetDescription;
  const files = propFiles !== undefined ? propFiles : localFiles;
  const setFiles = propSetFiles || localSetFiles;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    submitRequest(
      { 
        title: title.trim(), 
        description: description.trim(),
        attachments: files.length > 0 ? files : undefined,
      },
      {
        onSuccess: () => {
          // Only clear if using local state
          if (!propTitle) {
            localSetTitle('');
            localSetDescription('');
            localSetFiles([]);
          }
          onSuccess?.();
        },
      }
    );
  };

  const characterCount = description.length;
  const maxCharacters = 2000;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief title for your feature idea"
          maxLength={200}
          required
        />
        <p className="text-xs text-muted-foreground">
          {title.length}/200 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your feature request in detail... What problem does it solve? How would it work?"
          rows={6}
          maxLength={maxCharacters}
          required
        />
        <p className="text-xs text-muted-foreground">
          {characterCount}/{maxCharacters} characters
        </p>
      </div>

      <div className="space-y-2">
        <Label>Visual Mockups (Optional) 💡</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Visual mockups help us understand your vision better!
        </p>
        <FileUploadArea 
          files={files} 
          setFiles={setFiles} 
          maxFiles={3}
          screenshotMode={true}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || !title.trim() || !description.trim()}
      >
        {isSubmitting ? 'Submitting...' : '🚀 Submit Feature Request'}
      </Button>
    </form>
  );
};
