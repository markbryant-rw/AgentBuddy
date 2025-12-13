/**
 * Beacon Integration Module (NEW - Next Generation)
 *
 * ⚡ NEXT-GENERATION BEACON INTEGRATION
 * =====================================
 * This is the NEW Beacon integration module that can coexist with the legacy integration.
 *
 * Legacy Integration (still in use):
 * - Location: src/hooks/useBeaconIntegration.ts
 * - Uses: Edge Functions, appraisal_id, integration_settings table
 * - Status: Production, actively used
 *
 * New Integration (this module):
 * - Location: src/lib/beacon/ (this directory)
 * - Uses: Direct API calls, agentbuddy_property_id, team_integrations table
 * - Status: Ready for new features and gradual adoption
 *
 * For complete documentation, see: src/lib/beacon/README.md
 * For migration strategy, see: BEACON_MIGRATION_STRATEGY.md
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
