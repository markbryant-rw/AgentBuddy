/**
 * Beacon Integration Validation Layer
 *
 * This module enforces proper API usage and prevents common integration mistakes.
 *
 * WHY THIS MODULE EXISTS:
 * =======================
 * 1. Prevent using unstable IDs (external_lead_id) as primary identifiers
 * 2. Ensure all API requests have required fields before sending to Beacon
 * 3. Validate webhook payloads before processing to prevent runtime errors
 * 4. Provide helpful error messages that guide developers to correct usage
 * 5. Use TypeScript assertion functions for compile-time type safety
 *
 * CRITICAL CONCEPT - Property Identification:
 * ===========================================
 * AgentBuddy has multiple ID fields on different entities:
 * - property.id (properties table) ✓ USE THIS
 * - appraisal.id (appraisals table) ✗ WRONG
 * - listing.id (listings table) ✗ WRONG
 * - transaction.id (transactions table) ✗ WRONG
 *
 * When calling Beacon API, you MUST use property.id as agentbuddy_property_id.
 * This is because properties are the stable entity, while appraisals/listings/transactions
 * are transient stages in the property lifecycle.
 *
 * @module lib/beacon/validation
 */

import {
  BeaconIntegrationError,
  CreateReportRequest,
  SearchReportsRequest,
  UpdateReportRequest,
  DeleteReportRequest,
  WebhookPayload,
  BeaconReportType,
  BeaconReportStatus,
  BeaconWebhookEventType,
  isValidPropertyId,
  isValidReportType,
  isValidReportStatus,
  isValidWebhookEventType,
  isReportWebhook,
  isPropertyWebhook,
  isPropertyStageChangeWebhook,
} from '@/types/beacon';

// ============================================================================
// CRITICAL: Property ID Validation
// ============================================================================

/**
 * Ensure a stable property ID is provided
 *
 * WHY THIS EXISTS:
 * ================
 * The most common mistake in Beacon integration is using the wrong ID field.
 * Developers often accidentally use appraisal.id, listing.id, or transaction.id
 * instead of property.id when calling Beacon APIs.
 *
 * This causes CRITICAL issues:
 * 1. Reports get associated with the wrong property
 * 2. Webhooks can't be matched back to the correct property
 * 3. When external_lead_id changes (stage transition), all associations break
 *
 * CORRECT USAGE:
 * ==============
 * ```typescript
 * // ✓ CORRECT - Use property.id from properties table
 * const property = await getProperty(propertyId);
 * await createReport({
 *   agentbuddy_property_id: property.id,
 *   report_type: 'cma'
 * });
 *
 * // ✗ WRONG - Don't use IDs from other tables
 * const appraisal = await getAppraisal(appraisalId);
 * await createReport({
 *   agentbuddy_property_id: appraisal.id, // WRONG!
 *   report_type: 'cma'
 * });
 * ```
 *
 * @param id - The property ID to validate
 * @param context - Description of where this ID is being used (for error messages)
 * @throws {BeaconIntegrationError} If ID is missing or invalid
 */
export function ensureStablePropertyId(id: unknown, context: string): asserts id is string {
  // Check if ID is missing
  if (id === undefined || id === null) {
    throw new BeaconIntegrationError(
      `Missing agentbuddy_property_id in ${context}`,
      'MISSING_PROPERTY_ID',
      400,
      {
        context,
        suggestion: 'Use property.id from the properties table, not appraisal.id, listing.id, or transaction.id',
        example: {
          correct: '{ agentbuddy_property_id: property.id }',
          incorrect: '{ agentbuddy_property_id: appraisal.id }',
        },
      }
    );
  }

  // Check if ID is valid format
  if (!isValidPropertyId(id)) {
    throw new BeaconIntegrationError(
      `Invalid agentbuddy_property_id format in ${context}: ${String(id)}`,
      'INVALID_PROPERTY_ID',
      400,
      {
        context,
        providedId: id,
        suggestion: 'agentbuddy_property_id must be a non-empty string from the properties table',
      }
    );
  }
}

