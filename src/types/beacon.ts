/**
 * Beacon Integration Types
 *
 * This module provides comprehensive TypeScript types for the Beacon API integration.
 *
 * CRITICAL: Property Identification Strategy
 * =========================================
 * - agentbuddy_property_id: STABLE identifier that NEVER changes during property lifecycle
 * - external_lead_id: UNSTABLE identifier that changes when property transitions stages
 *
 * ALWAYS use agentbuddy_property_id as the primary property identifier in:
 * - Database foreign keys
 * - API requests
 * - Report associations
 * - Webhook processing
 *
 * @module types/beacon
 */

// ============================================================================
// Core Entity Types
// ============================================================================

/**
 * Beacon Property
 *
 * Represents a property in the Beacon system.
 *
 * CRITICAL: Use agentbuddy_property_id as the stable identifier for all operations.
 * The external_lead_id will change when properties move between pipeline stages.
 */
export interface BeaconProperty {
  /**
   * STABLE property identifier - USE THIS for all database relations and API calls
   * This ID remains constant throughout the property's lifecycle
   */
  agentbuddy_property_id: string;

  /**
   * UNSTABLE external lead ID - DO NOT use as primary identifier
   * This ID changes when property moves between stages (e.g., Lead -> Listing -> Transaction)
   * Only use this for Beacon API calls that specifically require it
   */
  external_lead_id: string;

  /** Property street address */
  street_address: string;

  /** City */
  city: string;

  /** State/Province code (e.g., "CA", "NY") */
  state: string;

  /** ZIP/Postal code */
  zip_code: string;

  /** Full formatted address */
  full_address?: string;

  /** Property type (e.g., "Single Family", "Condo", "Townhouse") */
  property_type?: string;

  /** Current property status in Beacon */
  status?: BeaconPropertyStatus;

  /** Property stage in pipeline */
  stage?: BeaconPropertyStage;

  /** Associated property owner information */
  owner?: BeaconPropertyOwner;

  /** Additional metadata */
  metadata?: Record<string, any>;

  /** Timestamp when property was created in Beacon */
  created_at?: string;

  /** Timestamp when property was last updated in Beacon */
  updated_at?: string;
}

/**
 * Property Status in Beacon
 */
export type BeaconPropertyStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'closed'
  | 'archived';

/**
 * Property Stage in Pipeline
 */
export type BeaconPropertyStage =
  | 'lead'
  | 'listing'
  | 'under_contract'
  | 'transaction'
  | 'closed';

/**
 * Property Owner Information
 */
export interface BeaconPropertyOwner {
  /** Owner's first name */
  first_name?: string;

  /** Owner's last name */
  last_name?: string;

  /** Owner's full name */
  full_name?: string;

  /** Owner's email address */
  email?: string;

  /** Owner's phone number */
  phone?: string;

  /** Mailing address if different from property */
  mailing_address?: string;
}

// ============================================================================
// Report Types
// ============================================================================

/**
 * Beacon Report Types
 *
 * Available report types in the Beacon platform
 */
export type BeaconReportType =
  | 'cma'              // Comparative Market Analysis
  | 'buyer_guide'      // Buyer's Guide
  | 'seller_guide'     // Seller's Guide
  | 'market_snapshot'  // Market Snapshot
  | 'property_report'  // Property Report
  | 'custom';          // Custom Report

/**
 * Report Status
 */
export type BeaconReportStatus =
  | 'draft'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Report Delivery Method
 */
export type BeaconReportDeliveryMethod =
  | 'email'
  | 'sms'
  | 'link'
  | 'webhook';

/**
 * Beacon Report
 *
 * Represents a report generated through the Beacon platform
 */
export interface BeaconReport {
  /** Unique report identifier in Beacon */
  id: string;

  /**
   * STABLE property identifier
   * CRITICAL: This must reference agentbuddy_property_id, not external_lead_id
   */
  agentbuddy_property_id: string;

  /** Report type */
  type: BeaconReportType;

  /** Report status */
  status: BeaconReportStatus;

  /** Report title/name */
  title?: string;

  /** Report description */
  description?: string;

  /** URL to view the report */
  report_url?: string;

  /** URL to download PDF version */
  pdf_url?: string;

  /** Delivery method used */
  delivery_method?: BeaconReportDeliveryMethod;

  /** Recipient email if delivered via email */
  recipient_email?: string;

