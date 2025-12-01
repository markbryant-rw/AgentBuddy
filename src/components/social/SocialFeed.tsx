import { useSocialPosts } from "@/hooks/useSocialPosts";
import { useSocialPostsRealtime } from "@/hooks/useSocialPostsRealtime";
import { PostCard } from "./PostCard";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SocialFeedProps {
  userId?: string;
  showCreateForm?: boolean;
}

export function SocialFeed({ userId, showCreateForm = false }: SocialFeedProps) {
  const { data: posts, isLoading, error } = useSocialPosts(userId);
  
  // Enable realtime updates
  useSocialPostsRealtime();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load posts. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {userId ? "No posts yet. Be the first to share!" : "No posts to show yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
