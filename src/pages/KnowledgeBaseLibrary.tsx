import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLibraryPlaybooks } from "@/hooks/useLibraryPlaybooks";
import { PlaybookCard } from "@/components/knowledge-base/PlaybookCard";
import { AddPlaybookCard } from "@/components/knowledge-base/AddPlaybookCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, ArrowLeft } from "lucide-react";
import { MODULE_COLORS, ModuleCategoryColor } from "@/lib/moduleColors";

export default function KnowledgeBaseLibrary() {
  const { libraryId } = useParams<{ libraryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch library details
  const { data: library, isLoading: libraryLoading } = useQuery({
    queryKey: ['library', libraryId, user?.id],
    queryFn: async () => {
      if (!libraryId || !user) return null;

      const { data, error } = await supabase
        .from('knowledge_base_categories')
        .select('id, name, description, icon, color_theme')
        .eq('id', libraryId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!libraryId && !!user,
  });

  const { playbooks, isLoading: playbooksLoading } = useLibraryPlaybooks(libraryId || '');

  // Filter playbooks based on search
  const filteredPlaybooks = playbooks?.filter(playbook =>
    playbook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playbook.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = libraryLoading || playbooksLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <BookOpen className="h-12 w-12 animate-pulse mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading library...</p>
        </div>
      </div>
    );
  }

  if (!library) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Library not found</p>
          <Button onClick={() => navigate('/knowledge-base')}>
            Back to Libraries
          </Button>
        </div>
      </div>
    );
  }

  const colors = MODULE_COLORS[library.color_theme as ModuleCategoryColor] || MODULE_COLORS.systems;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Breadcrumb */}
      <Button
        variant="ghost"
        onClick={() => navigate('/knowledge-base')}
        className="mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Libraries
      </Button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div 
          className={`p-4 rounded-lg text-4xl ${colors.gradient}`}
        >
          {library.icon || "📚"}
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{library.name}</h1>
          {library.description && (
            <p className="text-muted-foreground mt-2">{library.description}</p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search playbooks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Playbooks Grid */}
      {searchQuery && filteredPlaybooks && filteredPlaybooks.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Search className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <div>
            <h3 className="text-lg font-semibold">No results found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlaybooks && filteredPlaybooks.map((playbook) => (
            <PlaybookCard 
              key={playbook.id} 
              playbook={playbook}
              colorTheme={library.color_theme as ModuleCategoryColor}
            />
          ))}
          
          <AddPlaybookCard libraryId={libraryId!} />
        </div>
      )}
    </div>
  );
}
