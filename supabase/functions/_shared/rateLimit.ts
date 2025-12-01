// =============================================================================
// RATE LIMITING UTILITIES FOR EDGE FUNCTIONS
// =============================================================================

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Rate limit configuration for different endpoint types
 */
export interface RateLimitConfig {
  hourlyLimit: number;
  dailyLimit: number;
}

/**
 * Result from rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  message?: string;
  retryAfter?: number;
  currentCount?: number;
  limit?: number;
  limitType?: 'hourly' | 'daily';
  hourlyRemaining?: number;
  dailyRemaining?: number;
}

/**
 * Predefined rate limits for different action types
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Critical operations (very restrictive)
  'delete-user': { hourlyLimit: 2, dailyLimit: 10 },
  'change-user-role': { hourlyLimit: 5, dailyLimit: 20 },
  'suspend-user': { hourlyLimit: 5, dailyLimit: 20 },
  'reactivate-user': { hourlyLimit: 5, dailyLimit: 20 },

  // AI-powered operations (moderate due to cost)
  'coaches-corner-chat': { hourlyLimit: 30, dailyLimit: 100 },
  'notes-ai': { hourlyLimit: 30, dailyLimit: 100 },
  'generate-listing-description': { hourlyLimit: 20, dailyLimit: 100 },
  'analyze-bug-report': { hourlyLimit: 20, dailyLimit: 50 },
  'analyze-feature-request': { hourlyLimit: 20, dailyLimit: 50 },
  'ai-task-suggestions': { hourlyLimit: 30, dailyLimit: 100 },
  'generate-vendor-report': { hourlyLimit: 10, dailyLimit: 50 },
  'generate-daily-quote': { hourlyLimit: 20, dailyLimit: 100 },
  'generate-metric-info': { hourlyLimit: 50, dailyLimit: 200 },

  // Notification operations (prevent spam)
  'send-notification': { hourlyLimit: 50, dailyLimit: 200 },
  'send-announcement': { hourlyLimit: 10, dailyLimit: 30 },
  'notify-bug-status-change': { hourlyLimit: 30, dailyLimit: 100 },
  'notify-team-transaction': { hourlyLimit: 30, dailyLimit: 100 },

  // User management operations
  'invite-user': { hourlyLimit: 20, dailyLimit: 100 },
  'resend-invitation': { hourlyLimit: 10, dailyLimit: 50 },
  'accept-invitation': { hourlyLimit: 5, dailyLimit: 10 },
  'assign-role-to-user': { hourlyLimit: 10, dailyLimit: 50 },

  // Data operations (moderate)
  'geocode-listing': { hourlyLimit: 100, dailyLimit: 500 },
  'geocode-transaction': { hourlyLimit: 100, dailyLimit: 500 },
  'geocode-past-sale': { hourlyLimit: 100, dailyLimit: 500 },

  // Low-risk operations
  'get-weather': { hourlyLimit: 100, dailyLimit: 500 },
  'giphy-search': { hourlyLimit: 50, dailyLimit: 200 },
  'extract-website-logo': { hourlyLimit: 50, dailyLimit: 200 },
  'get-board-data': { hourlyLimit: 200, dailyLimit: 1000 },

  // Default for any unspecified action
  'default': { hourlyLimit: 100, dailyLimit: 500 },
};

/**
 * Check rate limit for a user action
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID (optional, can be null for IP-based limiting)
 * @param ipAddress - IP address (optional, used when userId is null)
 * @param actionType - Type of action being performed
 * @param customLimits - Optional custom limits (overrides predefined limits)
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  supabase: any,
  userId: string | null,
  ipAddress: string | null,
  actionType: string,
  customLimits?: RateLimitConfig
): Promise<RateLimitResult> {
  try {
    // Get rate limits (custom or predefined)
    const limits = customLimits || RATE_LIMITS[actionType] || RATE_LIMITS['default'];

    // Call the database function
    const { data, error } = await supabase.rpc('check_rate_limit', {
      _user_id: userId,
      _ip_address: ipAddress,
      _action_type: actionType,
      _hourly_limit: limits.hourlyLimit,
      _daily_limit: limits.dailyLimit,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request but log error
      return { allowed: true };
    }

    return data as RateLimitResult;
  } catch (error) {
    console.error('Rate limit check exception:', error);
    // Fail open - allow request but log error
    return { allowed: true };
  }
}

/**
 * Create a rate limit error response
 *
 * @param result - Rate limit check result
 * @param corsHeaders - CORS headers to include in response
 * @returns Response object with 429 status
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const headers = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'Retry-After': result.retryAfter?.toString() || '3600',
    'X-RateLimit-Limit': result.limit?.toString() || 'unknown',
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': result.retryAfter
      ? new Date(Date.now() + result.retryAfter * 1000).toISOString()
      : new Date(Date.now() + 3600000).toISOString(),
  };

  return new Response(
    JSON.stringify({
      error: result.message || 'Rate limit exceeded',
      code: 'RATE_LIMIT_EXCEEDED',
      retry_after: result.retryAfter,
      limit_type: result.limitType,
      current_count: result.currentCount,
      limit: result.limit,
    }),
    { status: 429, headers }
  );
}

/**
 * Extract IP address from request headers
 *
 * @param req - Request object
 * @returns IP address string
 */
