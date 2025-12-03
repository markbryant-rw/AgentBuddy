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

// ============================================================================
// CSRF-like Protection for JWT-based Authentication
// ============================================================================

// Allowed origins - must match cors.ts
const ALLOWED_ORIGINS = [
  'https://www.agentbuddy.co',
  'https://agentbuddy.co',
  'http://localhost:8080',
  'http://localhost:5173',
];

/**
 * Validates request origin and required security headers
 * Provides CSRF-like protection by ensuring:
 * 1. Request comes from allowed origin
 * 2. Custom headers are present (can't be set by CSRF attacks)
 * 3. Content-Type is correct for JSON requests
 *
 * @param req - The incoming request
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateRequestSecurity(req: Request): { isValid: boolean; error?: string } {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const contentType = req.headers.get('content-type');
  const requestedWith = req.headers.get('x-requested-with');

  // Skip validation for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return { isValid: true };
  }

  // 1. Origin validation (primary CSRF defense)
  if (origin) {
    const isOriginAllowed = ALLOWED_ORIGINS.includes(origin) ||
                            origin.endsWith('.lovableproject.com') ||
                            origin.endsWith('.lovable.app');

    if (!isOriginAllowed) {
      return {
        isValid: false,
        error: `Invalid origin: ${origin}. Request must come from an allowed domain.`,
      };
    }
  } else if (referer) {
    // Fallback to referer validation if no origin header
    try {
      const refererOrigin = new URL(referer).origin;
      const isRefererAllowed = ALLOWED_ORIGINS.includes(refererOrigin) ||
                               refererOrigin.endsWith('.lovableproject.com') ||
                               refererOrigin.endsWith('.lovable.app');

      if (!isRefererAllowed) {
        return {
          isValid: false,
          error: `Invalid referer: ${referer}. Request must come from an allowed domain.`,
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid referer URL format.',
      };
    }
  } else {
    // No origin or referer - likely a direct API call or CSRF attempt
    return {
      isValid: false,
      error: 'Missing origin and referer headers. Requests must include origin information.',
    };
  }

  // 2. Custom header validation (CSRF attacks can't set custom headers)
  // The presence of x-requested-with or proper content-type indicates a legitimate request
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const hasCustomHeader = requestedWith === 'XMLHttpRequest' ||
                           (contentType && contentType.includes('application/json'));

    if (!hasCustomHeader) {
      return {
        isValid: false,
        error: 'Missing required security headers. Request must include X-Requested-With or proper Content-Type.',
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates that the request is a state-changing operation
 * Ensures extra security for mutations (POST, PUT, DELETE, PATCH)
 *
 * @param req - The incoming request
 * @returns boolean indicating if additional security is required
 */
export function isStateChangingRequest(req: Request): boolean {
  return ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
}

/**
 * Creates a security-validated response wrapper
 * Use this wrapper to automatically validate requests and return errors
 *
 * @param req - The incoming request
 * @param handler - The function to execute if validation passes
 * @param corsHeaders - CORS headers to include in response
 * @returns Response from handler or security error response
 */
export async function withSecurityValidation(
  req: Request,
  handler: () => Promise<Response>,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Validate security for state-changing operations
  if (isStateChangingRequest(req)) {
    const validation = validateRequestSecurity(req);

    if (!validation.isValid) {
      console.error('[Security] Request validation failed:', validation.error);
      return new Response(
        JSON.stringify({
          error: 'Security validation failed',
          details: validation.error,
          code: ErrorCodes.FORBIDDEN,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }

  // Validation passed or not required, execute handler
  return handler();
}
