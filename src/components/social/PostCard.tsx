import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, Globe, Users, UserCircle, Building, PartyPopper, Edit, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { SocialPost, useReactToPost, useAddComment, useDeletePost, useUpdatePost } from "@/hooks/useSocialPosts";
import { ReactionBar } from "./ReactionBar";
import { CommentSection } from "./CommentSection";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import confetti from 'canvas-confetti';
import DOMPurify from 'dompurify';
import { RichTextPostEditor } from "./RichTextPostEditor";
import { PostImageLightbox } from "./PostImageLightbox";
import { supabase } from "@/integrations/supabase/client";
import { createMentionNotification } from "@/lib/notifications";

const visibilityIcons = {
  public: { icon: Globe, label: "Public" },
  team_only: { icon: Users, label: "Team Only" },
  friends_only: { icon: UserCircle, label: "Friends Only" },
  office_only: { icon: Building, label: "Office Only" },
};

const postTypeStyles = {
  weekly_reflection: "border-l-4 border-l-purple-500",
  achievement: "border-l-4 border-l-amber-500",
  milestone: "border-l-4 border-l-green-500",
  birthday_celebration: "border-l-4 border-l-pink-500",
  general_update: "",
};

const moodEmojis = {
  great: "😄",
  good: "😊",
  okay: "😐",
  challenging: "😓",
  tough: "😞",
};

interface PostCardProps {
  post: SocialPost;
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImageIndex, setLightboxImageIndex] = useState(0);
  const reactToPost = useReactToPost();
  const addComment = useAddComment();
  const deletePost = useDeletePost();
  const updatePost = useUpdatePost();

  const isOwnPost = user?.id === post.user_id;
  const VisibilityIcon = visibilityIcons[post.visibility].icon;
  const isEdited = post.created_at !== post.updated_at;
  const canEdit = isOwnPost && post.post_type === 'general_update'; // Only allow editing general updates
  const postImages = post.images || post.metadata?.images || [];

  const handleReact = (reactionType: any) => {
    reactToPost.mutate({ postId: post.id, reactionType, postAuthorId: post.user_id });
    
    // Trigger confetti for birthday celebrations
    if (post.post_type === 'birthday_celebration' && reactionType === 'celebrate') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  const handleAddComment = async (content: string, mentionedUserIds?: string[]) => {
    try {
      const result = await addComment.mutateAsync({ postId: post.id, content, postAuthorId: post.user_id });
      
      // Send mention notifications
      if (mentionedUserIds && mentionedUserIds.length > 0 && user && result) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          for (const mentionedUserId of mentionedUserIds) {
            await createMentionNotification(
              mentionedUserId,
              profile.full_name,
              'comment',
              (result as any).id,
              post.id
            );
          }
        }
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this post?")) {
      deletePost.mutate(post.id);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    await updatePost.mutateAsync({
      postId: post.id,
      content: editContent,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(post.content);
    setIsEditing(false);
  };

  // Check if content is HTML (starts with tag)
  const isHTMLContent = post.content.trim().startsWith('<');

  return (
    <Card className={cn("overflow-hidden", postTypeStyles[post.post_type])}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.profiles.avatar_url} />
              <AvatarFallback>
                {post.profiles.full_name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{post.profiles.full_name}</p>
                {post.post_type !== 'general_update' && (
                  <Badge variant="secondary" className="text-xs">
                    {post.post_type.replace('_', ' ')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                {isEdited && (
                  <>
                    <span>•</span>
                    <span className="italic">edited</span>
                  </>
                )}
                <span>•</span>
                <div className="flex items-center gap-1">
                  <VisibilityIcon className="h-3 w-3" />
                  <span>{visibilityIcons[post.visibility].label}</span>
                </div>
              </div>
            </div>
          </div>

          {isOwnPost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Post
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {post.mood && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-2xl">{moodEmojis[post.mood as keyof typeof moodEmojis]}</span>
            <span className="text-muted-foreground capitalize">Feeling {post.mood}</span>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-3">
            <RichTextPostEditor
              value={editContent}
              onChange={setEditContent}
              placeholder="Edit your post..."
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} disabled={!editContent.trim() || updatePost.isPending}>
                {updatePost.isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {isHTMLContent ? (
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }} />
            ) : (
              <p className="whitespace-pre-wrap">{post.content}</p>
            )}
          </div>
        )}

        {post.post_type === 'weekly_reflection' && post.reflection_data && (
          <div className="bg-accent/50 rounded-lg p-4 space-y-3 text-sm">
            {post.reflection_data.week_highlights && (
              <div>
                <p className="font-semibold text-green-600 dark:text-green-400">✨ Highlights</p>
                <p className="text-muted-foreground mt-1">{post.reflection_data.week_highlights}</p>
              </div>
            )}
            {post.reflection_data.challenges_faced && (
              <div>
                <p className="font-semibold text-orange-600 dark:text-orange-400">💪 Challenges</p>
                <p className="text-muted-foreground mt-1">{post.reflection_data.challenges_faced}</p>
              </div>
            )}
            {post.reflection_data.next_week_goals && (
              <div>
                <p className="font-semibold text-blue-600 dark:text-blue-400">🎯 Next Week</p>
                <p className="text-muted-foreground mt-1">{post.reflection_data.next_week_goals}</p>
              </div>
            )}
          </div>
        )}

        {/* Display images from either images column or metadata.images */}
        {postImages.length > 0 && (
          <div className={cn(
            "grid gap-2 rounded-lg overflow-hidden",
            postImages.length === 1 && "grid-cols-1",
            postImages.length === 2 && "grid-cols-2",
            postImages.length >= 3 && "grid-cols-2"
          )}>
            {postImages.map((image: string, index: number) => (
              <div 
                key={index} 
                className={cn(
                  "relative aspect-video bg-muted cursor-pointer hover:opacity-90 transition-opacity rounded-lg overflow-hidden",
                  postImages.length === 3 && index === 0 && "col-span-2"
                )}
                onClick={() => {
                  setLightboxImageIndex(index);
                  setLightboxOpen(true);
                }}
              >
                <img 
                  src={image} 
                  alt={`Post image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t space-y-3">
          {post.post_type === 'birthday_celebration' && (
            <div className="flex items-center gap-2 pb-2">
              <Button
                onClick={() => handleReact('celebrate')}
                size="sm"
                className="bg-pink-500 hover:bg-pink-600 text-white"
              >
                <PartyPopper className="h-4 w-4 mr-1" />
                Celebrate! 🎉
              </Button>
              <span className="text-sm text-muted-foreground">
                {post.post_reactions.filter(r => r.reaction_type === 'celebrate').length} celebrations
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setCommentsExpanded(!commentsExpanded)}
              className="gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-medium">
                {post.post_comments.length > 0 ? `${post.post_comments.length}` : 'Comment'}
              </span>
            </Button>

            <ReactionBar
              reactions={post.post_reactions}
              currentUserId={user?.id}
              onReact={handleReact}
            />
          </div>

          {commentsExpanded && (
            <CommentSection
              comments={post.post_comments}
              onAddComment={handleAddComment}
              isExpanded={commentsExpanded}
              onToggle={() => setCommentsExpanded(!commentsExpanded)}
            />
          )}
        </div>
      </CardContent>

      {/* Image Lightbox */}
      {lightboxOpen && postImages.length > 0 && (
        <PostImageLightbox
          images={postImages}
          initialIndex={lightboxImageIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </Card>
  );
}
