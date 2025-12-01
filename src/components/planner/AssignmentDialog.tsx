import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { DailyPlannerItem } from '@/hooks/useDailyPlanner';

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: DailyPlannerItem | null;
  onSave: (itemId: string, userIds: string[]) => void;
}

export function AssignmentDialog({ 
  open, 
  onOpenChange, 
  item,
  onSave 
}: AssignmentDialogProps) {
  const { members } = useTeamMembers();
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Reset selected users when item changes
  useEffect(() => {
    setSelectedUserIds(item?.assigned_users.map(u => u.id) || []);
  }, [item]);

  const handleToggle = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = () => {
    if (item) {
      onSave(item.id, selectedUserIds);
      onOpenChange(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to Team Members</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => handleToggle(member.id)}
            >
              <Checkbox
                checked={selectedUserIds.includes(member.id)}
                onCheckedChange={() => handleToggle(member.id)}
              />
              
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback>
                  {member.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <p className="text-sm font-medium">{member.full_name || member.email}</p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
