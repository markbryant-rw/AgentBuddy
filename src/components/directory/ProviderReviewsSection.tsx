import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ThumbsUp, ThumbsDown, Meh, MessageSquare, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { useProviderReviews } from '@/hooks/directory/useProviderReviews';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface ProviderReviewsSectionProps {
  providerId: string;
}

export const ProviderReviewsSection = ({ providerId }: ProviderReviewsSectionProps) => {
  const [content, setContent] = useState('');
  const [sentiment, setSentiment] = useState<'positive' | 'neutral' | 'negative' | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Inline editing state per review
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSentiment, setEditSentiment] = useState<'positive' | 'neutral' | 'negative' | null>(null);

  const { user } = useAuth();
  const { reviews, isLoading, refetch, error, addReview, updateReview, deleteReview } = useProviderReviews(providerId);

  // Calculate sentiment stats
  const sentimentCounts = reviews.reduce((acc, review) => {
    if (!review.parent_review_id) {
      acc[review.sentiment] = (acc[review.sentiment] || 0) + 1;
      acc.total += 1;
    }
    return acc;
  }, { positive: 0, neutral: 0, negative: 0, total: 0 });

  const positivePercentage = sentimentCounts.total > 0 
    ? Math.round((sentimentCounts.positive / sentimentCounts.total) * 100)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || (!replyingTo && !sentiment)) return;

    await addReview.mutateAsync({
      content: content.trim(),
      sentiment: sentiment || 'neutral',
      parentReviewId: replyingTo || undefined,
    });
    
    setReplyingTo(null);
    setContent('');
    setSentiment(null);
  };

  const handleEdit = (review: any) => {
    setEditingReviewId(review.id);
    setEditContent(review.content);
    setEditSentiment(review.sentiment);
  };

  const handleUpdateReview = async (reviewId: string) => {
    if (!editContent.trim() || !editSentiment) return;

    await updateReview.mutateAsync({
      reviewId,
      content: editContent.trim(),
      sentiment: editSentiment,
    });
    
    setEditingReviewId(null);
    setEditContent('');
    setEditSentiment(null);
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setEditContent('');
    setEditSentiment(null);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteReview.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getSentimentIcon = (reviewSentiment: 'positive' | 'neutral' | 'negative') => {
    switch (reviewSentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-600" />;
      case 'neutral':
        return <Meh className="h-4 w-4 text-amber-600" />;
    }
  };

  const getSentimentLabel = (reviewSentiment: 'positive' | 'neutral' | 'negative') => {
    switch (reviewSentiment) {
      case 'positive':
        return 'Recommended';
      case 'negative':
        return 'Not recommended';
      case 'neutral':
        return 'It was okay';
    }
  };

  const topLevelReviews = reviews.filter(r => !r.parent_review_id);
  const getReplies = (reviewId: string) => reviews.filter(r => r.parent_review_id === reviewId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-destructive font-medium">Failed to load reviews</p>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <div className="flex gap-2 justify-center">
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Reviews</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            setIsRefreshing(true);
            await refetch();
            setIsRefreshing(false);
          }}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Sentiment Summary */}
      {sentimentCounts.total > 0 && (
        <div className="flex items-center gap-6 p-4 bg-accent/50 rounded-lg">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{positivePercentage}%</div>
            <div className="text-sm text-muted-foreground mt-1">
              Positive
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4 text-green-600" />
              <span>{sentimentCounts.positive}</span>
            </div>
            <div className="flex items-center gap-1">
              <Meh className="h-4 w-4 text-amber-600" />
              <span>{sentimentCounts.neutral}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsDown className="h-4 w-4 text-red-600" />
              <span>{sentimentCounts.negative}</span>
            </div>
            <span className="text-muted-foreground ml-2">
              ({sentimentCounts.total} {sentimentCounts.total === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        </div>
      )}

      {/* Review Form */}
      <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
        <Label className="text-sm font-medium block">
          {replyingTo ? 'Reply to Review' : 'Add a Review'}
        </Label>
        
        {!replyingTo && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">How was your experience?</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={sentiment === 'positive' ? 'default' : 'outline'}
                size="lg"
                onClick={() => setSentiment('positive')}
                className={`flex-1 gap-2 ${
                  sentiment === 'positive' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'border-green-600 text-green-600 hover:bg-green-50'
                }`}
              >
                <ThumbsUp className="h-5 w-5" />
                Recommend
              </Button>
              <Button
                type="button"
                variant={sentiment === 'neutral' ? 'default' : 'outline'}
                size="lg"
                onClick={() => setSentiment('neutral')}
                className={`flex-1 gap-2 ${
                  sentiment === 'neutral' 
                    ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                    : 'border-amber-600 text-amber-600 hover:bg-amber-50'
                }`}
              >
                <Meh className="h-5 w-5" />
                Okay
              </Button>
              <Button
                type="button"
                variant={sentiment === 'negative' ? 'default' : 'outline'}
                size="lg"
                onClick={() => setSentiment('negative')}
                className={`flex-1 gap-2 ${
                  sentiment === 'negative' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'border-red-600 text-red-600 hover:bg-red-50'
                }`}
              >
                <ThumbsDown className="h-5 w-5" />
                Not recommended
              </Button>
            </div>
          </div>
        )}

        <div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={replyingTo ? "Write your reply..." : "Share your experience with this provider..."}
            className="min-h-[100px]"
            required
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={!content.trim() || (!replyingTo && !sentiment) || addReview.isPending}
          >
            {replyingTo ? 'Post Reply' : 'Submit Review'}
          </Button>
          {replyingTo && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReplyingTo(null);
                setContent('');
                setSentiment(null);
              }}
            >
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Reviews List */}
      <div className="space-y-4">
        {topLevelReviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No reviews yet. Be the first to review this provider!
          </p>
        ) : (
          topLevelReviews.map((review) => {
            const isEditing = editingReviewId === review.id;
            
            return (
              <div key={review.id} className="border rounded-lg p-4 space-y-3">
                {/* Review Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.profiles?.avatar_url || ''} />
                      <AvatarFallback>
                        {getInitials(review.profiles?.full_name || null)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{review.profiles?.full_name || 'Unknown User'}</p>
                      {!isEditing && (
                        <div className="flex items-center gap-2 mt-1">
                          {getSentimentIcon(review.sentiment)}
                          <span className="text-sm text-muted-foreground">
                            {getSentimentLabel(review.sentiment)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {user?.id === review.user_id && !isEditing && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(review)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirmId(review.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  /* Inline Edit Mode */
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">How was your experience?</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={editSentiment === 'positive' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditSentiment('positive')}
                          className={`flex-1 gap-2 ${
                            editSentiment === 'positive' 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'border-green-600 text-green-600 hover:bg-green-50'
                          }`}
                        >
                          <ThumbsUp className="h-4 w-4" />
                          Recommend
                        </Button>
                        <Button
                          type="button"
                          variant={editSentiment === 'neutral' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditSentiment('neutral')}
                          className={`flex-1 gap-2 ${
                            editSentiment === 'neutral' 
                              ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                              : 'border-amber-600 text-amber-600 hover:bg-amber-50'
                          }`}
                        >
                          <Meh className="h-4 w-4" />
                          Okay
                        </Button>
                        <Button
                          type="button"
                          variant={editSentiment === 'negative' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setEditSentiment('negative')}
                          className={`flex-1 gap-2 ${
                            editSentiment === 'negative' 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'border-red-600 text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <ThumbsDown className="h-4 w-4" />
                          Not recommended
                        </Button>
                      </div>
                    </div>
                    
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[100px]"
                      placeholder="Edit your review..."
                    />

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateReview(review.id)}
                        disabled={!editContent.trim() || !editSentiment || updateReview.isPending}
                      >
                        Update Review
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Normal Display Mode */
                  <>
                    {/* Review Content */}
                    <p className="text-sm">{review.content}</p>

                    {/* Metadata */}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </p>

                    {/* Reply Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(review.id)}
                      className="gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Reply
                    </Button>
                  </>
                )}

                {/* Replies */}
                {getReplies(review.id).length > 0 && (
                  <div className="ml-8 mt-4 space-y-3 border-l-2 pl-4">
                    {getReplies(review.id).map((reply) => (
                      <div key={reply.id} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={reply.profiles?.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {getInitials(reply.profiles?.full_name || null)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{reply.profiles?.full_name || 'Unknown User'}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>

                          {user?.id === reply.user_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(reply.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};