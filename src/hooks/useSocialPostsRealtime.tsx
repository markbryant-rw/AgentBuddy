import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSocialPostsRealtime() {
  const queryClient = useQueryClient();
  const lastUpdateRef = useRef<number>(0);
  const updateThrottle = 1000; // Max 1 update per second

  useEffect(() => {
    const channel = supabase
      .channel('social-posts-realtime')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'social_posts' 
        },
        (payload) => {
          console.log('New post received:', payload);
          const now = Date.now();
          
          // Throttle updates
          if (now - lastUpdateRef.current > updateThrottle) {
            lastUpdateRef.current = now;
            queryClient.invalidateQueries({ queryKey: ['social-posts'] });
            
            // Show a subtle notification for new posts
            if (payload.new) {
              toast.info('New post from your team', {
                duration: 2000,
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'social_posts' 
        },
        (payload) => {
          console.log('Post updated:', payload);
          const now = Date.now();
          
          if (now - lastUpdateRef.current > updateThrottle) {
            lastUpdateRef.current = now;
            queryClient.invalidateQueries({ queryKey: ['social-posts'] });
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'social_posts' 
        },
        (payload) => {
          console.log('Post deleted:', payload);
          const now = Date.now();
          
          if (now - lastUpdateRef.current > updateThrottle) {
            lastUpdateRef.current = now;
            queryClient.invalidateQueries({ queryKey: ['social-posts'] });
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'post_reactions' 
        },
        () => {
          console.log('Reaction updated');
          const now = Date.now();
          
          if (now - lastUpdateRef.current > updateThrottle) {
            lastUpdateRef.current = now;
            queryClient.invalidateQueries({ queryKey: ['social-posts'] });
          }
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'post_comments' 
        },
        () => {
          console.log('Comment updated');
          const now = Date.now();
          
          if (now - lastUpdateRef.current > updateThrottle) {
            lastUpdateRef.current = now;
            queryClient.invalidateQueries({ queryKey: ['social-posts'] });
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
