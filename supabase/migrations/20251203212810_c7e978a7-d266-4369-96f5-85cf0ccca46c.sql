-- =====================================================
-- COMPREHENSIVE RLS POLICIES FOR ALL 32 TABLES
-- =====================================================

-- =====================================================
-- PHASE 1: HIGH PRIORITY - Core Feature Tables
-- =====================================================

-- -----------------------------------------------------
-- 1.1 TRANSACTIONS SYSTEM (3 tables)
-- -----------------------------------------------------

-- transactions - Team-scoped
CREATE POLICY "Team members can view transactions" ON transactions
  FOR SELECT USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can create transactions" ON transactions
  FOR INSERT WITH CHECK (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can update transactions" ON transactions
  FOR UPDATE USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

CREATE POLICY "Team members can delete transactions" ON transactions
  FOR DELETE USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()));

-- transaction_milestones - Transaction-scoped
CREATE POLICY "Team members can manage transaction milestones" ON transaction_milestones
  FOR ALL USING (
    transaction_id IN (
      SELECT id FROM transactions 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- transaction_links - Transaction-scoped
CREATE POLICY "Team members can manage transaction links" ON transaction_links
  FOR ALL USING (
    transaction_id IN (
      SELECT id FROM transactions 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- -----------------------------------------------------
-- 1.2 MESSAGING SYSTEM (3 tables)
-- -----------------------------------------------------

-- conversations - Participant-based access
CREATE POLICY "Participants can view conversations" ON conversations
  FOR SELECT USING (
    id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Authenticated users can create conversations" ON conversations
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Conversation admins can update" ON conversations
  FOR UPDATE USING (
    id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid() AND is_admin = true)
    OR created_by = auth.uid()
  );

CREATE POLICY "Creators can delete conversations" ON conversations
  FOR DELETE USING (created_by = auth.uid());

-- conversation_participants - Conversation access
CREATE POLICY "Participants can view conversation members" ON conversation_participants
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can add participants" ON conversation_participants
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR conversation_id IN (SELECT id FROM conversations WHERE created_by = auth.uid())
  );

CREATE POLICY "Admins can update participants" ON conversation_participants
  FOR UPDATE USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Admins can remove or users can leave" ON conversation_participants
  FOR DELETE USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND is_admin = true
    )
    OR user_id = auth.uid()
  );

-- messages - Conversation-scoped
CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT USING (
    conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Participants can send messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants 
      WHERE user_id = auth.uid() AND can_post = true
    )
  );

CREATE POLICY "Users can edit own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (sender_id = auth.uid());

-- -----------------------------------------------------
-- 1.3 KNOWLEDGE BASE (3 tables) - Agency-scoped
-- -----------------------------------------------------

-- knowledge_base_categories
CREATE POLICY "Users can view knowledge base categories" ON knowledge_base_categories
  FOR SELECT USING (
    agency_id IS NULL 
    OR agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "Office managers can manage kb categories" ON knowledge_base_categories
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_role(auth.uid(), 'office_manager') OR has_role(auth.uid(), 'platform_admin'))
  );

CREATE POLICY "Office managers can update kb categories" ON knowledge_base_categories
  FOR UPDATE USING (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_role(auth.uid(), 'office_manager') OR has_role(auth.uid(), 'platform_admin'))
  );

CREATE POLICY "Office managers can delete kb categories" ON knowledge_base_categories
  FOR DELETE USING (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_role(auth.uid(), 'office_manager') OR has_role(auth.uid(), 'platform_admin'))
  );

-- knowledge_base_cards
CREATE POLICY "Users can view knowledge base cards" ON knowledge_base_cards
  FOR SELECT USING (
    agency_id IS NULL 
    OR agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "Office managers can manage kb cards" ON knowledge_base_cards
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_role(auth.uid(), 'office_manager') OR has_role(auth.uid(), 'platform_admin'))
  );

CREATE POLICY "Office managers can update kb cards" ON knowledge_base_cards
  FOR UPDATE USING (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_role(auth.uid(), 'office_manager') OR has_role(auth.uid(), 'platform_admin'))
  );

CREATE POLICY "Office managers can delete kb cards" ON knowledge_base_cards
  FOR DELETE USING (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_role(auth.uid(), 'office_manager') OR has_role(auth.uid(), 'platform_admin'))
  );

-- knowledge_base_playbooks
CREATE POLICY "Users can view playbooks" ON knowledge_base_playbooks
  FOR SELECT USING (
    agency_id IS NULL 
    OR agency_id = get_user_agency_id(auth.uid())
  );

CREATE POLICY "Office managers can manage playbooks" ON knowledge_base_playbooks
  FOR INSERT WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_role(auth.uid(), 'office_manager') OR has_role(auth.uid(), 'platform_admin'))
  );

CREATE POLICY "Office managers can update playbooks" ON knowledge_base_playbooks
  FOR UPDATE USING (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_role(auth.uid(), 'office_manager') OR has_role(auth.uid(), 'platform_admin'))
  );

