import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ServiceProvider {
  id: string;
  team_id: string;
  agency_id: string | null;
  visibility_level: 'office' | 'team' | 'private';
  category_id: string | null;
  team_category_id: string | null;
  full_name: string;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  total_reviews: number;
  last_used_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  avatar_url: string | null;
  logo_url: string | null;
  provider_categories?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  team_provider_categories?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  creator?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface UseServiceProvidersOptions {
  searchQuery?: string;
  categoryId?: string;
  sortBy?: 'name' | 'rating' | 'last_used';
  sortOrder?: 'asc' | 'desc';
}

export const useServiceProviders = (options: UseServiceProvidersOptions = {}) => {
  const { user } = useAuth();
  const { searchQuery = '', categoryId, sortBy = 'name', sortOrder = 'asc' } = options;

  return useQuery({
    queryKey: ['service-providers', user?.id, searchQuery, categoryId, sortBy, sortOrder],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('service_providers')
        .select(`
          *,
          provider_categories (
            id,
            name,
            icon,
            color
          ),
          team_provider_categories (
            id,
            name,
            icon,
            color
          ),
          creator:profiles!created_by (
            id,
            full_name,
            avatar_url
          )
        `);

      // Smart search using search_vector
      if (searchQuery.trim()) {
        query = query.textSearch('search_vector', searchQuery.trim(), {
          type: 'websearch',
          config: 'english'
        });
      }

      // Category filter
      if (categoryId) {
        query = query.or(`category_id.eq.${categoryId},team_category_id.eq.${categoryId}`);
      }

      // Sorting
      if (sortBy === 'name') {
        query = query.order('full_name', { ascending: sortOrder === 'asc' });
      } else if (sortBy === 'rating') {
        query = query.order('positive_count', { ascending: sortOrder === 'asc', nullsFirst: false });
      } else if (sortBy === 'last_used') {
        query = query.order('last_used_at', { ascending: sortOrder === 'asc', nullsFirst: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map((provider: any) => ({
        ...provider,
        agency_id: provider.agency_id || null,
        visibility_level: provider.visibility_level || 'office',
      })) as ServiceProvider[];
    },
    enabled: !!user,
  });
};
