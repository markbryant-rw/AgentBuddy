import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import { getCorsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@agentbuddy.co';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    // Calculate current week (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    console.log(`Sending weekly summary for week starting ${weekStartStr}`);

    // Get teams with weekly tasks enabled
    const { data: enabledTeams, error: settingsError } = await supabase
      .from('weekly_task_settings')
      .select(`
        team_id,
        teams (
          id,
          name
        )
      `)
      .eq('enabled', true);

    if (settingsError) throw settingsError;
    if (!enabledTeams || enabledTeams.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No teams with weekly tasks enabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailsSent = 0;

    for (const teamSetting of enabledTeams) {
      const teamId = teamSetting.team_id;
      const teamName = (teamSetting.teams as any)?.name || 'Your Team';

      // Get team leaders for this team
      const { data: teamLeaders } = await supabase
        .from('team_members')
        .select(`
          user_id,
          profiles (
            id,
            email,
            full_name
          )
        `)
        .eq('team_id', teamId)
        .eq('access_level', 'admin');

      if (!teamLeaders || teamLeaders.length === 0) continue;

      // Get weekly tasks for this team
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id,
          completed,
          assigned_to,
          profiles!tasks_assigned_to_fkey (
            id,
            full_name
          )
        `)
        .eq('team_id', teamId)
        .eq('is_weekly_recurring', true)
        .eq('generated_for_week', weekStartStr);

      if (!tasks || tasks.length === 0) continue;

      // Calculate stats per agent
      const agentStats: Map<string, { name: string; total: number; completed: number }> = new Map();

      for (const task of tasks) {
        const userId = task.assigned_to;
        if (!userId) continue;

        const profile = task.profiles as any;
        const name = profile?.full_name || 'Unknown';

        if (!agentStats.has(userId)) {
          agentStats.set(userId, { name, total: 0, completed: 0 });
        }

        const stats = agentStats.get(userId)!;
        stats.total++;
        if (task.completed) stats.completed++;
      }

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.completed).length;
      const teamRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Build agent summary HTML
      const agentRows = Array.from(agentStats.values())
        .sort((a, b) => {
          const rateA = a.total > 0 ? a.completed / a.total : 0;
          const rateB = b.total > 0 ? b.completed / b.total : 0;
          return rateB - rateA;
        })
        .map(agent => {
          const rate = agent.total > 0 ? Math.round((agent.completed / agent.total) * 100) : 0;
          const color = rate >= 80 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444';
          return `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${agent.name}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${agent.completed}/${agent.total}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center; color: ${color}; font-weight: 600;">${rate}%</td>
            </tr>
          `;
        })
        .join('');

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Weekly Tasks Summary</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">📊 Weekly Tasks Summary</h1>
          <p style="color: #6b7280; margin-bottom: 24px;">${teamName} - Week of ${weekStartStr}</p>
          
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; padding: 20px; margin-bottom: 24px; color: white;">
            <p style="margin: 0 0 8px 0; opacity: 0.9;">Team Completion Rate</p>
            <p style="margin: 0; font-size: 36px; font-weight: 700;">${teamRate}%</p>
            <p style="margin: 8px 0 0 0; opacity: 0.9;">${completedTasks} of ${totalTasks} tasks completed</p>
          </div>
          
          <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 12px;">Agent Performance</h2>
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #374151;">Agent</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">Tasks</th>
                <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #374151;">Rate</th>
              </tr>
            </thead>
            <tbody>
              ${agentRows}
            </tbody>
          </table>
          
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px; text-align: center;">
            This summary was automatically generated by AgentBuddy
          </p>
        </body>
        </html>
      `;

      // Send email to each team leader
      for (const leader of teamLeaders) {
        const profile = leader.profiles as any;
        const email = profile?.email;
        if (!email || !resend) continue;

        try {
          await resend.emails.send({
            from: `AgentBuddy <${fromEmail}>`,
            to: [email],
            subject: `📊 Weekly Tasks Summary - ${teamName} (${teamRate}% complete)`,
            html: emailHtml,
          });
          emailsSent++;
        } catch (emailError) {
          console.error(`Failed to send email to ${email}:`, emailError);
        }
      }
    }

    console.log(`Sent ${emailsSent} weekly summary emails`);

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending weekly summary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
