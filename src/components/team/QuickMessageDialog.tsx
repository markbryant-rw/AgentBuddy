import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

interface QuickMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
}

export function QuickMessageDialog({ open, onOpenChange, recipient }: QuickMessageDialogProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    toast.info("Direct messaging is coming soon! We're building this feature.");
    // Don't close dialog - let user see the message
  };

  const handleClose = () => {
    setMessage('');
    onOpenChange(false);
  };

  if (!recipient) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={recipient.avatar_url || ''} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {recipient.full_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <span>Message to {recipient.full_name}</span>
              <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Send a quick message to your team member
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px] resize-none"
          />
          <div className="text-xs text-muted-foreground text-right">
            {message.length} characters
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!message.trim()} className="gap-2">
            <Send className="h-4 w-4" />
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
