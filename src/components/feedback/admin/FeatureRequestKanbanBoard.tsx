import { useState } from "react";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FeatureRequestDetailDrawer } from "@/components/feedback/FeatureRequestDetailDrawer";
import { SortableFeatureCard } from "./SortableFeatureCard";
import { KanbanColumn } from "@/components/ui/kanban-column";
import { logger } from "@/lib/logger";

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  vote_count: number;
  created_at: string;
  user_id: string;
  ai_estimated_effort?: string;
  module?: string;
  priority?: string;
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

export const FeatureRequestKanbanBoard = () => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState<FeatureRequest | null>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const { data: features = [], isLoading } = useQuery({
    queryKey: ["feature-requests-kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_requests")
        .select("*")
        .order("position", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data?.map((f) => f.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      // Merge profiles with features using Map for O(n+m) complexity
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const featuresWithProfiles = data?.map((feature) => ({
        ...feature,
        profiles: profilesMap.get(feature.user_id),
      })) || [];

      return featuresWithProfiles as FeatureRequest[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ featureId, newStatus, reason, position }: { featureId: string; newStatus: string; reason?: string; position?: number }) => {
      console.log('[FeatureRequestKanbanBoard] Attempting status update via edge function:', { featureId, newStatus, reason, position });
      
      const { data, error } = await supabase.functions.invoke('notify-feature-status-change', {
        body: { 
          featureId, 
          newStatus, 
          adminNotes: reason,
          position 
        }
      });

      if (error) {
        console.error('[FeatureRequestKanbanBoard] Edge function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('[FeatureRequestKanbanBoard] Edge function returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('[FeatureRequestKanbanBoard] Update successful:', data);
      return data?.feature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-requests-kanban"] });
      toast.success("Feature request status updated");
    },
    onError: (error: any) => {
      console.error('[FeatureRequestKanbanBoard] Mutation failed:', {
        fullError: error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      logger.error('Failed to update feature request status', error);
      toast.error(`Failed to update feature request status: ${error?.message || 'Unknown error'}`);
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    const feature = features.find(f => f.id === event.active.id);
    setActiveFeature(feature || null);
  };

  // Helper to resolve target column ID from drop target (handles dropping on cards or columns)
  const getTargetColumnId = (overId: string): string | null => {
    const columnIds = ['triage', 'in_progress', 'needs_review', 'complete'];
    
    // If dropping directly on a column
    if (columnIds.includes(overId)) {
      return overId;
    }
    
    // If dropping on another feature card, find that feature and get its column
    const targetFeature = features.find(f => f.id === overId);
    if (targetFeature) {
      // Map feature status to column ID
      if (targetFeature.status === 'completed' || targetFeature.status === 'archived') {
        return 'complete';
      }
      return targetFeature.status;
    }
    
    console.error('[getTargetColumnId] Could not resolve column for overId:', overId);
    return null;
  };

  // Calculate new position based on drop location
  const calculateNewPosition = (
    targetColumnFeatures: any[],
    overIndex: number
  ): number => {
    // If dropping at the start
    if (overIndex === 0 || targetColumnFeatures.length === 0) {
      const firstItem = targetColumnFeatures[0];
      return firstItem?.position ? firstItem.position / 2 : 500;
    }
    
    // If dropping at the end
    if (overIndex >= targetColumnFeatures.length - 1) {
      const lastItem = targetColumnFeatures[targetColumnFeatures.length - 1];
      return lastItem?.position ? lastItem.position + 1000 : targetColumnFeatures.length * 1000;
    }
    
    // If dropping between two items
    const prevItem = targetColumnFeatures[overIndex - 1];
    const nextItem = targetColumnFeatures[overIndex];
    const prevPos = prevItem?.position || overIndex * 1000;
    const nextPos = nextItem?.position || (overIndex + 1) * 1000;
    return (prevPos + nextPos) / 2;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveFeature(null);
    
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

    const featureId = active.id;
    const feature = features.find((f) => f.id === featureId);
    if (!feature) {
      console.error('[Drag Drop] Feature not found:', featureId);
      return;
    }

    // Resolve the target column ID (handles dropping on cards or columns)
    const targetColumnId = getTargetColumnId(over.id);
    if (!targetColumnId) {
      console.error('[Drag Drop] Could not determine target column');
      return;
    }

    console.log('[Drag Drop] Found feature:', {
      id: feature.id,
      title: feature.title,
      currentStatus: feature.status,
      targetColumn: targetColumnId
    });

    // Can't skip stages
    if (feature.status === "triage" && targetColumnId === "complete") {
      toast.error("Cannot move directly from Triage to Complete. Must go through In Progress or Needs Review.");
      return;
    }

    // When dropping into Complete column, default to "completed" status
    const newStatus = targetColumnId === "complete" ? "completed" : targetColumnId;

    // Skip if no status change
    if (feature.status === newStatus) {
      console.log('[Drag Drop] No status change needed, handling reorder within column');
      // Still calculate position for within-column reordering
      const targetColumnFeatures = getFeaturesByStatus(targetColumnId);
      const overIndex = targetColumnFeatures.findIndex(f => f.id === over.id);
      const newPosition = calculateNewPosition(targetColumnFeatures, overIndex >= 0 ? overIndex : targetColumnFeatures.length);
      
      updateStatusMutation.mutate({ featureId, newStatus: feature.status, position: newPosition });
      return;
    }

    // Calculate position for the target column
    const targetColumnFeatures = getFeaturesByStatus(targetColumnId);
    const newPosition = calculateNewPosition(targetColumnFeatures, targetColumnFeatures.length);

    console.log('[Drag Drop] Updating status:', {
      featureId,
      fromStatus: feature.status,
      toStatus: newStatus,
      columnId: targetColumnId,
      newPosition
    });

    updateStatusMutation.mutate(
      { featureId, newStatus, position: newPosition },
      {
        onError: (error) => {
          console.error('[Drag Drop] Failed to update feature request', {
            featureId,
            attemptedStatus: newStatus,
            error
          });
        }
      }
    );
  };

  const getFeaturesByStatus = (columnId: string) => {
    if (columnId === "complete") {
      return features.filter((feature) => feature.status === "completed" || feature.status === "archived");
    }
    return features.filter((feature) => feature.status === columnId);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading feature requests...</div>;
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
              items={getFeaturesByStatus(column.id)}
              getItemId={(feature) => feature.id}
              renderItem={(feature) => (
                <SortableFeatureCard
                  feature={feature}
                  onClick={() => setSelectedFeature(feature.id)}
                />
              )}
            />
          ))}
        </div>
        
        <DragOverlay>
          {activeFeature && (
            <div className="opacity-50">
              <SortableFeatureCard feature={activeFeature} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedFeature && (
        <FeatureRequestDetailDrawer
          requestId={selectedFeature}
          open={!!selectedFeature}
          onClose={() => setSelectedFeature(null)}
          isAdmin
        />
      )}
    </>
  );
};
