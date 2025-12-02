import { useQuery } from "@tanstack/react-query";

interface Playbook {
  id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  estimated_minutes: number | null;
  is_published: boolean;
  card_count?: number;
  completion_rate?: number;
}

export function useLibraryPlaybooks(libraryId: string) {
  const { data: playbooks = [], isLoading } = useQuery({
    queryKey: ['library-playbooks', libraryId],
    queryFn: async () => {
      console.log('useLibraryPlaybooks: Stubbed - returning empty array');
      return [] as Playbook[];
    },
  });

  return { playbooks, isLoading };
}
