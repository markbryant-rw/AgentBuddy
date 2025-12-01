/**
 * Module Constants
 * Central source of truth for all module-related constants
 */

import type { ModuleId } from '@/hooks/useModuleAccess';

/**
 * Modules that are available to all users without subscription
 */
export const FREE_MODULES: readonly ModuleId[] = [
  'feature-request',
  'role-playing',
  'messages',
  'task-manager',
  'notes',
  'knowledge-base',
] as const;

/**
 * Complete list of all available modules in the system
 */
export const ALL_MODULES: readonly ModuleId[] = [
  'kpi-tracking',
  'listing-pipeline',
  'review-roadmap',
  'nurture-calculator',
  'role-playing',
  'vendor-reporting',
  'coaches-corner',
  'transaction-management',
  'feature-request',
  'listing-description',
  'referrals',
  'compliance',
  'people',
  'messages',
  'task-manager',
  'notes',
  'team-meetings',
  'knowledge-base',
  'past-sales-history',
  'cma-generator',
  'service-directory',
] as const;

/**
 * Default order for module display
 * This is used as the initial layout when users haven't customized their module order
 */
export const DEFAULT_MODULE_ORDER: readonly ModuleId[] = [
  // Performance & Growth
  'review-roadmap',
  'kpi-tracking',
  'nurture-calculator',
  'coaches-corner',
  'role-playing',
  
  // Listings & Transactions
  'listing-pipeline',
  'transaction-management',
  'vendor-reporting',
  'listing-description',
  'past-sales-history',
  'cma-generator',
  
  // Communication & Collaboration
  'people',
  'messages',
  'task-manager',
  'notes',
  'referrals',
  'team-meetings',
  
  // Systems & Compliance
  'feature-request',
  'compliance',
  'knowledge-base',
  'service-directory',
] as const;

/**
 * Customer Contact Hours (CCH) calculation multipliers
 * These define how different activities convert to CCH hours
 */
export const CCH_MULTIPLIERS = {
  /** Number of calls that equal 1 CCH hour */
  CALLS_PER_HOUR: 20,
  /** Number of CCH hours per appraisal */
  APPRAISALS_PER_HOUR: 1,
  /** Number of open homes that equal 1 CCH hour */
  OPEN_HOMES_PER_HOUR: 2,
} as const;
