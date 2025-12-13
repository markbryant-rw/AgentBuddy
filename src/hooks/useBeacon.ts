/**
 * Beacon Integration React Hooks
 *
 * Comprehensive hooks for using Beacon integration in React components.
 *
 * USAGE EXAMPLES:
 * ===============
 *
 * Initialize and check status:
 * ```tsx
 * const { client, isInitialized } = useBeaconClient();
 * const isEnabled = useIsBeaconEnabled();
 * const { data: stats } = useBeaconIntegration();
 * ```
 *
 * Create a report:
 * ```tsx
 * const createReport = useCreateBeaconReport();
 *
 * const handleCreateReport = async () => {
 *   await createReport.mutateAsync({
 *     agentbuddy_property_id: property.id,
 *     report_type: 'cma',
 *     delivery_method: 'email',
 *     recipient_email: 'client@example.com'
 *   });
 * };
 * ```
 *
 * View property reports:
 * ```tsx
 * const { data: reports, isLoading } = usePropertyBeaconReports(property.id);
 * const hasReports = useHasBeaconReports(property.id);
 * const reportCount = usePropertyReportCount(property.id);
 * ```
 *
 * @module hooks/useBeacon
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTeam } from '@/hooks/useTeam';
import { beaconClient, BeaconIntegrationStats } from '@/lib/beacon/client';
import {
  BeaconIntegrationError,
  CreateReportRequest,
  CreateReportResponse,
  GetReportResponse,
  SearchReportsRequest,
  SearchReportsResponse,
  UpdateReportRequest,
  UpdateReportResponse,
  DeleteReportResponse,
  BeaconReport,
} from '@/types/beacon';
import { formatBeaconError } from '@/lib/beacon/validation';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * Query key factory for Beacon queries
 *
 * Organized by entity type for easy invalidation
 */
export const beaconKeys = {
  /** All beacon queries */
  all: ['beacon'] as const,

  /** Beacon client initialization */
  client: (teamId?: string) => [...beaconKeys.all, 'client', teamId] as const,

  /** Integration status and stats */
  integration: (teamId?: string) => [...beaconKeys.all, 'integration', teamId] as const,

  /** All report queries */
  reports: () => [...beaconKeys.all, 'reports'] as const,

  /** Single report by ID */
  report: (reportId: string) => [...beaconKeys.reports(), reportId] as const,

  /** Report list with filters */
  reportList: (filters?: SearchReportsRequest) =>
    [...beaconKeys.reports(), 'list', filters] as const,

  /** Reports for a specific property */
  propertyReports: (propertyId: string) =>
    [...beaconKeys.reports(), 'property', propertyId] as const,

  /** Health check */
  health: (teamId?: string) => [...beaconKeys.all, 'health', teamId] as const,
} as const;

// ============================================================================
// INITIALIZATION HOOKS
// ============================================================================

/**
 * Get initialized Beacon client instance
 *
 * Automatically initializes client with current team credentials.
 *
 * @returns Beacon client and initialization state
 *
 * @example
 * ```tsx
 * function ReportButton() {
 *   const { client, isInitialized, error } = useBeaconClient();
 *
 *   if (!isInitialized) return <Spinner />;
 *   if (error) return <ErrorMessage />;
 *
 *   const handleClick = async () => {
 *     await client.createReport({...});
 *   };
 *
 *   return <Button onClick={handleClick}>Create Report</Button>;
 * }
 * ```
 */
export function useBeaconClient() {
  const { team } = useTeam();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<BeaconIntegrationError | null>(null);

  useEffect(() => {
    if (!team?.id) {
      setIsInitialized(false);
      setError(null);
      return;
    }

    const initialize = async () => {
      try {
        await beaconClient.initialize(team.id);
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        setIsInitialized(false);
        if (err instanceof BeaconIntegrationError) {
          setError(err);
        } else {
          setError(
            new BeaconIntegrationError(
              'Failed to initialize Beacon client',
              'INITIALIZATION_ERROR',
              500
            )
          );
        }
      }
    };

    initialize();
  }, [team?.id]);

  return {
    client: beaconClient,
    isInitialized,
    error,
    teamId: team?.id,
  };
}

