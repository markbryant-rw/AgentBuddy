-- Seed data for Knowledge Base module
-- This creates default categories and sample playbooks for demonstration

-- Insert default categories
DO $$
DECLARE
  v_team_id UUID;
  v_listings_category_id UUID;
  v_sales_category_id UUID;
  v_admin_category_id UUID;
  v_playbook_id UUID;
BEGIN
  -- Get the first team (adjust this query if you need to target specific teams)
  SELECT id INTO v_team_id FROM teams LIMIT 1;
  
  IF v_team_id IS NOT NULL THEN
    -- Create Listings category
    INSERT INTO knowledge_base_categories (team_id, name, description, color_theme, icon, sort_order)
    VALUES (
      v_team_id,
      'Listings',
      'Everything you need to know about managing listings from prospecting to settlement',
      'listings',
      '🏡',
      1
    )
    RETURNING id INTO v_listings_category_id;

    -- Create Sales category
    INSERT INTO knowledge_base_categories (team_id, name, description, color_theme, icon, sort_order)
    VALUES (
      v_team_id,
      'Sales & Prospecting',
      'Master your sales process and prospecting techniques',
      'performance',
      '💼',
      2
    )
    RETURNING id INTO v_sales_category_id;

    -- Create Admin/Operations category
    INSERT INTO knowledge_base_categories (team_id, name, description, color_theme, icon, sort_order)
    VALUES (
      v_team_id,
      'Admin & Operations',
      'Systems, processes, and operational procedures',
      'systems',
      '⚙️',
      3
    )
    RETURNING id INTO v_admin_category_id;

    -- Create sample playbooks for Listings category
    INSERT INTO knowledge_base_playbooks (category_id, team_id, title, description, estimated_minutes, is_published, created_by)
    VALUES (
      v_listings_category_id,
      v_team_id,
      'New Listing Onboarding',
      'Complete checklist for onboarding a new listing from contract to marketing',
      45,
      true,
      (SELECT id FROM profiles WHERE primary_team_id = v_team_id LIMIT 1)
    )
    RETURNING id INTO v_playbook_id;

    -- Add cards to New Listing Onboarding
    INSERT INTO knowledge_base_cards (playbook_id, card_number, title, content_type, content_rich, estimated_minutes)
    VALUES (
      v_playbook_id,
      1,
      'Welcome to Listing Onboarding',
      'document',
      '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Getting Started"}]},{"type":"paragraph","content":[{"type":"text","text":"This playbook will guide you through the complete process of onboarding a new listing. Follow each card in order to ensure nothing is missed."}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Contract verification"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Property inspection"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Marketing preparation"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Launch coordination"}]}]}]}]}',
      5
    );

    INSERT INTO knowledge_base_cards (playbook_id, card_number, title, content_type, checklist_items, estimated_minutes)
    VALUES (
      v_playbook_id,
      2,
      'Pre-Listing Checklist',
      'checklist',
      '[
        {"id":"1","text":"Review and sign listing agreement","hint":"Ensure all parties have signed"},
        {"id":"2","text":"Verify property details and ownership","hint":"Check title documents"},
        {"id":"3","text":"Schedule professional photography","hint":"Book 3-5 days in advance"},
        {"id":"4","text":"Arrange property styling consultation","hint":"Coordinate with owner availability"},
        {"id":"5","text":"Complete property condition report","hint":"Document any issues"},
        {"id":"6","text":"Order building and pest inspections","hint":"Required for marketing"},
        {"id":"7","text":"Collect property documents","hint":"Title, strata, council certificates"}
      ]',
      15
    );

    INSERT INTO knowledge_base_cards (playbook_id, card_number, title, content_type, steps, estimated_minutes)
    VALUES (
      v_playbook_id,
      3,
      'Property Photography Setup',
      'step-by-step',
      '[
        {"number":1,"title":"Prepare the property","description":"<p>Work with the owner to ensure the property is presented at its best:</p><ul><li>Declutter all rooms</li><li>Clean windows and surfaces</li><li>Arrange furniture for optimal flow</li><li>Turn on all lights</li><li>Open curtains and blinds</li></ul>","screenshot":null},
        {"number":2,"title":"Schedule the photographer","description":"<p>Book your preferred photographer at least 3-5 business days in advance. Consider:</p><ul><li>Time of day (morning light is usually best)</li><li>Weather forecast</li><li>Property access arrangements</li></ul>","screenshot":null},
        {"number":3,"title":"Brief the photographer","description":"<p>Provide the photographer with:</p><ul><li>Property highlights to capture</li><li>Number of rooms</li><li>Special features (pool, views, outdoor areas)</li><li>Any specific angle requests</li></ul>","screenshot":null},
        {"number":4,"title":"Review and approve images","description":"<p>Once you receive the photos:</p><ul><li>Review for quality and lighting</li><li>Ensure all key areas are covered</li><li>Request re-shoots if necessary</li><li>Select hero images for marketing</li></ul>","screenshot":null}
      ]',
      20
    );

    -- Create another playbook for Sales category
    INSERT INTO knowledge_base_playbooks (category_id, team_id, title, description, estimated_minutes, is_published, created_by)
    VALUES (
      v_sales_category_id,
      v_team_id,
      'Cold Calling Mastery',
      'Scripts, techniques, and best practices for effective cold calling',
      30,
      true,
      (SELECT id FROM profiles WHERE primary_team_id = v_team_id LIMIT 1)
    )
    RETURNING id INTO v_playbook_id;

    INSERT INTO knowledge_base_cards (playbook_id, card_number, title, content_type, content_rich, estimated_minutes)
    VALUES (
      v_playbook_id,
      1,
      'Cold Calling Mindset',
      'document',
      '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"The Right Mindset"}]},{"type":"paragraph","content":[{"type":"text","text":"Cold calling success starts with your mindset. Remember:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Every no gets you closer to a yes"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"You''re offering value, not asking for favors"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Rejection is part of the process"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Consistency beats perfection"}]}]}]},{"type":"heading","attrs":{"level":3},"content":[{"type":"text","text":"Daily Targets"}]},{"type":"paragraph","content":[{"type":"text","text":"Aim for:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"50-100 dials per day"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"10-15 conversations"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"2-3 qualified appointments"}]}]}]}]}',
      10
    );

    -- Create playbook for Admin category
    INSERT INTO knowledge_base_playbooks (category_id, team_id, title, description, estimated_minutes, is_published, created_by)
    VALUES (
      v_admin_category_id,
      v_team_id,
      'CRM Data Management',
      'How to maintain clean and accurate data in your CRM system',
      20,
      true,
      (SELECT id FROM profiles WHERE primary_team_id = v_team_id LIMIT 1)
    )
    RETURNING id INTO v_playbook_id;

    INSERT INTO knowledge_base_cards (playbook_id, card_number, title, content_type, checklist_items, estimated_minutes)
    VALUES (
      v_playbook_id,
      1,
      'Daily CRM Maintenance',
      'checklist',
      '[
        {"id":"1","text":"Log all phone calls and emails","hint":"Add notes immediately after contact"},
        {"id":"2","text":"Update contact stages","hint":"Keep pipeline accurate"},
        {"id":"3","text":"Schedule follow-up tasks","hint":"Never leave a contact without next action"},
        {"id":"4","text":"Clean up duplicate entries","hint":"Merge or delete duplicates"},
        {"id":"5","text":"Update property preferences","hint":"Keep buyer criteria current"},
        {"id":"6","text":"Tag contacts appropriately","hint":"Use consistent tagging system"}
      ]',
      20
    );

  END IF;
END $$;