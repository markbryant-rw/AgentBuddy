import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useState, useEffect } from 'react';

interface SearchFilters {
  tags?: string[];
  owner_id?: string;
  date_from?: string;
  date_to?: string;
}

export const useNoteSearch = (searchQuery: string, filters?: SearchFilters) => {
  const { user } = useAuth();
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['note-search', debouncedQuery, filters],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return [];
      }

      // Use PostgreSQL full-text search
      let query = supabase
        .from('notes')
        .select(`
          *,
          profiles:owner_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .textSearch('search_vector', debouncedQuery, {
          type: 'websearch',
          config: 'english',
        })
        .is('archived_at', null)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (filters?.tags && filters.tags.length > 0) {
        query = query.contains('tags', filters.tags);
      }

      if (filters?.owner_id) {
        query = query.eq('owner_id', filters.owner_id);
      }

      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && debouncedQuery.length >= 2,
  });

  return {
    results,
    isLoading,
    isSearching: searchQuery !== debouncedQuery,
  };
};
