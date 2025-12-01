import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Star, ThumbsUp } from 'lucide-react';

interface BugSatisfactionPollProps {
  bugId: string;
  bugSummary: string;
  onComplete?: () => void;
}

export function BugSatisfactionPoll({ bugId, bugSummary, onComplete }: BugSatisfactionPollProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const queryClient = useQueryClient();

  const submitSatisfactionMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('bug_reports')
        .update({
          satisfaction_rating: rating,
          satisfaction_feedback: feedback.trim() || null,
          satisfaction_recorded_at: new Date().toISOString(),
        })
        .eq('id', bugId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      queryClient.invalidateQueries({ queryKey: ['bug-detail', bugId] });
      queryClient.invalidateQueries({ queryKey: ['bug-reports'] });
      onComplete?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit feedback: ${error.message}`);
    },
  });

  const skipMutation = useMutation({
    mutationFn: async () => {
      // Mark as no response by recording timestamp but no rating
      const { error } = await supabase
        .from('bug_reports')
        .update({
          satisfaction_recorded_at: new Date().toISOString(),
        })
        .eq('id', bugId);

      if (error) throw error;
    },
    onSuccess: () => {
      onComplete?.();
    },
  });

  return (
    <Card className="border-2 border-green-200 dark:border-green-800">
      <CardHeader className="bg-green-50 dark:bg-green-900/10">
        <CardTitle className="flex items-center gap-2 text-base">
          <ThumbsUp className="h-5 w-5 text-green-600" />
          Bug Fixed - How did we do?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <p className="text-sm text-muted-foreground">
          The bug <strong>"{bugSummary.substring(0, 60)}..."</strong> has been marked as fixed. 
          Can you confirm the fix is working?
        </p>

        <div className="space-y-2">
          <Label>Rate your satisfaction (1-5 stars)</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
              >
                <Star
                  className={`h-8 w-8 ${
                    (hoveredRating || rating) >= star
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback">Additional Feedback (Optional)</Label>
          <Textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Is everything working now? Any additional comments?"
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => submitSatisfactionMutation.mutate()}
            disabled={rating === 0 || submitSatisfactionMutation.isPending}
            className="flex-1"
          >
            {submitSatisfactionMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => skipMutation.mutate()}
            disabled={skipMutation.isPending}
          >
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}