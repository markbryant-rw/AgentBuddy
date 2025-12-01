import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { useAuth } from "@/hooks/useAuth";

interface EditChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentTitle: string;
  currentIcon?: string | null;
  currentDescription?: string | null;
  currentAllowMemberInvites?: boolean;
  createdBy: string;
}

const commonEmojis = ["📢", "💬", "🎯", "🚀", "💡", "🔥", "⭐", "🎉", "📝", "🏆", "💼", "🎨"];

export function EditChannelDialog({ 
  open, 
  onOpenChange, 
  conversationId, 
  currentTitle,
  currentIcon,
  currentDescription,
  currentAllowMemberInvites = true,
  createdBy
}: EditChannelDialogProps) {
  const [title, setTitle] = useState(currentTitle);
  const [icon, setIcon] = useState(currentIcon || "");
  const [description, setDescription] = useState(currentDescription || "");
  const [allowMemberInvites, setAllowMemberInvites] = useState(currentAllowMemberInvites);
  const { updateChannelName, updateChannelIcon, updateChannelDescription, updateGroupSettings } = useChannelManagement();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const isCreator = user?.id === createdBy;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (title !== currentTitle) {
        await updateChannelName({ conversationId, title });
      }
      if (icon !== currentIcon) {
        await updateChannelIcon({ conversationId, icon });
      }
      if (description !== currentDescription) {
        await updateChannelDescription({ conversationId, description });
      }
      if (isCreator && allowMemberInvites !== currentAllowMemberInvites) {
        await updateGroupSettings({ conversationId, allowMemberInvites });
      }
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Channel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel Name</Label>
            <Input
              id="channel-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter channel name"
            />
          </div>

          <div className="space-y-2">
            <Label>Channel Icon</Label>
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Enter emoji or leave empty"
                className="flex-1"
                maxLength={2}
              />
              {icon && (
                <Button variant="outline" size="sm" onClick={() => setIcon("")}>
                  Clear
                </Button>
              )}
            </div>
            <div className="grid grid-cols-6 gap-2">
              {commonEmojis.map((emoji) => (
                <Button
                  key={emoji}
                  variant={icon === emoji ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIcon(emoji)}
                  className="text-lg"
                >
                  {emoji}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-description">Description (optional)</Label>
            <Textarea
              id="channel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group for?"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/200 characters
            </p>
          </div>

          {isCreator && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Group Settings</h4>
                
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="space-y-0.5">
                    <Label htmlFor="member-invites" className="cursor-pointer">
                      Allow members to add others
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      When off, only admins can add new members
                    </p>
                  </div>
                  <Switch
                    id="member-invites"
                    checked={allowMemberInvites}
                    onCheckedChange={setAllowMemberInvites}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}