/**
 * Get Beacon integration status and statistics
 *
 * @returns Integration stats including report counts, health status, etc.
 *
 * @example
 * ```tsx
 * function IntegrationDashboard() {
 *   const { data: stats, isLoading } = useBeaconIntegration();
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       <h2>Total Reports: {stats.total_reports}</h2>
 *       <p>Completed: {stats.reports_by_status.completed}</p>
 *       <p>Health: {stats.health_status}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBeaconIntegration(): UseQueryResult<BeaconIntegrationStats> {
  const { team } = useTeam();
  const { isInitialized } = useBeaconClient();

  return useQuery({
    queryKey: beaconKeys.integration(team?.id),
    queryFn: async () => {
      return await beaconClient.getIntegrationStats();
    },
    enabled: !!team?.id && isInitialized,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Check if Beacon integration is enabled for current team
 *
 * @returns Boolean indicating if integration is enabled
 *
 * @example
 * ```tsx
 * function ReportSection() {
 *   const isEnabled = useIsBeaconEnabled();
 *
 *   if (!isEnabled) {
 *     return <IntegrationSetupPrompt />;
 *   }
 *
 *   return <ReportsList />;
 * }
 * ```
 */
export function useIsBeaconEnabled(): boolean {
  const { isInitialized, error } = useBeaconClient();

  // Integration is enabled if client initialized successfully
  return isInitialized && !error;
}

// ============================================================================
// REPORT OPERATION HOOKS
// ============================================================================

/**
 * Create a Beacon report
 *
 * @returns Mutation for creating reports
 *
 * @example
 * ```tsx
 * function CreateReportButton({ property }) {
 *   const createReport = useCreateBeaconReport();
 *
 *   const handleCreate = async () => {
 *     await createReport.mutateAsync({
 *       agentbuddy_property_id: property.id,  // ✓ CORRECT
 *       report_type: 'cma',
 *       delivery_method: 'email',
 *       recipient_email: 'client@example.com',
 *       options: {
 *         include_comparables: true,
 *         comparable_count: 5
 *       }
 *     });
 *   };
 *
 *   return (
 *     <Button
 *       onClick={handleCreate}
 *       disabled={createReport.isPending}
 *     >
 *       {createReport.isPending ? 'Creating...' : 'Create CMA Report'}
 *     </Button>
 *   );
 * }
 * ```
 */
export function useCreateBeaconReport() {
  const queryClient = useQueryClient();
  const { team } = useTeam();

  return useMutation({
    mutationFn: async (
      request: Omit<CreateReportRequest, 'team_id' | 'api_key'>
    ): Promise<CreateReportResponse> => {
      return await beaconClient.createReport(request);
    },
    onSuccess: (data, variables) => {
      // Invalidate report queries
      queryClient.invalidateQueries({ queryKey: beaconKeys.reports() });
      queryClient.invalidateQueries({
        queryKey: beaconKeys.propertyReports(variables.agentbuddy_property_id),
      });
      queryClient.invalidateQueries({ queryKey: beaconKeys.integration(team?.id) });

      toast.success('Report created successfully', {
        description: `${data.report.type} report for property ${variables.agentbuddy_property_id}`,
      });
    },
    onError: (error: unknown) => {
      const formatted = formatBeaconError(error);
      toast.error(formatted.title, {
        description: formatted.message + (formatted.suggestion ? `\n\n${formatted.suggestion}` : ''),
      });
    },
  });
}

