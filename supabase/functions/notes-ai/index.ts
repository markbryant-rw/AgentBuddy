import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';

// AI action limits per plan
const AI_LIMITS: Record<string, number> = {
  free: 3,
  individual: 50,
  team: 200,
  agency: 999999, // Unlimited
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Extract plain text from content_rich JSON
  const extractPlainText = (contentRich: any): string => {
    if (!contentRich || !contentRich.content) return '';
    
    const traverse = (node: any): string => {
      if (node.type === 'text') return node.text || '';
      if (node.content) {
        return node.content.map(traverse).join(' ');
      }
      return '';
    };
    
    return traverse(contentRich).trim();
  };

  try {
    const { noteId, action, selectedText, currentContent, chatHistory } = await req.json();
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check user's subscription plan
    const { data: discountData } = await supabase
      .from('user_discount_codes')
      .select('code')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: accessData } = await supabase
      .from('user_effective_access_new')
      .select('policy_source')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    let userPlan = 'free';
    if (discountData?.code) {
      userPlan = 'team';
    } else if (accessData?.policy_source === 'agency') {
      userPlan = 'agency';
    } else {
      // Check if they have individual plan (mock for now)
      userPlan = 'individual';
    }

    // Check daily usage
    const today = new Date().toISOString().split('T')[0];
    const { data: usageData, error: usageError } = await supabase
      .from('ai_usage_tracking')
      .select('action_count')
      .eq('user_id', user.id)
      .eq('action_date', today)
      .maybeSingle();

    const currentUsage = usageData?.action_count || 0;
    const dailyLimit = AI_LIMITS[userPlan] || AI_LIMITS.free;

    if (currentUsage >= dailyLimit) {
      return new Response(
        JSON.stringify({ 
          error: 'Daily AI limit reached',
          usage: currentUsage,
          limit: dailyLimit,
          plan: userPlan
        }), 
        { 
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check premium features
    const premiumActions = ['expand-and-polish', 'detailed-summary', 'executive-summary', 'continue-writing', 'improve-text', 'expand-text', 'make-professional', 'simplify-text', 'analyze-and-suggest'];
    if (premiumActions.includes(action) && userPlan === 'free') {
      return new Response(
        JSON.stringify({ 
          error: 'Premium feature',
          message: 'Upgrade to unlock this AI feature',
          plan: userPlan
        }), 
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Actions that work on selected text don't need to fetch the note
    const textActions = ['continue-writing', 'improve-text', 'expand-text', 'make-professional', 'simplify-text', 'fix-grammar'];
    let note = null;
    let plainText = '';

    if (textActions.includes(action) && selectedText) {
      // Use the selected text directly
      plainText = selectedText;
    } else {
      // Fetch the note for summary actions
      if (!noteId) {
        throw new Error('Note ID is required for this action');
      }

      const { data: noteData, error: noteError } = await supabase
        .from('notes')
        .select('title, content_rich, content_plain')
        .eq('id', noteId)
        .single();

      if (noteError || !noteData) {
        throw new Error('Note not found');
      }

      note = noteData;
      plainText = note.content_plain || extractPlainText(note.content_rich) || note.title;
    }

    console.log('Generating AI content, action:', action, 'text length:', plainText.length);

    // Build prompt based on action
    let systemPrompt = '';
    let userPrompt = '';
    
    if (action === 'expand-and-polish') {
      systemPrompt = `You are an expert business writing assistant. Take rough notes, bullet points, and outlines and transform them into comprehensive, well-structured, professional documents. 

Maintain the original meaning and all key points, but add:
- Proper sections with clear headers
- Full paragraphs with context and explanation
- Professional formatting using markdown
- Logical flow and structure
- Descriptive elaboration where needed

Keep it practical and businesslike - not overly verbose. Use markdown formatting for headers, lists, and emphasis.`;
      
      userPrompt = `Transform this rough note into a polished, comprehensive working document:

${note ? `Title: ${note.title}\n\n` : ''}Content:
${plainText}

Create a well-structured document with:
- Clear sections and headers (use # and ##)
- Expanded explanations for each point
- Professional formatting
- Practical, useful context
- Maintain all original information

Return ONLY the transformed content in markdown format. Do not add any meta-commentary.`;
    } else if (action === 'consolidate-notes') {
      // For multi-note summarization
      systemPrompt = 'You are a professional synthesis assistant. Consolidate multiple notes into a coherent summary, identifying themes, key points, and action items across all notes.';
      userPrompt = `Consolidate these notes into a unified summary:

${plainText}

Format as:
# Consolidated Summary

## Overview
[Brief overview paragraph]

## Key Themes
- Theme 1
- Theme 2

## Important Points
- Point 1
- Point 2

## Action Items
- Action 1
- Action 2

Return as markdown.`;
    } else if (action === 'quick-summary') {
      systemPrompt = 'You are a concise summarization assistant. Generate brief, clear summaries.';
      userPrompt = `Summarize this note in 2-3 sentences: "${plainText}"`;
    } else if (action === 'detailed-summary') {
      systemPrompt = 'You are a professional summarization assistant. Generate detailed bullet-point summaries.';
      userPrompt = `Create a detailed bullet-point summary of this note${note ? ` titled "${note.title}"` : ''}: "${plainText}"

Format as:
## Key Points
- Main point 1
- Main point 2
- Main point 3

## Important Details
- Detail 1
- Detail 2`;
    } else if (action === 'executive-summary') {
      systemPrompt = 'You are an executive summary specialist. Generate professional executive summaries.';
      userPrompt = `Create an executive summary for this note${note ? ` titled "${note.title}"` : ''}: "${plainText}"

Format as:
## Executive Summary

### Overview
[Brief overview paragraph]

### Key Findings
- Finding 1
- Finding 2

### Action Items
- Action 1
- Action 2

### Next Steps
[Next steps paragraph]`;
    } else if (action === 'meeting-summary') {
      systemPrompt = 'You are a professional meeting notes assistant. Generate structured, professional meeting summaries.';
      userPrompt = `Based on this note${note ? ` titled "${note.title}"` : ''} with content: "${plainText}", generate a comprehensive meeting summary with these sections:

# Meeting Summary

## Attendees
[List key attendees or participants mentioned]

## Agenda
[Main topics and agenda items]

## Discussion Points
[Key points discussed during the meeting]

## Action Items
[Specific action items and next steps with owners if mentioned]

## Next Steps
[Follow-up actions and future meetings]

Format as markdown.`;
    } else if (action === 'property-notes') {
      systemPrompt = 'You are a professional real estate inspector. Generate detailed property inspection notes.';
      userPrompt = `Based on this note${note ? ` titled "${note.title}"` : ''} with content: "${plainText}", generate professional property inspection notes with these sections:

# Property Inspection Report

## Property Details
[Address, type, size, etc. if mentioned]

## Exterior Condition
[Roof, siding, foundation, landscaping]

## Interior Condition
[Rooms, flooring, walls, ceilings, fixtures]

## Utilities & Systems
[Plumbing, electrical, HVAC, appliances]

## Issues & Concerns
[Any problems or areas of concern identified]

## Recommendations
[Suggested repairs, improvements, or further inspections]

Format as markdown.`;
    } else if (action === 'continue-writing') {
      systemPrompt = 'You are a writing assistant. Continue the text naturally and professionally, adding the next logical paragraph or section.';
      userPrompt = `Continue this text naturally: "${selectedText}"`;
    } else if (action === 'improve-text') {
      systemPrompt = 'You are a writing improvement assistant. Enhance clarity, grammar, tone and professionalism while keeping the same length.';
      userPrompt = `Improve this text for better clarity and professionalism: "${selectedText}"`;
    } else if (action === 'expand-text') {
      systemPrompt = 'You are a writing expansion assistant. Add more detail, context, and explanation to make the text more comprehensive.';
      userPrompt = `Expand this text with more detail and context: "${selectedText}"`;
    } else if (action === 'simplify-text') {
      systemPrompt = 'You are a simplification assistant. Make text more concise and easier to understand while keeping key points.';
      userPrompt = `Simplify this text to be more concise: "${selectedText}"`;
    } else if (action === 'make-professional') {
      systemPrompt = 'You are a professional tone assistant. Rewrite text in a formal, business-appropriate tone.';
      userPrompt = `Rewrite this text in a professional, formal business tone: "${selectedText}"`;
    } else if (action === 'fix-grammar') {
      systemPrompt = 'You are a grammar correction assistant. Fix grammar, spelling, and punctuation errors while maintaining the original meaning.';
      userPrompt = `Fix all grammar, spelling, and punctuation errors: "${selectedText}"`;
    } else if (action === 'analyze-and-suggest') {
      // Extract text from TipTap JSON, including [bracketed instructions]
      const extractFullText = (content: any): { text: string; instructions: string[] } => {
        const instructions: string[] = [];
        let text = '';
        
        if (!content?.content) return { text: '', instructions: [] };
        
        const processNode = (node: any): string => {
          if (node.type === 'text') {
            const nodeText = node.text || '';
            // Extract [bracketed instructions]
            const bracketMatches = nodeText.match(/\[([^\]]+)\]/g);
            if (bracketMatches) {
              instructions.push(...bracketMatches.map((m: string) => m.slice(1, -1)));
            }
            return nodeText;
          }
          if (node.content) {
            return node.content.map(processNode).join('');
          }
          return '';
        };
        
        text = content.content.map(processNode).join('\n');
        return { text, instructions };
      };
      
      const { text: noteText, instructions } = extractFullText(currentContent);
      
      // Parse bracket commands for specific transformations
      const commandMap: { [key: string]: string } = {
        'expand': 'expand with more detail and elaborate on key points',
        'simplify': 'simplify and make more concise while keeping key information',
        'shorten': 'make shorter and more concise',
        'professional': 'rewrite in a professional, formal business tone',
        'professional tone': 'rewrite in a professional, formal business tone',
        'formal': 'rewrite in a formal, professional style',
        'polish': 'polish and improve clarity, grammar, and flow',
        'improve': 'improve clarity, grammar, and overall quality',
        'elaborate': 'add more detail and elaborate on the content',
        'concise': 'make more concise and to-the-point',
      };
      
      const detectedTransformations: string[] = [];
      instructions.forEach(instruction => {
        const normalized = instruction.toLowerCase().trim();
        if (commandMap[normalized]) {
          detectedTransformations.push(commandMap[normalized]);
        }
      });
      
      systemPrompt = `You are an expert writing assistant specializing in real estate sales notes. Your task is to analyze the user's notes and provide a polished, professional version.

Key guidelines:
- Improve clarity, structure, and professionalism
- Fix grammar and spelling
- Add proper formatting with headings, bullet points, and emphasis
- Keep the core meaning and key information intact
- Remove any [bracketed instructions] from your output - they are for your reference only
${detectedTransformations.length > 0 ? `\n- IMPORTANT: Apply these specific transformations: ${detectedTransformations.join('; ')}` : ''}
${instructions.length > 0 ? `\n- Additional user instructions found: ${instructions.filter(i => !commandMap[i.toLowerCase().trim()]).join(', ')}` : ''}

Return your response in clean markdown format with proper formatting.`;

      if (chatHistory && chatHistory.length > 0) {
        // Use chat history for refinement
        const lastUserMessage = chatHistory[chatHistory.length - 1];
        userPrompt = `Original note:\n${noteText}\n\nUser refinement request: ${lastUserMessage.content}`;
      } else {
        userPrompt = noteText;
      }
    } else {
      throw new Error('Invalid action type');
    }

    // Call Lovable AI
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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedMarkdown = data.choices[0].message.content;

    console.log('Generated content:', generatedMarkdown.substring(0, 200));

    // Update usage tracking
    if (usageData) {
      await supabase
        .from('ai_usage_tracking')
        .update({ 
          action_count: currentUsage + 1,
          last_action_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('action_date', today);
    } else {
      await supabase
        .from('ai_usage_tracking')
        .insert({ 
          user_id: user.id,
          action_date: today,
          action_count: 1
        });
    }

    // Convert markdown to TipTap JSON format with proper formatting
    const lines = generatedMarkdown.split('\n');
    const content: any = { type: 'doc', content: [] };
    
    const parseInlineFormatting = (text: string) => {
      const parts: any[] = [];
      let currentText = '';
      let i = 0;
      
      while (i < text.length) {
        // Check for bold (**text** or __text__)
        if ((text[i] === '*' && text[i + 1] === '*') || (text[i] === '_' && text[i + 1] === '_')) {
          if (currentText) {
            parts.push({ type: 'text', text: currentText });
            currentText = '';
          }
          const delimiter = text[i];
          i += 2;
          let boldText = '';
          while (i < text.length - 1 && !(text[i] === delimiter && text[i + 1] === delimiter)) {
            boldText += text[i];
            i++;
          }
          if (boldText) {
            parts.push({ type: 'text', text: boldText, marks: [{ type: 'bold' }] });
          }
          i += 2;
        }
        // Check for italic (*text* or _text_)
        else if (text[i] === '*' || text[i] === '_') {
          if (currentText) {
            parts.push({ type: 'text', text: currentText });
            currentText = '';
          }
          const delimiter = text[i];
          i += 1;
          let italicText = '';
          while (i < text.length && text[i] !== delimiter) {
            italicText += text[i];
            i++;
          }
          if (italicText) {
            parts.push({ type: 'text', text: italicText, marks: [{ type: 'italic' }] });
          }
          i += 1;
        } else {
          currentText += text[i];
          i++;
        }
      }
      
      if (currentText) {
        parts.push({ type: 'text', text: currentText });
      }
      
      return parts.length > 0 ? parts : [{ type: 'text', text: text }];
    };
    
    let i = 0;
    let currentList: any = null;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Skip empty lines but add spacing
      if (!trimmed) {
        if (currentList) {
          content.content.push(currentList);
          currentList = null;
        }
        i++;
        continue;
      }
      
      // Heading level 1
      if (trimmed.startsWith('# ')) {
        if (currentList) {
          content.content.push(currentList);
          currentList = null;
        }
        const text = trimmed.substring(2);
        content.content.push({
          type: 'heading',
          attrs: { level: 1 },
          content: parseInlineFormatting(text)
        });
      }
      // Heading level 2
      else if (trimmed.startsWith('## ')) {
        if (currentList) {
          content.content.push(currentList);
          currentList = null;
        }
        const text = trimmed.substring(3);
        content.content.push({
          type: 'heading',
          attrs: { level: 2 },
          content: parseInlineFormatting(text)
        });
      }
      // Heading level 3
      else if (trimmed.startsWith('### ')) {
        if (currentList) {
          content.content.push(currentList);
          currentList = null;
        }
        const text = trimmed.substring(4);
        content.content.push({
          type: 'heading',
          attrs: { level: 3 },
          content: parseInlineFormatting(text)
        });
      }
      // Bullet list item
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.substring(2);
        const listItem = {
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: parseInlineFormatting(text)
          }]
        };
        
        if (!currentList) {
          currentList = {
            type: 'bulletList',
            content: [listItem]
          };
        } else {
          currentList.content.push(listItem);
        }
      }
      // Regular paragraph
      else {
        if (currentList) {
          content.content.push(currentList);
          currentList = null;
        }
        content.content.push({
          type: 'paragraph',
          content: parseInlineFormatting(trimmed)
        });
      }
      
      i++;
    }
    
    // Add any remaining list
    if (currentList) {
      content.content.push(currentList);
    }
    
    // Ensure there's at least one paragraph
    if (content.content.length === 0) {
      content.content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: generatedMarkdown }]
      });
    }

    return new Response(JSON.stringify({ 
      content,
      usage: currentUsage + 1,
      limit: dailyLimit,
      plan: userPlan
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in notes-ai function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
