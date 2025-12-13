-- Add Withdrawn Sale Follow-up Communication Templates
INSERT INTO public.communication_templates (
  name,
  type,
  trigger_event,
  subject_template,
  body_template,
  is_system_template,
  is_default,
  scope,
  variables
) VALUES 
(
  'Withdrawn Sale - 2 Week Check-in',
  'email',
  'aftercare_withdrawn_14',
  'Just checking in, {{vendor_first_name}}',
  'Hi {{vendor_first_name}},

I hope you''re doing well! I wanted to reach out and see how things are going since we last spoke.

I understand that the timing wasn''t right for selling {{address}}, and that''s completely okay. Sometimes the market or personal circumstances just don''t align.

I''m here whenever you''re ready to have a conversation about your options. No pressure at all - just know that I''m available if you have any questions about the market or would like to discuss anything.

Take care,
{{agent_name}}
{{agent_phone}}',
  true,
  true,
  'platform',
  '["vendor_first_name", "address", "agent_name", "agent_phone"]'::jsonb
),
(
  'Withdrawn Sale - 30 Day Market Update',
  'email',
  'aftercare_withdrawn_30',
  'Market Update for {{suburb}}, {{vendor_first_name}}',
  'Hi {{vendor_first_name}},

I wanted to share a quick market update with you regarding {{suburb}} and properties similar to {{address}}.

**Recent Activity:**
• Properties listed: [X] this month
• Recent sales in your area: [X]
• Average days on market: [X] days

The market is showing [positive/stable/changing] signs, and I thought you might find this interesting.

If circumstances have changed or you''d like to discuss the current market conditions, I''m always happy to have a no-obligation chat.

Warm regards,
{{agent_name}}
{{agent_phone}}',
  true,
  false,
  'platform',
  '["vendor_first_name", "address", "suburb", "agent_name", "agent_phone"]'::jsonb
),
(
  'Withdrawn Sale - 60 Day Follow-up',
  'email',
  'aftercare_withdrawn_60',
  'Thinking of you, {{vendor_first_name}}',
  'Hi {{vendor_first_name}},

It''s been about two months since we last spoke about {{address}}, and I just wanted to touch base.

Sometimes circumstances change, and I wanted to let you know that I''m still here if you''d like to explore your options. Whether you''re considering selling, refinancing, or just curious about what''s happening in the market, I''m happy to help.

No pressure at all - just a friendly check-in.

Best wishes,
{{agent_name}}
{{agent_phone}}',
  true,
  false,
  'platform',
  '["vendor_first_name", "address", "agent_name", "agent_phone"]'::jsonb
),
(
  'Withdrawn Sale - 6 Month Review',
  'email',
  'aftercare_withdrawn_180',
  '6 Month Market Review - {{address}}',
  'Hi {{vendor_first_name}},

It''s been six months since we last discussed {{address}}, and I wanted to reach out with some updates.

A lot can change in the property market over six months. I''d love the opportunity to share:
• How property values have moved in {{suburb}}
• Recent comparable sales
• Current buyer demand in your area

If you''re curious about what your property might be worth today, or if your circumstances have changed, I''d be happy to provide a no-obligation market update.

Looking forward to hearing from you,
{{agent_name}}
{{agent_phone}}',
  true,
  false,
  'platform',
  '["vendor_first_name", "address", "suburb", "agent_name", "agent_phone"]'::jsonb
),
(
  'Withdrawn Sale - Check-in SMS',
  'sms',
  'aftercare_withdrawn_sms',
  NULL,
  'Hi {{vendor_first_name}}, it''s {{agent_name}}. Just checking in to see how things are going. Let me know if you''d like to chat about {{address}} - no pressure, just here to help! 🏠',
  true,
  true,
  'platform',
  '["vendor_first_name", "address", "agent_name"]'::jsonb
),
(
  'Withdrawn Sale - Anniversary',
  'email',
  'aftercare_withdrawn_365',
  'One Year Check-in - {{address}}',
  'Hi {{vendor_first_name}},

I can''t believe it''s been a year since we discussed selling {{address}}!

A lot has happened in the property market over the past 12 months, and I wanted to reach out to see if your circumstances have changed.

Whether you''re still in the property, thinking about selling, or just curious about the current market, I''d love to catch up and share what''s been happening in {{suburb}}.

Would you be open to a quick call or coffee catch-up? I''d love to hear how you''re doing.

Warmly,
{{agent_name}}
{{agent_phone}}',
  true,
  false,
  'platform',
  '["vendor_first_name", "address", "suburb", "agent_name", "agent_phone"]'::jsonb
);