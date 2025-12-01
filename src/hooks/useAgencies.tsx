import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Agency {
  id: string;
  name: string;
  slug: string;
}

export const useAgencies = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgencies();
  }, []);

  const fetchAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name, slug')
        .order('name');

      if (error) throw error;
      
      // Filter out Independent Agents from the list
      const filteredAgencies = (data || []).filter(
        agency => agency.slug !== 'independent-agents'
      );
      
      setAgencies(filteredAgencies);
    } catch (error) {
      console.error('Error fetching agencies:', error);
      setAgencies([]);
    } finally {
      setLoading(false);
    }
  };

  return { agencies, loading };
};
