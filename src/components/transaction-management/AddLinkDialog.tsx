import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { TransactionLink } from '@/hooks/useTransactions';

interface AddLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (link: TransactionLink) => void;
}

export const AddLinkDialog = ({ open, onOpenChange, onSave }: AddLinkDialogProps) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  const handleSave = () => {
    // Validation
    if (!title.trim()) {
      toast.error('Please enter a link title');
      return;
    }

    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    // Basic URL validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('URL must start with http:// or https://');
      return;
    }

    // Create new link
    const newLink: TransactionLink = {
      id: crypto.randomUUID(),
      title: title.trim(),
      url: url.trim(),
      created_at: new Date().toISOString(),
    };

    onSave(newLink);
    
    // Reset form and close
    setTitle('');
    setUrl('');
    onOpenChange(false);
    toast.success('Link added successfully');
  };

  const handleCancel = () => {
    setTitle('');
    setUrl('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Link</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Link Title</Label>
            <Input
              id="title"
              placeholder="e.g., Google Drive Folder"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">Link URL</Label>
            <Input
              id="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
