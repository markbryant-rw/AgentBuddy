import { useState } from "react";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BugDetailDrawer } from "@/components/feedback/BugDetailDrawer";
import { SortableBugCard } from "./SortableBugCard";
import { KanbanColumn } from "@/components/ui/kanban-column";
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
  const [activeBug, setActiveBug] = useState<BugReport | null>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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
    mutationFn: async ({ bugId, newStatus, reason, position }: { bugId: string; newStatus: string; reason?: string; position?: number }) => {
      console.log('[BugKanbanBoard] Attempting status update via edge function:', { bugId, newStatus, reason, position });
      
      const { data, error } = await supabase.functions.invoke('notify-bug-status-change', {
        body: { 
          bugId, 
          newStatus, 
          adminComment: reason,
          position 
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bug-reports-kanban"] });
      toast.success("Bug status updated");
    },
    onError: (error: any) => {
      console.error('[BugKanbanBoard] Mutation failed:', {
        fullError: error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      logger.error('Failed to update bug status', error);
      toast.error(`Failed to update bug status: ${error?.message || 'Unknown error'}`);
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const bug = bugs.find(b => b.id === event.active.id);
    setActiveBug(bug || null);
  };

  // Helper to resolve target column ID from drop target (handles dropping on cards or columns)
  const getTargetColumnId = (overId: string): string | null => {
    const columnIds = ['triage', 'in_progress', 'needs_review', 'complete'];
    
    // If dropping directly on a column
    if (columnIds.includes(overId)) {
      return overId;
    }
    
    // If dropping on another bug card, find that bug and get its column
    const targetBug = bugs.find(b => b.id === overId);
    if (targetBug) {
      // Map bug status to column ID
      if (targetBug.status === 'fixed' || targetBug.status === 'archived') {
        return 'complete';
      }
      return targetBug.status;
    }
    
    console.error('[getTargetColumnId] Could not resolve column for overId:', overId);
    return null;
  };

  // Calculate new position based on drop location
  const calculateNewPosition = (
    targetColumnBugs: any[],
    overIndex: number
  ): number => {
    // If dropping at the start
    if (overIndex === 0 || targetColumnBugs.length === 0) {
      const firstItem = targetColumnBugs[0];
      return firstItem?.position ? firstItem.position / 2 : 500;
    }
    
    // If dropping at the end
    if (overIndex >= targetColumnBugs.length - 1) {
      const lastItem = targetColumnBugs[targetColumnBugs.length - 1];
      return lastItem?.position ? lastItem.position + 1000 : targetColumnBugs.length * 1000;
    }
    
    // If dropping between two items
    const prevItem = targetColumnBugs[overIndex - 1];
    const nextItem = targetColumnBugs[overIndex];
    const prevPos = prevItem?.position || overIndex * 1000;
    const nextPos = nextItem?.position || (overIndex + 1) * 1000;
    return (prevPos + nextPos) / 2;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBug(null);
    
    console.log('[Drag Drop] Event:', { 
      activeId: active.id, 
      overId: over?.id,
      activeData: active.data.current,
      overData: over?.data.current
    });
    
    if (!over || active.id === over.id) {
      console.log('[Drag Drop] No valid drop target');
      return;
    }

    if (typeof active.id !== 'string' || typeof over.id !== 'string') {
      console.error('[Drag Drop] Expected string IDs for drag event');
      return;
    }

    const bugId = active.id;
    const bug = bugs.find((b) => b.id === bugId);
    if (!bug) {
      console.error('[Drag Drop] Bug not found:', bugId);
      return;
    }

    // Resolve the target column ID (handles dropping on cards or columns)
    const targetColumnId = getTargetColumnId(over.id);
    if (!targetColumnId) {
      console.error('[Drag Drop] Could not determine target column');
      return;
    }

    console.log('[Drag Drop] Found bug:', {
      id: bug.id,
      summary: bug.summary,
      currentStatus: bug.status,
      targetColumn: targetColumnId
    });

    // Can't skip stages
    if (bug.status === "triage" && targetColumnId === "complete") {
      toast.error("Cannot move directly from Triage to Complete. Must go through In Progress or Needs Review.");
      return;
    }

    // When dropping into Complete column, default to "fixed" status
    const newStatus = targetColumnId === "complete" ? "fixed" : targetColumnId;

    // Skip if no status change
    if (bug.status === newStatus) {
      console.log('[Drag Drop] No status change needed, handling reorder within column');
      // Still calculate position for within-column reordering
      const targetColumnBugs = getBugsByStatus(targetColumnId);
      const overIndex = targetColumnBugs.findIndex(b => b.id === over.id);
      const newPosition = calculateNewPosition(targetColumnBugs, overIndex >= 0 ? overIndex : targetColumnBugs.length);
      
      updateStatusMutation.mutate({ bugId, newStatus: bug.status, position: newPosition });
      return;
    }

    // Calculate position for the target column
    const targetColumnBugs = getBugsByStatus(targetColumnId);
    const newPosition = calculateNewPosition(targetColumnBugs, targetColumnBugs.length);

    console.log('[Drag Drop] Updating status:', {
      bugId,
      fromStatus: bug.status,
      toStatus: newStatus,
      columnId: targetColumnId,
      newPosition
    });

    updateStatusMutation.mutate(
      { bugId, newStatus, position: newPosition },
      {
        onError: (error) => {
          console.error('[Drag Drop] Failed to update bug', {
            bugId,
            attemptedStatus: newStatus,
            error
          });
        }
      }
    );
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
      <DndContext 
        sensors={sensors} 
        collisionDetection={closestCorners} 
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 h-[calc(100vh-300px)] overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              label={column.label}
              color={column.color}
              items={getBugsByStatus(column.id)}
              getItemId={(bug) => bug.id}
              renderItem={(bug) => (
                <SortableBugCard
                  bug={bug}
                  onClick={() => setSelectedBug(bug.id)}
                />
              )}
            />
          ))}
        </div>
        
        <DragOverlay>
          {activeBug && (
            <div className="opacity-50">
              <SortableBugCard bug={activeBug} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
