// Conversation color themes for different message types
export const conversationThemes = {
  personal: {
    gradient: "from-violet-500 to-purple-600",
    accent: "bg-violet-50 dark:bg-violet-950/20",
    border: "border-violet-200 dark:border-violet-800",
    ring: "ring-violet-500/20",
    text: "text-violet-600 dark:text-violet-400",
    badge: "bg-violet-500",
  },
  channel: {
    gradient: "from-blue-500 to-cyan-600",
    accent: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    ring: "ring-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500",
  },
  announcement: {
    gradient: "from-amber-500 to-orange-600",
    accent: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
    ring: "ring-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500",
  },
} as const;

export type ConversationTheme = keyof typeof conversationThemes;

export const getConversationTheme = (
  type: "direct" | "group",
  isSystemChannel?: boolean
): ConversationTheme => {
  if (isSystemChannel) return "announcement";
  if (type === "direct") return "personal";
  return "channel";
};
