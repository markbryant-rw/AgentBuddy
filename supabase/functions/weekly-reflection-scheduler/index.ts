import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';



interface Profile {
  id: string;
  full_name: string;
  social_preferences: {
    weekly_reflection_reminder?: boolean;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting weekly reflection scheduler...');

    // Get current date info
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
    const promptDate = now.toISOString().split('T')[0];

    console.log(`Current day: ${dayOfWeek}, Date: ${promptDate}`);

    // Fetch all active users with reflection reminders enabled
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, social_preferences')
      .eq('is_active', true);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} active profiles`);

    // Filter users who have reflection reminders enabled
    const eligibleUsers = (profiles as Profile[]).filter(
      (p) => p.social_preferences?.weekly_reflection_reminder !== false
    );

    console.log(`${eligibleUsers.length} users have reflection reminders enabled`);

    let sentCount = 0;
    let errorCount = 0;

    // Create reflection prompts and notifications for each user
    for (const profile of eligibleUsers) {
      try {
        // Check if prompt already exists for today
        const { data: existingPrompt } = await supabase
          .from('weekly_reflection_prompts')
          .select('id')
          .eq('user_id', profile.id)
          .eq('prompt_date', promptDate)
          .maybeSingle();

        if (existingPrompt) {
          console.log(`Prompt already exists for user ${profile.id}`);
          continue;
        }

        // Create weekly reflection prompt
        const { error: promptError } = await supabase
          .from('weekly_reflection_prompts')
          .insert({
            user_id: profile.id,
            prompt_date: promptDate,
            prompt_sent_at: now.toISOString(),
            status: 'sent',
          });

        if (promptError) {
          console.error(`Error creating prompt for ${profile.id}:`, promptError);
          errorCount++;
          continue;
        }

        // Create notification
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: profile.id,
            type: 'weekly_reflection_prompt',
            title: "Time to Reflect! 🌟",
            message: "How was your week? Share your wins and lessons with the team.",
            action_url: '/community?modal=reflection',
            is_read: false,
          });

        if (notificationError) {
          console.error(`Error creating notification for ${profile.id}:`, notificationError);
          errorCount++;
          continue;
        }

        sentCount++;
        console.log(`Successfully sent reflection prompt to ${profile.full_name}`);
      } catch (error) {
        console.error(`Error processing user ${profile.id}:`, error);
        errorCount++;
      }
    }

    const result = {
      success: true,
      message: `Weekly reflection prompts sent`,
      stats: {
        total_profiles: profiles?.length || 0,
        eligible_users: eligibleUsers.length,
        sent: sentCount,
        errors: errorCount,
        prompt_date: promptDate,
        day_of_week: dayOfWeek,
      },
    };

    console.log('Scheduler completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Scheduler error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
