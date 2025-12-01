import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SwitchRoleRequest {
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasAnonKey: !!supabaseAnonKey
    });

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error('Missing environment variables');
      throw new Error("Missing environment variables");
    }

    // Get auth token from request - JWT is already verified by Supabase
    const authHeader = req.headers.get("Authorization");
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: "Unauthorized: No auth header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JWT from header
    const token = authHeader.replace('Bearer ', '');
    
    // Create service role client for secure operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from JWT (JWT is already verified by Supabase)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    console.log('Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      hasError: !!authError,
      error: authError?.message
    });
    
    if (authError || !user) {
      console.error('Auth failed:', authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Auth failed", details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('User authenticated successfully');

    // Parse request body
    console.log('Parsing request body...');
    const { role }: SwitchRoleRequest = await req.json();

    if (!role) {
      console.error('No role provided in request');
      return new Response(
        JSON.stringify({ error: "Role is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Switching to role:', role);

    // Call the set_active_role function (which includes validation)
    console.log('Calling set_active_role function...');
    const { data, error: setRoleError } = await supabaseAdmin
      .rpc('set_active_role', {
        _user_id: user.id,
        _role: role,
      });

    if (setRoleError) {
      console.error('Error setting active role:', setRoleError);
      return new Response(
        JSON.stringify({ error: setRoleError.message || "Failed to switch role" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Role switched successfully');

    // Log to audit logs
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'role_switched',
        details: { new_role: role },
      });

    console.log('Audit log created');

    return new Response(
      JSON.stringify({ success: true, role }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error in switch-role function:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
