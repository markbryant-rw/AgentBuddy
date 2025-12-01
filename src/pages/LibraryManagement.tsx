import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useKnowledgeBase } from "@/hooks/useKnowledgeBase";
import { LibraryList } from "@/components/knowledge-base/LibraryList";
import { LibraryForm } from "@/components/knowledge-base/LibraryForm";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, BookOpen } from "lucide-react";

export default function LibraryManagement() {
  const navigate = useNavigate();
  const { user, isPlatformAdmin } = useAuth();
  const { createLibrary, updateLibrary, deleteLibrary, reorderLibraries } = useKnowledgeBase();
  const [showForm, setShowForm] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Redirect if not admin
  if (!isPlatformAdmin) {
    navigate('/knowledge-base');
    return null;
  }

  // Fetch libraries with playbook counts
  const { data: libraries, isLoading } = useQuery({
    queryKey: ['libraries-management', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get user's team
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .single();

      if (!teamMember) return [];

      // Fetch libraries
      const { data: libraries, error } = await supabase
        .from('knowledge_base_categories')
        .select('id, name, description, icon, color_theme, sort_order, team_id, created_at, updated_at')
        .eq('team_id', teamMember.team_id)
        .order('sort_order');

      if (error) throw error;

      // Get playbook counts for each library
      const librariesWithCounts = await Promise.all(
        (libraries || []).map(async (library) => {
          const { count } = await supabase
            .from('knowledge_base_playbooks')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', library.id);

          return {
            ...library,
            playbook_count: count || 0,
          };
        })
      );

      return librariesWithCounts;
    },
    enabled: !!user && isPlatformAdmin,
  });

  const handleSave = async (data: any) => {
    setIsSaving(true);
    try {
      if (data.id) {
        await updateLibrary(data);
      } else {
        await createLibrary(data);
      }
      setShowForm(false);
      setEditingLibrary(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (library: any) => {
    setEditingLibrary(library);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteLibrary(id);
  };

  const handleReorder = async (updates: { id: string; sort_order: number }[]) => {
    await reorderLibraries(updates);
  };

  const handleAddNew = () => {
    setEditingLibrary(null);
    setShowForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <BookOpen className="h-12 w-12 animate-pulse mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading libraries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          onClick={() => navigate('/knowledge-base')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Libraries
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Manage Libraries</h1>
            <p className="text-muted-foreground mt-2">
              Create and organize libraries for your team's playbooks
            </p>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Library
          </Button>
        </div>
      </div>

      {/* Libraries List */}
      <div className="bg-card border rounded-lg p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Your Libraries</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Drag to reorder, click to edit
          </p>
        </div>
        <LibraryList
          libraries={libraries || []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReorder={handleReorder}
        />
      </div>

      {/* Form Modal */}
      <LibraryForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingLibrary(null);
        }}
        library={editingLibrary}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
