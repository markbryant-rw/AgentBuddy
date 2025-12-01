import { QueryClient } from "@tanstack/react-query";

/**
 * Centralized cache invalidation utilities
 * Consolidates common query invalidation patterns across the application
 */

interface InvalidateTeamDataOptions {
  teamId?: string;
  officeId?: string;
}

/**
 * Invalidates all team-related queries
 * Use after: team updates, member changes, team creation/deletion
 */
export const invalidateTeamData = (
  queryClient: QueryClient,
  options?: InvalidateTeamDataOptions
) => {
  const { teamId, officeId } = options || {};

  // Core team queries
  queryClient.invalidateQueries({ queryKey: ['team-hierarchy'] });
  queryClient.invalidateQueries({ queryKey: ['office-data', officeId] });
  
  // Specific team data
  if (teamId) {
    queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
    queryClient.invalidateQueries({ queryKey: ['team-members-detail', teamId] });
    queryClient.invalidateQueries({ queryKey: ['team-members-expanded', teamId] });
  } else {
    // Invalidate all team member queries if no specific team
    queryClient.invalidateQueries({ queryKey: ['team-members'] });
    queryClient.invalidateQueries({ queryKey: ['team-members-detail'] });
    queryClient.invalidateQueries({ queryKey: ['team-members-expanded'] });
  }

  // Office-related team data
  if (officeId) {
    queryClient.invalidateQueries({ queryKey: ['office-teams-users', officeId] });
  } else {
    queryClient.invalidateQueries({ queryKey: ['office-teams-users'] });
  }
};

/**
 * Invalidates all user/profile-related queries
 * Use after: profile updates, role changes, user deletion
 */
export const invalidateUserData = (
  queryClient: QueryClient,
  userId?: string
) => {
  // User profile queries
  if (userId) {
    queryClient.invalidateQueries({ queryKey: ['profile', userId] });
  } else {
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  }

  // Related user data
  queryClient.invalidateQueries({ queryKey: ['all-users'] });
  queryClient.invalidateQueries({ queryKey: ['available-profiles'] });
};

interface InvalidateListingDataOptions {
  teamId?: string;
  listingId?: string;
}

/**
 * Invalidates all listing and pipeline-related queries
 * Use after: listing creation/update, appraisal changes, transaction updates
 */
export const invalidateListingData = (
  queryClient: QueryClient,
  options?: InvalidateListingDataOptions
) => {
  const { teamId, listingId } = options || {};

  // Core listing queries
  queryClient.invalidateQueries({ queryKey: ['listings-pipeline'] });
  queryClient.invalidateQueries({ queryKey: ['logged-appraisals'] });
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: ['past-sales'] });

  // Team-specific listing data
  if (teamId) {
    queryClient.invalidateQueries({ queryKey: ['listings-pipeline', teamId] });
    queryClient.invalidateQueries({ queryKey: ['logged-appraisals', teamId] });
    queryClient.invalidateQueries({ queryKey: ['transactions', teamId] });
  }

  // Specific listing
  if (listingId) {
    queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
    queryClient.invalidateQueries({ queryKey: ['listing-comments', listingId] });
  }

  // Related analytics
  queryClient.invalidateQueries({ queryKey: ['listing-pipeline-stats'] });
};

interface InvalidateMessageDataOptions {
  conversationId?: string;
  userId?: string;
}

/**
 * Invalidates all message and conversation-related queries
 * Use after: sending messages, conversation updates, participant changes
 */
export const invalidateMessageData = (
  queryClient: QueryClient,
  options?: InvalidateMessageDataOptions
) => {
  const { conversationId, userId } = options || {};

  // Core conversation queries
  queryClient.invalidateQueries({ queryKey: ['conversations'] });
  
  // Specific conversation data
  if (conversationId) {
    queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    queryClient.invalidateQueries({ queryKey: ['conversation-participants', conversationId] });
  } else {
    // Invalidate all if no specific conversation
    queryClient.invalidateQueries({ queryKey: ['messages'] });
  }

  // User-specific conversation data
  if (userId) {
    queryClient.invalidateQueries({ queryKey: ['user-conversations', userId] });
  }
};

interface InvalidateProjectDataOptions {
  projectId?: string;
  teamId?: string;
}

/**
 * Invalidates all project and task-related queries
 * Use after: task creation/update, project changes, assignment updates
 */
export const invalidateProjectData = (
  queryClient: QueryClient,
  options?: InvalidateProjectDataOptions
) => {
  const { projectId, teamId } = options || {};

  // Core project queries
  queryClient.invalidateQueries({ queryKey: ['projects'] });
  queryClient.invalidateQueries({ queryKey: ['daily-planner-items'] });

  // Specific project data
  if (projectId) {
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] });
  }

  // Team-specific projects
  if (teamId) {
    queryClient.invalidateQueries({ queryKey: ['projects', teamId] });
    queryClient.invalidateQueries({ queryKey: ['daily-planner-items', teamId] });
  }

  // User assignments
  queryClient.invalidateQueries({ queryKey: ['my-assignments'] });
  queryClient.invalidateQueries({ queryKey: ['daily-planner-assignments'] });
};

/**
 * Invalidates all data - use sparingly for major changes
 * Use after: office switches, major role changes, bulk operations
 */
export const invalidateAllData = (queryClient: QueryClient) => {
  queryClient.invalidateQueries();
};
