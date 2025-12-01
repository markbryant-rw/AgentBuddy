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
  quarter: number;
  year: number;
  review_type: 'team' | 'individual';
  wins: string | null;
  challenges: string | null;
  lessons_learned: string | null;
  action_items: string | null;
  performance_data: any;
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
  
  const ensureReviewTask = async () => {
    if (!user || !team || !needsReview) return;
    
    try {
      // Check if ANY task already exists (completed or not) for this quarter
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('id, completed')
        .eq('team_id', team.id)
        .ilike('title', 'Complete Quarterly Review%')
        .order('created_at', { ascending: false });
      
      // If there are any incomplete quarterly review tasks, don't create a new one
      const incompleteTask = existingTasks?.find(task => !task.completed);
      if (incompleteTask) return;
      
      // If there's a completed task, we can create a new one for the new quarter
      // But only if we confirmed needsReview is true (meaning it's a new quarter)
      
      // Create task with quarter info in description
      await supabase
        .from('tasks')
        .insert({
          team_id: team.id,
          title: 'Complete Quarterly Review',
          description: `Complete your Q${targetQuarter} ${targetYear} quarterly review and set goals for the upcoming quarter.`,
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
    // Only attempt to create task once per mount
    if (needsReview && user && team && !taskCreationRef.current) {
      taskCreationRef.current = true;
      ensureReviewTask();
      
      // Auto-create quarterly review notification
      const createNotification = async () => {
        try {
          await supabase.rpc('create_quarterly_review_notification', {
            _user_id: user.id,
            _team_id: team.id,
          });
        } catch (error) {
          console.error('Failed to create quarterly review notification:', error);
        }
      };
      createNotification();
    }
    
    // Reset when needsReview becomes false
    if (!needsReview) {
      taskCreationRef.current = false;
    }
  }, [needsReview, user, team]);
  
  const fetchReview = async () => {
    if (!user || !team) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('quarterly_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('team_id', team.id)
      .eq('quarter', targetQuarter)
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
    
    const { data, error } = await supabase.rpc('needs_quarterly_review', {
      _user_id: user.id,
      _team_id: team.id
    });
    
    if (!error) {
      setNeedsReview(data);
    }
  };
  
  const saveReview = async (reviewData: Partial<QuarterlyReview>) => {
    if (!user || !team) return;
    
    const dataToSave = {
      ...reviewData,
      team_id: team.id,
      user_id: user.id,
      quarter: targetQuarter,
      year: targetYear,
      review_type: 'individual' as const,
      created_by: user.id
    };
    
    if (review) {
      const { error } = await supabase
        .from('quarterly_reviews')
        .update(dataToSave)
        .eq('id', review.id);
      
      if (error) {
        toast.error('Failed to save review');
        throw error;
      }
    } else {
      const { error } = await supabase
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
        // Update existing review
        const { error } = await supabase
          .from('quarterly_reviews')
          .update({ completed: true })
          .eq('id', review.id);
        
        if (error) throw error;
      } else {
        // Create new review marked as complete
        const { error } = await supabase
          .from('quarterly_reviews')
          .insert({
            team_id: team.id,
            user_id: user.id,
            quarter: targetQuarter,
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
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('type', 'quarterly_review')
        .eq('read', false);
      
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
