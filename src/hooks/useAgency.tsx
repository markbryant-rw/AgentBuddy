import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Agency {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  logo_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface AgencyContextType {
  agency: Agency | null;
  loading: boolean;
  isSuperAdmin: boolean;
  updateAgency: (updates: { name?: string; bio?: string }) => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  refreshAgency: () => Promise<void>;
}

const AgencyContext = createContext<AgencyContextType>({
  agency: null,
  loading: true,
  isSuperAdmin: false,
  updateAgency: async () => {},
  uploadLogo: async () => {},
  refreshAgency: async () => {},
});

export const useAgency = () => {
  const context = useContext(AgencyContext);
  if (!context) {
    throw new Error('useAgency must be used within AgencyProvider');
  }
  return context;
};

export const AgencyProvider = ({ children }: { children: React.ReactNode }) => {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { user } = useAuth();

  const fetchAgency = useCallback(async () => {
    if (!user) {
      setAgency(null);
      setLoading(false);
      return;
    }

    try {
      const { data: teamMember, error: memberError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (memberError || !teamMember) {
        setAgency(null);
        setLoading(false);
        return;
      }

      const { data: team, error: teamError } = await supabase
        .from('teams' as any)
        .select('agency_id')
        .eq('id', teamMember.team_id)
        .single();

      if (teamError || !(team as any)?.agency_id) {
        setAgency(null);
        setLoading(false);
        return;
      }

      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies' as any)
        .select('*')
        .eq('id', (team as any).agency_id)
        .single();

      if (agencyError) {
        console.error('Error fetching agency:', agencyError);
        setAgency(null);
      } else {
        setAgency(agencyData as any as Agency);
      }

      const { data: teamMemberData } = await supabase
        .from('team_members')
        .select('access_level')
        .eq('user_id', user.id)
        .single();

      setIsSuperAdmin(teamMemberData?.access_level === 'admin' || false);
    } catch (error) {
      console.error('Error in fetchAgency:', error);
      setAgency(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAgency();
  }, [fetchAgency]);

  const updateAgency = async (updates: { name?: string; bio?: string }) => {
    if (!agency) {
      toast.error('No agency found');
      return;
    }

    try {
      const { error } = await supabase
        .from('agencies' as any)
        .update(updates)
        .eq('id', agency.id);

      if (error) throw error;

      setAgency({ ...agency, ...updates });
      toast.success('Agency updated successfully');
    } catch (error) {
      console.error('Error updating agency:', error);
      toast.error('Failed to update agency');
      throw error;
    }
  };

  const uploadLogo = async (file: File) => {
    if (!agency) {
      toast.error('No agency found');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${agency.id}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('agency-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('agency-logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('agencies' as any)
        .update({ logo_url: publicUrl })
        .eq('id', agency.id);

      if (updateError) throw updateError;

      setAgency({ ...agency, logo_url: publicUrl });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
      throw error;
    }
  };

  const refreshAgency = async () => {
    await fetchAgency();
  };

  return (
    <AgencyContext.Provider value={{ agency, loading, isSuperAdmin, updateAgency, uploadLogo, refreshAgency }}>
      {children}
    </AgencyContext.Provider>
  );
};
