import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
      // Feature not yet implemented - return empty array
      return [] as TagLibraryItem[];
    },
    enabled: !!team?.id,
  });

  const createTag = useMutation({
    mutationFn: async (_tag: Omit<TagLibraryItem, "id" | "created_at" | "usage_count" | "created_by">) => {
      toast({
        title: "Feature coming soon",
        description: "Tag library is not yet implemented",
      });
      throw new Error("Not implemented");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-library"] });
    },
  });

  const updateTag = useMutation({
    mutationFn: async (_params: Partial<TagLibraryItem> & { id: string }) => {
      throw new Error("Not implemented");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-library"] });
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (_id: string) => {
      throw new Error("Not implemented");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tag-library"] });
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
