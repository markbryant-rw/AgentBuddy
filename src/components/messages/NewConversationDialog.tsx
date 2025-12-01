import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConversations } from "@/hooks/useConversations";
import { Loader2 } from "lucide-react";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
  onConversationCreated,
}: NewConversationDialogProps) {
  const { user } = useAuth();
  const { members: teamMembers = [] } = useTeamMembers();
  const { createDirectConversation, createGroupConversation } = useConversations();
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch friends
  const { data: friends = [] } = useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("friend_connections")
        .select(`
          friend_id,
          profiles:friend_id (id, full_name, avatar_url, email)
        `)
        .eq("user_id", user.id)
        .eq("accepted", true);

      if (error) throw error;

      return data.map((f) => f.profiles).filter(Boolean);
    },
    enabled: !!user,
  });

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      if (selectedUsers.length === 1) {
        // Create direct conversation
        const conversationId = await createDirectConversation(selectedUsers[0]);
        onConversationCreated(conversationId);
      } else {
        // Create group conversation
        if (!groupTitle.trim()) {
          alert("Please enter a group name");
          return;
        }
        const conversationId = await createGroupConversation({
          title: groupTitle,
          participantIds: selectedUsers,
        });
        onConversationCreated(conversationId);
      }
      
      // Reset state
      setSelectedUsers([]);
      setGroupTitle("");
    } finally {
      setIsCreating(false);
    }
  };

  const allUsers = [
    ...teamMembers.map((tm) => ({ ...tm, source: 'team' })),
    ...(friends as any[]).map((f) => ({ ...f, source: 'friends' })),
  ].filter((u) => u.user_id !== user?.id && u.id !== user?.id);

  // Remove duplicates
  const uniqueUsers = allUsers.reduce((acc, current) => {
    const userId = current.user_id || current.id;
    if (!acc.find((u) => (u.user_id || u.id) === userId)) {
      acc.push(current);
    }
    return acc;
  }, [] as any[]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {selectedUsers.length > 1 && (
            <div>
              <Label htmlFor="group-title">Group Name</Label>
              <Input
                id="group-title"
                placeholder="Enter group name..."
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label>Select people to message</Label>
            <ScrollArea className="h-[300px] mt-2 border rounded-lg">
              <div className="p-4 space-y-3">
                {uniqueUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No team members or friends available
                  </p>
                ) : (
                  uniqueUsers.map((person) => {
                    const userId = person.user_id || person.id;
                    const name = person.full_name || person.email;
                    const avatar = person.avatar_url;

                    return (
                      <div
                        key={userId}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => toggleUser(userId)}
                      >
                        <Checkbox
                          checked={selectedUsers.includes(userId)}
                          onCheckedChange={() => toggleUser(userId)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={avatar || undefined} />
                          <AvatarFallback>
                            {name?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">
                            {person.source === 'team' ? 'Team Member' : 'Friend'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={selectedUsers.length === 0 || isCreating}
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {selectedUsers.length > 1 ? 'Create Group' : 'Start Chat'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
