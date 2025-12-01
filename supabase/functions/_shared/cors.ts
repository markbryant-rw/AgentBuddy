// Allowed origins whitelist
const ALLOWED_ORIGINS = [
  'https://lndyurrvcblxnkjprdwr.lovable.app', // Production Lovable deployment
  'http://localhost:8080',                     // Local development (vite.config.ts)
  'http://localhost:5173',                     // Alternative Vite dev port
];

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Fallback, should use getCorsHeaders instead
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Get CORS headers with origin validation
 * @param origin - The origin from the request headers
 * @returns CORS headers with validated origin
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0]; // Default to production domain if origin is not in whitelist

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