  /** Recipient phone if delivered via SMS */
  recipient_phone?: string;

  /** Report generation options/settings */
  options?: BeaconReportOptions;

  /** Report metadata */
  metadata?: Record<string, any>;

  /** Error message if report generation failed */
  error_message?: string;

  /** Timestamp when report was requested */
  created_at: string;

  /** Timestamp when report was last updated */
  updated_at: string;

  /** Timestamp when report was completed */
  completed_at?: string;

  /** User who requested the report */
  requested_by?: string;
}

/**
 * Report Generation Options
 */
export interface BeaconReportOptions {
  /** Include property photos */
  include_photos?: boolean;

  /** Include market statistics */
  include_market_stats?: boolean;

  /** Include comparable properties */
  include_comparables?: boolean;

  /** Number of comparable properties to include */
  comparable_count?: number;

  /** Include neighborhood information */
  include_neighborhood?: boolean;

  /** Include school information */
  include_schools?: boolean;

  /** Custom branding settings */
  branding?: {
    logo_url?: string;
    primary_color?: string;
    agent_name?: string;
    agent_photo_url?: string;
    company_name?: string;
  };

  /** Additional custom options */
  custom_options?: Record<string, any>;
}

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Create Report Request
 *
 * CRITICAL: Must use agentbuddy_property_id, not external_lead_id
 */
export interface CreateReportRequest {
  /**
   * STABLE property identifier
   * REQUIRED: Use agentbuddy_property_id from BeaconProperty
   */
  agentbuddy_property_id: string;

  /** Report type to generate */
  report_type: BeaconReportType;

  /** Report delivery method */
  delivery_method?: BeaconReportDeliveryMethod;

  /** Recipient email (required if delivery_method is 'email') */
  recipient_email?: string;

  /** Recipient phone (required if delivery_method is 'sms') */
  recipient_phone?: string;

  /** Report generation options */
  options?: BeaconReportOptions;

  /** Custom metadata */
  metadata?: Record<string, any>;
}

/**
 * Create Report Response
 */
export interface CreateReportResponse {
  /** Created report */
  report: BeaconReport;

  /** Success indicator */
  success: boolean;

  /** Message */
  message?: string;
}

/**
 * Get Report Request
 */
export interface GetReportRequest {
  /** Report ID */
  report_id: string;
}

/**
 * Get Report Response
 */
export interface GetReportResponse {
  /** Report data */
  report: BeaconReport;

  /** Success indicator */
  success: boolean;
}

/**
 * Search Reports Request
 *
 * CRITICAL: When filtering by property, use agentbuddy_property_id
 */
export interface SearchReportsRequest {
  /**
   * Filter by STABLE property identifier
   * Use agentbuddy_property_id, not external_lead_id
   */
  agentbuddy_property_id?: string;

  /** Filter by report type */
  report_type?: BeaconReportType;

  /** Filter by status */
  status?: BeaconReportStatus;

  /** Filter by creation date range */
  created_after?: string;
  created_before?: string;

  /** Filter by completion date range */
  completed_after?: string;
  completed_before?: string;

  /** Filter by user who requested */
  requested_by?: string;

  /** Pagination: page number (1-indexed) */
  page?: number;

  /** Pagination: items per page */
  per_page?: number;

  /** Sort field */
  sort_by?: 'created_at' | 'updated_at' | 'completed_at';

  /** Sort direction */
  sort_order?: 'asc' | 'desc';
}

/**
 * Search Reports Response
 */
export interface SearchReportsResponse {
  /** Array of reports */
  reports: BeaconReport[];

  /** Pagination information */
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };

  /** Success indicator */
  success: boolean;
}

/**
 * Update Report Request
 */
export interface UpdateReportRequest {
  /** Report ID to update */
  report_id: string;

  /** New status */
  status?: BeaconReportStatus;

  /** Updated metadata */
  metadata?: Record<string, any>;

  /** Cancel reason if status is 'cancelled' */
  cancellation_reason?: string;
}

/**
 * Update Report Response
 */
export interface UpdateReportResponse {
  /** Updated report */
  report: BeaconReport;

  /** Success indicator */
  success: boolean;

  /** Message */
  message?: string;
}

/**
 * Delete Report Request
 */
export interface DeleteReportRequest {
  /** Report ID to delete */
  report_id: string;
}

/**
 * Delete Report Response
 */
