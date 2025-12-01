import { useState, useEffect } from 'react';
import { SocialFeed } from '@/components/social/SocialFeed';
import { CreatePostForm } from '@/components/social/CreatePostForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';
import { WeeklyReflectionModal } from '@/components/social/WeeklyReflectionModal';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function FeedTab() {
  const [filter, setFilter] = useState<'all' | 'team' | 'friends' | 'office'>('all');
  const [reflectionModalOpen, setReflectionModalOpen] = useState(false);
  const [isFridayEvening, setIsFridayEvening] = useState(false);

  // Check if it's Friday after 5 PM
  useEffect(() => {
    const checkFridayEvening = () => {
      const now = new Date();
      const isFriday = now.getDay() === 5;
      const isAfter5PM = now.getHours() >= 17;
      setIsFridayEvening(isFriday && isAfter5PM);
    };
    
    checkFridayEvening();
    const interval = setInterval(checkFridayEvening, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Check if user has reflected this week
  const { data: hasReflected } = useQuery({
    queryKey: ['weekly-reflection-status'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return true;

      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('social_posts')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_type', 'weekly_reflection')
        .gte('created_at', startOfWeek.toISOString())
        .limit(1);

      return (data?.length ?? 0) > 0;
    },
  });

  return (
    <div className="space-y-6">
      {/* Friday Evening Reflection Banner */}
      {isFridayEvening && !hasReflected && (
        <Alert className="border-primary bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle>Time to Reflect! 🌟</AlertTitle>
          <AlertDescription className="flex items-center gap-2">
            <span>Share your weekly reflection with the team</span>
            <Button 
              onClick={() => setReflectionModalOpen(true)} 
              size="sm"
              className="ml-2"
            >
              Write Reflection
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Create Post Section */}
      <CreatePostForm />

      {/* Filter Buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'team', 'friends', 'office'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social Feed */}
      <SocialFeed />

      {/* Weekly Reflection Modal */}
      <WeeklyReflectionModal 
        open={reflectionModalOpen} 
        onOpenChange={setReflectionModalOpen} 
      />
    </div>
  );
}
