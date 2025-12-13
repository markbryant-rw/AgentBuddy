import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AftercareTemplate, AftercareTask } from "@/types/aftercare";
import { Json } from "@/integrations/supabase/types";

export function useAftercareTemplates(teamId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['aftercare-templates', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aftercare_templates')
        .select('*')
        .order('is_system_template', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map to proper types
      return (data || []).map(item => ({
        ...item,
        scope: item.scope as AftercareTemplate['scope'],
        tasks: (item.tasks || []) as unknown as AftercareTask[],
        is_evergreen: (item as any).is_evergreen || false,
      })) as AftercareTemplate[];
    },
  });

  // Get the evergreen template for 10+ year old sales
  const getEvergreenTemplate = (): AftercareTemplate | null => {
    return templates.find(t => t.is_evergreen && t.is_system_template) || null;
  };

  // Get the effective template with 3-tier inheritance
  const getEffectiveTemplate = (userId?: string): AftercareTemplate | null => {
    // Priority: user → team → office → platform
    const userTemplate = templates.find(t => t.scope === 'user' && t.user_id === userId && t.is_default);
    if (userTemplate) return userTemplate;

    const teamTemplate = templates.find(t => t.scope === 'team' && t.team_id === teamId && t.is_default);
    if (teamTemplate) return teamTemplate;

    const officeTemplate = templates.find(t => t.scope === 'office' && t.is_default);
    if (officeTemplate) return officeTemplate;

    const platformTemplate = templates.find(t => t.scope === 'platform' && t.is_system_template && t.is_default);
    return platformTemplate || null;
  };

  const createTemplate = useMutation({
    mutationFn: async (template: Partial<AftercareTemplate>) => {
      const { data, error } = await supabase
        .from('aftercare_templates')
        .insert({
          name: template.name || 'Untitled Template',
          scope: template.scope || 'team',
          description: template.description,
          agency_id: template.agency_id,
          team_id: template.team_id,
          user_id: template.user_id,
          is_system_template: template.is_system_template,
          is_default: template.is_default,
          tasks: template.tasks as unknown as Json,
          created_by: template.created_by,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aftercare-templates'] });
      toast({ title: "Template created successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to create template", description: error.message, variant: "destructive" });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AftercareTemplate> & { id: string }) => {
      const updateData = {
        ...updates,
        tasks: updates.tasks as unknown as Json,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('aftercare_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aftercare-templates'] });
      toast({ title: "Template updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to update template", description: error.message, variant: "destructive" });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('aftercare_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aftercare-templates'] });
      toast({ title: "Template deleted successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete template", description: error.message, variant: "destructive" });
    },
  });

  return {
    templates,
    isLoading,
    getEffectiveTemplate,
    getEvergreenTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
