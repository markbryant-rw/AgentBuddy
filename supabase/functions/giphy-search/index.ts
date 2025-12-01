import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, type = 'search' } = await req.json();
    
    const GIPHY_API_KEY = Deno.env.get('GIPHY_API_KEY');
    if (!GIPHY_API_KEY) {
      throw new Error('GIPHY_API_KEY not configured');
    }

    const GIPHY_BASE_URL = "https://api.giphy.com/v1/gifs";
    const endpoint = type === 'trending' 
      ? `${GIPHY_BASE_URL}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
      : `${GIPHY_BASE_URL}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`;

    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in giphy-search:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch GIFs' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
