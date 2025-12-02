import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface Team {
  id: string;
  name: string;
  bio: string | null;
  description?: string | null;
  logo_url: string | null;
  team_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  uses_financial_year: boolean;
  financial_year_start_month: number;
  is_personal_team?: boolean;
}

interface TeamContextType {
  team: Team | null;
  loading: boolean;
  updateTeam: (updates: { name?: string; bio?: string }) => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  refreshTeam: () => Promise<void>;
}

const TeamContext = createContext<TeamContextType>({
  team: null,
  loading: true,
  updateTeam: async () => {},
  uploadLogo: async () => {},
  refreshTeam: async () => {},
});

export const useTeam = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return context;
};

export const TeamProvider = ({ children }: { children: React.ReactNode }) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchTeam = useCallback(async () => {
    if (!user) {
      setTeam(null);
      setLoading(false);
      return;
    }

    try {
      // Direct query without timeout wrapper
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('primary_team_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setTeam(null);
        setLoading(false);
        return;
      }

      if (!profile?.primary_team_id) {
        console.log('No primary_team_id found for user', user.id);
        setTeam(null);
        setLoading(false);
        return;
      }

      // Then fetch the actual team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', profile.primary_team_id)
        .maybeSingle();

      if (teamError) {
        console.error('Error fetching team:', teamError);
        setTeam(null);
      } else if (teamData) {
        // Map description to bio if bio is not set
        setTeam({
          ...teamData,
          bio: teamData.bio || teamData.description || null,
        });
      } else {
        setTeam(null);
      }
    } catch (error) {
      console.error('Error in fetchTeam:', error);
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const updateTeam = async (updates: { name?: string; bio?: string }) => {
    if (!team) {
      toast.error('No team found');
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', team.id);

      if (error) throw error;

      setTeam({ ...team, ...updates });
      toast.success('Team updated successfully');
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Failed to update team');
      throw error;
    }
  };

  const uploadLogo = async (file: File) => {
    if (!team) {
      toast.error('No team found');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${team.id}.${fileExt}`;
      const filePath = fileName;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('team-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('team-logos')
        .getPublicUrl(filePath);

      // Update team record
      const { error: updateError } = await supabase
        .from('teams')
        .update({ logo_url: publicUrl })
        .eq('id', team.id);

      if (updateError) throw updateError;

      setTeam({ ...team, logo_url: publicUrl });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
      throw error;
    }
  };

  const refreshTeam = async () => {
    await fetchTeam();
  };

  return (
    <TeamContext.Provider value={{ team, loading, updateTeam, uploadLogo, refreshTeam }}>
      {children}
    </TeamContext.Provider>
  );
};