/**
 * Extract property ID from an entity object
 *
 * WHY THIS EXISTS:
 * ================
 * Different parts of the codebase may pass property data in different shapes.
 * This utility safely extracts the property ID with clear error messages.
 *
 * @param entity - Object that should contain a property ID
 * @returns The extracted property ID
 * @throws {BeaconIntegrationError} If property ID cannot be found
 */
export function extractPropertyId(entity: {
  agentbuddy_property_id?: string;
  property_id?: string;
  id?: string;
}): string {
  // Try agentbuddy_property_id first (preferred)
  if (entity.agentbuddy_property_id && isValidPropertyId(entity.agentbuddy_property_id)) {
    return entity.agentbuddy_property_id;
  }

  // Try property_id as fallback
  if (entity.property_id && isValidPropertyId(entity.property_id)) {
    return entity.property_id;
  }

  // Try generic id as last resort (but validate it's not from wrong table)
  if (entity.id && isValidPropertyId(entity.id)) {
    // WARNING: Using generic 'id' field is risky
    console.warn(
      '[Beacon] Using generic "id" field as property ID. Ensure this is property.id, not appraisal.id or listing.id'
    );
    return entity.id;
  }

  // No valid property ID found
  throw new BeaconIntegrationError(
    'Could not extract agentbuddy_property_id from entity',
    'MISSING_PROPERTY_ID',
    400,
    {
      entity,
      suggestion: 'Ensure the entity has agentbuddy_property_id or property_id field with a valid value',
    }
  );
}

// ============================================================================
// Request Validation Functions
// ============================================================================

/**
 * Validate CreateReportRequest
 *
 * WHY THIS EXISTS:
 * ================
 * Ensures all required fields are present before making API call.
 * Catches mistakes early with helpful error messages.
 *
 * @param data - The data to validate
 * @throws {BeaconIntegrationError} If validation fails
 */
export function validateCreateReportRequest(data: any): asserts data is CreateReportRequest {
  if (typeof data !== 'object' || data === null) {
    throw BeaconIntegrationError.validation(
      'CreateReportRequest must be an object',
      { received: typeof data }
    );
  }

  // Validate agentbuddy_property_id (CRITICAL)
  ensureStablePropertyId(data.agentbuddy_property_id, 'CreateReportRequest');

  // Validate report_type
  if (!data.report_type) {
    throw BeaconIntegrationError.validation('report_type is required', {
      suggestion: 'Valid types: cma, buyer_guide, seller_guide, market_snapshot, property_report, custom',
    });
  }

  if (!isValidReportType(data.report_type)) {
    throw BeaconIntegrationError.validation(
      `Invalid report_type: ${data.report_type}`,
      {
        received: data.report_type,
        validTypes: ['cma', 'buyer_guide', 'seller_guide', 'market_snapshot', 'property_report', 'custom'],
      }
    );
  }

  // Validate delivery_method if provided
  if (data.delivery_method) {
    const validMethods = ['email', 'sms', 'link', 'webhook'];
    if (!validMethods.includes(data.delivery_method)) {
      throw BeaconIntegrationError.validation(
        `Invalid delivery_method: ${data.delivery_method}`,
        {
          received: data.delivery_method,
          validMethods,
        }
      );
    }

    // If email delivery, require recipient_email
    if (data.delivery_method === 'email') {
      if (!data.recipient_email) {
        throw BeaconIntegrationError.validation(
          'recipient_email is required when delivery_method is "email"'
        );
      }
      if (!isValidEmail(data.recipient_email)) {
        throw BeaconIntegrationError.validation(
          `Invalid recipient_email format: ${data.recipient_email}`
        );
      }
    }

    // If SMS delivery, require recipient_phone
    if (data.delivery_method === 'sms') {
      if (!data.recipient_phone) {
        throw BeaconIntegrationError.validation(
          'recipient_phone is required when delivery_method is "sms"'
        );
      }
      if (!isValidPhoneNumber(data.recipient_phone)) {
        throw BeaconIntegrationError.validation(
          `Invalid recipient_phone format: ${data.recipient_phone}`,
          {
            suggestion: 'Use E.164 format: +1234567890',
          }
        );
      }
    }
  }

  // Validate options if provided
  if (data.options) {
    if (typeof data.options !== 'object' || Array.isArray(data.options)) {
      throw BeaconIntegrationError.validation('options must be an object');
    }

    // Validate comparable_count if provided
    if (data.options.comparable_count !== undefined) {
      if (
        typeof data.options.comparable_count !== 'number' ||
        data.options.comparable_count < 0 ||
        data.options.comparable_count > 50
      ) {
        throw BeaconIntegrationError.validation(
          'options.comparable_count must be a number between 0 and 50',
          { received: data.options.comparable_count }
        );
      }
    }
  }
}

