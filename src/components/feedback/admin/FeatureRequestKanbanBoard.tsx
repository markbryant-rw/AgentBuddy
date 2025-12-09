import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FeatureRequestDetailDrawer } from "@/components/feedback/FeatureRequestDetailDrawer";
import { FeatureCard } from "./FeatureCard";
import { FeatureKanbanColumn } from "./FeatureKanbanColumn";
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
  ai_analysis?: any;
  ai_priority_score?: number;
  ai_analyzed_at?: string;
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

interface FeatureRequestKanbanBoardProps {
  sourceFilter?: 'all' | 'agentbuddy' | 'beacon';
}

export const FeatureRequestKanbanBoard = ({ sourceFilter = 'all' }: FeatureRequestKanbanBoardProps) => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Auto-analyze feature request when it enters triage
  const triggerAutoAnalysis = useCallback(async (featureId: string) => {
    try {
      console.log('[FeatureRequestKanbanBoard] Triggering auto-analysis for:', featureId);
      const { data, error } = await supabase.functions.invoke('analyze-feature-request', {
        body: { featureRequestId: featureId }
      });
      
      if (error) {
        console.error('[FeatureRequestKanbanBoard] Auto-analysis error:', error);
        return;
      }
      
      console.log('[FeatureRequestKanbanBoard] Auto-analysis complete:', data);
      // Refresh to show analysis results
      queryClient.invalidateQueries({ queryKey: ["feature-requests-kanban"] });
    } catch (err) {
      console.error('[FeatureRequestKanbanBoard] Auto-analysis failed:', err);
    }
  }, [queryClient]);

  const { data: features = [], isLoading } = useQuery({
    queryKey: ["feature-requests-kanban", sourceFilter],
    queryFn: async () => {
      let query = supabase
        .from("feature_requests")
        .select("*")
        .order("position", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      // Apply source filter if not 'all'
      if (sourceFilter !== 'all') {
        query = query.eq('source', sourceFilter);
      }

      const { data, error } = await query;

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

      // Auto-analyze any triage features that haven't been analyzed yet
      featuresWithProfiles.forEach((feature) => {
        if ((feature.status === 'triage' || feature.status === 'pending') && !feature.ai_analyzed_at) {
          triggerAutoAnalysis(feature.id);
        }
      });

      return featuresWithProfiles as FeatureRequest[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ featureId, newStatus }: { featureId: string; newStatus: string }) => {
      console.log('[FeatureRequestKanbanBoard] Updating status via edge function:', { featureId, newStatus });
      
      const { data, error } = await supabase.functions.invoke('notify-feature-status-change', {
        body: { 
          featureId, 
          newStatus,
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
    // Optimistic update - move card instantly
    onMutate: async ({ featureId, newStatus }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["feature-requests-kanban"] });

      // Snapshot previous value
      const previousFeatures = queryClient.getQueryData<FeatureRequest[]>(["feature-requests-kanban"]);

      // Optimistically update the cache
      queryClient.setQueryData<FeatureRequest[]>(["feature-requests-kanban"], (old) => {
        if (!old) return old;
        return old.map((feature) =>
          feature.id === featureId ? { ...feature, status: newStatus } : feature
        );
      });

      // Show immediate feedback
      const statusLabels: Record<string, string> = {
        'in_progress': 'In Progress',
        'needs_review': 'Needs Review',
        'completed': 'Completed',
        'archived': 'Archived',
        'triage': 'Triage',
      };
      toast.success(`Feature moved to ${statusLabels[newStatus] || newStatus}`);

      // Return context with the previous value
      return { previousFeatures };
    },
    onError: (error: any, variables, context) => {
      // Rollback to previous value on error
      if (context?.previousFeatures) {
        queryClient.setQueryData(["feature-requests-kanban"], context.previousFeatures);
      }
      console.error('[FeatureRequestKanbanBoard] Mutation failed:', error);
      logger.error('Failed to update feature request status', error);
      toast.error(`Failed to update feature status: ${error?.message || 'Unknown error'}`);
    },
    onSettled: () => {
      // Refetch to ensure we have server state
      queryClient.invalidateQueries({ queryKey: ["feature-requests-kanban"] });
    },
  });

  const handleStatusChange = (featureId: string, newStatus: string) => {
    updateStatusMutation.mutate({ featureId, newStatus });
  };

  const getFeaturesByStatus = (columnId: string) => {
    if (columnId === "complete") {
      return features.filter((feature) => feature.status === "completed" || feature.status === "archived");
    }
    if (columnId === "triage") {
      // Include 'triage', legacy 'pending', and 'submitted' (from external sources) in triage column
      return features.filter((feature) => 
        feature.status === "triage" || feature.status === "pending" || feature.status === "submitted"
      );
    }
    return features.filter((feature) => feature.status === columnId);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading feature requests...</div>;
  }

  return (
    <>
      <div className="flex gap-3 h-[calc(100vh-300px)] overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <FeatureKanbanColumn
            key={column.id}
            id={column.id}
            label={column.label}
            color={column.color}
            items={getFeaturesByStatus(column.id)}
            getItemId={(feature) => feature.id}
            renderItem={(feature) => (
              <FeatureCard
                feature={feature}
                onClick={() => setSelectedFeature(feature.id)}
                onStatusChange={handleStatusChange}
              />
            )}
          />
        ))}
      </div>

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
