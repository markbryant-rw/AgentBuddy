import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';

interface DirectMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export const DirectMessageDialog = ({ open, onOpenChange, userId, userName }: DirectMessageDialogProps) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const handleSend = async () => {
    if (!message.trim()) return;

    setSending(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get or create conversation
      const { data: conversationId, error: convError } = await supabase
        .rpc('get_or_create_direct_conversation', {
          user1_id: user.id,
          user2_id: userId,
        });

      if (convError) throw convError;

      // Send message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          author_id: user.id,
          content: message,
          message_type: 'text',
        });

      if (msgError) throw msgError;

      toast.success('Message sent successfully');
      setMessage('');
      onOpenChange(false);
      
      // Navigate to messages
      navigate(`/messages?conversation=${conversationId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Message to {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            rows={6}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={!message.trim() || sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
