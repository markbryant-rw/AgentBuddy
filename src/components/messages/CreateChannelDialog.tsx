import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useChannelManagement } from "@/hooks/useChannelManagement";
import { Hash, Megaphone } from "lucide-react";

interface CreateChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelCreated: (conversationId: string) => void;
}

export function CreateChannelDialog({ open, onOpenChange, onChannelCreated }: CreateChannelDialogProps) {
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState<"standard" | "announcement">("standard");
  const [icon, setIcon] = useState("💬");
  const { createChannel, isCreating } = useChannelManagement();

  const handleCreate = async () => {
    if (!channelName.trim()) return;

    try {
      const conversationId = await createChannel({
        title: channelName,
        channelType,
        icon,
      });
      onChannelCreated(conversationId);
      setChannelName("");
      setIcon("💬");
      setChannelType("standard");
    } catch (error) {
      console.error("Failed to create channel:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Create a channel for your team to collaborate and communicate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="channelName">Channel Name</Label>
            <div className="flex gap-2">
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-16 text-center"
                maxLength={2}
                placeholder="😀"
              />
              <Input
                id="channelName"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="e.g. general, listings, wins"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Channel Type</Label>
            <RadioGroup value={channelType} onValueChange={(v) => setChannelType(v as any)}>
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="standard" id="standard" />
                <Label htmlFor="standard" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Standard Channel</div>
                      <div className="text-sm text-muted-foreground">Anyone can post messages</div>
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <RadioGroupItem value="announcement" id="announcement" />
                <Label htmlFor="announcement" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Announcement Channel</div>
                      <div className="text-sm text-muted-foreground">Only team leaders can post</div>
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!channelName.trim() || isCreating}>
            {isCreating ? "Creating..." : "Create Channel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
