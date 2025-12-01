// Shared security utilities for edge functions
// Phase 1: Security Hardening

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  return email
    .trim()
    .toLowerCase()
    .replace(/[^\w@.-]/g, '') // Only allow valid email characters
    .slice(0, 255);
}

/**
 * Hash token using Web Crypto API (SHA-256)
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate cryptographically secure token
 */
export function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Validate input length
 */
export function validateLength(
  input: string,
  min: number,
  max: number,
  fieldName: string
): { valid: boolean; error?: string } {
  if (input.length < min) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${min} characters`
    };
  }
  
  if (input.length > max) {
    return {
      valid: false,
      error: `${fieldName} must be less than ${max} characters`
    };
  }
  
  return { valid: true };
}

/**
 * Standard error codes for consistent error handling
 */
export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  INVALID_TOKEN: 'invalid_token',
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_ALREADY_USED: 'token_already_used',
  
  // Validation errors
  MISSING_FIELDS: 'missing_fields',
  INVALID_EMAIL: 'invalid_email',
  INVALID_INPUT: 'invalid_input',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  
  // User errors
  USER_EXISTS: 'user_exists',
  USER_NOT_FOUND: 'user_not_found',
  USER_INACTIVE: 'user_inactive',
  
  // Team errors
  INVALID_TEAM: 'invalid_team',
  TEAM_ASSIGNMENT_FAILED: 'team_assignment_failed',
  
  // System errors
  INTERNAL_ERROR: 'internal_error',
  DATABASE_ERROR: 'database_error',
  PROFILE_INCOMPLETE: 'profile_incomplete',
  IDEMPOTENCY_CONFLICT: 'idempotency_conflict',
} as const;

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, any>
) {
  return {
    success: false,
    code,
    message,
    ...details
  };
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(data?: Record<string, any>) {
  return {
    success: true,
    ...data
  };
}
