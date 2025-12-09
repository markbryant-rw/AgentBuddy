import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface BeaconOwner {
  name: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
  beaconOwnerId?: string;
}

interface Owner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
  beacon_owner_id?: string;
}

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
    const { externalLeadId, vendorName, vendorEmail, vendorMobile, owners } = body;

    console.log('Received owner update from Beacon:', {
      externalLeadId,
      vendorName,
      vendorEmail: vendorEmail ? '***' : null,
      vendorMobile: vendorMobile ? '***' : null,
      ownerCount: owners?.length || 0,
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

    // Build update object
    const updateData: Record<string, any> = {};
    
    // Handle multi-owner format from Beacon
    if (owners && Array.isArray(owners) && owners.length > 0) {
      // Convert Beacon owners to our format
      const convertedOwners: Owner[] = owners.map((o: BeaconOwner, index: number) => ({
        id: crypto.randomUUID(),
        name: o.name,
        email: o.email || '',
        phone: o.phone || '',
        is_primary: o.isPrimary ?? (index === 0),
        beacon_owner_id: o.beaconOwnerId,
      }));
      
      updateData.owners = convertedOwners;
      
      // Also update legacy fields with primary owner for backward compatibility
      const primary = convertedOwners.find(o => o.is_primary) || convertedOwners[0];
      if (primary) {
        updateData.vendor_name = primary.name;
        updateData.vendor_email = primary.email;
        updateData.vendor_mobile = primary.phone;
      }
    } else {
      // Legacy single-owner format
      if (vendorName !== undefined) updateData.vendor_name = vendorName;
      if (vendorEmail !== undefined) updateData.vendor_email = vendorEmail;
      if (vendorMobile !== undefined) updateData.vendor_mobile = vendorMobile;
      
      // Also update owners array for new format
      if (vendorName) {
        updateData.owners = [{
          id: crypto.randomUUID(),
          name: vendorName,
          email: vendorEmail || '',
          phone: vendorMobile || '',
          is_primary: true,
        }];
      }
    }

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
      .select('id, address, vendor_name, vendor_email, vendor_mobile, owners')
      .single();

    if (error) {
      console.error('Error updating appraisal:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update appraisal', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully updated appraisal:', data?.id, data?.address, 'owners:', (data?.owners as Owner[])?.length || 0);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Owner details updated',
        appraisalId: data?.id,
        ownerCount: (data?.owners as Owner[])?.length || 0,
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