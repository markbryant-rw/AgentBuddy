import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { websiteUrl } = await req.json();

    if (!websiteUrl) {
      return new Response(
        JSON.stringify({ error: 'Website URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Extracting logo from: ${websiteUrl}`);

    // Fetch the website HTML
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }

    const html = await response.text();
    
    // Extract potential logo URLs using regex patterns
    const logoPatterns = [
      // Open Graph image
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
      // Twitter card image
      /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
      // Link rel icon
      /<link\s+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']+)["']/i,
      // Schema.org logo
      /"logo"\s*:\s*"([^"]+)"/i,
      // Common logo image patterns
      /<img[^>]*class=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)["']/i,
      /<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*logo[^"']*["']/i,
    ];

    const candidates: string[] = [];

    for (const pattern of logoPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let logoUrl = match[1];
        
        // Convert relative URLs to absolute
        if (logoUrl.startsWith('//')) {
          logoUrl = `https:${logoUrl}`;
        } else if (logoUrl.startsWith('/')) {
          const urlObj = new URL(websiteUrl);
          logoUrl = `${urlObj.protocol}//${urlObj.host}${logoUrl}`;
        } else if (!logoUrl.startsWith('http')) {
          logoUrl = new URL(logoUrl, websiteUrl).href;
        }
        
        candidates.push(logoUrl);
      }
    }

    if (candidates.length === 0) {
      console.log('No logo candidates found');
      return new Response(
        JSON.stringify({ logoUrl: null, message: 'No logo found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${candidates.length} logo candidates`);

    // Use Lovable AI to identify the best logo
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: aiResponse, error: aiError } = await supabase.functions.invoke('lovable-ai', {
      body: {
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: `From these logo URL candidates, identify which one is most likely the primary company logo (not a favicon or small icon). Return ONLY the URL, nothing else.\n\nCandidates:\n${candidates.join('\n')}\n\nBest logo URL:`,
          },
        ],
        stream: false,
      },
    });

    if (aiError) {
      console.error('AI error:', aiError);
      // Fallback to first candidate if AI fails
      return new Response(
        JSON.stringify({ logoUrl: candidates[0] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const selectedLogo = aiResponse?.choices?.[0]?.message?.content?.trim() || candidates[0];
    
    // Validate the selected logo is one of our candidates
    const finalLogo = candidates.find(c => selectedLogo.includes(c)) || candidates[0];

    console.log(`Selected logo: ${finalLogo}`);

    return new Response(
      JSON.stringify({ logoUrl: finalLogo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error extracting logo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
