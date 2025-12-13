/**
 * Beacon API Client
 *
 * Type-safe API wrapper for all Beacon integration operations.
 *
 * USAGE:
 * ======
 * ```typescript
 * import { beaconClient } from '@/lib/beacon/client';
 *
 * // Initialize with team credentials
 * await beaconClient.initialize(teamId);
 *
 * // Create a report
 * const { report } = await beaconClient.createReport({
 *   agentbuddy_property_id: property.id,  // ✓ CORRECT - use property.id
 *   report_type: 'cma',
 *   delivery_method: 'email',
 *   recipient_email: 'client@example.com'
 * });
 *
 * // Search reports for a property
 * const { reports } = await beaconClient.getPropertyReports(property.id);
 * ```
 *
 * CRITICAL REQUIREMENTS:
 * ======================
 * 1. ALWAYS call initialize() before making API requests
 * 2. ALWAYS use agentbuddy_property_id (property.id from properties table)
 * 3. NEVER use appraisal.id, listing.id, or transaction.id as property identifiers
 *
 * @module lib/beacon/client
 */

import { supabase } from '@/integrations/supabase/client';
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
import {
  validateCreateReportRequest,
  validateSearchReportsRequest,
  validateUpdateReportRequest,
  validateDeleteReportRequest,
  validateBeaconResponse,
  ensureStablePropertyId,
} from './validation';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Beacon API Configuration
 */