export interface DeleteReportResponse {
  /** Success indicator */
  success: boolean;

  /** Message */
  message?: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Webhook Event Types
 */
export type BeaconWebhookEventType =
  | 'report.created'
  | 'report.processing'
  | 'report.completed'
  | 'report.failed'
  | 'report.cancelled'
  | 'property.created'
  | 'property.updated'
  | 'property.deleted'
  | 'property.stage_changed';

/**
 * Base Webhook Payload
 *
 * All webhook events extend this base structure
 */
export interface BaseWebhookPayload {
  /** Event type */
  event: BeaconWebhookEventType;

  /** Event timestamp */
  timestamp: string;

  /** Unique event ID */
  event_id: string;

  /** Webhook delivery attempt number */
  delivery_attempt?: number;
}

/**
 * Report Webhook Payload
 *
 * Sent when report status changes
 */
export interface ReportWebhookPayload extends BaseWebhookPayload {
  event:
    | 'report.created'
    | 'report.processing'
    | 'report.completed'
    | 'report.failed'
    | 'report.cancelled';

  /** Report data */
  data: {
    report: BeaconReport;

    /** Previous status (for update events) */
    previous_status?: BeaconReportStatus;
  };
}

/**
 * Property Webhook Payload
 *
 * Sent when property is created, updated, or deleted
 */
export interface PropertyWebhookPayload extends BaseWebhookPayload {
  event:
    | 'property.created'
    | 'property.updated'
    | 'property.deleted';

  /** Property data */
  data: {
    property: BeaconProperty;

    /** Changes made (for update events) */
    changes?: Partial<BeaconProperty>;
  };
}

/**
 * Property Stage Change Webhook Payload
 *
 * CRITICAL: This event fires when external_lead_id changes
 * You must update your local records to use the new external_lead_id
 * while maintaining the same agentbuddy_property_id
 */
export interface PropertyStageChangeWebhookPayload extends BaseWebhookPayload {
  event: 'property.stage_changed';

  /** Property stage change data */
  data: {
    /**
     * STABLE property identifier - this NEVER changes
     */
    agentbuddy_property_id: string;

    /**
     * OLD external_lead_id (before stage change)
     */
    old_external_lead_id: string;

    /**
     * NEW external_lead_id (after stage change)
     * CRITICAL: Update this in your local records
     */
    new_external_lead_id: string;

    /** Previous stage */
    old_stage: BeaconPropertyStage;

    /** New stage */
    new_stage: BeaconPropertyStage;

    /** Full property data with updated information */
    property: BeaconProperty;
  };
}

/**
 * Union type of all webhook payloads
 */
export type WebhookPayload =
  | ReportWebhookPayload
  | PropertyWebhookPayload
  | PropertyStageChangeWebhookPayload;

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Beacon Integration Error
 *
 * Custom error class for Beacon API integration errors
 */
export class BeaconIntegrationError extends Error {
  /** Error code */
  public code: string;

  /** HTTP status code if applicable */
  public statusCode?: number;

  /** Additional error details */
  public details?: any;

  /** Original error if wrapped */
  public originalError?: Error;

  constructor(
    message: string,
    code: string = 'BEACON_ERROR',
    statusCode?: number,
    details?: any,
    originalError?: Error
  ) {
    super(message);
    this.name = 'BeaconIntegrationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.originalError = originalError;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BeaconIntegrationError);
    }
  }

  /**
   * Create error from API response
   */
  static fromApiResponse(response: any, statusCode: number): BeaconIntegrationError {
    const message = response?.message || response?.error || 'Unknown API error';
    const code = response?.code || `HTTP_${statusCode}`;
    return new BeaconIntegrationError(message, code, statusCode, response);
  }

  /**
   * Create validation error
   */
  static validation(message: string, details?: any): BeaconIntegrationError {
    return new BeaconIntegrationError(message, 'VALIDATION_ERROR', 400, details);
  }

  /**
   * Create property not found error
   */
  static propertyNotFound(agentbuddy_property_id: string): BeaconIntegrationError {
    return new BeaconIntegrationError(
      `Property not found: ${agentbuddy_property_id}`,
      'PROPERTY_NOT_FOUND',
      404,
      { agentbuddy_property_id }
    );
  }

  /**
   * Create report not found error
   */
  static reportNotFound(report_id: string): BeaconIntegrationError {
    return new BeaconIntegrationError(
      `Report not found: ${report_id}`,
      'REPORT_NOT_FOUND',
      404,
      { report_id }
    );
  }

