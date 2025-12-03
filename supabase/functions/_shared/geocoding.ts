// Shared geocoding utilities for edge functions
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from './cors.ts';

export interface OpenCageResponse {
  results: Array<{
    geometry: {
      lat: number;
      lng: number;
    };
    formatted: string;
    confidence: number;
  }>;
  status: {
    code: number;
    message: string;
  };
  rate: {
    limit: number;
    remaining: number;
    reset: number;
  };
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
  confidence?: number;
  rate?: {
    limit: number;
    remaining: number;
    reset: number;
  };
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
 * Geocode an entity (listing, appraisal, transaction, etc.)
 */
export async function geocodeEntity(
  supabaseClient: any,
  entityId: string,
  config: GeocodeConfig
): Promise<Response> {
  const { tableName, idFieldName, entityName } = config;

  const opencageApiKey = Deno.env.get('OPENCAGE_API_KEY');
  if (!opencageApiKey) {
    console.error('OPENCAGE_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'Geocoding service not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!entityId) {
    return new Response(
      JSON.stringify({ error: `${entityName} ID is required` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
  console.log('Geocoding address:', query);

  // Call OpenCage API with retry logic
  const opencageUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${opencageApiKey}&countrycode=nz&limit=1`;

  try {
    const geocodeResponse = await fetchWithRetry(opencageUrl);

    if (!geocodeResponse.ok) {
      const errorText = await geocodeResponse.text();
      console.error('OpenCage API error:', errorText);

      await supabaseClient
        .from(tableName)
        .update({ geocode_error: `API error: ${geocodeResponse.status}` })
        .eq('id', entityId);

      return new Response(
        JSON.stringify({ error: 'Geocoding API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geocodeData: OpenCageResponse = await geocodeResponse.json();

    if (geocodeData.status.code !== 200) {
      console.error('OpenCage status error:', geocodeData.status);

      await supabaseClient
        .from(tableName)
        .update({ geocode_error: geocodeData.status.message })
        .eq('id', entityId);

      return new Response(
        JSON.stringify({ error: geocodeData.status.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!geocodeData.results || geocodeData.results.length === 0) {
      console.log('No geocoding results found for:', query);

      await supabaseClient
        .from(tableName)
        .update({ geocode_error: 'Address not found - try using the Fix Location tool with autocomplete' })
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
    const { lat, lng } = result.geometry;

    console.log('Geocoding successful:', { lat, lng, confidence: result.confidence });

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
        confidence: result.confidence,
        formatted: result.formatted,
        rate: geocodeData.rate,
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
 * Handle CORS preflight request
 */
export function handleCorsPreFlight(): Response {
  return new Response(null, { headers: corsHeaders });
}
