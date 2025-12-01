import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User } from "lucide-react";

interface AssigneeAvatarProps {
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
  size?: "sm" | "md";
  onClick?: () => void;
}

export const AssigneeAvatar = ({ assignee, size = "sm", onClick }: AssigneeAvatarProps) => {
  const sizeClasses = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!assignee) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className={`${sizeClasses} cursor-pointer bg-muted`} onClick={onClick}>
              <AvatarFallback className="bg-muted text-muted-foreground">
                <User className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>
            <p>Unassigned</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className={`${sizeClasses} cursor-pointer`} onClick={onClick}>
            {assignee.avatar_url && (
              <AvatarImage src={assignee.avatar_url} alt={assignee.full_name || "User"} />
            )}
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {getInitials(assignee.full_name)}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent>
          <p>{assignee.full_name || "Unknown User"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
