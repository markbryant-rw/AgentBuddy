import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



interface AIBugAnalysis {
  root_cause_hypothesis: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  areas_to_investigate: string[];
  suggested_prompts: Array<{
    label: string;
    prompt: string;
    context?: string;
  }>;
  solution_outline: string[];
  needs_more_info: boolean;
  clarifying_questions: string[];
  affected_components: string[];
  estimated_fix_complexity: 'trivial' | 'easy' | 'moderate' | 'complex' | 'major';
  lovable_fix_prompt: string;
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

    const { bugId } = await req.json();
    console.log('Analyzing bug:', bugId);

    // Fetch bug details
    const { data: bug, error: bugError } = await supabaseClient
      .from('bug_reports')
      .select('summary, description, workspace_module, module, severity, expected_behaviour, steps_to_reproduce, environment')
      .eq('id', bugId)
      .single();

    if (bugError || !bug) {
      throw new Error('Bug not found');
    }

    // Call Lovable AI for analysis
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert software debugging assistant for a real estate agent hub application built with React, TypeScript, Supabase, and Tailwind CSS. 

The app includes workspaces: PROSPECT (listings pipeline), TRANSACT (transaction coordination), OPERATE (daily planner, tasks, projects), GROW (coaching, feedback), and ENGAGE (social feed, service providers).

Analyze bug reports and provide actionable insights. Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):

{
  "root_cause_hypothesis": "Clear explanation of likely cause",
  "confidence": 0.85,
  "impact": "high",
  "areas_to_investigate": ["Component/file names"],
  "suggested_prompts": [
    {
      "label": "Check RLS policies",
      "prompt": "Review the RLS policies for [table] to ensure proper access control",
      "context": "Why this matters"
    }
  ],
  "solution_outline": ["Step 1", "Step 2"],
  "needs_more_info": false,
  "clarifying_questions": [],
  "affected_components": ["src/path/Component.tsx"],
  "estimated_fix_complexity": "moderate",
  "lovable_fix_prompt": "A complete, ready-to-paste prompt for Lovable that describes the bug, its root cause, affected files, and step-by-step fix instructions. Write it as a direct instruction to Lovable AI. Make it comprehensive but concise. Start with 'Fix bug:' followed by the issue title."
}

IMPORTANT: The lovable_fix_prompt should be a single, comprehensive prompt that a developer can copy and paste directly into Lovable to fix the issue. Include:
- Clear bug description
- Root cause explanation
- Specific file references
- Step-by-step fix instructions
- Any edge cases to handle

If the bug description is too vague, set needs_more_info=true and focus on clarifying_questions.`
          },
          {
            role: 'user',
            content: `Analyze this bug report:

Summary: ${bug.summary}
Description: ${bug.description}
Module: ${bug.workspace_module || bug.module || 'General'}
Severity: ${bug.severity}
Expected Behaviour: ${bug.expected_behaviour || 'Not specified'}
Steps to Reproduce: ${bug.steps_to_reproduce || 'Not specified'}
Environment: ${JSON.stringify(bug.environment || {})}`
          }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    let analysis: AIBugAnalysis;
    try {
      const content = aiData.choices[0].message.content;
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback response
      analysis = {
        root_cause_hypothesis: 'Unable to analyze automatically. Manual review needed.',
        confidence: 0,
        impact: 'medium',
        areas_to_investigate: ['Manual review required'],
        suggested_prompts: [],
        solution_outline: ['Review bug details manually'],
        needs_more_info: true,
        clarifying_questions: ['Please provide more detailed steps to reproduce', 'What were you trying to accomplish?'],
        affected_components: [],
        estimated_fix_complexity: 'moderate',
        lovable_fix_prompt: 'Unable to generate fix prompt - please provide more details about the bug.'
      };
    }

    // Store analysis in database
    const { error: updateError } = await supabaseClient
      .from('bug_reports')
      .update({
        ai_analysis: analysis,
        ai_analyzed_at: new Date().toISOString(),
        ai_confidence: analysis.confidence,
        ai_impact: analysis.impact,
      })
      .eq('id', bugId);

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
    console.error('Error in analyze-bug-report:', error);
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