  /**
   * Create missing property ID error
   */
  static missingPropertyId(): BeaconIntegrationError {
    return new BeaconIntegrationError(
      'agentbuddy_property_id is required for all property operations',
      'MISSING_PROPERTY_ID',
      400
    );
  }

  /**
   * Create invalid property ID error
   */
  static invalidPropertyId(agentbuddy_property_id: string): BeaconIntegrationError {
    return new BeaconIntegrationError(
      `Invalid agentbuddy_property_id format: ${agentbuddy_property_id}`,
      'INVALID_PROPERTY_ID',
      400,
      { agentbuddy_property_id }
    );
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid agentbuddy_property_id
 *
 * CRITICAL: Use this to validate property IDs before API calls
 */
export function isValidPropertyId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim().length > 0
  );
}

/**
 * Check if a value is a valid report type
 */
export function isValidReportType(value: unknown): value is BeaconReportType {
  const validTypes: BeaconReportType[] = [
    'cma',
    'buyer_guide',
    'seller_guide',
    'market_snapshot',
    'property_report',
    'custom'
  ];
  return typeof value === 'string' && validTypes.includes(value as BeaconReportType);
}

/**
 * Check if a value is a valid report status
 */
export function isValidReportStatus(value: unknown): value is BeaconReportStatus {
  const validStatuses: BeaconReportStatus[] = [
    'draft',
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled'
  ];
  return typeof value === 'string' && validStatuses.includes(value as BeaconReportStatus);
}

/**
 * Check if a value is a valid webhook event type
 */
export function isValidWebhookEventType(value: unknown): value is BeaconWebhookEventType {
  const validEventTypes: BeaconWebhookEventType[] = [
    'report.created',
    'report.processing',
    'report.completed',
    'report.failed',
    'report.cancelled',
    'property.created',
    'property.updated',
    'property.deleted',
    'property.stage_changed'
  ];
  return typeof value === 'string' && validEventTypes.includes(value as BeaconWebhookEventType);
}

/**
 * Check if a webhook payload is a report event
 */
export function isReportWebhook(payload: WebhookPayload): payload is ReportWebhookPayload {
  return payload.event.startsWith('report.');
}

/**
 * Check if a webhook payload is a property event
 */
export function isPropertyWebhook(payload: WebhookPayload): payload is PropertyWebhookPayload {
  return payload.event.startsWith('property.') && payload.event !== 'property.stage_changed';
}

/**
 * Check if a webhook payload is a property stage change event
 */
export function isPropertyStageChangeWebhook(
  payload: WebhookPayload
): payload is PropertyStageChangeWebhookPayload {
  return payload.event === 'property.stage_changed';
}

/**
 * Validate BeaconProperty has required fields
 */
export function isValidBeaconProperty(value: unknown): value is BeaconProperty {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const property = value as BeaconProperty;

  return (
    isValidPropertyId(property.agentbuddy_property_id) &&
    typeof property.external_lead_id === 'string' &&
    typeof property.street_address === 'string' &&
    typeof property.city === 'string' &&
    typeof property.state === 'string' &&
    typeof property.zip_code === 'string'
  );
}

/**
 * Validate CreateReportRequest has required fields
 */
export function isValidCreateReportRequest(value: unknown): value is CreateReportRequest {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const request = value as CreateReportRequest;

  return (
    isValidPropertyId(request.agentbuddy_property_id) &&
    isValidReportType(request.report_type)
  );
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pagination parameters for list operations
 */
export interface PaginationParams {
  page?: number;
  per_page?: number;
}

/**
 * Sort parameters for list operations
 */
export interface SortParams<T extends string = string> {
  sort_by?: T;
  sort_order?: 'asc' | 'desc';
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  after?: string;
  before?: string;
}

/**
 * API Configuration
 */
export interface BeaconApiConfig {
  /** Beacon API base URL */
  baseUrl: string;

  /** API key for authentication */
  apiKey: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Retry configuration */
  retry?: {
    maxRetries: number;
    retryDelay: number;
  };

  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Beacon Client Configuration
 */
export interface BeaconClientConfig extends BeaconApiConfig {
  /** Workspace/tenant ID */
  workspaceId: string;

  /** User ID for audit trails */
  userId?: string;
}