CREATE POLICY "Office managers can delete playbooks" ON knowledge_base_playbooks
  FOR DELETE USING (
    agency_id = get_user_agency_id(auth.uid())
    AND (has_role(auth.uid(), 'office_manager') OR has_role(auth.uid(), 'platform_admin'))
  );

-- -----------------------------------------------------
-- 1.4 GOALS & REVIEWS (2 tables) - Team-scoped
-- -----------------------------------------------------

-- goals
CREATE POLICY "Users can view goals" ON goals
  FOR SELECT USING (
    user_id = auth.uid()
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create goals" ON goals
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update goals" ON goals
  FOR UPDATE USING (
    user_id = auth.uid()
    OR (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()) AND set_by_admin = false)
    OR is_team_admin(auth.uid(), team_id)
  );

CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (user_id = auth.uid() OR created_by = auth.uid());

-- quarterly_reviews
CREATE POLICY "Team members can view quarterly reviews" ON quarterly_reviews
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Team members can create quarterly reviews" ON quarterly_reviews
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own reviews" ON quarterly_reviews
  FOR UPDATE USING (
    user_id = auth.uid() 
    OR reviewed_by = auth.uid()
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can delete own reviews" ON quarterly_reviews
  FOR DELETE USING (user_id = auth.uid() OR created_by = auth.uid());

-- -----------------------------------------------------
-- 1.5 SERVICE PROVIDERS (3 tables) - Agency-scoped
-- -----------------------------------------------------

-- service_providers
CREATE POLICY "Users can view service providers" ON service_providers
  FOR SELECT USING (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "Users can create service providers" ON service_providers
  FOR INSERT WITH CHECK (agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "Users can update service providers" ON service_providers
  FOR UPDATE USING (
    created_by = auth.uid()
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_role(auth.uid(), 'office_manager'))
  );

CREATE POLICY "Users can delete service providers" ON service_providers
  FOR DELETE USING (
    created_by = auth.uid()
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_role(auth.uid(), 'office_manager'))
  );

-- service_provider_notes
CREATE POLICY "Users can manage provider notes in their agency" ON service_provider_notes
  FOR ALL USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE agency_id = get_user_agency_id(auth.uid())
    )
  );

