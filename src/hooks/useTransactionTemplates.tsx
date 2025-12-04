import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type TransactionStage = 'signed' | 'live' | 'contract' | 'unconditional' | 'settled' | 'open_homes' | 'property_documents';

export interface TransactionTemplate {
  id: string;
  stage: TransactionStage;
  name: string;
  description?: string;
  team_id?: string;
  office_id?: string;
  is_default: boolean;
  is_system_template: boolean;
  tasks: Array<{
    title: string;
    section: string;
    description?: string;
    due_offset_days?: number;
    assigned_to_user?: string;
    assigned_to_role?: string;
    knowledge_base_article_id?: string;
  }>;
  documents: Array<{
    title: string;
    section: string;
    required: boolean;
  }>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useTransactionTemplates = (stage?: TransactionStage) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['transaction-templates', stage],
    queryFn: async () => {
      let query = supabase
        .from('transaction_stage_templates' as any)
        .select('*')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (stage) {
        query = query.eq('stage', stage);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TransactionTemplate[];
    },
  });

  const getDefaultTemplate = (stage: TransactionStage) => {
    // Prioritize user's custom default, fall back to system default
    const userDefault = templates.find(
      t => !t.is_system_template && t.is_default && t.stage === stage
    );
    const systemDefault = templates.find(
      t => t.is_system_template && t.stage === stage
    );
    return userDefault || systemDefault;
  };

  const applyTemplate = useMutation({
    mutationFn: async ({
      templateId,
      transactionId,
    }: {
      templateId: string;
      transactionId: string;
    }) => {
      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      // Get transaction to access team_id and assignees
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('team_id, assignees')
        .eq('id', transactionId)
        .single();

      if (txError || !transaction) throw new Error('Transaction not found');

      // Role resolution function
      const resolveRoleToUser = (roleName: string): string | null => {
        if (!transaction.assignees) return null;
        
        const assignees = transaction.assignees as {
          lead_salesperson?: string;
          secondary_salesperson?: string;
          admin?: string;
          support?: string;
        };

        // Map generic roles to specific transaction roles
        const roleMap: Record<string, keyof typeof assignees> = {
          'Salesperson': 'lead_salesperson',
          'Lead Salesperson': 'lead_salesperson',
          'Secondary Salesperson': 'secondary_salesperson',
          'Admin': 'admin',
          'Support': 'support',
        };
        
        const roleKey = roleMap[roleName];
        if (!roleKey) return null;
        
        const assignedUser = assignees[roleKey];
        
        // Fallback logic for optional roles
        if (!assignedUser) {
          if (roleName === 'Secondary Salesperson') {
            return assignees.lead_salesperson || null;
          }
          if (roleName === 'Support') {
            return assignees.admin || null;
          }
        }
        
        return assignedUser || null;
      };

      // Create documents from template
      if (template.documents.length > 0) {
        const docs = template.documents.map((doc, index) => ({
          transaction_id: transactionId,
          stage: template.stage,
          section: doc.section,
          title: doc.title,
          required: doc.required,
          order_index: index,
          created_by: user?.id,
        }));

        const { error: docsError } = await supabase
          .from('transaction_documents' as any)
          .insert(docs as any);

        if (docsError) throw docsError;
      }

      // Create tasks from template
      if (template.tasks.length > 0) {
        const tasks = template.tasks.map((task, index) => {
          let assignedTo = null;
          
          if (task.assigned_to_role) {
            // Resolve role to actual user based on transaction assignees
            assignedTo = resolveRoleToUser(task.assigned_to_role);
          } else if (task.assigned_to_user) {
            // Direct user assignment (for custom templates)
            assignedTo = task.assigned_to_user;
          }
          
          return {
            title: task.title,
            description: task.description,
            section: task.section || 'General',
            transaction_id: transactionId,
            transaction_stage: template.stage,
            team_id: transaction.team_id,
            created_by: user?.id,
            order_position: index,
            due_date: task.due_offset_days
              ? new Date(Date.now() + task.due_offset_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              : null,
            assigned_to: assignedTo,
          };
        });

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasks as any);

        if (tasksError) throw tasksError;
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-documents'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-tasks-count'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Template applied successfully');
    },
    onError: (error) => {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template');
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<TransactionTemplate>) => {
      const { data, error } = await supabase
        .from('transaction_stage_templates' as any)
        .insert([{ ...template, created_by: user?.id }] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-templates'] });
      toast.success('Template created');
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<TransactionTemplate>;
    }) => {
      const { data, error } = await supabase
        .from('transaction_stage_templates' as any)
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-templates'] });
      toast.success('Template updated');
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const template = templates.find(t => t.id === id);
      
      if (template?.is_system_template) {
        throw new Error('System templates cannot be deleted');
      }

      const { error } = await supabase
        .from('transaction_stage_templates' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-templates'] });
      toast.success('Template deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });

  const setTemplateAsDefault = useMutation({
    mutationFn: async ({ 
      templateId, 
      stage, 
      makeDefault 
    }: { 
      templateId: string; 
      stage: TransactionStage;
      makeDefault: boolean;
    }) => {
      if (makeDefault) {
        // First, unset any existing defaults for this stage and team
        const { data: profile } = await supabase
          .from('profiles')
          .select('primary_team_id')
          .eq('id', user?.id)
          .single();

        if (profile?.primary_team_id) {
          await supabase
            .from('transaction_stage_templates' as any)
            .update({ is_default: false } as any)
            .eq('stage', stage)
            .eq('team_id', profile.primary_team_id);
        }
      }
      
      // Then set/unset this template as default
      const { data, error } = await supabase
        .from('transaction_stage_templates' as any)
        .update({ is_default: makeDefault } as any)
        .eq('id', templateId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction-templates'] });
      toast.success('Default template updated');
    },
    onError: (error) => {
      console.error('Error setting default template:', error);
      toast.error('Failed to update default template');
    },
  });

  return {
    templates,
    isLoading,
    getDefaultTemplate,
    applyTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setTemplateAsDefault,
  };
};
