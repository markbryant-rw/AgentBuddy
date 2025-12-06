import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BugDetailDrawer } from "@/components/feedback/BugDetailDrawer";
import { BugCard } from "./BugCard";
import { BugKanbanColumn } from "./BugKanbanColumn";
import { logger } from "@/lib/logger";

interface BugReport {
  id: string;
  summary: string;
  description: string;
  severity: string;
  status: string;
  vote_count: number;
  created_at: string;
  user_id: string;
  ai_impact?: string;
  module?: string;
  archived_reason?: string;
  attachments?: string[];
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

const COLUMNS = [
  { id: "triage", label: "Triage", color: "border-orange-500" },
  { id: "in_progress", label: "In Progress", color: "border-purple-500" },
  { id: "needs_review", label: "Needs Review", color: "border-amber-500" },
  { id: "complete", label: "Complete", color: "border-green-500" },
];

export const BugKanbanBoard = () => {
  const [selectedBug, setSelectedBug] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: bugs = [], isLoading } = useQuery({
    queryKey: ["bug-reports-kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bug_reports")
        .select("*")
        .order("position", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data?.map((b) => b.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      // Merge profiles with bugs using Map for O(n+m) complexity
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const bugsWithProfiles = data?.map((bug) => ({
        ...bug,
        profiles: profilesMap.get(bug.user_id),
      })) || [];

      return bugsWithProfiles as BugReport[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bugId, newStatus }: { bugId: string; newStatus: string }) => {
      console.log('[BugKanbanBoard] Updating status via edge function:', { bugId, newStatus });
      
      const { data, error } = await supabase.functions.invoke('notify-bug-status-change', {
        body: { 
          bugId, 
          newStatus,
        }
      });

      if (error) {
        console.error('[BugKanbanBoard] Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('[BugKanbanBoard] Edge function returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('[BugKanbanBoard] Update successful:', data);
      return data?.bug;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports-kanban"] });
      const statusLabels: Record<string, string> = {
        'in_progress': 'In Progress',
        'needs_review': 'Needs Review',
        'fixed': 'Fixed',
        'archived': 'Archived',
        'triage': 'Triage',
      };
      toast.success(`Bug moved to ${statusLabels[variables.newStatus] || variables.newStatus}`);
    },
    onError: (error: any) => {
      console.error('[BugKanbanBoard] Mutation failed:', error);
      logger.error('Failed to update bug status', error);
      toast.error(`Failed to update bug status: ${error?.message || 'Unknown error'}`);
    },
  });

  const handleStatusChange = (bugId: string, newStatus: string) => {
    updateStatusMutation.mutate({ bugId, newStatus });
  };

  const getBugsByStatus = (columnId: string) => {
    if (columnId === "complete") {
      return bugs.filter((bug) => bug.status === "fixed" || bug.status === "archived");
    }
    if (columnId === "triage") {
      // Include both 'triage' and legacy 'open' status in triage column
      return bugs.filter((bug) => bug.status === "triage" || bug.status === "open");
    }
    return bugs.filter((bug) => bug.status === columnId);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading bugs...</div>;
  }

  return (
    <>
      <div className="flex gap-3 h-[calc(100vh-300px)] overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <BugKanbanColumn
            key={column.id}
            id={column.id}
            label={column.label}
            color={column.color}
            items={getBugsByStatus(column.id)}
            getItemId={(bug) => bug.id}
            renderItem={(bug) => (
              <BugCard
                bug={bug}
                onClick={() => setSelectedBug(bug.id)}
                onStatusChange={handleStatusChange}
              />
            )}
          />
        ))}
      </div>

      {selectedBug && (
        <BugDetailDrawer
          bugId={selectedBug}
          open={!!selectedBug}
          onClose={() => setSelectedBug(null)}
          isAdmin={true}
        />
      )}
    </>
  );
};