-- service_provider_reviews
CREATE POLICY "Agency members can view provider reviews" ON service_provider_reviews
  FOR SELECT USING (
    provider_id IN (
      SELECT id FROM service_providers WHERE agency_id = get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "Users can add provider reviews" ON service_provider_reviews
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND provider_id IN (
      SELECT id FROM service_providers WHERE agency_id = get_user_agency_id(auth.uid())
    )
  );

CREATE POLICY "Users can update own provider reviews" ON service_provider_reviews
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own provider reviews" ON service_provider_reviews
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- PHASE 2: BUG REPORTS & FEATURE REQUESTS (6 tables)
-- =====================================================

-- bug_report_categories - Platform-wide
CREATE POLICY "Anyone can view bug categories" ON bug_report_categories
  FOR SELECT USING (true);

CREATE POLICY "Platform admins can insert bug categories" ON bug_report_categories
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can update bug categories" ON bug_report_categories
  FOR UPDATE USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can delete bug categories" ON bug_report_categories
  FOR DELETE USING (has_role(auth.uid(), 'platform_admin'));

-- bug_report_comments
CREATE POLICY "Anyone can view bug report comments" ON bug_report_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can add bug report comments" ON bug_report_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bug comments" ON bug_report_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own bug comments" ON bug_report_comments
  FOR DELETE USING (user_id = auth.uid());

-- bug_report_votes
CREATE POLICY "Anyone can view bug votes" ON bug_report_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can vote on bugs" ON bug_report_votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own bug vote" ON bug_report_votes
  FOR DELETE USING (user_id = auth.uid());

-- feature_request_comments
CREATE POLICY "Anyone can view feature comments" ON feature_request_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can add feature comments" ON feature_request_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own feature comments" ON feature_request_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own feature comments" ON feature_request_comments
  FOR DELETE USING (user_id = auth.uid());

-- feature_request_votes
CREATE POLICY "Anyone can view feature votes" ON feature_request_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can vote on features" ON feature_request_votes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own feature vote" ON feature_request_votes
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- PHASE 3: AI & COACHING (2 tables)
-- =====================================================

-- coaching_conversations
CREATE POLICY "Users can manage own coaching conversations" ON coaching_conversations
  FOR ALL USING (user_id = auth.uid());

-- coaching_conversation_messages
CREATE POLICY "Users can manage messages in own coaching conversations" ON coaching_conversation_messages
  FOR ALL USING (
    conversation_id IN (
      SELECT id FROM coaching_conversations WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- PHASE 4: USER CONTENT (4 tables)
-- =====================================================

-- notes
CREATE POLICY "Users can view own or shared notes" ON notes
  FOR SELECT USING (
    user_id = auth.uid()
    OR owner_id = auth.uid()
    OR id IN (SELECT note_id FROM note_shares WHERE user_id = auth.uid())
    OR (is_private = false)
  );

CREATE POLICY "Users can create notes" ON notes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notes" ON notes
  FOR UPDATE USING (
    user_id = auth.uid()
    OR id IN (SELECT note_id FROM note_shares WHERE user_id = auth.uid() AND can_edit = true)
  );

CREATE POLICY "Users can delete own notes" ON notes
  FOR DELETE USING (user_id = auth.uid());

-- kb_card_views
CREATE POLICY "Users manage own card views" ON kb_card_views
  FOR ALL USING (user_id = auth.uid());

-- friend_connections
CREATE POLICY "Users can view own connections" ON friend_connections
  FOR SELECT USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create connection requests" ON friend_connections
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update connection status" ON friend_connections
  FOR UPDATE USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can delete connections" ON friend_connections
  FOR DELETE USING (user_id = auth.uid() OR friend_id = auth.uid());

-- listing_comments
CREATE POLICY "Team members can view listing comments" ON listing_comments
  FOR SELECT USING (
    listing_id IN (
      SELECT id FROM listings_pipeline 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Team members can add listing comments" ON listing_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND listing_id IN (
      SELECT id FROM listings_pipeline 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own listing comments" ON listing_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own listing comments" ON listing_comments
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- PHASE 5: VENDOR REPORTS (1 table)
-- =====================================================

-- vendor_reports
CREATE POLICY "Team members can view vendor reports" ON vendor_reports
  FOR SELECT USING (
    listing_id IN (
      SELECT id FROM listings_pipeline 
      WHERE team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
    OR generated_by = auth.uid()
  );

CREATE POLICY "Users can create vendor reports" ON vendor_reports
  FOR INSERT WITH CHECK (generated_by = auth.uid());

CREATE POLICY "Users can delete own vendor reports" ON vendor_reports
  FOR DELETE USING (generated_by = auth.uid());

-- =====================================================
-- PHASE 6: PLATFORM/SYSTEM TABLES (3 tables)
-- =====================================================

-- modules
CREATE POLICY "Authenticated users can view modules" ON modules
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Platform admins can insert modules" ON modules
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can update modules" ON modules
  FOR UPDATE USING (has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Platform admins can delete modules" ON modules
  FOR DELETE USING (has_role(auth.uid(), 'platform_admin'));

-- module_policies
CREATE POLICY "Users can view module policies" ON module_policies
  FOR SELECT USING (
    agency_id IS NULL 
    OR agency_id = get_user_agency_id(auth.uid())
    OR has_role(auth.uid(), 'platform_admin')
  );

CREATE POLICY "Admins can manage module policies" ON module_policies
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'platform_admin')
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_role(auth.uid(), 'office_manager'))
  );

CREATE POLICY "Admins can update module policies" ON module_policies
  FOR UPDATE USING (
    has_role(auth.uid(), 'platform_admin')
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_role(auth.uid(), 'office_manager'))
  );

CREATE POLICY "Admins can delete module policies" ON module_policies
  FOR DELETE USING (
    has_role(auth.uid(), 'platform_admin')
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_role(auth.uid(), 'office_manager'))
  );

-- module_audit_events
CREATE POLICY "Users can view own module audit events" ON module_audit_events
  FOR SELECT USING (
    user_id = auth.uid() 
    OR has_role(auth.uid(), 'platform_admin')
  );

CREATE POLICY "System can create audit events" ON module_audit_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- PHASE 7: SOCIAL FEATURES (3 tables - Deferred Feature)
-- =====================================================

-- social_posts
CREATE POLICY "Users can view social posts" ON social_posts
  FOR SELECT USING (
    user_id = auth.uid()
    OR visibility = 'public'
    OR (visibility = 'agency' AND user_id IN (
      SELECT id FROM profiles WHERE office_id = get_user_agency_id(auth.uid())
    ))
  );

CREATE POLICY "Users can create social posts" ON social_posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own social posts" ON social_posts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own social posts" ON social_posts
  FOR DELETE USING (user_id = auth.uid());

-- social_post_comments
CREATE POLICY "Users can view post comments" ON social_post_comments
  FOR SELECT USING (
    post_id IN (
      SELECT id FROM social_posts 
      WHERE user_id = auth.uid() 
        OR visibility = 'public'
        OR (visibility = 'agency' AND user_id IN (
          SELECT id FROM profiles WHERE office_id = get_user_agency_id(auth.uid())
        ))
    )
  );

CREATE POLICY "Users can add post comments" ON social_post_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own post comments" ON social_post_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own post comments" ON social_post_comments
  FOR DELETE USING (user_id = auth.uid());

-- social_post_reactions
CREATE POLICY "Users can view post reactions" ON social_post_reactions
  FOR SELECT USING (true);

CREATE POLICY "Users can add reactions" ON social_post_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove own reactions" ON social_post_reactions
  FOR DELETE USING (user_id = auth.uid());