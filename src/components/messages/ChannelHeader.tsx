import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { GroupDetailsDialog } from "./GroupDetailsDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { MessagesHeader } from "./MessagesHeader";

interface ChannelHeaderProps {
  conversationId: string;
  onBack?: () => void;
  showBackButton?: boolean;
}

export function ChannelHeader({ conversationId, onBack, showBackButton }: ChannelHeaderProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [showGroupDetails, setShowGroupDetails] = useState(false);

  const { data: conversation } = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, description, icon")
        .eq("id", conversationId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId && !!user,
  });

  // Fetch participants separately (more reliable than embedded query)
  const { data: participants } = useQuery({
    queryKey: ["channel-participants-count", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId);

      if (error) throw error;
      return data;
    },
    enabled: !!conversationId && !!user,
  });

  if (!conversation) return null;

  const participantCount = participants?.length || 0;

  return (
    <>
      <MessagesHeader
        variant="channel"
        title={conversation.title || "Channel"}
        subtitle={conversation.description || `${participantCount} ${participantCount === 1 ? 'member' : 'members'}`}
        icon={conversation.icon}
        showBackButton={showBackButton}
        onBack={onBack}
        actions={
          !isMobile ? [
            <Button 
              key="details"
              variant="ghost" 
              size="sm"
              onClick={() => setShowGroupDetails(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              Details
            </Button>
          ] : undefined
        }
      />

      <GroupDetailsDialog
        open={showGroupDetails}
        onOpenChange={setShowGroupDetails}
        conversationId={conversationId}
      />
    </>
  );
}