/**
 * Get a single report by ID
 *
 * @param reportId - Report ID to fetch
 * @returns Query for report data
 *
 * @example
 * ```tsx
 * function ReportDetails({ reportId }) {
 *   const { data: report, isLoading } = useBeaconReport(reportId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (!report) return <NotFound />;
 *
 *   return (
 *     <div>
 *       <h2>{report.report.type}</h2>
 *       <p>Status: {report.report.status}</p>
 *       {report.report.report_url && (
 *         <a href={report.report.report_url}>View Report</a>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBeaconReport(reportId: string): UseQueryResult<GetReportResponse> {
  const { isInitialized } = useBeaconClient();

  return useQuery({
    queryKey: beaconKeys.report(reportId),
    queryFn: async () => {
      return await beaconClient.getReport(reportId);
    },
    enabled: !!reportId && isInitialized,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Search reports with filters
 *
 * @param filters - Search filters (optional)
 * @returns Query for paginated report list
 *
 * @example
 * ```tsx
 * function ReportsList() {
 *   const { data, isLoading } = useBeaconReports({
 *     status: 'completed',
 *     page: 1,
 *     per_page: 20,
 *     sort_by: 'created_at',
 *     sort_order: 'desc'
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <div>
 *       {data.reports.map(report => (
 *         <ReportCard key={report.id} report={report} />
 *       ))}
 *       <Pagination {...data.pagination} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useBeaconReports(
  filters?: Omit<SearchReportsRequest, 'team_id' | 'api_key'>
): UseQueryResult<SearchReportsResponse> {
  const { isInitialized } = useBeaconClient();

  return useQuery({
    queryKey: beaconKeys.reportList(filters),
    queryFn: async () => {
      return await beaconClient.searchReports(filters || {});
    },
    enabled: isInitialized,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get all reports for a specific property
 *
 * Convenience hook for property-specific report listing.
 *
 * @param propertyId - AgentBuddy property ID (property.id from properties table)
 * @returns Query for property's reports
 *
 * @example
 * ```tsx
 * function PropertyReports({ property }) {
 *   const { data, isLoading } = usePropertyBeaconReports(property.id);
 *
 *   if (isLoading) return <Spinner />;
 *   if (!data?.reports.length) return <EmptyState />;
 *
 *   return (
 *     <div>
 *       <h3>Reports for {property.address}</h3>
 *       {data.reports.map(report => (
 *         <ReportCard key={report.id} report={report} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePropertyBeaconReports(
  propertyId: string
): UseQueryResult<SearchReportsResponse> {
  const { isInitialized } = useBeaconClient();

  return useQuery({
    queryKey: beaconKeys.propertyReports(propertyId),
    queryFn: async () => {
      return await beaconClient.getPropertyReports(propertyId);
    },
    enabled: !!propertyId && isInitialized,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Update a report
 *
 * @returns Mutation for updating reports
 *
 * @example
 * ```tsx
 * function CancelReportButton({ reportId }) {
 *   const updateReport = useUpdateBeaconReport();
 *
 *   const handleCancel = async () => {
 *     await updateReport.mutateAsync({
 *       reportId,
 *       status: 'cancelled',
 *       cancellation_reason: 'Client requested cancellation'
 *     });
 *   };
 *
 *   return (
 *     <Button onClick={handleCancel} variant="destructive">
 *       Cancel Report
 *     </Button>
 *   );
 * }
 * ```
 */
export function useUpdateBeaconReport() {
  const queryClient = useQueryClient();
  const { team } = useTeam();

  return useMutation({
    mutationFn: async ({
      reportId,
      ...updates
    }: { reportId: string } & Partial<BeaconReport>): Promise<UpdateReportResponse> => {
      return await beaconClient.updateReport(reportId, updates);
    },
    onSuccess: (data, variables) => {
      // Invalidate affected queries
      queryClient.invalidateQueries({ queryKey: beaconKeys.report(variables.reportId) });
      queryClient.invalidateQueries({ queryKey: beaconKeys.reports() });
      if (data.report.agentbuddy_property_id) {
        queryClient.invalidateQueries({
          queryKey: beaconKeys.propertyReports(data.report.agentbuddy_property_id),
        });
      }
      queryClient.invalidateQueries({ queryKey: beaconKeys.integration(team?.id) });

      toast.success('Report updated successfully');
    },
    onError: (error: unknown) => {
      const formatted = formatBeaconError(error);
      toast.error(formatted.title, {
        description: formatted.message,
      });
    },
  });
}

/**
 * Delete a report
 *
 * @returns Mutation for deleting reports
 *
 * @example
 * ```tsx
 * function DeleteReportButton({ reportId, propertyId }) {
 *   const deleteReport = useDeleteBeaconReport();
 *
 *   const handleDelete = async () => {
 *     if (confirm('Are you sure you want to delete this report?')) {
 *       await deleteReport.mutateAsync({ reportId, propertyId });
 *     }
 *   };
 *
 *   return (
 *     <Button onClick={handleDelete} variant="destructive">
 *       Delete Report
 *     </Button>
 *   );
 * }
 * ```
 */
export function useDeleteBeaconReport() {
  const queryClient = useQueryClient();
  const { team } = useTeam();

  return useMutation({
    mutationFn: async ({
      reportId,
      propertyId,
    }: {
      reportId: string;
      propertyId?: string;
    }): Promise<DeleteReportResponse> => {
      return await beaconClient.deleteReport(reportId);
    },
    onSuccess: (data, variables) => {
      // Invalidate affected queries
      queryClient.invalidateQueries({ queryKey: beaconKeys.report(variables.reportId) });
      queryClient.invalidateQueries({ queryKey: beaconKeys.reports() });
      if (variables.propertyId) {
        queryClient.invalidateQueries({
          queryKey: beaconKeys.propertyReports(variables.propertyId),
        });
      }
      queryClient.invalidateQueries({ queryKey: beaconKeys.integration(team?.id) });

      toast.success('Report deleted successfully');
    },
    onError: (error: unknown) => {
      const formatted = formatBeaconError(error);
      toast.error(formatted.title, {
        description: formatted.message,
      });
    },
  });
}

// ============================================================================
// PROPERTY OPERATION HOOKS
// ============================================================================

