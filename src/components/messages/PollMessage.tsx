import { usePoll } from "@/hooks/usePoll";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Check, Users } from "lucide-react";

interface PollMessageProps {
  pollId: string;
  messageId: string;
}

export const PollMessage = ({ pollId }: PollMessageProps) => {
  const { user } = useAuth();
  const { poll, votes, vote, isVoting } = usePoll(pollId);

  if (!poll) {
    return <div className="text-sm text-muted-foreground">Loading poll...</div>;
  }

  const userVotes = votes.filter((v) => v.user_id === user?.id).map((v) => v.option_id);
  const totalVotes = votes.length;

  const getVoteCount = (optionId: string) => {
    return votes.filter((v) => v.option_id === optionId).length;
  };

  const getVotePercentage = (optionId: string) => {
    if (totalVotes === 0) return 0;
    return Math.round((getVoteCount(optionId) / totalVotes) * 100);
  };

  const hasVoted = userVotes.length > 0;
  const isClosed = poll.closed || (poll.expires_at && new Date(poll.expires_at) < new Date());

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3 max-w-md shadow-sm">
      <div className="flex items-start gap-2">
        <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
          <span className="text-lg">📊</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">{poll.question}</p>
        </div>
      </div>

      <div className="space-y-2">
        {poll.options.map((option: any) => {
          const voteCount = getVoteCount(option.id);
          const percentage = getVotePercentage(option.id);
          const isSelected = userVotes.includes(option.id);

          return (
            <div key={option.id}>
              <Button
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "w-full justify-start h-auto p-0 overflow-hidden relative",
                  isSelected && "bg-blue-500 hover:bg-blue-600 border-blue-500"
                )}
                onClick={() => !isClosed && vote(option.id)}
                disabled={isVoting || isClosed}
              >
                {/* Background progress bar */}
                {hasVoted && (
                  <div
                    className={cn(
                      "absolute inset-0 transition-all duration-300",
                      isSelected
                        ? "bg-blue-600/30"
                        : "bg-muted"
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative flex items-center justify-between w-full p-3 gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isSelected && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                    <span className="text-sm truncate">{option.text}</span>
                  </div>

                  {hasVoted && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-medium">
                        {voteCount}
                      </span>
                      <span className="text-xs opacity-70">
                        {percentage}%
                      </span>
                    </div>
                  )}
                </div>
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
        <Users className="h-3 w-3" />
        <span>
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
        {poll.allow_multiple && (
          <>
            <span>•</span>
            <span>Multiple choice</span>
          </>
        )}
        {isClosed && (
          <>
            <span>•</span>
            <span className="text-destructive">Closed</span>
          </>
        )}
      </div>
    </div>
  );
};
