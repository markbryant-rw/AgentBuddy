import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { corsHeaders } from '../_shared/cors.ts';



interface Profile {
  id: string;
  full_name: string;
  birthday: string;
  birthday_visibility: 'public' | 'team_only' | 'friends_only' | 'private';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🎂 Birthday scheduler running...');

    // Get today's date in MM-DD format
    const today = new Date();
    const todayMMDD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    console.log(`Looking for birthdays on ${todayMMDD}`);

    // Find profiles with birthdays today (excluding private)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, birthday, birthday_visibility, primary_team_id')
      .not('birthday', 'is', null)
      .neq('birthday_visibility', 'private')
      .like('birthday', `%${todayMMDD}`);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} birthday(s) today`);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No birthdays today' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let postsCreated = 0;
    let notificationsSent = 0;

    for (const profile of profiles) {
      console.log(`Processing birthday for ${profile.full_name}`);

      // Create birthday celebration post
      const birthdayMessages = [
        `🎉 Let's celebrate ${profile.full_name}'s birthday! Wish them a happy birthday! 🎂`,
        `🎂 It's ${profile.full_name}'s special day! Join us in celebrating! 🎉`,
        `🌟 Happy Birthday ${profile.full_name}! Hope your day is as amazing as you are! 🎈`,
        `🎈 Wishing ${profile.full_name} a fantastic birthday filled with joy! 🎉`,
      ];

      const randomMessage = birthdayMessages[Math.floor(Math.random() * birthdayMessages.length)];

      const { data: post, error: postError } = await supabase
        .from('social_posts')
        .insert({
          user_id: profile.id,
          content: randomMessage,
          post_type: 'birthday_celebration',
          visibility: profile.birthday_visibility,
          mood: 'great',
        })
        .select()
        .single();

      if (postError) {
        console.error(`Error creating post for ${profile.full_name}:`, postError);
        continue;
      }

      postsCreated++;
      console.log(`Created birthday post for ${profile.full_name}`);

      // Track birthday celebration
      const { error: celebrationError } = await supabase
        .from('birthday_celebrations')
        .insert({
          birthday_user_id: profile.id,
          birthday_date: today.toISOString().split('T')[0],
          auto_post_id: post.id,
          celebration_count: 0,
        });

      if (celebrationError) {
        console.error('Error tracking celebration:', celebrationError);
      }

      // Send notification to the birthday person
      const { error: selfNotifError } = await supabase
        .from('notifications')
        .insert({
          user_id: profile.id,
          type: 'birthday_self',
          title: '🎂 Happy Birthday!',
          message: "It's your special day! Your team is celebrating you!",
          metadata: { post_id: post.id },
        });

      if (!selfNotifError) notificationsSent++;

      // Get team members and friends based on visibility
      let notifyUserIds: string[] = [];

      if (profile.birthday_visibility === 'public') {
        // Notify all users (simplified - you may want to add limits)
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('id')
          .neq('id', profile.id)
          .limit(100);
        
        notifyUserIds = allUsers?.map(u => u.id) || [];
      } else if (profile.birthday_visibility === 'team_only' && profile.primary_team_id) {
        // Notify team members
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', profile.primary_team_id)
          .neq('user_id', profile.id);
        
        notifyUserIds = teamMembers?.map(tm => tm.user_id) || [];
      } else if (profile.birthday_visibility === 'friends_only') {
        // Notify friends
        const { data: friends } = await supabase
          .from('friend_connections')
          .select('user_id, friend_id')
          .eq('accepted', true)
          .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`);
        
        notifyUserIds = friends?.map(f => 
          f.user_id === profile.id ? f.friend_id : f.user_id
        ) || [];
      }

      // Send notifications to relevant users
      if (notifyUserIds.length > 0) {
        const notifications = notifyUserIds.map(userId => ({
          user_id: userId,
          type: 'birthday_team',
          title: `🎉 ${profile.full_name}'s Birthday!`,
          message: `Wish ${profile.full_name.split(' ')[0]} a happy birthday today!`,
          metadata: { birthday_user_id: profile.id, post_id: post.id },
        }));

        const { error: teamNotifError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (!teamNotifError) {
          notificationsSent += notifyUserIds.length;
          console.log(`Sent ${notifyUserIds.length} birthday notifications`);
        }
      }
    }

    const result = {
      success: true,
      birthdays: profiles.length,
      postsCreated,
      notificationsSent,
      timestamp: new Date().toISOString(),
    };

    console.log('Birthday scheduler completed:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Birthday scheduler error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
