import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get yesterday's date range (NZT midnight to midnight)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const yesterdayISO = yesterday.toISOString();
    const todayISO = today.toISOString();
    const entryDate = yesterday.toISOString().split('T')[0];

    console.log(`Generating changelog for ${entryDate}`);

    // Check if entry already exists
    const { data: existing } = await supabase
      .from('changelog_entries')
      .select('id')
      .eq('entry_date', entryDate)
      .maybeSingle();

    if (existing) {
      console.log(`Changelog for ${entryDate} already exists, skipping`);
      return new Response(
        JSON.stringify({ message: "Changelog already exists", date: entryDate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch bug reports fixed in the last 24 hours
    const { data: fixedBugs, error: bugsError } = await supabase
      .from('bug_reports')
      .select('id, title, summary, module, severity')
      .eq('status', 'fixed')
      .gte('updated_at', yesterdayISO)
      .lt('updated_at', todayISO);

    if (bugsError) {
      console.error('Error fetching bugs:', bugsError);
      throw bugsError;
    }

    // Fetch feature requests completed in the last 24 hours
    const { data: completedFeatures, error: featuresError } = await supabase
      .from('feature_requests')
      .select('id, title, description, module')
      .eq('status', 'completed')
      .gte('updated_at', yesterdayISO)
      .lt('updated_at', todayISO);

    if (featuresError) {
      console.error('Error fetching features:', featuresError);
      throw featuresError;
    }

    const bugCount = fixedBugs?.length || 0;
    const featureCount = completedFeatures?.length || 0;

    console.log(`Found ${bugCount} bugs fixed, ${featureCount} features completed`);

    // Skip if no changes
    if (bugCount === 0 && featureCount === 0) {
      console.log('No changes to report, skipping changelog generation');
      return new Response(
        JSON.stringify({ message: "No changes to report", date: entryDate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare raw changes data
    const rawChanges = {
      bugs: fixedBugs || [],
      features: completedFeatures || [],
    };

    // Generate AI summary using Lovable AI
    let aiSummary = "";
    
    if (lovableApiKey) {
      const prompt = `You are writing a friendly product update email for AgentBuddy, a CRM for real estate agents.

Summarize these changes in warm, simple English that real estate agents will understand. Be brief, celebratory, and use 1-2 emojis per section. Avoid technical jargon.

Format:
- Start with a brief greeting (1 sentence)
- If there are bug fixes, list them under "🔧 Bug Fixes" with simple descriptions
- If there are new features, list them under "✨ New Features" with simple descriptions
- End with an encouraging closing (1 sentence)

Changes to summarize:

Bug Fixes (${bugCount}):
${fixedBugs?.map(b => `- ${b.title}: ${b.summary || 'Fixed an issue'}`).join('\n') || 'None'}

New Features (${featureCount}):
${completedFeatures?.map(f => `- ${f.title}: ${f.description?.substring(0, 100) || 'New feature added'}`).join('\n') || 'None'}`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You write friendly, concise product updates for non-technical users. Keep summaries under 200 words." },
              { role: "user", content: prompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiSummary = aiData.choices?.[0]?.message?.content || "";
          console.log('AI summary generated successfully');
        } else {
          console.error('AI request failed:', await aiResponse.text());
          // Fallback to simple summary
          aiSummary = generateFallbackSummary(fixedBugs || [], completedFeatures || []);
        }
      } catch (aiError) {
        console.error('AI error:', aiError);
        aiSummary = generateFallbackSummary(fixedBugs || [], completedFeatures || []);
      }
    } else {
      console.log('No Lovable API key, using fallback summary');
      aiSummary = generateFallbackSummary(fixedBugs || [], completedFeatures || []);
    }

    // Store the changelog entry
    const { data: entry, error: insertError } = await supabase
      .from('changelog_entries')
      .insert({
        entry_date: entryDate,
        raw_changes: rawChanges,
        ai_summary: aiSummary,
        bug_count: bugCount,
        feature_count: featureCount,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting changelog:', insertError);
      throw insertError;
    }

    console.log(`Changelog created for ${entryDate}:`, entry.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        date: entryDate,
        bugCount,
        featureCount,
        entryId: entry.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error generating changelog:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateFallbackSummary(bugs: any[], features: any[]): string {
  let summary = "Hey there! 👋\n\nHere's what we've been working on:\n\n";
  
  if (bugs.length > 0) {
    summary += "🔧 **Bug Fixes**\n";
    bugs.forEach(bug => {
      summary += `• ${bug.title}\n`;
    });
    summary += "\n";
  }
  
  if (features.length > 0) {
    summary += "✨ **New Features**\n";
    features.forEach(feature => {
      summary += `• ${feature.title}\n`;
    });
    summary += "\n";
  }
  
  summary += "Thanks for being part of the AgentBuddy community! 🏠";
  
  return summary;
}
