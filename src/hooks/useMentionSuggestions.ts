import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MentionUser {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export function useMentionSuggestions(query: string) {
  return useQuery({
    queryKey: ['mention-suggestions', query],
    queryFn: async () => {
      if (!query || query.length < 1) {
        // If no query, return recent/popular users
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .limit(10);
        
        if (error) throw error;
        return data as MentionUser[];
      }

      // Search for users matching the query
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${query}%`)
        .limit(10);
      
      if (error) throw error;
      return data as MentionUser[];
    },
    enabled: true,
  });
}
