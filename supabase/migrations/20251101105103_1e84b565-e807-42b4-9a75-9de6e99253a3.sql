-- Emergency Recovery: Explicit Policy Cleanup and Rebuild
-- Step 1: Drop ALL existing policies by their exact names

-- Profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can search profiles for team invitations" ON profiles;
DROP POLICY IF EXISTS "Users can view friend profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view office colleague profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

-- User_roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_manage" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "user_roles_insert" ON user_roles;
DROP POLICY IF EXISTS "user_roles_update" ON user_roles;
DROP POLICY IF EXISTS "user_roles_delete" ON user_roles;

-- Team_members policies
DROP POLICY IF EXISTS "Users can view own team memberships" ON team_members;
DROP POLICY IF EXISTS "Users can view teammates" ON team_members;
DROP POLICY IF EXISTS "Users can view their own team membership" ON team_members;
DROP POLICY IF EXISTS "team_members_select" ON team_members;
DROP POLICY IF EXISTS "Users can leave teams" ON team_members;
DROP POLICY IF EXISTS "team_members_delete" ON team_members;
DROP POLICY IF EXISTS "team_members_insert" ON team_members;
DROP POLICY IF EXISTS "team_members_update" ON team_members;
DROP POLICY IF EXISTS "Admins can manage team members" ON team_members;
DROP POLICY IF EXISTS "Team admins can manage members" ON team_members;

-- User_subscriptions policies
DROP POLICY IF EXISTS "user_subscriptions_select" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_insert" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_update" ON user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_delete" ON user_subscriptions;

-- Friend_connections policies
DROP POLICY IF EXISTS "friend_connections_select" ON friend_connections;
DROP POLICY IF EXISTS "friend_connections_insert" ON friend_connections;
DROP POLICY IF EXISTS "friend_connections_update" ON friend_connections;
DROP POLICY IF EXISTS "friend_connections_delete" ON friend_connections;

-- Conversations policies
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;

-- Conversation_participants policies
DROP POLICY IF EXISTS "conversation_participants_select" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_delete" ON conversation_participants;

-- Messages policies
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

-- Tasks policies
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;

-- Transactions policies
DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_update" ON transactions;
DROP POLICY IF EXISTS "transactions_delete" ON transactions;

-- Step 2: Create minimal single policies per operation

-- PROFILES: All authenticated users can view all profiles (needed for team/friend lookups)
CREATE POLICY "profiles_select" ON profiles 
FOR SELECT TO authenticated 
USING (true);

-- PROFILES: Users can update their own profile
CREATE POLICY "profiles_update" ON profiles 
FOR UPDATE TO authenticated 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- PROFILES: Users can insert their own profile
CREATE POLICY "profiles_insert" ON profiles 
FOR INSERT TO authenticated 
WITH CHECK (id = auth.uid());

-- USER_ROLES: Users can view their own roles OR if they're platform admin
CREATE POLICY "user_roles_select" ON user_roles 
FOR SELECT TO authenticated 
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
);

-- USER_ROLES: Only platform admins can insert roles
CREATE POLICY "user_roles_insert" ON user_roles 
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
);

-- USER_ROLES: Only platform admins can update roles
CREATE POLICY "user_roles_update" ON user_roles 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
);

-- USER_ROLES: Only platform admins can delete roles
CREATE POLICY "user_roles_delete" ON user_roles 
FOR DELETE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'platform_admin'
  )
);

-- TEAM_MEMBERS: Users can view their own membership, teammates, or if admin
CREATE POLICY "team_members_select" ON team_members 
FOR SELECT TO authenticated 
USING (
  user_id = auth.uid()
  OR team_id IN (
    SELECT team_id FROM team_members 
    WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('platform_admin', 'admin')
  )
);

-- TEAM_MEMBERS: Users can join teams, or team admins/platform admins can add
CREATE POLICY "team_members_insert" ON team_members 
FOR INSERT TO authenticated 
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.access_level = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('platform_admin', 'admin')
  )
);

-- TEAM_MEMBERS: Team admins or platform admins can update
CREATE POLICY "team_members_update" ON team_members 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.access_level = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('platform_admin', 'admin')
  )
);

-- TEAM_MEMBERS: Users can leave their own teams, or admins can remove
CREATE POLICY "team_members_delete" ON team_members 
FOR DELETE TO authenticated 
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM team_members tm 
    WHERE tm.team_id = team_members.team_id 
    AND tm.user_id = auth.uid() 
    AND tm.access_level = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('platform_admin', 'admin')
  )
);

