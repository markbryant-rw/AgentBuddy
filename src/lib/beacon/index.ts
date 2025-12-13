/**
 * Beacon Integration Module
 *
 * Complete Beacon API integration for AgentBuddy.
 *
 * USAGE:
 * ======
 * ```typescript
 * // Import everything from single entry point
 * import {
 *   // Client
 *   beaconClient,
 *   BeaconClient,
 *
 *   // Hooks
 *   useBeaconClient,
 *   useCreateBeaconReport,
 *   usePropertyBeaconReports,
 *
 *   // Types
 *   BeaconReport,
 *   CreateReportRequest,
 *
 *   // Validation
 *   validateCreateReportRequest,
 *   ensureStablePropertyId,
 *
 *   // Errors
 *   BeaconIntegrationError,
 * } from '@/lib/beacon';
 * ```
 *
 * CRITICAL REQUIREMENT:
 * =====================
 * ALWAYS use agentbuddy_property_id (property.id from properties table)
 * as the stable property identifier. NEVER use appraisal.id, listing.id,
 * or transaction.id.
 *
 * @module lib/beacon
 */

// ============================================================================
// Types
// ============================================================================

export * from '@/types/beacon';

// ============================================================================
// Validation
// ============================================================================

export * from './validation';

// ============================================================================
// Client
// ============================================================================

export { BeaconClient, beaconClient } from './client';
export type { BeaconIntegrationStats } from './client';

// ============================================================================
// React Hooks
// ============================================================================

export * from '@/hooks/useBeacon';
