import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTeam } from "./useTeam";

export interface TagLibraryItem {
  id: string;
  team_id: string;
  name: string;
  color: string;
  icon?: string;
  category?: string;
  usage_count: number;
  created_at: string;
  created_by?: string;
}

export const useTagLibrary = () => {
  const { team } = useTeam();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["tag-library", team?.id],
    queryFn: async () => {
      if (!team?.id) return [];

      const { data, error } = await supabase
        .from("tag_library")
        .select("*")
        .eq("team_id", team.id)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as TagLibraryItem[];
    },
    enabled: !!team?.id,
  });

  const createTag = useMutation({
    mutationFn: async (tag: Omit<TagLibraryItem, "id" | "created_at" | "usage_count" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("tag_library")
        .insert({
          ...tag,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-library"] });
      toast({
        title: "Tag created",
        description: "New tag added to library",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTag = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TagLibraryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("tag_library")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-library"] });
      toast({
        title: "Tag updated",
        description: "Tag has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tag_library")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-library"] });
      toast({
        title: "Tag deleted",
        description: "Tag removed from library",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    tags,
    isLoading,
    createTag,
    updateTag,
    deleteTag,
  };
};
