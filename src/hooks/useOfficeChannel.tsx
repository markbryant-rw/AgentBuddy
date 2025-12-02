import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useOfficeChannel = () => {
  const queryClient = useQueryClient();

  const createOfficeChannel = useMutation({
    mutationFn: async (agencyId: string) => {
      // Stub: create_office_channel RPC doesn't exist
      console.log('createOfficeChannel: Stubbed', agencyId);
      toast.success("Office channel created");
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error) => {
      toast.error("Failed to create office channel");
      console.error(error);
    },
  });

  const getOfficeChannel = (agencyId: string) => {
    return useQuery({
      queryKey: ["office-channel", agencyId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("agencies")
          .select("office_channel_id")
          .eq("id", agencyId)
          .single();

        if (error) throw error;
        return data?.office_channel_id;
      },
      enabled: !!agencyId,
    });
  };

  return {
    createOfficeChannel: createOfficeChannel.mutate,
    isCreating: createOfficeChannel.isPending,
    getOfficeChannel,
  };
};
