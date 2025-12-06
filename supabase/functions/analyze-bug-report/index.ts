import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from '../_shared/cors.ts';

interface AIBugAnalysis {
  root_cause_hypothesis: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  suggested_severity: 'low' | 'medium' | 'high' | 'critical';
  severity_reasoning: string;
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
  // AI-improved report fields
  improved_summary: string;
  improved_description: string;
  report_quality: 'excellent' | 'good' | 'needs_improvement' | 'poor';
  analysis_status: 'success' | 'partial' | 'failed';
  analysis_notes: string;
}

const createFailedAnalysis = (reason: string): AIBugAnalysis => ({
  root_cause_hypothesis: 'Unable to determine - insufficient information provided.',
  confidence: 0,
  impact: 'medium',
  suggested_severity: 'medium',
  severity_reasoning: 'Unable to assess severity due to limited information.',
  areas_to_investigate: [],
  suggested_prompts: [],
  solution_outline: ['Review bug report manually', 'Request additional details from reporter'],
  needs_more_info: true,
  clarifying_questions: [
    'What specific action were you trying to perform?',
    'What did you expect to happen?',
    'What actually happened instead?',
    'Can you provide step-by-step instructions to reproduce this?'
  ],
  affected_components: [],
  estimated_fix_complexity: 'moderate',
  lovable_fix_prompt: 'Unable to generate fix prompt - please provide more details about the bug.',
  improved_summary: '',
  improved_description: '',
  report_quality: 'poor',
  analysis_status: 'failed',
  analysis_notes: reason
});

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

    const { bugId, batchMode } = await req.json();
    console.log('Analyzing bug:', bugId, batchMode ? '(batch mode)' : '');

    // Fetch bug details
    const { data: bug, error: bugError } = await supabaseClient
      .from('bug_reports')
      .select('summary, description, workspace_module, module, severity, expected_behaviour, steps_to_reproduce, environment, status')
      .eq('id', bugId)
      .single();

    if (bugError || !bug) {
      console.error('Bug not found:', bugError);
      throw new Error('Bug not found');
    }

    // Check if report has minimal viable content
    const hasMinimalContent = bug.summary?.length > 5 || bug.description?.length > 10;
    
    if (!hasMinimalContent) {
      console.log('Bug report has insufficient content, storing failed analysis');
      const failedAnalysis = createFailedAnalysis('Bug report contains insufficient information to analyze.');
      
      await supabaseClient
        .from('bug_reports')
        .update({
          ai_analysis: failedAnalysis,
          ai_analyzed_at: new Date().toISOString(),
          ai_confidence: 0,
          ai_impact: 'medium',
        })
        .eq('id', bugId);

      return new Response(
        JSON.stringify({ success: true, analysis: failedAnalysis, status: 'failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Lovable AI for analysis
    let aiResponse;
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: `You are an expert software debugging assistant for AgentBuddy, a real estate agent productivity platform built with React, TypeScript, Supabase, and Tailwind CSS.

The app includes workspaces: PLAN (KPIs, goals), PROSPECT (appraisals, listings pipeline), TRANSACT (transaction coordination), OPERATE (daily planner, tasks, projects), GROW (coaching, feedback, knowledge base), and ENGAGE (social feed, service providers).

Analyze bug reports and provide actionable insights. You must:
1. Assess the severity honestly based on impact and scope
2. Improve the bug report if it's unclear or poorly written
3. Provide a confidence score based on information quality
4. Fail gracefully if you truly can't understand the issue

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):

{
  "root_cause_hypothesis": "Clear explanation of likely cause, or 'Unable to determine' if unclear",
  "confidence": 0.85,
  "impact": "high",
  "suggested_severity": "high",
  "severity_reasoning": "Why this severity level is appropriate - consider user impact, frequency, workarounds",
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
  "lovable_fix_prompt": "Fix bug: [title]. [description of issue, root cause, affected files, step-by-step fix]",
  "improved_summary": "A clearer, more actionable bug title (50 chars max)",
  "improved_description": "A well-structured bug description with clear problem statement, impact, and reproduction steps",
  "report_quality": "good",
  "analysis_status": "success",
  "analysis_notes": "Any notes about the analysis or limitations"
}

SEVERITY GUIDELINES:
- critical: App crashes, data loss, security vulnerability, affects all users
- high: Major feature broken, significant user impact, no workaround
- medium: Feature partially broken, workaround exists, moderate impact
- low: Minor issue, cosmetic, edge case, minimal user impact

REPORT QUALITY:
- excellent: Clear steps, expected vs actual, good context
- good: Understandable but could be clearer
- needs_improvement: Missing key details, vague description
- poor: Cannot understand the issue at all

If the bug description is too vague to analyze, set:
- analysis_status: "partial" or "failed"
- needs_more_info: true
- confidence: low (0.1-0.3)
- Focus on clarifying_questions`
            },
            {
              role: 'user',
              content: `Analyze this bug report and suggest improvements:

Summary: ${bug.summary || 'Not provided'}
Description: ${bug.description || 'Not provided'}
Module: ${bug.workspace_module || bug.module || 'General'}
Current Severity: ${bug.severity || 'Not set'}
Expected Behaviour: ${bug.expected_behaviour || 'Not specified'}
Steps to Reproduce: ${bug.steps_to_reproduce || 'Not specified'}
Environment: ${JSON.stringify(bug.environment || {})}`
            }
          ],
          max_completion_tokens: 2500,
        }),
      });
    } catch (fetchError) {
      console.error('AI API fetch error:', fetchError);
      const failedAnalysis = createFailedAnalysis('AI service temporarily unavailable.');
      
      await supabaseClient
        .from('bug_reports')
        .update({
          ai_analysis: failedAnalysis,
          ai_analyzed_at: new Date().toISOString(),
          ai_confidence: 0,
          ai_impact: 'medium',
        })
        .eq('id', bugId);

      return new Response(
        JSON.stringify({ success: true, analysis: failedAnalysis, status: 'failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      // Handle rate limits gracefully
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        const failedAnalysis = createFailedAnalysis('AI service rate limit reached. Will retry later.');
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limited', analysis: failedAnalysis }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      const failedAnalysis = createFailedAnalysis(`AI analysis failed: ${aiResponse.status}`);
      await supabaseClient
        .from('bug_reports')
        .update({
          ai_analysis: failedAnalysis,
          ai_analyzed_at: new Date().toISOString(),
          ai_confidence: 0,
          ai_impact: 'medium',
        })
        .eq('id', bugId);

      return new Response(
        JSON.stringify({ success: true, analysis: failedAnalysis, status: 'failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    let analysis: AIBugAnalysis;
    try {
      const content = aiData.choices[0].message.content;
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanContent);
      
      // Ensure analysis_status is set
      if (!analysis.analysis_status) {
        analysis.analysis_status = analysis.confidence >= 0.5 ? 'success' : 'partial';
      }
      if (!analysis.analysis_notes) {
        analysis.analysis_notes = '';
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      analysis = createFailedAnalysis('AI response could not be parsed.');
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

    console.log('Analysis stored successfully, status:', analysis.analysis_status);

    return new Response(
      JSON.stringify({ success: true, analysis, status: analysis.analysis_status }),
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