import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  const startTime = Date.now();
  console.log('[STEP 1] Request received at:', new Date().toISOString());

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication by extracting user ID from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[AUTH ERROR] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract and validate JWT token
    let userId: string;
    try {
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.sub;
      
      if (!userId) {
        throw new Error('No user ID in token');
      }
      
      console.log('[STEP 2] Auth user verified:', userId);
    } catch (error) {
      console.error('[AUTH ERROR] Invalid JWT token:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { propertyAddress, vendorName, campaignWeek, desiredOutcome, buyerFeedback, useEmojiFormatting = true, section = 'all', customInstructions } = await req.json();

    console.log('[STEP 3] Input data:', {
      propertyAddress: propertyAddress?.substring(0, 50),
      vendorName,
      campaignWeek,
      desiredOutcome: desiredOutcome?.substring(0, 50),
      buyerFeedbackLength: buyerFeedback?.length,
      section
    });

    if (!propertyAddress || !campaignWeek || !desiredOutcome || !buyerFeedback) {
      console.error('[VALIDATION ERROR] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: propertyAddress, campaignWeek, desiredOutcome, and buyerFeedback are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[CONFIG ERROR] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Customize system prompt based on section
    let systemPrompt: string;
    
    if (section === 'vendor') {
      systemPrompt = `You are an expert real estate assistant. Generate ONLY a vendor-facing campaign report.

Structure and Content:

Title: Week [X] Campaign Summary: [Property Address]

Date: Provide the current date.

Introduction: A short paragraph summarizing the week's activity.

Key Metrics: Bulleted list with Groups Through, Documents Requested, Repeat Viewings, etc.

Buyer Feedback Analysis:
- What Buyers Are Loving: Positive recurring feedback
- Key Challenges & Objections: Primary negative feedback

Price Feedback: Summarize price mentions as a clear range.

Summary & Strategy for the Week Ahead: Key learnings, ideal buyer profile, plan for next week.

Tone: Professional, realistic, reassuring. Frame challenges as valuable information.

Formatting Instructions:
${useEmojiFormatting ? `
- Use emoji headers for visual hierarchy:
  ⭐ Introduction
  📊 Key Metrics
  💬 Buyer Feedback Analysis
  ➡️ What Buyers Are Loving
  ⚠️ Key Challenges & Objections
  💰 Price Feedback
  🎯 Summary & Strategy for the Week Ahead

- Use emoji bullets for sub-points:
  📌 for key metrics
  ✅ for positives
  🔸 for challenges
` : `
- Use CAPITALIZED SECTION HEADERS
- Add double line breaks between sections
- Use simple bullet points (•) not asterisks
- Keep formatting clean and minimal
`}

CRITICAL: Since rich text markdown is not supported, DO NOT use **asterisks** for bold. Use ${useEmojiFormatting ? 'emojis' : 'capitalization and spacing'} for emphasis.

${customInstructions ? `
---
ADDITIONAL USER INSTRUCTIONS:
${customInstructions}

IMPORTANT: Incorporate these instructions while maintaining the core structure and format specified above.
---
` : ''}

Format your response with: ---SECTION:VENDOR---
[Your complete vendor-facing report here]`;
    } else if (section === 'actions') {
      systemPrompt = `You are an expert real estate assistant. Generate ONLY vendor-facing action points.

CRITICAL: These action points are FOR THE VENDOR, not internal agent tasks. They should reassure the vendor that positive steps are being taken this week.

Structure and Content:

Title: ${useEmojiFormatting ? '✅ Action Points for Week [X]' : 'ACTION POINTS FOR WEEK [X]'}

Generate 4-6 action points that:
- Are written FROM the agent TO the vendor
- Show proactive steps being taken this week
- Focus on moving the campaign forward
- Build vendor confidence
- Reference specific buyers/feedback when relevant

Tone: Professional, proactive, reassuring, action-oriented.

${useEmojiFormatting ? 'Start each point with ▶️' : 'Start each point with •'}

GOOD Examples (vendor-facing):
${useEmojiFormatting ? '▶️' : '•'} Continue personalized follow-up with James H. and Annie C., who both requested documents and showed strong interest
${useEmojiFormatting ? '▶️' : '•'} Schedule additional viewings with qualified buyers who appreciate the unique benefits of the property
${useEmojiFormatting ? '▶️' : '•'} Leverage the overwhelmingly positive feedback on house presentation in our marketing to attract similar buyers
${useEmojiFormatting ? '▶️' : '•'} Refine messaging to address section concerns proactively and focus on the lifestyle benefits for the right buyer profile
${useEmojiFormatting ? '▶️' : '•'} Engage with new enquiries from the weekend's marketing push and qualify their interest level

BAD Examples (agent-focused - DO NOT USE):
❌ Liaise with solicitor about contracts
❌ Draft SOLD marketing materials
❌ Archive buyer leads in CRM
❌ Prepare for price discussion internally
❌ Update database with feedback

${customInstructions ? `
---
ADDITIONAL USER INSTRUCTIONS:
${customInstructions}

IMPORTANT: Incorporate these instructions while maintaining the core structure and format specified above.
---
` : ''}

Format your response with: ---SECTION:ACTIONS---
[Your complete vendor-facing action points here]`;
    } else if (section === 'whatsapp') {
      systemPrompt = `You are an expert real estate assistant. Generate ONLY a WhatsApp summary for the vendor and team.

Structure and Content:

Title: ${useEmojiFormatting ? '📱 Week [X] Update: [Property Address]' : 'WEEK [X] UPDATE: [Property Address]'}

A brief, scannable summary for WhatsApp/text message (max 5 sentences):
- Open with key metric (e.g., "${useEmojiFormatting ? '📊' : ''} X groups through the open home")
- 2 sentences on core feedback themes
- 1 sentence on most important next step or lead (use ${useEmojiFormatting ? '✅' : '>>>'} prefix)
- Brief closing statement

Tone: Succinct, professional, positive but direct. Keep it conversational but informative. ${useEmojiFormatting ? 'Use 2-3 emojis maximum.' : 'No emojis.'}

CRITICAL: Since rich text markdown is not supported, DO NOT use **asterisks** for bold.

${customInstructions ? `
---
ADDITIONAL USER INSTRUCTIONS:
${customInstructions}

IMPORTANT: Incorporate these instructions while maintaining the core structure and format specified above.
---
` : ''}

Format your response with: ---SECTION:WHATSAPP---
[Your complete WhatsApp summary here]`;
    } else {
      // Default: all sections
      systemPrompt = `You are an expert real estate assistant. Transform raw buyer feedback into three professional summaries.

PART 1: VENDOR-FACING CAMPAIGN REPORT

Title: ${useEmojiFormatting ? '⭐ Week [X] Campaign Summary: [Property Address]' : 'WEEK [X] CAMPAIGN SUMMARY: [Property Address]'}

Date: Provide current date

Introduction: Short paragraph summarizing the week's activity

Key Metrics: Bulleted list
${useEmojiFormatting ? '📌' : '•'} Groups Through: X
${useEmojiFormatting ? '📌' : '•'} Documents Requested: X
${useEmojiFormatting ? '📌' : '•'} Repeat Viewings: X

Buyer Feedback Analysis:

${useEmojiFormatting ? '➡️ What Buyers Are Loving:' : 'WHAT BUYERS ARE LOVING:'}
Summarize positive recurring feedback

${useEmojiFormatting ? '⚠️ Key Challenges & Objections:' : 'KEY CHALLENGES & OBJECTIONS:'}
Summarize primary negative feedback

${useEmojiFormatting ? '💰 Price Feedback:' : 'PRICE FEEDBACK:'}
Summarize price mentions as clear range

${useEmojiFormatting ? '🎯 Summary & Strategy:' : 'SUMMARY & STRATEGY:'}
Key learnings, ideal buyer profile, plan for next week

Tone: Professional, realistic, reassuring

CRITICAL: DO NOT use **asterisks** for bold. Use ${useEmojiFormatting ? 'emojis' : 'CAPITALIZATION'} for emphasis.

---

PART 2: VENDOR-FACING ACTION POINTS

Title: ${useEmojiFormatting ? '✅ Action Points for Week [X]' : 'ACTION POINTS FOR WEEK [X]'}

Generate 4-6 action points that:
- Are written FROM agent TO vendor
- Show proactive steps being taken THIS WEEK
- Focus on moving the campaign forward
- Build vendor confidence
- Reference specific buyers/feedback when relevant

Start each with: ${useEmojiFormatting ? '▶️' : '•'}

GOOD Examples (vendor-facing):
${useEmojiFormatting ? '▶️' : '•'} Continue personalized follow-up with James H., who requested documents and showed strong interest
${useEmojiFormatting ? '▶️' : '•'} Schedule additional viewings with qualified buyers who appreciate the property's unique benefits
${useEmojiFormatting ? '▶️' : '•'} Leverage positive feedback on house presentation in marketing to attract similar buyers
${useEmojiFormatting ? '▶️' : '•'} Refine messaging to address concerns proactively and focus on lifestyle benefits

BAD Examples (DO NOT USE - these are agent-focused):
❌ Liaise with solicitor about contracts
❌ Draft SOLD marketing materials  
❌ Prepare for internal price discussion
❌ Update CRM database

---

PART 3: WHATSAPP SUMMARY

Title: ${useEmojiFormatting ? '📱 Week [X] Update: [Property Address]' : 'WEEK [X] UPDATE: [Property Address]'}

Brief, scannable summary (max 5 sentences):
- Open with key metric (e.g., "${useEmojiFormatting ? '📊' : ''} X groups through")
- 2 sentences on core feedback themes  
- 1 sentence on most important next step (use ${useEmojiFormatting ? '✅' : '>>>'} prefix)
- Brief forward-looking closing

Tone: Succinct, professional, direct. ${useEmojiFormatting ? 'Use 2-3 emojis maximum.' : 'No emojis.'}

CRITICAL: DO NOT use **asterisks** for bold.

---

Format your response EXACTLY as follows:

---SECTION:VENDOR---
[Your complete vendor-facing report here]

---SECTION:ACTIONS---
[Your complete action points here]

---SECTION:WHATSAPP---
[Your complete WhatsApp summary here]`;
    }

    const userPrompt = `Property Address: ${propertyAddress}
${vendorName ? `Vendor Name: ${vendorName}` : ''}
Campaign Week: ${campaignWeek}
Desired Outcome: ${desiredOutcome}

Buyer Feedback:
${buyerFeedback}

Please generate the ${section === 'all' ? 'three reports' : section + ' section'} as specified in your instructions.`;

    console.log('[STEP 4] Calling Lovable AI Gateway with gemini-2.5-pro...');
    
    // Add timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let aiResponse;
    try {
      aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
        }),
        signal: controller.signal,
      });
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('[TIMEOUT ERROR] AI request timed out after 30 seconds');
        return new Response(
          JSON.stringify({ error: 'AI request timed out after 30 seconds. Please try again.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    console.log('[STEP 5] AI Response received:', aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[AI ERROR] Status:', aiResponse.status, 'Response:', errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a few moments.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI service error (${aiResponse.status}): ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const generatedText = aiData.choices[0].message.content;

    console.log('[STEP 6] Raw AI text length:', generatedText.length);
    console.log('[STEP 6.5] First 200 chars:', generatedText.substring(0, 200));

    // Parse using section markers
    const vendorMarker = '---SECTION:VENDOR---';
    const actionsMarker = '---SECTION:ACTIONS---';
    const whatsappMarker = '---SECTION:WHATSAPP---';

    const vendorStart = generatedText.indexOf(vendorMarker);
    const actionsStart = generatedText.indexOf(actionsMarker);
    const whatsappStart = generatedText.indexOf(whatsappMarker);

    console.log('[STEP 7] Section markers found:', {
      vendor: vendorStart !== -1,
      actions: actionsStart !== -1,
      whatsapp: whatsappStart !== -1
    });

    let sections: any = {};

    if (section === 'all') {
      // Parse all three sections
      if (vendorStart === -1 || actionsStart === -1 || whatsappStart === -1) {
        console.error('[PARSE ERROR] Section markers not found. Returning raw response for debugging.');
        sections = {
          vendorReport: generatedText,
          actionPoints: '⚠️ Parsing failed - section markers not found. See vendor report for full text.',
          whatsappSummary: '⚠️ Parsing failed - section markers not found. See vendor report for full text.'
        };
      } else {
        sections = {
          vendorReport: generatedText.slice(vendorStart + vendorMarker.length, actionsStart).trim(),
          actionPoints: generatedText.slice(actionsStart + actionsMarker.length, whatsappStart).trim(),
          whatsappSummary: generatedText.slice(whatsappStart + whatsappMarker.length).trim()
        };
      }
    } else if (section === 'vendor') {
      if (vendorStart === -1) {
        sections.vendorReport = generatedText;
      } else {
        const endPos = actionsStart !== -1 ? actionsStart : generatedText.length;
        sections.vendorReport = generatedText.slice(vendorStart + vendorMarker.length, endPos).trim();
      }
    } else if (section === 'actions') {
      if (actionsStart === -1) {
        sections.actionPoints = generatedText;
      } else {
        const endPos = whatsappStart !== -1 ? whatsappStart : generatedText.length;
        sections.actionPoints = generatedText.slice(actionsStart + actionsMarker.length, endPos).trim();
      }
    } else if (section === 'whatsapp') {
      if (whatsappStart === -1) {
        sections.whatsappSummary = generatedText;
      } else {
        sections.whatsappSummary = generatedText.slice(whatsappStart + whatsappMarker.length).trim();
      }
    }

    console.log('[STEP 8] Parsed sections:', Object.keys(sections));

    const executionTime = Date.now() - startTime;
    console.log('[SUCCESS] Report generated successfully in', executionTime, 'ms');

    return new Response(
      JSON.stringify({ 
        success: true,
        section: section,
        report: sections
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[FATAL ERROR] Error in generate-vendor-report:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