export function getIpAddress(req: Request): string | null {
  // Try various headers that might contain the client IP
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list, take the first IP
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return null;
}

/**
 * Log suspicious activity to the database
 *
 * @param supabase - Supabase client instance
 * @param params - Activity details
 */
export async function logSuspiciousActivity(
  supabase: any,
  params: {
    userId?: string;
    ipAddress?: string;
    actionType: string;
    reason: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    requestDetails?: Record<string, any>;
    userAgent?: string;
  }
): Promise<void> {
  try {
    await supabase.rpc('log_suspicious_activity', {
      _user_id: params.userId || null,
      _ip_address: params.ipAddress || null,
      _action_type: params.actionType,
      _reason: params.reason,
      _severity: params.severity || 'medium',
      _request_details: params.requestDetails || {},
      _user_agent: params.userAgent || null,
    });
  } catch (error) {
    console.error('Failed to log suspicious activity:', error);
    // Don't throw - logging failure shouldn't break the request
  }
}

/**
 * Middleware-like wrapper for rate limiting
 * Use this to wrap your edge function handler
 *
 * @example
 * ```typescript
 * serve(withRateLimit('delete-user', async (req, context) => {
 *   // Your handler code here
 *   return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
 * }));
 * ```
 */
export function withRateLimit(
  actionType: string,
  handler: (req: Request, context: { userId: string | null; ipAddress: string | null }) => Promise<Response>,
  customLimits?: RateLimitConfig
) {
  return async (req: Request): Promise<Response> => {
    // Get CORS headers (assuming they're available or can be imported)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Extract user ID from auth header
      const authHeader = req.headers.get('Authorization');
      let userId: string | null = null;

      if (authHeader) {
        // You'd need to verify the JWT and extract the user ID
        // For now, we'll leave this as a placeholder
        // In practice, you'd use supabase.auth.getUser() here
      }

      // Get IP address
      const ipAddress = getIpAddress(req);

      // Create a minimal supabase client for rate limiting
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
      }

      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: authHeader ? { Authorization: authHeader } : {} },
      });

      // If we have an auth header, get the user
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          userId = user.id;
        }
      }

      // Check rate limit
      const rateLimitResult = await checkRateLimit(
        supabase,
        userId,
        ipAddress,
        actionType,
        customLimits
      );

      if (!rateLimitResult.allowed) {
        return createRateLimitResponse(rateLimitResult, corsHeaders);
      }

      // Call the actual handler
      return await handler(req, { userId, ipAddress });
    } catch (error) {
      console.error('Error in rate limit wrapper:', error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  };
}