/**
 * Validate SearchReportsRequest
 *
 * WHY THIS EXISTS:
 * ================
 * Ensures search parameters are valid before querying.
 * Prevents common mistakes like invalid pagination or date formats.
 *
 * @param data - The data to validate
 * @throws {BeaconIntegrationError} If validation fails
 */
export function validateSearchReportsRequest(data: any): asserts data is SearchReportsRequest {
  if (typeof data !== 'object' || data === null) {
    throw BeaconIntegrationError.validation(
      'SearchReportsRequest must be an object',
      { received: typeof data }
    );
  }

  // Validate agentbuddy_property_id if provided (filtering by property)
  if (data.agentbuddy_property_id !== undefined) {
    ensureStablePropertyId(data.agentbuddy_property_id, 'SearchReportsRequest filter');
  }

  // Validate report_type if provided
  if (data.report_type !== undefined && !isValidReportType(data.report_type)) {
    throw BeaconIntegrationError.validation(
      `Invalid report_type filter: ${data.report_type}`,
      {
        validTypes: ['cma', 'buyer_guide', 'seller_guide', 'market_snapshot', 'property_report', 'custom'],
      }
    );
  }

  // Validate status if provided
  if (data.status !== undefined && !isValidReportStatus(data.status)) {
    throw BeaconIntegrationError.validation(
      `Invalid status filter: ${data.status}`,
      {
        validStatuses: ['draft', 'pending', 'processing', 'completed', 'failed', 'cancelled'],
      }
    );
  }

  // Validate pagination parameters
  if (data.page !== undefined) {
    if (typeof data.page !== 'number' || data.page < 1) {
      throw BeaconIntegrationError.validation(
        'page must be a positive integer',
        { received: data.page }
      );
    }
  }

  if (data.per_page !== undefined) {
    if (typeof data.per_page !== 'number' || data.per_page < 1 || data.per_page > 100) {
      throw BeaconIntegrationError.validation(
        'per_page must be between 1 and 100',
        { received: data.per_page }
      );
    }
  }

  // Validate sort parameters
  if (data.sort_by !== undefined) {
    const validSortFields = ['created_at', 'updated_at', 'completed_at'];
    if (!validSortFields.includes(data.sort_by)) {
      throw BeaconIntegrationError.validation(
        `Invalid sort_by field: ${data.sort_by}`,
        { validFields: validSortFields }
      );
    }
  }

  if (data.sort_order !== undefined) {
    if (data.sort_order !== 'asc' && data.sort_order !== 'desc') {
      throw BeaconIntegrationError.validation(
        `Invalid sort_order: ${data.sort_order}`,
        { validValues: ['asc', 'desc'] }
      );
    }
  }

  // Validate date filters if provided
  const dateFields = ['created_after', 'created_before', 'completed_after', 'completed_before'];
  for (const field of dateFields) {
    if (data[field] !== undefined) {
      if (!isValidISODate(data[field])) {
        throw BeaconIntegrationError.validation(
          `Invalid ${field} format. Must be ISO 8601 date string`,
          {
            received: data[field],
            example: '2025-01-15T10:30:00Z',
          }
        );
      }
    }
  }
}

/**
 * Validate UpdateReportRequest
 *
 * WHY THIS EXISTS:
 * ================
 * Ensures update requests have valid report ID and fields before sending.
 *
 * @param data - The data to validate
 * @throws {BeaconIntegrationError} If validation fails
 */
