import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectTitle, projectDescription } = await req.json();
    
    if (!projectTitle) {
      return new Response(
        JSON.stringify({ error: 'Project title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Call Lovable AI Gateway with google/gemini-2.5-flash
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a project management assistant. Given a project title and description, suggest 3-6 actionable tasks that would help complete the project.

Return ONLY a valid JSON array with this exact structure (no markdown, no extra text):
[
  { "title": "Task name", "priority": "high" },
  { "title": "Task name", "priority": "medium" },
  { "title": "Task name", "priority": "low" }
]

Priority must be one of: "high", "medium", "low"
Task titles should be clear, actionable, and specific.`
          },
          {
            role: 'user',
            content: `Project: ${projectTitle}\nDescription: ${projectDescription || 'No description provided'}`
          }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the AI response (remove any markdown code blocks if present)
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/```\n?/g, '');
    }

    const suggestions = JSON.parse(cleanContent);

    // Validate the response structure
    if (!Array.isArray(suggestions)) {
      throw new Error('AI response is not an array');
    }

    // Ensure all suggestions have the required fields
    const validSuggestions = suggestions
      .filter(s => s.title && s.priority)
      .map(s => ({
        title: s.title,
        priority: ['high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium',
      }))
      .slice(0, 6); // Limit to 6 suggestions

    if (validSuggestions.length === 0) {
      throw new Error('No valid suggestions generated');
    }

    return new Response(
      JSON.stringify({ suggestions: validSuggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-task-suggestions:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate suggestions',
        suggestions: [] // Fallback to empty array
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
