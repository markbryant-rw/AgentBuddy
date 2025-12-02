import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTeam } from './useTeam';
import { useFinancialYear } from './useFinancialYear';
import { toast } from 'sonner';

export interface QuarterlyReview {
  id: string;
  team_id: string;
  user_id: string | null;
  quarter: string;
  year: number;
  review_type: 'team' | 'individual';
  wins: string | null;
  challenges: string | null;
  lessons_learned: string | null;
  action_items: string | null;
  achievements: string | null;
  areas_for_improvement: string | null;
  goals_for_next_quarter: string | null;
  performance_notes: string | null;
  completed: boolean;
  created_by: string;
  created_at: string;
}

export const useQuarterlyReview = (quarter?: number, year?: number) => {
  const { user } = useAuth();
  const { team } = useTeam();
  const { currentQuarter } = useFinancialYear();
  
  const [review, setReview] = useState<QuarterlyReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsReview, setNeedsReview] = useState(false);
  
  const targetQuarter = quarter || currentQuarter.quarter;
  const targetYear = year || currentQuarter.year;
  const quarterString = `Q${targetQuarter}`;
  
  const ensureReviewTask = async () => {
    if (!user || !team || !needsReview) return;
    
    try {
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('id, completed')
        .eq('team_id', team.id)
        .ilike('title', 'Complete Quarterly Review%')
        .order('created_at', { ascending: false });
      
      const incompleteTask = existingTasks?.find(task => !task.completed);
      if (incompleteTask) return;
      
      await supabase
        .from('tasks')
        .insert({
          team_id: team.id,
          title: 'Complete Quarterly Review',
          description: `Complete your ${quarterString} ${targetYear} quarterly review and set goals for the upcoming quarter.`,
          created_by: user.id,
          priority: 'high',
          status: 'todo',
          due_date: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Failed to create review task:', error);
    }
  };

  const taskCreationRef = useRef(false);

  useEffect(() => {
    if (user && team) {
      fetchReview();
      checkNeedsReview();
    }
  }, [user, team, targetQuarter, targetYear]);
  
  useEffect(() => {
    if (needsReview && user && team && !taskCreationRef.current) {
      taskCreationRef.current = true;
      ensureReviewTask();
    }
    
    if (!needsReview) {
      taskCreationRef.current = false;
    }
  }, [needsReview, user, team]);
  
  const fetchReview = async () => {
    if (!user || !team) return;
    
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('quarterly_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('team_id', team.id)
      .eq('quarter', quarterString)
      .eq('year', targetYear)
      .eq('review_type', 'individual')
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching review:', error);
    } else {
      setReview(data as QuarterlyReview | null);
    }
    
    setLoading(false);
  };
  
  const checkNeedsReview = async () => {
    if (!user || !team) return;
    
    // Simple check: does a completed review exist for this quarter?
    const { data } = await (supabase as any)
      .from('quarterly_reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('team_id', team.id)
      .eq('quarter', quarterString)
      .eq('year', targetYear)
      .eq('completed', true)
      .maybeSingle();
    
    setNeedsReview(!data);
  };
  
  const saveReview = async (reviewData: Partial<QuarterlyReview>) => {
    if (!user || !team) return;
    
    const dataToSave = {
      ...reviewData,
      team_id: team.id,
      user_id: user.id,
      quarter: quarterString,
      year: targetYear,
      review_type: 'individual' as const,
      created_by: user.id
    };
    
    if (review) {
      const { error } = await (supabase as any)
        .from('quarterly_reviews')
        .update(dataToSave)
        .eq('id', review.id);
      
      if (error) {
        toast.error('Failed to save review');
        throw error;
      }
    } else {
      const { error } = await (supabase as any)
        .from('quarterly_reviews')
        .insert(dataToSave);
      
      if (error) {
        toast.error('Failed to create review');
        throw error;
      }
    }
    
    toast.success('Review saved successfully');
    await fetchReview();
    await checkNeedsReview();
  };
  
  const completeReview = async () => {
    if (!user || !team) return;
    
    try {
      if (review) {
        const { error } = await (supabase as any)
          .from('quarterly_reviews')
          .update({ completed: true })
          .eq('id', review.id);
        
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('quarterly_reviews')
          .insert({
            team_id: team.id,
            user_id: user.id,
            quarter: quarterString,
            year: targetYear,
            review_type: 'individual',
            completed: true,
            created_by: user.id,
          });
        
        if (error) throw error;
      }
      
      // Complete the associated task
      const { data: reviewTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('team_id', team.id)
        .eq('title', 'Complete Quarterly Review')
        .eq('completed', false)
        .maybeSingle();
      
      if (reviewTask) {
        await supabase
          .from('tasks')
          .update({
            completed: true,
            completed_at: new Date().toISOString(),
            status: 'done',
          })
          .eq('id', reviewTask.id);
      }
      
      // Mark associated notification as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('type', 'quarterly_review')
        .eq('is_read', false);
      
      toast.success('Quarterly review completed!');
      await fetchReview();
      await checkNeedsReview();
    } catch (error) {
      toast.error('Failed to complete review');
      throw error;
    }
  };
  
  const refreshReview = async () => {
    await fetchReview();
    await checkNeedsReview();
  };
  
  return {
    review,
    loading,
    needsReview,
    saveReview,
    completeReview,
    refreshReview
  };
};