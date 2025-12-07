import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



interface AIFeatureAnalysis {
  implementation_approach: string;
  affected_components: string[];
  technical_complexity: 'low' | 'medium' | 'high';
  estimated_effort: 'small' | 'medium' | 'large' | 'epic';
  estimated_days: number;
  priority_score: number;
  dependencies: string[];
  risks: string[];
  alternative_approaches: string[];
  mvp_scope: string;
  nice_to_have: string[];
  suggested_prompts: Array<{
    label: string;
    prompt: string;
  }>;
  build_it_prompt: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { featureRequestId } = await req.json();
    console.log('Analyzing feature request:', featureRequestId);

    // Fetch feature request details
    const { data: request, error: requestError } = await supabaseClient
      .from('feature_requests')
      .select('title, description, vote_count, module, status')
      .eq('id', featureRequestId)
      .single();

    if (requestError || !request) {
      throw new Error('Feature request not found');
    }

    // Call Lovable AI for strategic analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are a product strategist and technical architect for a real estate agent hub application built with React, TypeScript, Supabase, and Tailwind CSS.

The app includes workspaces: PROSPECT, TRANSACT, OPERATE, GROW, and ENGAGE.

Analyze feature requests and provide strategic implementation guidance. Return ONLY a valid JSON object (no markdown):

{
  "implementation_approach": "High-level strategy",
  "affected_components": ["Component paths"],
  "technical_complexity": "medium",
  "estimated_effort": "medium",
  "estimated_days": 5,
  "priority_score": 0.75,
  "dependencies": ["Required features/changes"],
  "risks": ["Potential issues"],
  "alternative_approaches": ["Other options"],
  "mvp_scope": "Minimal viable version",
  "nice_to_have": ["Optional enhancements"],
  "suggested_prompts": [
    {
      "label": "Create base component",
      "prompt": "Create a new component for [feature]"
    }
  ],
  "build_it_prompt": "A comprehensive, ready-to-use prompt for Lovable AI that describes exactly how to implement this feature. Include specific file paths, component names, database changes needed, and step-by-step implementation instructions. Make it actionable and detailed so it can be copy-pasted directly into Lovable."
}

Priority score (0-1): Consider vote_count, technical feasibility, and business impact.`
          },
          {
            role: 'user',
            content: `Analyze this feature request:

Title: ${request.title}
Description: ${request.description}
Votes: ${request.vote_count}
Module: ${request.module || 'Not specified'}
Current Status: ${request.status}`
          }
        ],
        max_completion_tokens: 2500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    let analysis: AIFeatureAnalysis;
    try {
      const content = aiData.choices[0].message.content;
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysis = {
        implementation_approach: 'Manual planning required',
        affected_components: [],
        technical_complexity: 'medium',
        estimated_effort: 'medium',
        estimated_days: 3,
        priority_score: 0.5,
        dependencies: [],
        risks: ['Requires detailed technical assessment'],
        alternative_approaches: [],
        mvp_scope: 'Needs definition',
        nice_to_have: [],
        suggested_prompts: [],
        build_it_prompt: ''
      };
    }

    // Store analysis in database
    const { error: updateError } = await supabaseClient
      .from('feature_requests')
      .update({
        ai_analysis: analysis,
        ai_analyzed_at: new Date().toISOString(),
        ai_estimated_effort: analysis.estimated_effort,
        ai_priority_score: analysis.priority_score,
      })
      .eq('id', featureRequestId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log('Analysis stored successfully');

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-feature-request:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