-- USER_SUBSCRIPTIONS: Users can view their own subscription
CREATE POLICY "user_subscriptions_select" ON user_subscriptions 
FOR SELECT TO authenticated 
USING (user_id = auth.uid());

-- FRIEND_CONNECTIONS: Users can view connections involving them
CREATE POLICY "friend_connections_select" ON friend_connections 
FOR SELECT TO authenticated 
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- FRIEND_CONNECTIONS: Users can create connections
CREATE POLICY "friend_connections_insert" ON friend_connections 
FOR INSERT TO authenticated 
WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

-- FRIEND_CONNECTIONS: Users can update connections involving them
CREATE POLICY "friend_connections_update" ON friend_connections 
FOR UPDATE TO authenticated 
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- FRIEND_CONNECTIONS: Users can delete connections involving them
CREATE POLICY "friend_connections_delete" ON friend_connections 
FOR DELETE TO authenticated 
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- CONVERSATIONS: Users can view conversations they're part of
CREATE POLICY "conversations_select" ON conversations 
FOR SELECT TO authenticated 
USING (
  id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- CONVERSATIONS: Users can create conversations
CREATE POLICY "conversations_insert" ON conversations 
FOR INSERT TO authenticated 
WITH CHECK (created_by = auth.uid());

-- CONVERSATIONS: Users can update conversations they're part of
CREATE POLICY "conversations_update" ON conversations 
FOR UPDATE TO authenticated 
USING (
  id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- CONVERSATION_PARTICIPANTS: Users can view participants in their conversations
CREATE POLICY "conversation_participants_select" ON conversation_participants 
FOR SELECT TO authenticated 
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- CONVERSATION_PARTICIPANTS: Users or admins can add participants
CREATE POLICY "conversation_participants_insert" ON conversation_participants 
FOR INSERT TO authenticated 
WITH CHECK (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- CONVERSATION_PARTICIPANTS: Users or admins can update participants
CREATE POLICY "conversation_participants_update" ON conversation_participants 
FOR UPDATE TO authenticated 
USING (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- CONVERSATION_PARTICIPANTS: Users can leave or admins can remove
CREATE POLICY "conversation_participants_delete" ON conversation_participants 
FOR DELETE TO authenticated 
USING (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- MESSAGES: Users can view messages in their conversations
CREATE POLICY "messages_select" ON messages 
FOR SELECT TO authenticated 
USING (
  conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid()
  )
);

-- MESSAGES: Users can send messages if they have posting permission
CREATE POLICY "messages_insert" ON messages 
FOR INSERT TO authenticated 
WITH CHECK (
  author_id = auth.uid()
  AND conversation_id IN (
    SELECT conversation_id 
    FROM conversation_participants 
    WHERE user_id = auth.uid() AND can_post = true
  )
);

-- MESSAGES: Users can update their own messages
CREATE POLICY "messages_update" ON messages 
FOR UPDATE TO authenticated 
USING (author_id = auth.uid());

-- MESSAGES: Users can delete their own messages
CREATE POLICY "messages_delete" ON messages 
FOR DELETE TO authenticated 
USING (author_id = auth.uid());

-- TASKS: Users can view tasks they created, assigned to them, or in their team
CREATE POLICY "tasks_select" ON tasks 
FOR SELECT TO authenticated 
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR list_id IN (
    SELECT id FROM task_lists 
    WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
  OR transaction_id IN (
    SELECT id FROM transactions 
    WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
);

-- TASKS: Users can create tasks
CREATE POLICY "tasks_insert" ON tasks 
FOR INSERT TO authenticated 
WITH CHECK (created_by = auth.uid());

-- TASKS: Users can update tasks they have access to
CREATE POLICY "tasks_update" ON tasks 
FOR UPDATE TO authenticated 
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR list_id IN (
    SELECT id FROM task_lists 
    WHERE team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  )
);

-- TASKS: Users can delete their own tasks
CREATE POLICY "tasks_delete" ON tasks 
FOR DELETE TO authenticated 
USING (created_by = auth.uid());

-- TRANSACTIONS: Users can view team transactions
CREATE POLICY "transactions_select" ON transactions 
FOR SELECT TO authenticated 
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- TRANSACTIONS: Users can create transactions for their team
CREATE POLICY "transactions_insert" ON transactions 
FOR INSERT TO authenticated 
WITH CHECK (
  created_by = auth.uid()
  AND team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- TRANSACTIONS: Users can update team transactions
CREATE POLICY "transactions_update" ON transactions 
FOR UPDATE TO authenticated 
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);

-- TRANSACTIONS: Users can delete team transactions
CREATE POLICY "transactions_delete" ON transactions 
FOR DELETE TO authenticated 
USING (
  team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()
  )
);