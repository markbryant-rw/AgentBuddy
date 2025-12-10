import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get request body
    const { teamId } = await req.json();

    if (!teamId) {
      return new Response(
        JSON.stringify({ error: "teamId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get team info
    const { data: team } = await supabaseClient
      .from("teams")
      .select("name, meeting_generation_tone")
      .eq("id", teamId)
      .single();

    if (!team) {
      return new Response(
        JSON.stringify({ error: "Team not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate date ranges
    const today = new Date();
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Fetch KPI data for last week
    const { data: kpiData } = await supabaseClient
      .from("kpi_entries")
      .select("*, profiles:user_id(full_name)")
      .gte("entry_date", lastWeekStart.toISOString().split('T')[0])
      .lte("entry_date", today.toISOString().split('T')[0])
      .in("user_id", (await supabaseClient.from("team_members").select("user_id").eq("team_id", teamId)).data?.map(m => m.user_id) || []);

    // Fetch pipeline data
    const { data: pipelineData } = await supabaseClient
      .from("listings_pipeline")
      .select("warmth, estimated_value")
      .eq("team_id", teamId)
      .is("archived_at", null);

    // Fetch active transactions
    const { data: transactionsData } = await supabaseClient
      .from("transactions")
      .select("settlement_date")
      .eq("team_id", teamId)
      .neq("status", "settled")
      .order("created_at", { ascending: false });

    // Fetch tasks for this week
    const { data: tasksData } = await supabaseClient
      .from("tasks")
      .select("priority")
      .gte("due_date", weekStart.toISOString())
      .lte("due_date", weekEnd.toISOString())
      .in("created_by", (await supabaseClient.from("team_members").select("user_id").eq("team_id", teamId)).data?.map(m => m.user_id) || []);

    // Fetch team goals
    const { data: goalsData } = await supabaseClient
      .from("goals")
      .select("id")
      .eq("team_id", teamId)
      .or(`goal_type.eq.team,goal_type.eq.individual`);

    // Build AI prompt with all data
    const systemPrompt = `You are an AI assistant generating a weekly team meeting agenda for a real estate team. 
Create a structured, data-driven meeting outline that is professional, motivational, and actionable.`;

    const userPrompt = `Generate a weekly team meeting outline for ${team.name} with the following data:

**Last Week's Activity (${lastWeekStart.toLocaleDateString()} - ${today.toLocaleDateString()}):**
- KPI Entries: ${kpiData?.length || 0} entries logged
- Top performers: ${kpiData ? [...new Set(kpiData.map((k: any) => k.profiles?.full_name))].join(', ') : 'N/A'}

**Current Pipeline:**
- Total listings: ${pipelineData?.length || 0}
- Hot listings: ${pipelineData?.filter((p: any) => p.warmth === 'hot').length || 0}
- Warm listings: ${pipelineData?.filter((p: any) => p.warmth === 'warm').length || 0}
- Cold listings: ${pipelineData?.filter((p: any) => p.warmth === 'cold').length || 0}
- Total estimated value: $${pipelineData?.reduce((sum: number, p: any) => sum + (p.estimated_value || 0), 0).toLocaleString() || 0}

**Active Transactions:**
- In progress: ${transactionsData?.length || 0} deals
- Upcoming settlements this week: ${transactionsData?.filter((t: any) => {
  const settlement = new Date(t.settlement_date);
  return settlement >= weekStart && settlement <= weekEnd;
}).length || 0}

**This Week's Focus (${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}):**
- Tasks due: ${tasksData?.length || 0}
- High priority tasks: ${tasksData?.filter((t: any) => t.priority === 'high').length || 0}

**Team Goals:**
- Active goals: ${goalsData?.length || 0}

Please structure the meeting outline with these sections:
1. **Last Week's Wins** - Celebrate achievements and closed deals
2. **Pipeline Update** - Current listings and their status
3. **Active Transactions** - Deals in progress and upcoming milestones
4. **This Week's Focus** - Key tasks and priorities
5. **Upcoming This Month** - Expected settlements and monthly targets
6. **Team Shoutouts** - Recognition for top performers

Format the output in clean Markdown with headings (##), bullet points (-), and bold text (**text**) for emphasis. Use a ${team.meeting_generation_tone || 'professional'} tone. Keep it concise and actionable.`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0]?.message?.content;

    if (!generatedContent) {
      throw new Error("No content generated from AI");
    }

    // Parse markdown to TipTap JSON
    const lines = generatedContent.split('\n');
    const content: any[] = [];
    
    let currentList: any = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) {
        if (currentList) {
          content.push(currentList);
          currentList = null;
        }
        continue;
      }
      
      // Heading (## text)
      if (trimmed.startsWith('##')) {
        if (currentList) {
          content.push(currentList);
          currentList = null;
        }
        const text = trimmed.replace(/^##\s*/, '');
        content.push({
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text }]
        });
      }
      // Bullet point (- text or * text)
      else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const text = trimmed.replace(/^[-*]\s*/, '');
        const textContent = parseInlineFormatting(text);
        
        if (!currentList) {
          currentList = {
            type: "bulletList",
            content: []
          };
        }
        
        currentList.content.push({
          type: "listItem",
          content: [{
            type: "paragraph",
            content: textContent
          }]
        });
      }
      // Regular paragraph
      else {
        if (currentList) {
          content.push(currentList);
          currentList = null;
        }
        const textContent = parseInlineFormatting(trimmed);
        content.push({
          type: "paragraph",
          content: textContent
        });
      }
    }
    
    // Add any remaining list
    if (currentList) {
      content.push(currentList);
    }
    
    const tiptapContent = {
      type: "doc",
      content: content.length > 0 ? content : [{
        type: "paragraph",
        content: [{ type: "text", text: generatedContent }]
      }]
    };
    
    // Helper function to parse bold text (**text**)
    function parseInlineFormatting(text: string) {
      const parts: any[] = [];
      const regex = /\*\*(.+?)\*\*/g;
      let lastIndex = 0;
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        // Add text before bold
        if (match.index > lastIndex) {
          parts.push({
            type: "text",
            text: text.substring(lastIndex, match.index)
          });
        }
        
        // Add bold text
        parts.push({
          type: "text",
          text: match[1],
          marks: [{ type: "bold" }]
        });
        
        lastIndex = regex.lastIndex;
      }
      
      // Add remaining text
      if (lastIndex < text.length) {
        parts.push({
          type: "text",
          text: text.substring(lastIndex)
        });
      }
      
      return parts.length > 0 ? parts : [{ type: "text", text }];
    }

    // Get a team member to attribute the note creation (use first admin)
    const { data: teamMembers } = await supabaseClient
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("access_level", "admin")
      .limit(1);

    const createdBy = teamMembers?.[0]?.user_id || null;

    // Create the note
    const { data: note, error: noteError } = await supabaseClient
      .from("notes")
      .insert({
        title: `Weekly Team Meeting - ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        content_rich: tiptapContent,
        visibility: 'team',
        team_id: teamId,
        owner_id: createdBy,
        tags: ['Team Meeting', 'AI Generated'],
        is_pinned: true,
      })
      .select()
      .single();

    if (noteError) {
      console.error("Error creating note:", noteError);
      throw noteError;
    }

    return new Response(
      JSON.stringify({ success: true, noteId: note.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in generate-team-meeting:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
