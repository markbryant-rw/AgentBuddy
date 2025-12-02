import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';
import { calculateCCH } from '@/lib/cchCalculations';
import { startOfWeek, endOfWeek, format, startOfDay, endOfDay } from 'date-fns';
import { useKPITargets } from '@/hooks/useKPITargets';

export interface PersonalKPIData {
  calls: { today: number; week: number; goal: number; targetId?: string; targetStatus?: 'on-track' | 'behind' | 'at-risk' | 'complete'; progressPercent?: number };
  sms: { today: number; week: number; goal: number; targetId?: string; targetStatus?: 'on-track' | 'behind' | 'at-risk' | 'complete'; progressPercent?: number };
  appraisals: { today: number; week: number; goal: number; targetId?: string; targetStatus?: 'on-track' | 'behind' | 'at-risk' | 'complete'; progressPercent?: number };
  openHomes: { today: number; week: number; goal: number; targetId?: string; targetStatus?: 'on-track' | 'behind' | 'at-risk' | 'complete'; progressPercent?: number };
}

export interface CCHData {
  daily: number;
  weekly: number;
  dailyTarget: number;
  weeklyTarget: number;
  breakdown: {
    calls: number;
    appraisals: number;
    openHomes: number;
  };
  weeklyBreakdown: {
    calls: number;
    appraisals: number;
    openHomes: number;
  };
}

export interface TeamMemberData {
  userId: string;
  name: string;
  avatarUrl: string | null;
  kpis: PersonalKPIData;
  cch: CCHData;
  contributionPercent: {
    calls: number;
    sms: number;
    appraisals: number;
    openHomes: number;
  };
}

export interface TeamKPIData {
  aggregate: PersonalKPIData;
  cch: CCHData;
  members: TeamMemberData[];
  goals: {
    calls: number;
    sms: number;
    appraisals: number;
    openHomes: number;
  };
}

const emptyPersonalKPIData: PersonalKPIData = {
  calls: { today: 0, week: 0, goal: 0 },
  sms: { today: 0, week: 0, goal: 0 },
  appraisals: { today: 0, week: 0, goal: 0 },
  openHomes: { today: 0, week: 0, goal: 0 },
};

const emptyCCHData: CCHData = {
  daily: 0,
  weekly: 0,
  dailyTarget: 0,
  weeklyTarget: 0,
  breakdown: { calls: 0, appraisals: 0, openHomes: 0 },
  weeklyBreakdown: { calls: 0, appraisals: 0, openHomes: 0 },
};

export const useKPITrackerData = () => {
  const { user } = useAuth();
  const { team } = useTeam();
  const [personalKPIs, setPersonalKPIs] = useState<PersonalKPIData>(emptyPersonalKPIData);
  const [personalCCH, setPersonalCCH] = useState<CCHData>(emptyCCHData);
  const [teamKPIs, setTeamKPIs] = useState<TeamKPIData>({
    aggregate: emptyPersonalKPIData,
    cch: emptyCCHData,
    members: [],
    goals: { calls: 0, sms: 0, appraisals: 0, openHomes: 0 },
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Stub: Complex KPI tracker queries with missing columns
      console.log('useKPITrackerData: Stubbed - returning empty data');
      
      setPersonalKPIs(emptyPersonalKPIData);
      setPersonalCCH(emptyCCHData);
      setTeamKPIs({
        aggregate: emptyPersonalKPIData,
        cch: emptyCCHData,
        members: [],
        goals: { calls: 0, sms: 0, appraisals: 0, openHomes: 0 },
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching KPI tracker data:', error);
      setLoading(false);
    }
  }, [user, team]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    personalKPIs,
    personalCCH,
    teamKPIs,
    loading,
    refetch: fetchData,
  };
};
