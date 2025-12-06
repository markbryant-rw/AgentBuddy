import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkles, Calendar, Home, FileText, Crown, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

interface AIActionsMenuProps {
  noteId: string;
  onContentUpdate: (content: any) => void;
  asDropdownItems?: boolean;
}

export function AIActionsMenu({ noteId, onContentUpdate, asDropdownItems = false }: AIActionsMenuProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { subscription } = useUserSubscription();
  const { user } = useAuth();

  const { data: usageData, refetch } = useQuery({
    queryKey: ['ai-usage', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const today = new Date().toISOString().split('T')[0];
      const { data } = await (supabase as any)
        .from('ai_usage_tracking')
        .select('action_count')
        .eq('user_id', user.id)
        .eq('action_date', today)
        .maybeSingle();
      return data?.action_count || 0;
    },
    enabled: !!user,
  });

  const limits: Record<string, number> = {
    starter: 3,
    basic: 50,
    professional: 200,
  };

  const currentUsage = usageData || 0;
  const dailyLimit = limits[subscription?.plan || 'starter'];
  const isPremium = subscription?.plan !== 'starter';

  const handleAIAction = async (action: string, requiresPremium = false) => {
    if (isGenerating) return;
    if (requiresPremium && !isPremium) {
      toast.error('Upgrade to unlock this feature', {
        description: 'Get access to advanced AI features with a premium plan',
      });
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading('Generating with AI...');

    try {
      const { data, error } = await supabase.functions.invoke('notes-ai', {
        body: { noteId, action },
      });

      if (error) {
        if (error.message?.includes('Premium feature')) {
          toast.error('Upgrade to unlock this feature', { id: toastId });
          return;
        }
        if (error.message?.includes('Daily AI limit')) {
          toast.error(`Daily limit reached (${dailyLimit} actions)`, { 
            id: toastId,
            description: 'Upgrade for more AI actions'
          });
          return;
        }
        throw error;
      }

      if (data?.content) {
        onContentUpdate(data.content);
        toast.success('AI content generated!', { id: toastId });
        refetch();
      }
    } catch (error: any) {
      console.error('AI generation error:', error);
      toast.error(error.message || 'Failed to generate AI content', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  if (asDropdownItems) {
    return (
      <>
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Actions
          </span>
          {currentUsage !== null && (
            <Badge variant="secondary" className="text-xs">
              {currentUsage}/{dailyLimit}
            </Badge>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuItem
          onClick={() => handleAIAction('expand-and-polish', true)}
          disabled={isGenerating || currentUsage >= dailyLimit || !isPremium}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Expand & Polish Note
          {!isPremium && <Crown className="h-3 w-3 ml-auto text-yellow-500" />}
        </DropdownMenuItem>
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isGenerating || currentUsage >= dailyLimit}>
            <FileText className="h-4 w-4 mr-2" />
            Summaries
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => handleAIAction('quick-summary')}
              disabled={isGenerating || currentUsage >= dailyLimit}
            >
              Quick Summary
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAIAction('detailed-summary', true)}
              disabled={isGenerating || currentUsage >= dailyLimit || !isPremium}
            >
              Detailed Summary
              {!isPremium && <Crown className="h-3 w-3 ml-auto text-yellow-500" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAIAction('executive-summary', true)}
              disabled={isGenerating || currentUsage >= dailyLimit || !isPremium}
            >
              Executive Summary
              {!isPremium && <Crown className="h-3 w-3 ml-auto text-yellow-500" />}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={isGenerating || currentUsage >= dailyLimit}>
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem
              onClick={() => handleAIAction('meeting-summary')}
              disabled={isGenerating || currentUsage >= dailyLimit}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Meeting Summary
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleAIAction('property-notes')}
              disabled={isGenerating || currentUsage >= dailyLimit}
            >
              <Home className="h-4 w-4 mr-2" />
              Property Inspection
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isGenerating} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {isGenerating ? 'Generating...' : 'AI Actions'}
          {currentUsage < dailyLimit && (
            <Badge variant="secondary" className="text-xs">
              {currentUsage}/{dailyLimit}
            </Badge>
          )}
          {currentUsage >= dailyLimit && (
            <Badge variant="destructive" className="text-xs">
              Limit reached
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>AI Actions</span>
          <Badge variant="outline" className="text-xs">
            {currentUsage}/{dailyLimit} today
          </Badge>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Summaries
        </DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => handleAIAction('quick-summary')}
          disabled={currentUsage >= dailyLimit}
        >
          <FileText className="h-4 w-4 mr-2" />
          Quick Summary
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleAIAction('detailed-summary', true)}
          disabled={currentUsage >= dailyLimit || !isPremium}
        >
          <FileText className="h-4 w-4 mr-2" />
          Detailed Summary
          {!isPremium && <Crown className="h-3 w-3 ml-auto text-yellow-500" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleAIAction('executive-summary', true)}
          disabled={currentUsage >= dailyLimit || !isPremium}
        >
          <FileText className="h-4 w-4 mr-2" />
          Executive Summary
          {!isPremium && <Crown className="h-3 w-3 ml-auto text-yellow-500" />}
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Templates
        </DropdownMenuLabel>
        <DropdownMenuItem 
          onClick={() => handleAIAction('meeting-summary')}
          disabled={currentUsage >= dailyLimit}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Meeting Summary
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleAIAction('property-notes')}
          disabled={currentUsage >= dailyLimit}
        >
          <Home className="h-4 w-4 mr-2" />
          Property Inspection
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