export function validateUpdateReportRequest(data: any): asserts data is UpdateReportRequest {
  if (typeof data !== 'object' || data === null) {
    throw BeaconIntegrationError.validation(
      'UpdateReportRequest must be an object',
      { received: typeof data }
    );
  }

  // Validate report_id
  if (!data.report_id || typeof data.report_id !== 'string' || data.report_id.trim().length === 0) {
    throw BeaconIntegrationError.validation(
      'report_id is required and must be a non-empty string',
      { received: data.report_id }
    );
  }

  // Validate status if provided
  if (data.status !== undefined && !isValidReportStatus(data.status)) {
    throw BeaconIntegrationError.validation(
      `Invalid status: ${data.status}`,
      {
        validStatuses: ['draft', 'pending', 'processing', 'completed', 'failed', 'cancelled'],
      }
    );
  }

  // Validate metadata if provided
  if (data.metadata !== undefined) {
    if (typeof data.metadata !== 'object' || Array.isArray(data.metadata)) {
      throw BeaconIntegrationError.validation('metadata must be an object');
    }
  }

  // If status is cancelled, recommend including cancellation_reason
  if (data.status === 'cancelled' && !data.cancellation_reason) {
    console.warn('[Beacon] Setting status to "cancelled" without cancellation_reason');
  }

  // Ensure at least one field is being updated
  if (data.status === undefined && data.metadata === undefined && data.cancellation_reason === undefined) {
    throw BeaconIntegrationError.validation(
      'UpdateReportRequest must include at least one field to update (status, metadata, or cancellation_reason)'
    );
  }
}

/**
 * Validate DeleteReportRequest
 *
 * @param data - The data to validate
 * @throws {BeaconIntegrationError} If validation fails
 */
export function validateDeleteReportRequest(data: any): asserts data is DeleteReportRequest {
  if (typeof data !== 'object' || data === null) {
    throw BeaconIntegrationError.validation(
      'DeleteReportRequest must be an object',
      { received: typeof data }
    );
  }

  // Validate report_id
  if (!data.report_id || typeof data.report_id !== 'string' || data.report_id.trim().length === 0) {
    throw BeaconIntegrationError.validation(
      'report_id is required and must be a non-empty string',
      { received: data.report_id }
    );
  }
}

// ============================================================================
// Webhook Validation
// ============================================================================

/**
 * Validate Webhook Payload
 *
 * WHY THIS EXISTS:
 * ================
 * Webhooks come from external systems and cannot be trusted.
 * This validates the structure before processing to prevent runtime errors.
 *
 * IMPORTANT: This does NOT verify webhook signatures - that should be done
 * separately in your webhook handler middleware.
 *
 * @param payload - The webhook payload to validate
 * @throws {BeaconIntegrationError} If validation fails
 */
export function validateWebhookPayload(payload: any): asserts payload is WebhookPayload {
  if (typeof payload !== 'object' || payload === null) {
    throw BeaconIntegrationError.validation(
      'Webhook payload must be an object',
      { received: typeof payload }
    );
  }

  // Validate event type
  if (!payload.event) {
    throw BeaconIntegrationError.validation('Webhook payload missing event field');
  }

  if (!isValidWebhookEventType(payload.event)) {
    throw BeaconIntegrationError.validation(
      `Invalid webhook event type: ${payload.event}`,
      {
        received: payload.event,
        validTypes: [
          'report.created',
          'report.processing',
          'report.completed',
          'report.failed',
          'report.cancelled',
          'property.created',
          'property.updated',
          'property.deleted',
          'property.stage_changed',
        ],
      }
    );
  }

  // Validate timestamp
  if (!payload.timestamp) {
    throw BeaconIntegrationError.validation('Webhook payload missing timestamp field');
  }

  if (!isValidISODate(payload.timestamp)) {
    throw BeaconIntegrationError.validation(
      'Webhook timestamp must be ISO 8601 format',
      {
        received: payload.timestamp,
        example: '2025-01-15T10:30:00Z',
      }
    );
  }

  // Validate event_id
  if (!payload.event_id || typeof payload.event_id !== 'string') {
    throw BeaconIntegrationError.validation('Webhook payload missing valid event_id');
  }

  // Validate data field exists
  if (!payload.data || typeof payload.data !== 'object') {
    throw BeaconIntegrationError.validation('Webhook payload missing data field');
  }

  // Type-specific validation
  if (isReportWebhook(payload)) {
    validateReportWebhookData(payload);
  } else if (isPropertyStageChangeWebhook(payload)) {
    validatePropertyStageChangeWebhookData(payload);
  } else if (isPropertyWebhook(payload)) {
    validatePropertyWebhookData(payload);
  }
}