const BEACON_CONFIG = {
  /** Base URL for Beacon API */
  baseUrl: import.meta.env.VITE_BEACON_API_URL || 'https://api.beacon.com/v1',

  /** Request timeout in milliseconds */
  timeout: 10000,

  /** Retry configuration */
  retry: {
    maxAttempts: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 5000, // 5 seconds
    backoffMultiplier: 2,
  },
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Beacon Integration Statistics
 */
export interface BeaconIntegrationStats {
  /** Total reports created */
  total_reports: number;

  /** Reports by status */
  reports_by_status: {
    draft: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  };

  /** Reports by type */
  reports_by_type: {
    cma: number;
    buyer_guide: number;
    seller_guide: number;
    market_snapshot: number;
    property_report: number;
    custom: number;
  };

  /** Last report created timestamp */
  last_report_created_at?: string;

  /** Integration health status */
  health_status: 'healthy' | 'degraded' | 'down';
}

/**
 * Beacon API Credentials stored in database
 */
interface BeaconCredentials {
  /** Beacon API key */
  api_key: string;

  /** Team ID in Beacon */
  beacon_team_id?: string;

  /** Workspace ID in Beacon */
  workspace_id?: string;

  /** Whether integration is enabled */
  enabled: boolean;
}

/**
 * Retry context for tracking retry attempts
 */
interface RetryContext {
  attempt: number;
  maxAttempts: number;
  lastError?: Error;
}

// ============================================================================
// BeaconClient Class
// ============================================================================

/**
 * Beacon API Client
 *
 * Provides type-safe access to all Beacon API operations with automatic
 * validation, authentication, error handling, and retry logic.
 */
export class BeaconClient {
  /** Current team ID */
  private teamId?: string;

  /** Cached Beacon credentials */
  private credentials?: BeaconCredentials;

  /** Whether client has been initialized */
  private initialized: boolean = false;

  /**
   * Create a new BeaconClient instance
   *
   * @param teamId - Optional team ID to initialize immediately
   *
   * @example
   * ```typescript
   * const client = new BeaconClient();
   * await client.initialize('team_123');
   * ```
   */
  constructor(teamId?: string) {
    if (teamId) {
      this.teamId = teamId;
    }
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the client with team credentials
   *
   * Fetches Beacon API credentials from AgentBuddy database and caches them.
   * Must be called before making any API requests.
   *
   * @param teamId - Team ID to initialize with (optional if provided in constructor)
   * @throws {BeaconIntegrationError} If team not found or integration not configured
   *
   * @example
   * ```typescript
   * await beaconClient.initialize('team_123');
   * ```
   */
  async initialize(teamId?: string): Promise<void> {
    // Use provided teamId or fall back to constructor teamId
    const effectiveTeamId = teamId || this.teamId;

    if (!effectiveTeamId) {
      throw new BeaconIntegrationError(
        'Team ID is required to initialize Beacon client',
        'MISSING_TEAM_ID',
        400,
        {
          suggestion: 'Call initialize(teamId) or pass teamId to constructor',
        }
      );
    }

    this.teamId = effectiveTeamId;

    try {
      // Fetch Beacon credentials from database
      const { data, error } = await supabase
        .from('team_integrations')
        .select('api_key, beacon_team_id, workspace_id, enabled')
        .eq('team_id', this.teamId)
        .eq('integration_name', 'beacon')
        .single();

      if (error) {
        throw new BeaconIntegrationError(
          `Failed to fetch Beacon credentials for team ${this.teamId}`,
          'CREDENTIALS_FETCH_ERROR',
          500,
          {
            originalError: error,
            suggestion: 'Ensure Beacon integration is configured for this team',
          }
        );
      }

      if (!data) {
        throw new BeaconIntegrationError(
          `Beacon integration not found for team ${this.teamId}`,
          'INTEGRATION_NOT_FOUND',
          404,
          {
            suggestion: 'Configure Beacon integration in team settings',
          }
        );
      }

      if (!data.enabled) {
        throw new BeaconIntegrationError(
          `Beacon integration is disabled for team ${this.teamId}`,
          'INTEGRATION_DISABLED',
          403,
          {
            suggestion: 'Enable Beacon integration in team settings',
          }
        );
      }

      if (!data.api_key) {
        throw new BeaconIntegrationError(
          `Beacon API key not configured for team ${this.teamId}`,
          'MISSING_API_KEY',
          400,
          {
            suggestion: 'Add Beacon API key in team integration settings',
          }
        );
      }

      // Cache credentials
      this.credentials = {
        api_key: data.api_key,
        beacon_team_id: data.beacon_team_id || undefined,
        workspace_id: data.workspace_id || undefined,
        enabled: data.enabled,
      };

      this.initialized = true;

      console.log(`[Beacon] Client initialized for team ${this.teamId}`);
    } catch (error) {
      // Re-throw BeaconIntegrationError as-is
      if (error instanceof BeaconIntegrationError) {
        throw error;
      }

      // Wrap other errors
      throw new BeaconIntegrationError(
        'Failed to initialize Beacon client',
        'INITIALIZATION_ERROR',
        500,
        { originalError: error }
      );
    }
  }

  /**
   * Ensure client is initialized before making API requests
   *
   * @throws {BeaconIntegrationError} If not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.credentials) {
      throw new BeaconIntegrationError(
        'Beacon client not initialized',
        'NOT_INITIALIZED',
        500,
        {
          suggestion: 'Call await beaconClient.initialize(teamId) before making API requests',
        }
      );
    }
  }

  // ==========================================================================
  // Core API Methods - Reports
  // ==========================================================================

  /**
   * Create a new report
   *
   * CRITICAL: Use property.id from properties table as agentbuddy_property_id
   *
   * @param request - Report creation request (without team_id/api_key)
   * @returns Created report data
   * @throws {BeaconIntegrationError} If validation fails or API request fails
   *
   * @example
   * ```typescript
   * const { report } = await beaconClient.createReport({
   *   agentbuddy_property_id: property.id,  // ✓ CORRECT
   *   report_type: 'cma',
   *   delivery_method: 'email',
   *   recipient_email: 'client@example.com',
   *   options: {
   *     include_photos: true,
   *     include_comparables: true,
   *     comparable_count: 5
   *   }
   * });
   * ```
   */
  async createReport(
    request: Omit<CreateReportRequest, 'team_id' | 'api_key'>
  ): Promise<CreateReportResponse> {
    this.ensureInitialized();

    // Validate request BEFORE sending
    validateCreateReportRequest(request);

    // Make API request
    const response = await this.request<CreateReportResponse>('/reports', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    // Store report metadata in database for tracking
    await this.storeReportMetadata(response.report);

    console.log(`[Beacon] Created report ${response.report.id} for property ${request.agentbuddy_property_id}`);

    return response;
  }

  /**
   * Get a report by ID
   *
   * @param reportId - Report ID to fetch
   * @returns Report data
   * @throws {BeaconIntegrationError} If report not found or API request fails
   *
   * @example
   * ```typescript
   * const { report } = await beaconClient.getReport('report_123');
   * console.log(report.status); // 'completed'
   * ```
   */
  async getReport(reportId: string): Promise<GetReportResponse> {
    this.ensureInitialized();

    if (!reportId || typeof reportId !== 'string') {
      throw BeaconIntegrationError.validation('Invalid report ID', { reportId });
    }

    return this.request<GetReportResponse>(`/reports/${reportId}`, {
      method: 'GET',
    });
  }

  /**
   * Search reports with filters
   *
   * @param request - Search filters (without team_id/api_key)
   * @returns Paginated list of reports
   * @throws {BeaconIntegrationError} If validation fails or API request fails
   *
   * @example
   * ```typescript
   * // Search all reports for a property
   * const { reports } = await beaconClient.searchReports({
   *   agentbuddy_property_id: property.id,
   *   status: 'completed'
   * });
   *
   * // Search with pagination
   * const { reports, pagination } = await beaconClient.searchReports({
   *   page: 2,
   *   per_page: 20,
   *   sort_by: 'created_at',
   *   sort_order: 'desc'
   * });
   * ```
   */
  async searchReports(
    request: Omit<SearchReportsRequest, 'team_id' | 'api_key'> = {}
  ): Promise<SearchReportsResponse> {
    this.ensureInitialized();

    // Validate request BEFORE sending
    validateSearchReportsRequest(request);

    // Build query parameters
    const params = new URLSearchParams();
    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });

    const queryString = params.toString();
    const endpoint = queryString ? `/reports?${queryString}` : '/reports';

    return this.request<SearchReportsResponse>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * Update a report
   *
   * @param reportId - Report ID to update
   * @param updates - Fields to update
   * @returns Updated report data
   * @throws {BeaconIntegrationError} If validation fails or API request fails
   *
   * @example
   * ```typescript
   * const { report } = await beaconClient.updateReport('report_123', {
   *   status: 'cancelled',
   *   cancellation_reason: 'Client requested cancellation'
   * });
   * ```
   */
  async updateReport(
    reportId: string,
    updates: Partial<BeaconReport>
  ): Promise<UpdateReportResponse> {
    this.ensureInitialized();

    const request: UpdateReportRequest = {
      report_id: reportId,
      ...updates,
    };

    // Validate request BEFORE sending
    validateUpdateReportRequest(request);

    return this.request<UpdateReportResponse>(`/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a report
   *
   * @param reportId - Report ID to delete
   * @returns Deletion confirmation
   * @throws {BeaconIntegrationError} If API request fails
   *
   * @example
   * ```typescript
   * await beaconClient.deleteReport('report_123');
   * ```
   */
  async deleteReport(reportId: string): Promise<DeleteReportResponse> {
    this.ensureInitialized();

    const request = { report_id: reportId };

    // Validate request BEFORE sending
    validateDeleteReportRequest(request);

    // Delete from Beacon API
    const response = await this.request<DeleteReportResponse>(`/reports/${reportId}`, {
      method: 'DELETE',
    });

    // Remove from local database
    await this.removeReportMetadata(reportId);

    console.log(`[Beacon] Deleted report ${reportId}`);

    return response;
  }

  // ==========================================================================
  // Property Operations
  // ==========================================================================

  /**
   * Link a Beacon property slug to an AgentBuddy property ID
   *
   * This creates the mapping between Beacon's property identifier (slug)
   * and AgentBuddy's stable property ID.
   *
   * CRITICAL: Use property.id from properties table
   *
   * @param propertySlug - Beacon property slug/identifier
   * @param agentbuddyPropertyId - AgentBuddy property ID (property.id)
   * @throws {BeaconIntegrationError} If validation fails or database operation fails
   *
   * @example
   * ```typescript
   * await beaconClient.linkProperty(
   *   'beacon-property-slug-123',
   *   property.id  // ✓ CORRECT - from properties table
   * );
   * ```
   */
  async linkProperty(propertySlug: string, agentbuddyPropertyId: string): Promise<void> {
    this.ensureInitialized();

    // Validate property ID
    ensureStablePropertyId(agentbuddyPropertyId, 'linkProperty');

    if (!propertySlug || typeof propertySlug !== 'string') {
      throw BeaconIntegrationError.validation('Invalid Beacon property slug', { propertySlug });
    }

    try {
      // Store property link in database
      const { error } = await supabase.from('beacon_property_links').upsert(
        {
          team_id: this.teamId!,
          beacon_property_slug: propertySlug,
          agentbuddy_property_id: agentbuddyPropertyId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'team_id,beacon_property_slug',
        }
      );

      if (error) {
        throw new BeaconIntegrationError(
          'Failed to link property in database',
          'PROPERTY_LINK_ERROR',
          500,
          { originalError: error }
        );
      }

      console.log(`[Beacon] Linked property ${propertySlug} -> ${agentbuddyPropertyId}`);
    } catch (error) {
      if (error instanceof BeaconIntegrationError) {
        throw error;
      }
      throw new BeaconIntegrationError(
        'Failed to link property',
        'PROPERTY_LINK_ERROR',
        500,
        { originalError: error }
      );
    }
  }

  /**
   * Get all reports for a property
   *
   * Convenience method for searching reports by property ID
   *
   * @param agentbuddyPropertyId - AgentBuddy property ID (property.id)
   * @returns List of reports for the property
   * @throws {BeaconIntegrationError} If validation fails or API request fails
   *
   * @example
   * ```typescript
   * const { reports } = await beaconClient.getPropertyReports(property.id);
   * reports.forEach(report => {
   *   console.log(`${report.type}: ${report.status}`);
   * });
   * ```
   */
  async getPropertyReports(agentbuddyPropertyId: string): Promise<SearchReportsResponse> {
    // Validate property ID
    ensureStablePropertyId(agentbuddyPropertyId, 'getPropertyReports');

    return this.searchReports({
      agentbuddy_property_id: agentbuddyPropertyId,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Check Beacon API health
   *
   * @returns Health status and timestamp
   * @throws {BeaconIntegrationError} If API is down
   *
   * @example
   * ```typescript
   * const health = await beaconClient.checkHealth();
   * console.log(health.status); // 'ok'
   * ```
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    this.ensureInitialized();

    try {
      const response = await this.request<{ status: string }>('/health', {
        method: 'GET',
      });

      return {
        status: response.status || 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new BeaconIntegrationError(
        'Beacon API health check failed',
        'HEALTH_CHECK_FAILED',
        503,
        { originalError: error }
      );
    }
  }

  /**
   * Get integration statistics
   *
   * Fetches aggregated statistics about Beacon usage for this team
   *
   * @returns Integration statistics
   *
   * @example
   * ```typescript
   * const stats = await beaconClient.getIntegrationStats();
   * console.log(`Total reports: ${stats.total_reports}`);
   * console.log(`Completed: ${stats.reports_by_status.completed}`);
   * ```
   */
  async getIntegrationStats(): Promise<BeaconIntegrationStats> {
    this.ensureInitialized();

    try {
      // Fetch reports from local database for statistics
      const { data: reports, error } = await supabase
        .from('beacon_reports')
        .select('type, status, created_at')
        .eq('team_id', this.teamId!);

      if (error) {
        throw error;
      }

      // Aggregate statistics
      const stats: BeaconIntegrationStats = {
        total_reports: reports?.length || 0,
        reports_by_status: {
          draft: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          cancelled: 0,
        },
        reports_by_type: {
          cma: 0,
          buyer_guide: 0,
          seller_guide: 0,
          market_snapshot: 0,
          property_report: 0,
          custom: 0,
        },
        health_status: 'healthy',
      };

      // Count by status and type
      reports?.forEach((report) => {
        if (report.status && report.status in stats.reports_by_status) {
          stats.reports_by_status[report.status as keyof typeof stats.reports_by_status]++;
        }
        if (report.type && report.type in stats.reports_by_type) {
          stats.reports_by_type[report.type as keyof typeof stats.reports_by_type]++;
        }
      });

      // Get last created timestamp
      if (reports && reports.length > 0) {
        const sorted = [...reports].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        stats.last_report_created_at = sorted[0].created_at;
      }

      // Determine health status
      const failureRate = stats.total_reports > 0
        ? stats.reports_by_status.failed / stats.total_reports
        : 0;

      if (failureRate > 0.5) {
        stats.health_status = 'down';
      } else if (failureRate > 0.2) {
        stats.health_status = 'degraded';
      }

      return stats;
    } catch (error) {
      throw new BeaconIntegrationError(
        'Failed to fetch integration statistics',
        'STATS_FETCH_ERROR',
        500,
        { originalError: error }
      );
    }
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Make an HTTP request to Beacon API
   *
   * Handles:
   * - Authentication headers
   * - Request/response validation
   * - Error handling
   * - Retry logic for transient failures
   *
   * @param endpoint - API endpoint (relative to baseUrl)
   * @param options - Fetch options
   * @returns Parsed response data
   * @throws {BeaconIntegrationError} If request fails
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    this.ensureInitialized();

    const url = `${BEACON_CONFIG.baseUrl}${endpoint}`;

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.credentials!.api_key}`,
      'X-AgentBuddy-Team-ID': this.teamId!,
      ...(options.headers || {}),
    };

    // Add workspace ID if configured
    if (this.credentials!.workspace_id) {
      (headers as Record<string, string>)['X-Beacon-Workspace-ID'] = this.credentials!.workspace_id;
    }

    // Merge options
    const fetchOptions: RequestInit = {
      ...options,
      headers,
      signal: AbortSignal.timeout(BEACON_CONFIG.timeout),
    };

    // Execute with retry logic
    return this.requestWithRetry<T>(url, fetchOptions);
  }

  /**
   * Execute request with exponential backoff retry
   *
   * Retries on:
   * - Network errors (timeout, connection refused, etc.)
   * - 5xx server errors
   *
   * Does NOT retry on:
   * - 4xx client errors (bad request, not found, etc.)
   */
  private async requestWithRetry<T>(
    url: string,
    options: RequestInit,
    context: RetryContext = { attempt: 0, maxAttempts: BEACON_CONFIG.retry.maxAttempts }
  ): Promise<T> {
    try {
      const response = await fetch(url, options);
      const data = await response.json();

      // Validate response
      validateBeaconResponse<T>(response, data);

      return data as T;
    } catch (error) {
      // Check if we should retry
      const shouldRetry = this.shouldRetryRequest(error, context);

      if (shouldRetry && context.attempt < context.maxAttempts) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          BEACON_CONFIG.retry.initialDelay * Math.pow(BEACON_CONFIG.retry.backoffMultiplier, context.attempt),
          BEACON_CONFIG.retry.maxDelay
        );

        console.warn(
          `[Beacon] Request failed (attempt ${context.attempt + 1}/${context.maxAttempts}), ` +
          `retrying in ${delay}ms...`,
          error
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Retry with incremented attempt count
        return this.requestWithRetry<T>(url, options, {
          ...context,
          attempt: context.attempt + 1,
          lastError: error as Error,
        });
      }

      // No more retries or non-retryable error - throw
      if (error instanceof BeaconIntegrationError) {
        throw error;
      }

      // Wrap unknown errors
      throw new BeaconIntegrationError(
        'Beacon API request failed',
        'REQUEST_FAILED',
        500,
        {
          url,
          method: options.method,
          originalError: error,
          attempts: context.attempt + 1,
        }
      );
    }
  }

  /**
   * Determine if request should be retried
   *
   * @param error - The error that occurred
   * @param context - Retry context
   * @returns Whether to retry the request
   */
  private shouldRetryRequest(error: unknown, context: RetryContext): boolean {
    // Don't retry if max attempts reached
    if (context.attempt >= context.maxAttempts) {
      return false;
    }

    // Retry on network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }

    // Retry on timeout
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return true;
    }

    // Retry on 5xx server errors
    if (error instanceof BeaconIntegrationError) {
      const statusCode = error.statusCode;
      if (statusCode && statusCode >= 500 && statusCode < 600) {
        return true;
      }

      // Retry on rate limiting (429) with backoff
      if (statusCode === 429) {
        return true;
      }
    }

    // Don't retry on client errors (4xx)
    return false;
  }

  /**
   * Store report metadata in local database for tracking
   *
   * @param report - Report data to store
   */
  private async storeReportMetadata(report: BeaconReport): Promise<void> {
    try {
      const { error } = await supabase.from('beacon_reports').upsert(
        {
          team_id: this.teamId!,
          beacon_report_id: report.id,
          agentbuddy_property_id: report.agentbuddy_property_id,
          type: report.type,
          status: report.status,
          report_url: report.report_url,
          pdf_url: report.pdf_url,
          created_at: report.created_at,
          updated_at: report.updated_at,
          completed_at: report.completed_at,
          metadata: report.metadata || {},
        },
        {
          onConflict: 'team_id,beacon_report_id',
        }
      );

      if (error) {
        console.error('[Beacon] Failed to store report metadata:', error);
        // Don't throw - this is non-critical
      }
    } catch (error) {
      console.error('[Beacon] Failed to store report metadata:', error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Remove report metadata from local database
   *
   * @param reportId - Report ID to remove
   */
  private async removeReportMetadata(reportId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('beacon_reports')
        .delete()
        .eq('team_id', this.teamId!)
        .eq('beacon_report_id', reportId);

      if (error) {
        console.error('[Beacon] Failed to remove report metadata:', error);
        // Don't throw - this is non-critical
      }
    } catch (error) {
      console.error('[Beacon] Failed to remove report metadata:', error);
      // Don't throw - this is non-critical
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton Beacon client instance
 *
 * USAGE:
 * ======
 * ```typescript
 * import { beaconClient } from '@/lib/beacon/client';
 *
 * // In your component or API handler
 * await beaconClient.initialize(teamId);
 * const { report } = await beaconClient.createReport({...});
 * ```
 */
export const beaconClient = new BeaconClient();
