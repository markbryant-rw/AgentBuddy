import { memo } from "react";
import { Heart, ThumbsUp, Trophy, Flame, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReactionType } from "@/hooks/useSocialPosts";
import { cn } from "@/lib/utils";

const reactionIcons = {
  like: { icon: ThumbsUp, label: "Like", color: "text-blue-500" },
  love: { icon: Heart, label: "Love", color: "text-red-500" },
  celebrate: { icon: PartyPopper, label: "Celebrate", color: "text-purple-500" },
  support: { icon: Trophy, label: "Support", color: "text-amber-500" },
  fire: { icon: Flame, label: "Fire", color: "text-orange-500" },
};

interface ReactionBarProps {
  reactions: Array<{ user_id: string; reaction_type: ReactionType }>;
  currentUserId?: string;
  onReact: (type: ReactionType) => void;
  compact?: boolean;
}

const ReactionBarComponent = ({ reactions, currentUserId, onReact, compact = false }: ReactionBarProps) => {
  // Count reactions by type
  const reactionCounts = reactions.reduce((acc, r) => {
    acc[r.reaction_type] = (acc[r.reaction_type] || 0) + 1;
    return acc;
  }, {} as Record<ReactionType, number>);

  // Check user's reaction
  const userReaction = reactions.find(r => r.user_id === currentUserId)?.reaction_type;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {(Object.entries(reactionIcons) as [ReactionType, typeof reactionIcons.like][]).map(([type, { icon: Icon, label, color }]) => {
        const count = reactionCounts[type] || 0;
        const isActive = userReaction === type;

        return (
          <Button
            key={type}
            variant="ghost"
            size={compact ? "sm" : "default"}
            onClick={() => onReact(type)}
            className={cn(
              "gap-1.5 transition-all",
              isActive && "bg-accent",
              count > 0 && !isActive && "hover:bg-accent/50"
            )}
          >
            <Icon className={cn("h-4 w-4", isActive ? color : "text-muted-foreground")} />
            {!compact && <span className="text-xs">{label}</span>}
            {count > 0 && (
              <span className={cn("text-xs font-medium", isActive ? color : "text-muted-foreground")}>
                {count}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export const ReactionBar = memo(ReactionBarComponent);
