import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per IP

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { type, title, description, module, severity, attachments, api_key } = body;

    // Validate API key (public identifier - just validates source is Beacon)
    const expectedApiKey = Deno.env.get('BEACON_FEEDBACK_API_KEY');
    if (!expectedApiKey || api_key !== expectedApiKey) {
      console.log('Invalid API key provided');
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!type || !title || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, title, description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (type !== 'bug' && type !== 'feature') {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Must be "bug" or "feature"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Input validation - prevent abuse
    if (title.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Title must be less than 200 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (description.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Description must be less than 5000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role for inserting records
    // Service role bypasses RLS, allowing inserts without a valid user_id FK
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Process attachments if provided (base64 encoded images)
    let uploadedAttachments: string[] = [];
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      // Limit attachments
      const maxAttachments = 5;
      const attachmentsToProcess = attachments.slice(0, maxAttachments);

      for (let i = 0; i < attachmentsToProcess.length; i++) {
        try {
          const base64Data = attachmentsToProcess[i];
          
          // Extract base64 content (handle data URL format)
          let base64Content = base64Data;
          let contentType = 'image/png';
          
          if (base64Data.startsWith('data:')) {
            const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              contentType = matches[1];
              base64Content = matches[2];
            }
          }

          // Decode base64 to binary
          const binaryData = Uint8Array.from(atob(base64Content), c => c.charCodeAt(0));
          
          // Generate unique filename
          const extension = contentType.split('/')[1] || 'png';
          const filename = `beacon/${type}s/${Date.now()}-${i}.${extension}`;

          // Upload to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('feedback-attachments')
            .upload(filename, binaryData, {
              contentType,
              upsert: false
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('feedback-attachments')
              .getPublicUrl(filename);
            
            if (urlData?.publicUrl) {
              uploadedAttachments.push(urlData.publicUrl);
            }
          }
        } catch (attachmentError) {
          console.error('Attachment processing error:', attachmentError);
        }
      }
    }

    let result;

    if (type === 'bug') {
      // Insert bug report - user_id is nullable, external submissions don't have a user
      const { data, error } = await supabase
        .from('bug_reports')
        .insert({
          title: title.trim(),
          description: description.trim(),
          module: module || 'BEACON',
          workspace_module: 'BEACON',
          severity: severity || 'medium',
          source: 'beacon',
          status: 'triage',
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Bug insert error:', error);
        throw error;
      }

      result = { type: 'bug', id: data.id };

      // Trigger AI analysis asynchronously (fire and forget)
      supabase.functions.invoke('analyze-bug-report', {
        body: { bugId: data.id }
      }).catch(err => console.error('AI analysis trigger failed:', err));

    } else {
      // Insert feature request - user_id is nullable, external submissions don't have a user
      const { data, error } = await supabase
        .from('feature_requests')
        .insert({
          title: title.trim(),
          description: description.trim(),
          module: 'BEACON',
          source: 'beacon',
          status: 'submitted',
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Feature insert error:', error);
        throw error;
      }

      result = { type: 'feature', id: data.id };

      // Trigger AI analysis asynchronously (fire and forget)
      supabase.functions.invoke('analyze-feature-request', {
        body: { featureId: data.id }
      }).catch(err => console.error('AI analysis trigger failed:', err));
    }

    console.log(`External ${type} submitted from Beacon:`, result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${type === 'bug' ? 'Bug report' : 'Feature request'} submitted successfully`,
        id: result.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing external feedback:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to submit feedback. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
