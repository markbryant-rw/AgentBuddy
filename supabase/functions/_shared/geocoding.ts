// Shared geocoding utilities for edge functions using Photon API (OpenStreetMap)
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getCorsHeaders } from './cors.ts';

export interface PhotonResponse {
  type: string;
  features: Array<{
    type: string;
    geometry: {
      type: string;
      coordinates: [number, number]; // [lng, lat]
    };
    properties: {
      osm_type: string;
      osm_id: number;
      country: string;
      city?: string;
      district?: string;
      street?: string;
      housenumber?: string;
      postcode?: string;
      state?: string;
    };
  }>;
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

// NZ bounding box for Photon API
const NZ_BBOX = '166.0,-47.5,179.0,-34.0';

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
 * Geocode an entity (listing, appraisal, transaction, etc.) using Photon API
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
  console.log('Geocoding address with Photon:', query);

  // Call Photon API (no API key required!)
  const photonUrl = `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&bbox=${NZ_BBOX}&limit=1`;

  try {
    const geocodeResponse = await fetchWithRetry(photonUrl);

    if (!geocodeResponse.ok) {
      const errorText = await geocodeResponse.text();
      console.error('Photon API error:', errorText);

      await supabaseClient
        .from(tableName)
        .update({ geocode_error: `API error: ${geocodeResponse.status}` })
        .eq('id', entityId);

      return new Response(
        JSON.stringify({ error: 'Geocoding API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geocodeData: PhotonResponse = await geocodeResponse.json();

    if (!geocodeData.features || geocodeData.features.length === 0) {
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

    const result = geocodeData.features[0];
    // Photon returns coordinates as [lng, lat]
    const lng = result.geometry.coordinates[0];
    const lat = result.geometry.coordinates[1];

    // Build formatted address from properties
    const props = result.properties;
    const formattedParts = [
      props.housenumber,
      props.street,
      props.district || props.city,
      props.state,
      props.postcode,
      props.country
    ].filter(Boolean);
    const formatted = formattedParts.join(', ');

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
