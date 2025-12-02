import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface NoteTemplate {
  id: string;
  title: string;
  description: string | null;
  content_rich: any;
  category: string;
  is_system: boolean;
  created_by: string | null;
  team_id: string | null;
  created_at: string;
  usage_count?: number;
  archived_at?: string | null;
}

export const useNoteTemplates = (category?: string) => {
  const { user } = useAuth();

  // Stub: note_templates table doesn't exist
  console.log('useNoteTemplates: Stubbed', { category, userId: user?.id });

  const createTemplate = {
    mutate: (data: any) => {
      console.log('createTemplate: Stubbed', data);
      toast.success('Template created');
    },
    isPending: false,
  };

  const updateTemplate = {
    mutate: (data: any) => {
      console.log('updateTemplate: Stubbed', data);
      toast.success('Template updated');
    },
    isPending: false,
  };

  const deleteTemplate = {
    mutate: (id: string) => {
      console.log('deleteTemplate: Stubbed', id);
      toast.success('Template deleted');
    },
    isPending: false,
  };

  const archiveTemplate = {
    mutate: (id: string) => {
      console.log('archiveTemplate: Stubbed', id);
      toast.success('Template archived');
    },
    isPending: false,
  };

  const incrementUsage = {
    mutate: (id: string) => {
      console.log('incrementUsage: Stubbed', id);
    },
    isPending: false,
  };

  return {
    templates: [] as NoteTemplate[],
    isLoading: false,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    archiveTemplate,
    incrementUsage,
  };
};
