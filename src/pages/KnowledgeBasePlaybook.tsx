import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Pencil, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlaybookViewer } from "@/components/knowledge-base/PlaybookViewer";
import { usePlaybookCards } from "@/hooks/usePlaybookCards";

export default function KnowledgeBasePlaybook() {
  const { playbookId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { team } = useTeam();

  // Check if user is admin
  const { data: teamMember } = useQuery({
    queryKey: ['team-member', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from('team_members')
        .select('access_level')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const canEdit = ['edit', 'admin'].includes(teamMember?.access_level || '');

  // Fetch playbook details
  const { data: playbook, isLoading: playbookLoading } = useQuery({
    queryKey: ['playbook', playbookId],
    queryFn: async () => {
      if (!playbookId) return null;
      
      const { data, error } = await supabase
        .from('knowledge_base_playbooks')
        .select(`
          *,
          category:knowledge_base_categories(name, color_theme)
        `)
        .eq('id', playbookId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!playbookId,
  });

  // Fetch cards
  const { cards, isLoading: cardsLoading } = usePlaybookCards(playbookId);

  const isLoading = playbookLoading || cardsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <BookOpen className="h-12 w-12 animate-pulse mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading playbook...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!playbook) {
    return (
      <div className="container mx-auto py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/knowledge-base')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Knowledge Base
        </Button>
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold">Playbook not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-4">
      {/* Breadcrumb and Edit Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/knowledge-base')}
          >
            <ArrowLeft className="h-3 w-3 mr-1.5" />
            Libraries
          </Button>
          {playbook.category && (
            <>
              <span>/</span>
              <span>{playbook.category.name}</span>
            </>
          )}
          <span>/</span>
          <span className="text-foreground">{playbook.title}</span>
        </div>
        
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/knowledge-base/edit/${playbookId}`)}
          >
            <Pencil className="h-3 w-3 mr-1.5" />
            Edit Playbook
          </Button>
        )}
      </div>

      {/* Playbook header */}
      <div>
        <h1 className="text-2xl font-bold">{playbook.title}</h1>
        {playbook.description && (
          <p className="text-muted-foreground text-sm mt-1">{playbook.description}</p>
        )}
      </div>

      {/* Viewer */}
      {cards && cards.length > 0 ? (
        <PlaybookViewer 
          cards={cards} 
          playbookId={playbookId!} 
          canEdit={canEdit} 
        />
      ) : (
        <div className="text-center py-16 border rounded-lg bg-muted/30">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-semibold">No cards yet</h3>
          <p className="text-muted-foreground mt-2 mb-6">
            This playbook doesn't have any content yet
          </p>
          {canEdit && (
            <Button
              onClick={() => navigate(`/knowledge-base/edit/${playbookId}`)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Chapter
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