/**
 * Validate Report Webhook Data
 */
function validateReportWebhookData(payload: any): void {
  if (!payload.data.report) {
    throw BeaconIntegrationError.validation('Report webhook missing data.report field');
  }

  const report = payload.data.report;

  // Validate report has required fields
  if (!report.id) {
    throw BeaconIntegrationError.validation('Report webhook data.report missing id');
  }

  // CRITICAL: Validate agentbuddy_property_id is present
  ensureStablePropertyId(report.agentbuddy_property_id, 'Report webhook data.report');

  if (!report.type || !isValidReportType(report.type)) {
    throw BeaconIntegrationError.validation(
      'Report webhook data.report has invalid type',
      { received: report.type }
    );
  }

  if (!report.status || !isValidReportStatus(report.status)) {
    throw BeaconIntegrationError.validation(
      'Report webhook data.report has invalid status',
      { received: report.status }
    );
  }
}

/**
 * Validate Property Webhook Data
 */
function validatePropertyWebhookData(payload: any): void {
  if (!payload.data.property) {
    throw BeaconIntegrationError.validation('Property webhook missing data.property field');
  }

  const property = payload.data.property;

  // CRITICAL: Validate agentbuddy_property_id is present
  ensureStablePropertyId(property.agentbuddy_property_id, 'Property webhook data.property');

  // Validate external_lead_id is present
  if (!property.external_lead_id || typeof property.external_lead_id !== 'string') {
    throw BeaconIntegrationError.validation(
      'Property webhook data.property missing external_lead_id'
    );
  }

  // Validate address fields
  const requiredFields = ['street_address', 'city', 'state', 'zip_code'];
  for (const field of requiredFields) {
    if (!property[field] || typeof property[field] !== 'string') {
      throw BeaconIntegrationError.validation(
        `Property webhook data.property missing ${field}`
      );
    }
  }
}

/**
 * Validate Property Stage Change Webhook Data
 *
 * WHY THIS EXISTS:
 * ================
 * This is the MOST CRITICAL webhook to validate correctly.
 * When this webhook arrives, external_lead_id has changed and we must
 * update our local records to prevent orphaned reports and broken associations.
 */
function validatePropertyStageChangeWebhookData(payload: any): void {
  const data = payload.data;

  // CRITICAL: Validate agentbuddy_property_id (the stable ID)
  ensureStablePropertyId(data.agentbuddy_property_id, 'Property stage change webhook data');

  // Validate old_external_lead_id
  if (!data.old_external_lead_id || typeof data.old_external_lead_id !== 'string') {
    throw BeaconIntegrationError.validation(
      'Property stage change webhook missing old_external_lead_id'
    );
  }

  // Validate new_external_lead_id
  if (!data.new_external_lead_id || typeof data.new_external_lead_id !== 'string') {
    throw BeaconIntegrationError.validation(
      'Property stage change webhook missing new_external_lead_id'
    );
  }

  // Validate they're different (otherwise why send this webhook?)
  if (data.old_external_lead_id === data.new_external_lead_id) {
    console.warn(
      '[Beacon] Property stage change webhook has same old and new external_lead_id:',
      data.old_external_lead_id
    );
  }

  // Validate old_stage
  if (!data.old_stage || typeof data.old_stage !== 'string') {
    throw BeaconIntegrationError.validation(
      'Property stage change webhook missing old_stage'
    );
  }

  // Validate new_stage
  if (!data.new_stage || typeof data.new_stage !== 'string') {
    throw BeaconIntegrationError.validation(
      'Property stage change webhook missing new_stage'
    );
  }

  // Validate property object
  if (!data.property) {
    throw BeaconIntegrationError.validation(
      'Property stage change webhook missing property object'
    );
  }

  validatePropertyWebhookData({ ...payload, data: { property: data.property } });
}

