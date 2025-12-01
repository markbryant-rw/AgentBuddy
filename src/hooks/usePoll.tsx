import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

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
    queryFn: async () => {
      if (!pollId) return null;

      const { data, error } = await supabase
        .from("message_polls")
        .select("*")
        .eq("id", pollId)
        .single();

      if (error) throw error;
      return data as unknown as Poll;
    },
    enabled: !!pollId,
  });

  const { data: votes = [] } = useQuery({
    queryKey: ["poll-votes", pollId],
    queryFn: async () => {
      if (!pollId) return [];

      const { data, error } = await supabase
        .from("poll_votes")
        .select("*")
        .eq("poll_id", pollId);

      if (error) throw error;
      return data as PollVote[];
    },
    enabled: !!pollId,
  });

  // Real-time subscription for votes
  useEffect(() => {
    if (!pollId) return;

    const channel = supabase
      .channel(`poll-votes:${pollId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_votes",
          filter: `poll_id=eq.${pollId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["poll-votes", pollId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, queryClient]);

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      const { error } = await supabase.rpc("vote_on_poll", {
        p_poll_id: pollId,
        p_option_id: optionId,
      });

      if (error) throw error;
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
  const queryClient = useQueryClient();

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
      const pollOptions = options.map((text, index) => ({
        id: `option-${index}`,
        text,
      }));

      const { data, error } = await supabase
        .from("message_polls")
        .insert({
          message_id: messageId,
          question,
          options: pollOptions,
          allow_multiple: allowMultiple,
          expires_at: expiresAt?.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Poll created");
    },
    onError: (error) => {
      toast.error("Failed to create poll");
      console.error(error);
    },
  });
};
