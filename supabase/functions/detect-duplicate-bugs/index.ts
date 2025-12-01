import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { summary, description, module } = await req.json();

    // Fetch recent bug reports (last 30 days, not fixed)
    const { data: existingBugs, error: fetchError } = await supabaseClient
      .from('bug_reports')
      .select('id, summary, description, module, status')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .neq('status', 'fixed')
      .limit(50);

    if (fetchError) throw fetchError;

    if (!existingBugs || existingBugs.length === 0) {
      return new Response(
        JSON.stringify({ duplicates: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI for duplicate detection
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a bug duplicate detection system. Compare the new bug report with existing reports and identify potential duplicates. Return ONLY a valid JSON array.'
          },
          {
            role: 'user',
            content: `New Bug:
Summary: ${summary}
Description: ${description}
Module: ${module}

Existing Bugs:
${existingBugs.map((b, i) => `
${i + 1}. ID: ${b.id}
   Summary: ${b.summary}
   Description: ${b.description}
   Module: ${b.module}
   Status: ${b.status}
`).join('\n')}

Analyze and return JSON array of potential duplicates with:
- bug_id: string (UUID)
- confidence: number (0-100, only include if > 60)
- reason: string (brief explanation)

Example format:
[
  {
    "bug_id": "uuid-here",
    "confidence": 85,
    "reason": "Very similar issue in same module with matching symptoms"
  }
]

Return empty array [] if no duplicates found.`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '[]';
    
    // Parse AI response
    let duplicates = [];
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      duplicates = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      // Enrich duplicates with actual bug data
      duplicates = duplicates.map((dup: any) => {
        const bugData = existingBugs.find(b => b.id === dup.bug_id);
        return {
          ...dup,
          summary: bugData?.summary,
          status: bugData?.status
        };
      });
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      duplicates = [];
    }

    return new Response(
      JSON.stringify({ duplicates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, duplicates: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