// ============================================================================
// Response Validation
// ============================================================================

/**
 * Validate Beacon API Response
 *
 * WHY THIS EXISTS:
 * ================
 * Validates that API responses match expected types before using them.
 * Catches API changes early and provides helpful error messages.
 *
 * @param response - The fetch Response object
 * @param data - The parsed response data
 * @throws {BeaconIntegrationError} If response indicates error
 */
export function validateBeaconResponse<T>(response: Response, data: any): asserts data is T {
  // Check HTTP status
  if (!response.ok) {
    throw BeaconIntegrationError.fromApiResponse(data, response.status);
  }

  // Check for API-level errors in response body
  if (data && typeof data === 'object') {
    // Some APIs return { success: false, error: "message" }
    if (data.success === false) {
      throw BeaconIntegrationError.fromApiResponse(data, response.status);
    }

    // Some APIs return { error: "message" }
    if (data.error) {
      throw BeaconIntegrationError.fromApiResponse(data, response.status);
    }
  }
}

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Validate email format
 *
 * WHY THIS EXISTS:
 * ================
 * Prevents sending invalid emails to Beacon API, which would fail anyway.
 * Provides faster feedback to user.
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string' || email.length === 0) {
    return false;
  }

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 *
 * WHY THIS EXISTS:
 * ================
 * Ensures phone numbers are in E.164 format (+1234567890) before sending to API.
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (typeof phone !== 'string' || phone.length === 0) {
    return false;
  }

  // E.164 format: +[country code][number]
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate ISO 8601 date format
 *
 * WHY THIS EXISTS:
 * ================
 * Ensures dates are in correct format before sending to API.
 */
export function isValidISODate(date: string): boolean {
  if (typeof date !== 'string' || date.length === 0) {
    return false;
  }

  // Try to parse as Date
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return false;
  }

  // Ensure it's in ISO format (not just parseable)
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoRegex.test(date);
}

/**
 * Format error for display to user
 *
 * WHY THIS EXISTS:
 * ================
 * Converts technical errors into user-friendly messages with actionable suggestions.
 *
 * @param error - The error to format
 * @returns Formatted error with title, message, and optional suggestion
 */
export function formatBeaconError(error: unknown): {
  title: string;
  message: string;
  suggestion?: string;
} {
  // Handle BeaconIntegrationError
  if (error instanceof BeaconIntegrationError) {
    const title = getErrorTitle(error.code);
    let message = error.message;

    // Extract suggestion from details if available
    let suggestion: string | undefined;
    if (error.details?.suggestion) {
      suggestion = error.details.suggestion;
    }

    return { title, message, suggestion };
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      title: 'Integration Error',
      message: error.message,
    };
  }

  // Handle unknown errors
  return {
    title: 'Unknown Error',
    message: String(error),
  };
}

/**
 * Get user-friendly error title from error code
 */
function getErrorTitle(code: string): string {
  const titles: Record<string, string> = {
    MISSING_PROPERTY_ID: 'Missing Property ID',
    INVALID_PROPERTY_ID: 'Invalid Property ID',
    PROPERTY_NOT_FOUND: 'Property Not Found',
    REPORT_NOT_FOUND: 'Report Not Found',
    VALIDATION_ERROR: 'Validation Error',
    HTTP_400: 'Bad Request',
    HTTP_401: 'Unauthorized',
    HTTP_403: 'Forbidden',
    HTTP_404: 'Not Found',
    HTTP_429: 'Rate Limited',
    HTTP_500: 'Server Error',
    HTTP_503: 'Service Unavailable',
  };

  return titles[code] || 'Integration Error';
}
