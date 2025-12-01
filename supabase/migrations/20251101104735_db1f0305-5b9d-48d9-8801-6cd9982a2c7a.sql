-- COMPLETE RLS RESET: Drop all existing policies and create clean, minimal policies

-- ============================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ============================================

-- Drop all policies on profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;

-- Drop all policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Platform admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_select_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_insert_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_update_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_delete_roles" ON public.user_roles;

-- Drop all policies on team_members
DROP POLICY IF EXISTS "Users can view their own team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Users can view their team members" ON public.team_members;
DROP POLICY IF EXISTS "Team admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view their teams" ON public.team_members;
DROP POLICY IF EXISTS "Platform admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can join teams" ON public.team_members;
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "users_select_team_members" ON public.team_members;
DROP POLICY IF EXISTS "users_insert_team_members" ON public.team_members;
DROP POLICY IF EXISTS "users_update_team_members" ON public.team_members;
DROP POLICY IF EXISTS "users_delete_team_members" ON public.team_members;

-- Drop all policies on user_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Platform admins can view all subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Platform admins can manage subscriptions" ON public.user_subscriptions;

-- Drop all policies on friend_connections
DROP POLICY IF EXISTS "Users can create friend connections" ON public.friend_connections;
DROP POLICY IF EXISTS "Users can delete their friend connections" ON public.friend_connections;
DROP POLICY IF EXISTS "Users can update their friend connections" ON public.friend_connections;
DROP POLICY IF EXISTS "Users can view their friend connections" ON public.friend_connections;

-- Drop all policies on conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

-- Drop all policies on conversation_participants
DROP POLICY IF EXISTS "Admins can add members" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins can remove members" ON public.conversation_participants;
DROP POLICY IF EXISTS "Creators and admins can update member permissions" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can remove themselves from conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

-- Drop all policies on messages
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can edit own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view conversation messages" ON public.messages;

-- Drop all policies on tasks
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Team members can view team tasks" ON public.tasks;

-- Drop all policies on transactions
DROP POLICY IF EXISTS "Team members can delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Team members can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Team members can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Team members can view transactions" ON public.transactions;

-- ============================================
-- STEP 2: CREATE CLEAN, MINIMAL POLICIES
-- ============================================

-- PROFILES: One policy per operation
CREATE POLICY "profiles_select_all" ON public.profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- USER_ROLES: Simple, non-recursive policies
CREATE POLICY "user_roles_select" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'platform_admin'
  )
);

CREATE POLICY "user_roles_manage" ON public.user_roles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'platform_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'platform_admin'
  )
);

-- TEAM_MEMBERS: Simple team visibility
CREATE POLICY "team_members_select" ON public.team_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('platform_admin', 'admin'))
);

CREATE POLICY "team_members_insert" ON public.team_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND access_level = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('platform_admin', 'admin'))
);

CREATE POLICY "team_members_update" ON public.team_members
FOR UPDATE TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND access_level = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('platform_admin', 'admin'))
);

CREATE POLICY "team_members_delete" ON public.team_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND access_level = 'admin')
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('platform_admin', 'admin'))
);

-- USER_SUBSCRIPTIONS: Simple access
CREATE POLICY "user_subscriptions_select" ON public.user_subscriptions
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

CREATE POLICY "user_subscriptions_manage" ON public.user_subscriptions
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

-- FRIEND_CONNECTIONS: User can manage their friendships
CREATE POLICY "friend_connections_select" ON public.friend_connections
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friend_connections_insert" ON public.friend_connections
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friend_connections_update" ON public.friend_connections
FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "friend_connections_delete" ON public.friend_connections
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR friend_id = auth.uid());

-- CONVERSATIONS: Users can see their conversations
CREATE POLICY "conversations_select" ON public.conversations
FOR SELECT TO authenticated
USING (
  id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
);

CREATE POLICY "conversations_insert" ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "conversations_update" ON public.conversations
FOR UPDATE TO authenticated
USING (
  id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
);

-- CONVERSATION_PARTICIPANTS: Manage conversation membership
CREATE POLICY "conversation_participants_select" ON public.conversation_participants
FOR SELECT TO authenticated
USING (
  conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
);

CREATE POLICY "conversation_participants_insert" ON public.conversation_participants
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "conversation_participants_update" ON public.conversation_participants
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "conversation_participants_delete" ON public.conversation_participants
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants 
    WHERE user_id = auth.uid() AND is_admin = true
  )
);

-- MESSAGES: Users can see and send messages in their conversations
CREATE POLICY "messages_select" ON public.messages
FOR SELECT TO authenticated
USING (
  conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
);

CREATE POLICY "messages_insert" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND conversation_id IN (
    SELECT conversation_id FROM public.conversation_participants 
    WHERE user_id = auth.uid() AND can_post = true
  )
);

CREATE POLICY "messages_update" ON public.messages
FOR UPDATE TO authenticated
USING (author_id = auth.uid());

CREATE POLICY "messages_delete" ON public.messages
FOR DELETE TO authenticated
USING (author_id = auth.uid());

-- TASKS: Users can manage their tasks and team tasks
CREATE POLICY "tasks_select" ON public.tasks
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR list_id IN (
    SELECT id FROM public.task_lists 
    WHERE (created_by = auth.uid() OR is_shared = true)
    AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "tasks_insert" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "tasks_update" ON public.tasks
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR list_id IN (
    SELECT id FROM public.task_lists 
    WHERE team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "tasks_delete" ON public.tasks
FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR list_id IN (
    SELECT id FROM public.task_lists 
    WHERE created_by = auth.uid()
    AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  )
);

-- TRANSACTIONS: Team members can manage team transactions
CREATE POLICY "transactions_select" ON public.transactions
FOR SELECT TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

CREATE POLICY "transactions_insert" ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

CREATE POLICY "transactions_update" ON public.transactions
FOR UPDATE TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

CREATE POLICY "transactions_delete" ON public.transactions
FOR DELETE TO authenticated
USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);