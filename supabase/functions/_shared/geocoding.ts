// Shared geocoding utilities for edge functions using Google Geocoding API
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from './cors.ts';

export interface GoogleGeocodeResponse {
  results: Array<{
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    formatted_address: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
  status: string;
  error_message?: string;
}

export interface GeocodeConfig {
  tableName: string;
  idFieldName: string;
  entityName: string;
}

export interface GeocodeResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  formatted?: string;
  error?: string;
}

/**
 * Fetch with retry logic and timeout
 */
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error as Error;
      console.error(`Fetch attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt - 1) * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

/**
 * Geocode an entity (listing, appraisal, transaction, etc.) using Google Geocoding API
 */
export async function geocodeEntity(
  supabaseClient: any,
  entityId: string,
  config: GeocodeConfig,
  origin?: string | null
): Promise<Response> {
  const { tableName, idFieldName, entityName } = config;
  const corsHeaders = getCorsHeaders(origin || null);

  if (!entityId) {
    return new Response(
      JSON.stringify({ error: `${entityName} ID is required` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get Google Maps API key
  const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!googleMapsApiKey) {
    console.error('GOOGLE_MAPS_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'Geocoding service not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Fetch entity details
  const { data: entity, error: fetchError } = await supabaseClient
    .from(tableName)
    .select('id, address, suburb')
    .eq('id', entityId)
    .single();

  if (fetchError || !entity) {
    console.error(`${entityName} not found:`, fetchError);
    return new Response(
      JSON.stringify({ error: `${entityName} not found` }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!entity.address) {
    await supabaseClient
      .from(tableName)
      .update({ geocode_error: 'No address provided' })
      .eq('id', entityId);

    return new Response(
      JSON.stringify({ error: `${entityName} has no address` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Build geocoding query - avoid duplicating suburb if already in address
  let query: string;
  const addressLower = entity.address.toLowerCase();
  const suburbLower = entity.suburb?.toLowerCase() || '';
  
  // Check if suburb (or its first word for multi-word suburbs) is already in address
  const suburbFirstWord = suburbLower.split(' ')[0];
  const suburbInAddress = suburbLower && (
    addressLower.includes(suburbLower) || 
    (suburbFirstWord.length > 3 && addressLower.includes(suburbFirstWord))
  );
  
  if (suburbInAddress) {
    query = `${entity.address}, New Zealand`;
    console.log('Suburb already in address, skipping duplication');
  } else {
    query = `${entity.address}${entity.suburb ? ', ' + entity.suburb : ''}, New Zealand`;
  }
  console.log('Geocoding address with Google:', query);

  // Call Google Geocoding API
  const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=nz&components=country:NZ&key=${googleMapsApiKey}`;

  try {
    const geocodeResponse = await fetchWithRetry(googleUrl);

    if (!geocodeResponse.ok) {
      const errorText = await geocodeResponse.text();
      console.error('Google Geocoding API error:', errorText);

      await supabaseClient
        .from(tableName)
        .update({ geocode_error: `API error: ${geocodeResponse.status}` })
        .eq('id', entityId);

      return new Response(
        JSON.stringify({ error: 'Geocoding API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geocodeData: GoogleGeocodeResponse = await geocodeResponse.json();

    if (geocodeData.status !== 'OK' || !geocodeData.results || geocodeData.results.length === 0) {
      console.log('No geocoding results found for:', query, 'Status:', geocodeData.status);
      
      const errorMsg = geocodeData.error_message || geocodeData.status === 'ZERO_RESULTS' 
        ? 'Address not found - try using the Fix Location tool with autocomplete'
        : `Geocoding failed: ${geocodeData.status}`;

      await supabaseClient
        .from(tableName)
        .update({ geocode_error: errorMsg })
        .eq('id', entityId);

      // Return 200 with success: false - this is a valid response, not an error
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Address not found',
          message: 'Use the Fix Location tool to search and select the correct address'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = geocodeData.results[0];
    const lat = result.geometry.location.lat;
    const lng = result.geometry.location.lng;
    const formatted = result.formatted_address;

    console.log('Geocoding successful:', { lat, lng, formatted });

    // Update entity with coordinates
    const { error: updateError } = await supabaseClient
      .from(tableName)
      .update({
        latitude: lat,
        longitude: lng,
        geocoded_at: new Date().toISOString(),
        geocode_error: null,
      })
      .eq('id', entityId);

    if (updateError) {
      console.error(`Failed to update ${entityName}:`, updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update ${entityName}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        latitude: lat,
        longitude: lng,
        formatted: formatted,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`Geocoding error for ${entityName}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Create a standard Supabase client with authorization header
 */
export function createAuthenticatedClient(req: Request) {
  return {
    supabaseClient: createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    ),
  };
}

/**
 * Handle CORS preflight request with dynamic origin
 */
export function handleCorsPreFlight(origin?: string | null): Response {
  return new Response(null, { headers: getCorsHeaders(origin || null) });
}
