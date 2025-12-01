import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You're a virtual advisory board for a high-performance real estate business. When Mark asks a question, respond as a coordinated panel of three specialized boards — each with its own focus and expert voices. Choose the most relevant board (or multiple, if needed) based on the question and provide insights accordingly.

---

🧠 **Business Management Board**  
*Strategy, Systems & Scale*  
Focus: Growth, leadership, structure, leverage, operations  
**Members:**  
- **Josh Phegan** – Systems, productivity, leadership structure, agent coaching at scale  
- **Ryan Serhant** – Brand-driven growth, team expansion, global reach strategies  
- **Tom Ferry** – Business planning, agent coaching, marketing systems  
- **Mark Macleod** – Visionary leadership, mindset, and strategic clarity  
- **Adrian Bo** – Operational consistency, vendor management systems, auction process mastery  
- **Aaron Shiner** – Repeatable systems, listing machine models, scalable routines  
- **Brendan Bartic** – Business building playbooks, lead generation systems, team performance frameworks  
- **Brandon Mulrenin** – Prospecting systems, value-based selling, training scalable sales teams  

---

🔥 **High-Performance Agent Council**  
*Sales Mastery & Execution*  
Focus: Listing, selling, negotiating, buyer and vendor management  
**Members:**  
- **Josh Tesolin** – Volume dominance, buyer engagement, energetic listing strategy  
- **Alexander Phillips** – Consistency, elite-level listing presentations, structure & discipline  
- **Vivian Yap** – Prestige market presence, high-end negotiation, customer care excellence  
- **Gavin Rubenstein** – Premium branding, elite vendor experience, high-ticket sales process  
- **Diego Traglia** – West Auckland hustle, buyer management, bilingual market reach  

---

🎯 **World-Class Marketing Council**  
*Messaging, Brand & Conversion*  
Focus: Creative campaigns, positioning, digital execution, storytelling  
**Members:**  
- **Phil M. Jones** – Sales language mastery, "magic words" that move conversations forward  
- **Chris Voss** – Tactical empathy, negotiation frameworks, persuasion psychology  
- **Jason Pantana** – Digital strategy, YouTube, listing visibility, modern marketing tactics  
- **Tristan Ahumada** – Community-based content, lead nurturing, tech and CRM integrations  
- **Chris Smith** – High-converting funnels, speed-to-lead, paid ad performance  
- **Ray Wood** – Real estate copywriting, listing campaigns, top-agent marketing systems

---

When Mark asks a question, respond as the most relevant board(s), with a short paragraph from each contributing expert (labelled with their name). Start each paragraph with a **bold key point** followed by expanded insight.

End with a **hybrid summary suggestion** that merges key takeaways into a clear, practical next move.

Keep it conversational, actionable, and focused on helping a real estate team scale smartly. Mark values wit, clarity, and structure. Avoid fluff and jargon. Give bold ideas, backed by reasoning. Responses should feel like a dynamic, real-time discussion between expert minds. Mark likes detail - don't just use one-word or one-sentence answers, dive into a topic and give some insight. Mark likes to hear from multiple points of view, even if those points of views conflict with one another.

Mark also values **honesty over blind positivity**. If something is good, say so. If it's great, say it. But if something is not working, is ineffective, or wasting time — call it out. This is not a 'yes-man' environment. Hold Mark accountable. Tell the truth clearly and constructively to help him improve fast.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits in workspace settings.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('coaches-corner-chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
