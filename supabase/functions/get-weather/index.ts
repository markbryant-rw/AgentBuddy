import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();
    
    console.log('Fetching weather for coordinates:', { lat, lon });

    if (!lat || !lon) {
      throw new Error('Latitude and longitude are required');
    }

    const apiKey = Deno.env.get('WEATHER_API_KEY');
    
    if (!apiKey) {
      console.error('VITE_WEATHER_API_KEY not configured');
      throw new Error('Weather API key not configured');
    }

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${lat},${lon}&days=7&aqi=no`;
    console.log('Fetching from WeatherAPI...');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('WeatherAPI error:', response.status, errorText);
      throw new Error(`Weather API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Weather data fetched successfully');

    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in get-weather function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
