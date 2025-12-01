import { useConversations } from "./useConversations";

export const useUnreadCount = () => {
  const { conversations } = useConversations();

  const unreadCount = conversations.reduce((total, conv) => total + conv.unread_count, 0);

  return { unreadCount };
};
