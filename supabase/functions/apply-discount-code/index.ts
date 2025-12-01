import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';



interface DiscountCode {
  code: string;
  description: string;
  access_type: string;
  active: boolean;
  expires_at: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Attempting to redeem discount code`);

    // Check if code exists and is active
    const { data: discountCode, error: codeError } = await supabaseClient
      .from('discount_codes')
      .select('code, description, expires_at')
      .eq('code', code.toLowerCase())
      .eq('active', true)
      .single();

    if (codeError || !discountCode) {
      console.log('Invalid code:', code);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired discount code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code has expired
    if (discountCode.expires_at && new Date(discountCode.expires_at) < new Date()) {
      console.log('Code expired:', code);
      return new Response(
        JSON.stringify({ error: 'This discount code has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has already redeemed this code
    const { data: existingRedemption } = await supabaseClient
      .from('user_discount_codes')
      .select('id')
      .eq('user_id', user.id)
      .eq('code', discountCode.code)
      .single();

    if (existingRedemption) {
      console.log('Code already redeemed by user');
      return new Response(
        JSON.stringify({ error: 'You have already redeemed this code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the Platform Access plan (includes all modules)
    const { data: platformPlan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('id')
      .eq('name', 'Platform Access')
      .eq('is_active', true)
      .single();

    if (planError || !platformPlan) {
      console.error('Error fetching Platform Access plan:', planError);
      return new Response(
        JSON.stringify({ error: 'Platform Access plan not found. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user subscription
    const { error: subscriptionError } = await supabaseClient
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        plan_id: platformPlan.id,
        is_active: true,
        started_at: new Date().toISOString(),
        expires_at: null, // Unlimited access
      });

    if (subscriptionError) {
      console.error('Error creating subscription:', subscriptionError);
      return new Response(
        JSON.stringify({ error: 'Failed to activate your subscription. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record the redemption
    const { error: redemptionError } = await supabaseClient
      .from('user_discount_codes')
      .insert({
        user_id: user.id,
        code: discountCode.code,
      });

    if (redemptionError) {
      console.error('Error recording redemption:', redemptionError);
      return new Response(
        JSON.stringify({ error: 'Failed to record redemption' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully applied discount code`);

    return new Response(
      JSON.stringify({
        success: true,
        message: '🎉 Congratulations! You\'ve unlocked the entire Team-OS module suite!',
        description: discountCode.description,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
