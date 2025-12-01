import { LibraryGridCard } from "@/components/knowledge-base/LibraryGridCard";
import { AddLibraryCard } from "@/components/knowledge-base/AddLibraryCard";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function KnowledgeBase() {
  const navigate = useNavigate();
  const { user, isPlatformAdmin } = useAuth();

  // Fetch libraries with playbook counts
  const { data: libraries, isLoading } = useQuery({
    queryKey: ['libraries', user?.id],
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
        .select('id, name, description, icon, color_theme, sort_order')
        .eq('team_id', teamMember.team_id)
        .order('sort_order');

      if (error) throw error;

      // Get playbook counts for each library
      const librariesWithCounts = await Promise.all(
        (libraries || []).map(async (library) => {
          const { count } = await supabase
            .from('knowledge_base_playbooks')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', library.id)
            .eq('is_published', true);

          return {
            ...library,
            playbook_count: count || 0,
          };
        })
      );

      return librariesWithCounts;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <BookOpen className="h-12 w-12 animate-pulse mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Libraries</h1>
          <p className="text-muted-foreground mt-2">
            Your team's organized playbooks and SOPs
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/knowledge-base/analytics')}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Analytics
        </Button>
      </div>

      {/* Libraries Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {libraries && libraries.map((library) => (
          <LibraryGridCard
            key={library.id}
            id={library.id}
            name={library.name}
            description={library.description}
            icon={library.icon}
            colorTheme={library.color_theme as any}
            playbookCount={library.playbook_count}
          />
        ))}
        
        {isPlatformAdmin && <AddLibraryCard />}
      </div>

      {/* Empty State */}
      {(!libraries || libraries.length === 0) && !isPlatformAdmin && (
        <div className="text-center py-16 space-y-4">
          <BookOpen className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          <div>
            <h3 className="text-lg font-semibold">No libraries yet</h3>
            <p className="text-muted-foreground">
              Ask an admin to create libraries
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
