import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AftercareTaskAssigneeProps {
  taskId: string;
  assignedTo: string | null;
  pastSaleId: string;
}

export function AftercareTaskAssignee({ 
  taskId, 
  assignedTo, 
  pastSaleId 
}: AftercareTaskAssigneeProps) {
  const [open, setOpen] = useState(false);
  const { members } = useTeamMembers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const assignedMember = members.find(m => m.user_id === assignedTo);

  const handleAssign = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ assigned_to: userId })
        .eq('id', taskId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['aftercare-tasks', pastSaleId] });
      toast({ title: "Task reassigned" });
      setOpen(false);
    } catch (error: any) {
      toast({ 
        title: "Failed to reassign", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded-full hover:ring-2 hover:ring-primary/20"
          onClick={(e) => e.stopPropagation()}
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={assignedMember?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-primary/10">
              {assignedMember ? getInitials(assignedMember.full_name || 'U') : <User className="h-3 w-3" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-48 p-1 z-[12000]" 
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs font-medium text-muted-foreground px-2 py-1">
          Assign to
        </div>
        <div className="space-y-0.5">
          {members.map((member) => (
            <button
              key={member.user_id}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-muted transition-colors",
                member.user_id === assignedTo && "bg-primary/10"
              )}
              onClick={() => handleAssign(member.user_id)}
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={member.avatar_url || undefined} />
                <AvatarFallback className="text-[9px]">
                  {getInitials(member.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 text-left truncate">
                {member.full_name}
              </span>
              {member.user_id === assignedTo && (
                <Check className="h-3 w-3 text-primary" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
