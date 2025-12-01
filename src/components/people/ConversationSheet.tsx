import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConversationView } from '@/components/messages/ConversationView';

interface ConversationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  recipientName?: string;
}

export function ConversationSheet({ 
  open, 
  onOpenChange, 
  conversationId,
  recipientName 
}: ConversationSheetProps) {
  if (!conversationId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>
            {recipientName ? `Message ${recipientName}` : 'Message'}
          </SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-5rem)] flex flex-col">
          <ConversationView conversationId={conversationId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
