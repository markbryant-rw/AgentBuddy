import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface BugReport {
  id: string;
  user_id: string;
  team_id: string | null;
  module: string | null;
  summary: string;
  description: string;
  expected_behaviour: string | null;
  steps_to_reproduce: string | null;
  environment: Record<string, any> | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'triage' | 'investigating' | 'in_progress' | 'needs_review' | 'fixed' | 'archived';
  attachments: string[] | null;
  admin_comments: string | null;
  vote_count: number;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  archived_reason?: string | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export interface BugReportSubmission {
  summary: string;
  description: string;
  expected_behaviour?: string;
  steps_to_reproduce?: string;
  module?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  attachments?: File[];
}

export const useBugReports = (statusFilter: string = 'all') => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  // Subscribe to realtime bug reports (admin only)
  useEffect(() => {
    if (!user || profile?.active_role !== 'platform_admin') return;
    
    const channel = supabase
      .channel('bug-reports-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bug_reports'
        },
        (payload) => {
          toast.success('New Bug Report!', {
            description: payload.new.summary,
            duration: 5000,
          });
          queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile, queryClient]);

  // Fetch bug reports
  const { data: bugReports = [], isLoading: isLoadingReports } = useQuery({
    queryKey: ['bug-reports', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch profiles separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(d => d.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        return data.map(bug => ({
          ...bug,
          environment: bug.environment || {}, // Ensure it's an object
          profiles: profileMap.get(bug.user_id) as { full_name: string; email: string } | undefined
        })) as any[];
      }
      
      return [] as BugReport[];
    },
    enabled: !!user,
  });

  // Upload files to storage
  const uploadFiles = async (files: File[], userId: string): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('feedback-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('feedback-attachments')
        .getPublicUrl(fileName);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  // Capture environment data
  const captureEnvironment = () => {
    const ua = navigator.userAgent;
    return {
      browser: detectBrowser(ua),
      os: detectOS(ua),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };
  };

  // Submit bug report
  const submitBugMutation = useMutation({
    mutationFn: async (submission: BugReportSubmission) => {
      if (!user) throw new Error('User not authenticated');

      let attachmentUrls: string[] = [];
      if (submission.attachments && submission.attachments.length > 0) {
        attachmentUrls = await uploadFiles(submission.attachments, user.id);
      }

      const environment = captureEnvironment();
      const module = submission.module || detectModuleFromURL();

      const { data, error } = await (supabase as any)
        .from('bug_reports')
        .insert({
          user_id: user.id,
          summary: submission.summary,
          description: submission.description,
          expected_behaviour: submission.expected_behaviour,
          steps_to_reproduce: submission.steps_to_reproduce,
          module,
          workspace_module: submission.module || module,
          severity: submission.severity || 'medium',
          environment,
          attachments: attachmentUrls.length > 0 ? attachmentUrls : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      queryClient.invalidateQueries({ queryKey: ['bug-points'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      
      // Trigger AI analysis in background (fire and forget)
      if (data?.id) {
        supabase.functions.invoke('analyze-bug-report', {
          body: { bugId: data.id }
        }).then(result => {
          if (result.error) {
            console.error('Auto-analysis failed:', result.error);
          } else {
            console.log('Bug auto-analyzed successfully');
          }
        }).catch(err => console.error('Auto-analysis request failed:', err));
      }
      
      // Fetch user's updated total points
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_bug_points')
          .eq('id', user.id)
          .single();
        
        const totalPoints = profile?.total_bug_points || 10;
        toast.success(`🎉 Bug report submitted! +10 points`, {
          description: `Total: ${totalPoints} points. Thank you for helping us improve!`,
        });
      } else {
        toast.success('Bug report submitted successfully! Thank you for helping us improve.');
      }
    },
    onError: (error) => {
      console.error('Error submitting bug report:', error);
      toast.error('Failed to submit bug report');
    },
  });

  // Update bug report status (admin only)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ bugId, status }: { bugId: string; status: string }) => {
      const { error } = await supabase
        .from('bug_reports')
        .update({ status })
        .eq('id', bugId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      toast.success('Status updated successfully');
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    },
  });

  // Update bug report severity (admin only)
  const updateSeverityMutation = useMutation({
    mutationFn: async ({ bugId, severity }: { bugId: string; severity: string }) => {
      const { error } = await supabase
        .from('bug_reports')
        .update({ severity })
        .eq('id', bugId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      toast.success('Severity updated successfully');
    },
    onError: (error) => {
      console.error('Error updating severity:', error);
      toast.error('Failed to update severity');
    },
  });

  // Update bug report (for original reporter and admin)
  const updateBugMutation = useMutation({
    mutationFn: async ({ 
      bugId, 
      summary, 
      description, 
      expected_behaviour, 
      steps_to_reproduce,
      severity,
      module
    }: { 
      bugId: string; 
      summary: string; 
      description: string; 
      expected_behaviour?: string; 
      steps_to_reproduce?: string; 
      severity?: string;
      module?: string;
    }) => {
      const updateData: any = {
        summary,
        description,
        expected_behaviour,
        steps_to_reproduce,
      };
      
      // Only include severity and module if provided (admin edit)
      if (severity !== undefined) updateData.severity = severity;
      if (module !== undefined) updateData.module = module;

      const { error } = await supabase
        .from('bug_reports')
        .update(updateData)
        .eq('id', bugId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      queryClient.invalidateQueries({ queryKey: ['bug-detail'] });
      toast.success('Bug report updated successfully');
    },
    onError: (error: Error) => {
      console.error('Error updating bug report:', error);
      toast.error('Failed to update bug report');
    },
  });

  // Mark as fixed (quick action)
  const markAsFixedMutation = useMutation({
    mutationFn: async (bugId: string) => {
      const { data, error } = await supabase.functions.invoke('notify-bug-status-change', {
        body: { bugId, newStatus: 'fixed' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      queryClient.invalidateQueries({ queryKey: ['bug-detail'] });
      toast.success('Bug marked as fixed');
    },
    onError: () => {
      toast.error('Failed to mark bug as fixed');
    },
  });

  // Archive bug (quick action)
  const archiveBugMutation = useMutation({
    mutationFn: async ({ bugId, reason }: { bugId: string; reason?: string }) => {
      const { error } = await supabase
        .from('bug_reports')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_reason: reason || 'manual_archive'
        })
        .eq('id', bugId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      queryClient.invalidateQueries({ queryKey: ['bug-detail'] });
      toast.success('Bug archived');
    },
    onError: () => {
      toast.error('Failed to archive bug');
    },
  });

  // Delete bug report mutation (platform admin only)
  const deleteBugMutation = useMutation({
    mutationFn: async (bugId: string) => {
      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', bugId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      toast.success('Bug report deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Error deleting bug report:', error);
      toast.error('Failed to delete bug report');
    },
  });

  return {
    bugReports,
    isLoadingReports,
    submitBug: submitBugMutation.mutate,
    isSubmitting: submitBugMutation.isPending,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    updateSeverity: updateSeverityMutation.mutate,
    isUpdatingSeverity: updateSeverityMutation.isPending,
    updateBug: updateBugMutation.mutate,
    isUpdatingBug: updateBugMutation.isPending,
    deleteBug: deleteBugMutation.mutate,
    isDeleting: deleteBugMutation.isPending,
    markAsFixed: markAsFixedMutation.mutate,
    isMarkingFixed: markAsFixedMutation.isPending,
    archiveBug: archiveBugMutation.mutate,
    isArchiving: archiveBugMutation.isPending,
  };
};

// Helper functions
const detectBrowser = (ua: string): string => {
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
};

const detectOS = (ua: string): string => {
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS')) return 'iOS';
  return 'Unknown';
};

const detectModuleFromURL = (): string => {
  const path = window.location.pathname;
  const moduleMap: Record<string, string> = {
    '/dashboard': 'dashboard',
    '/kpi-tracker': 'kpi-tracker',
    '/listing-pipeline': 'listing-pipeline',
    '/messages': 'messages',
    '/tasks': 'task-manager',
    '/notes': 'notes',
    '/review-roadmap': 'review-roadmap',
    '/coaches-corner': 'coaches-corner',
    '/transaction-management': 'transaction-management',
    '/vendor-reporting': 'vendor-reporting',
    '/role-playing': 'role-playing',
    '/nurture-calculator': 'nurture-calculator',
    '/listing-description': 'listing-description',
  };
  return moduleMap[path] || 'feedback-centre';
};
