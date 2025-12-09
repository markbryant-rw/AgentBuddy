import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API key from Beacon
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = Deno.env.get('BEACON_API_KEY');
    
    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('Invalid or missing API key');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { externalLeadId, vendorName, vendorEmail, vendorMobile } = body;

    console.log('Received owner update from Beacon:', {
      externalLeadId,
      vendorName,
      vendorEmail: vendorEmail ? '***' : null,
      vendorMobile: vendorMobile ? '***' : null,
    });

    if (!externalLeadId) {
      return new Response(
        JSON.stringify({ error: 'Missing externalLeadId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build update object with only provided fields
    const updateData: Record<string, string> = {};
    if (vendorName !== undefined) updateData.vendor_name = vendorName;
    if (vendorEmail !== undefined) updateData.vendor_email = vendorEmail;
    if (vendorMobile !== undefined) updateData.vendor_mobile = vendorMobile;

    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No fields to update' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the appraisal record
    const { data, error } = await supabase
      .from('logged_appraisals')
      .update(updateData)
      .eq('id', externalLeadId)
      .select('id, address, vendor_name, vendor_email, vendor_mobile')
      .single();

    if (error) {
      console.error('Error updating appraisal:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update appraisal', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully updated appraisal:', data?.id, data?.address);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Owner details updated',
        appraisalId: data?.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
