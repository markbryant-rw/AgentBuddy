import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Stub implementation - polls feature not yet implemented
interface PollOption {
  id: string;
  text: string;
}

interface Poll {
  id: string;
  message_id: string;
  question: string;
  options: PollOption[];
  allow_multiple: boolean;
  created_at: string;
  expires_at: string | null;
  closed: boolean;
}

interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_id: string;
  created_at: string;
}

export const usePoll = (pollId: string | null) => {
  const queryClient = useQueryClient();

  const { data: poll } = useQuery({
    queryKey: ["poll", pollId],
    queryFn: async (): Promise<Poll | null> => {
      // Polls feature not yet implemented
      return null;
    },
    enabled: !!pollId,
  });

  const { data: votes = [] } = useQuery({
    queryKey: ["poll-votes", pollId],
    queryFn: async (): Promise<PollVote[]> => {
      // Polls feature not yet implemented
      return [];
    },
    enabled: !!pollId,
  });

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      toast.info("Polls feature coming soon");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["poll-votes", pollId] });
    },
    onError: (error) => {
      toast.error("Failed to vote");
      console.error(error);
    },
  });

  return {
    poll,
    votes,
    vote: voteMutation.mutate,
    isVoting: voteMutation.isPending,
  };
};

export const useCreatePoll = () => {
  return useMutation({
    mutationFn: async ({
      messageId,
      question,
      options,
      allowMultiple,
      expiresAt,
    }: {
      messageId: string;
      question: string;
      options: string[];
      allowMultiple: boolean;
      expiresAt?: Date;
    }) => {
      toast.info("Polls feature coming soon");
      return null;
    },
    onError: (error) => {
      toast.error("Failed to create poll");
      console.error(error);
    },
  });
};