/**
 * Link a Beacon property to an AgentBuddy property
 *
 * Creates the mapping between Beacon's property identifier and AgentBuddy's property ID.
 *
 * @returns Mutation for linking properties
 *
 * @example
 * ```tsx
 * function LinkPropertyButton({ beaconSlug, property }) {
 *   const linkProperty = useLinkBeaconProperty();
 *
 *   const handleLink = async () => {
 *     await linkProperty.mutateAsync({
 *       propertySlug: beaconSlug,
 *       agentbuddyPropertyId: property.id  // ✓ CORRECT - from properties table
 *     });
 *   };
 *
 *   return <Button onClick={handleLink}>Link Property</Button>;
 * }
 * ```
 */
export function useLinkBeaconProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      propertySlug,
      agentbuddyPropertyId,
    }: {
      propertySlug: string;
      agentbuddyPropertyId: string;
    }): Promise<void> => {
      return await beaconClient.linkProperty(propertySlug, agentbuddyPropertyId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: beaconKeys.propertyReports(variables.agentbuddyPropertyId),
      });

      toast.success('Property linked successfully', {
        description: `Beacon property linked to AgentBuddy property ${variables.agentbuddyPropertyId}`,
      });
    },
    onError: (error: unknown) => {
      const formatted = formatBeaconError(error);
      toast.error(formatted.title, {
        description: formatted.message,
      });
    },
  });
}

/**
 * Get count of reports for a property
 *
 * @param propertyId - AgentBuddy property ID
 * @returns Report count
 *
 * @example
 * ```tsx
 * function PropertyHeader({ property }) {
 *   const reportCount = usePropertyReportCount(property.id);
 *
 *   return (
 *     <div>
 *       <h2>{property.address}</h2>
 *       <Badge>{reportCount} Reports</Badge>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePropertyReportCount(propertyId: string): number {
  const { data } = usePropertyBeaconReports(propertyId);
  return data?.reports.length || 0;
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Check Beacon API health status
 *
 * @returns Query for health check data
 *
 * @example
 * ```tsx
 * function HealthIndicator() {
 *   const { data: health, isError } = useBeaconHealth();
 *
 *   return (
 *     <div>
 *       <span>Beacon API:</span>
 *       {isError ? (
 *         <Badge variant="destructive">Down</Badge>
 *       ) : (
 *         <Badge variant="success">{health?.status}</Badge>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBeaconHealth(): UseQueryResult<{ status: string; timestamp: string }> {
  const { team } = useTeam();
  const { isInitialized } = useBeaconClient();

  return useQuery({
    queryKey: beaconKeys.health(team?.id),
    queryFn: async () => {
      return await beaconClient.checkHealth();
    },
    enabled: !!team?.id && isInitialized,
    staleTime: 60 * 1000, // 1 minute
    retry: 1, // Only retry once for health checks
  });
}

/**
 * Check if a property has any Beacon reports
 *
 * Boolean helper for conditional rendering.
 *
 * @param propertyId - AgentBuddy property ID
 * @returns Boolean indicating if property has reports
 *
 * @example
 * ```tsx
 * function PropertyActions({ property }) {
 *   const hasReports = useHasBeaconReports(property.id);
 *
 *   return (
 *     <div>
 *       {hasReports ? (
 *         <Button variant="outline">View Reports</Button>
 *       ) : (
 *         <Button>Create First Report</Button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useHasBeaconReports(propertyId: string): boolean {
  const count = usePropertyReportCount(propertyId);
  return count > 0;
}

/**
 * Get Beacon client with automatic reinitialization on team change
 *
 * Advanced hook that handles team switching automatically.
 *
 * @returns Beacon client instance and status
 *
 * @example
 * ```tsx
 * function AdvancedComponent() {
 *   const beacon = useBeaconClientWithReinit();
 *
 *   useEffect(() => {
 *     if (beacon.isReady) {
 *       // Client is ready to use
 *       beacon.client.getIntegrationStats().then(console.log);
 *     }
 *   }, [beacon.isReady]);
 *
 *   return <div>Status: {beacon.status}</div>;
 * }
 * ```
 */
export function useBeaconClientWithReinit() {
  const { team } = useTeam();
  const { client, isInitialized, error } = useBeaconClient();

  const status = error ? 'error' : isInitialized ? 'ready' : 'initializing';

  return {
    client,
    isReady: isInitialized && !error,
    isInitializing: !isInitialized && !error,
    isError: !!error,
    error,
    status,
    teamId: team?.id,
  };
}

// ============================================================================
// Type Exports
// ============================================================================

export type {
  BeaconReport,
  CreateReportRequest,
  SearchReportsRequest,
  BeaconIntegrationStats,
};
