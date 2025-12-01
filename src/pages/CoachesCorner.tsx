import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, User, Users, Building2, TrendingUp, Megaphone, CheckCircle2, Plus, RefreshCw, Mic, MicOff, ArrowDown, Share2, ChevronDown, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationSidebar } from '@/components/ConversationSidebar';
import { useCoachingConversations } from '@/hooks/useCoachingConversations';
import { useSaveConversation } from '@/hooks/useSaveConversation';
import { useConversationMessages } from '@/hooks/useConversationMessages';
import { useTeam } from '@/hooks/useTeam';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useConversationRealtime } from '@/hooks/useConversationRealtime';
import { ConversationPresence } from '@/components/ConversationPresence';
import { TypingIndicator } from '@/components/TypingIndicator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coaches-corner-chat`;

const EXAMPLE_QUESTIONS = [
  // Prospecting & Lead Generation
  "I'm struggling to find consistent listing opportunities in a tough market. What's a realistic 90-day prospecting plan?",
  "How do I build a database of 500+ quality contacts in 90 days without spending on advertising?",
  "What's the best door-knocking script for premium suburbs where people are skeptical of agents?",
  "I want to dominate my local area. Give me a geographic farming strategy that actually works",
  "How do I get past gatekeepers when cold calling expired listings?",
  "What's the most effective way to prospect on social media without looking desperate?",
  
  // Scripts & Dialogues
  "Create a script for calling expired listings that doesn't sound pushy or salesy",
  "Help me handle the 'we want to think about it' objection during a listing presentation",
  "Write a door-knock script for a neighbourhood where a property just sold above expectations",
  "I need a script for calling FSBOs (For Sale By Owner) that positions me as a partner, not competition",
  "How do I respond when a vendor says 'your commission is too high'?",
  "Give me a powerful closing script for listing presentations that gets vendor commitment",
  
  // SMS & Communication
  "Write an SMS to a vendor who's been ghosting me after our appraisal meeting",
  "How do I follow up with a lead who went cold 6 months ago without being awkward?",
  "Create a text message sequence for nurturing database contacts over 90 days",
  "I just door-knocked 50 homes. What SMS should I send to follow up?",
  "Write a congratulations text to past clients when I see their property value has increased",
  
  // Negotiation & Objection Handling
  "A buyer is low-balling my listing. How do I negotiate without offending them or my vendor?",
  "My vendor wants to list $100k above market value. How do I have this difficult conversation?",
  "How do I handle a vendor who wants to interview 5 other agents before deciding?",
  "A competing agent is undercutting my commission. What's my response strategy?",
  "The buyer's building inspection came back negative. How do I keep the deal together?",
  
  // Business Growth & Scaling
  "My team is growing but I feel like I'm micromanaging everything. How do I scale without losing control?",
  "When is the right time to hire an assistant vs. another sales agent?",
  "I want to go from 20 to 50 transactions per year. What systems do I need in place first?",
  "How do I build a predictable sales pipeline instead of the feast-or-famine cycle?",
  "Should I niche down to luxury properties or stay as a generalist? Pros and cons?",
  
  // Marketing & Branding
  "What's the most cost-effective marketing strategy for a solo agent with a $5k monthly budget?",
  "How do I position myself as the local expert when there are 10 other agents in my area?",
  "Give me a 90-day content strategy for social media that actually generates leads",
  "I'm launching a personal brand. What should my unique value proposition be?",
  "How do I run a successful open house that converts attendees into buyer leads?",
];

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  authToken,
  apiKey,
}: {
  messages: Message[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  authToken: string;
  apiKey: string;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': apiKey,
      },
      body: JSON.stringify({ messages }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        onError('Rate limit exceeded. Please try again in a moment.');
        return;
      }
      if (resp.status === 402) {
        onError('AI credits exhausted. Please add credits in workspace settings.');
        return;
      }
      const errorData = await resp.json().catch(() => ({}));
      onError(errorData.error || 'Failed to get coaching response');
      return;
    }

    if (!resp.body) {
      onError('No response body');
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split('\n')) {
        if (!raw) continue;
        if (raw.endsWith('\r')) raw = raw.slice(0, -1);
        if (raw.startsWith(':') || raw.trim() === '') continue;
        if (!raw.startsWith('data: ')) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

const CoachesCorner = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [isSharedWithFriends, setIsSharedWithFriends] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { team } = useTeam();
  const { user } = useAuth();

  const {
    starredConversations,
    myConversations,
    sharedConversations,
    friendsSharedConversations,
    toggleShare,
    toggleShareWithFriends,
    starConversation,
    deleteConversation,
  } = useCoachingConversations();

  const { messages: dbMessages } = useConversationMessages(currentConversationId);
  const { presenceUsers, typingUsersList, updateTypingStatus } = useConversationRealtime(currentConversationId);

  const { saveConversation } = useSaveConversation();

  // Memoize random questions generation to avoid recalculation on every render
  const [randomQuestions, setRandomQuestions] = useState<string[]>(() => {
    const shuffled = [...EXAMPLE_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  });

  const shuffleQuestions = useCallback(() => {
    const shuffled = [...EXAMPLE_QUESTIONS].sort(() => Math.random() - 0.5);
    setRandomQuestions(shuffled.slice(0, 6));
  }, []);

  // Speech recognition for voice input
  const { transcript, isListening, isSupported, startListening, stopListening, resetTranscript } = useSpeechRecognition();

  // Update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInput((prev) => {
        const newInput = prev + (prev ? ' ' : '') + transcript;
        resetTranscript();
        return newInput;
      });
    }
  }, [transcript, resetTranscript]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    
    // Clear existing timeout to prevent memory leaks
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Update typing status to true if conversation is shared
    if (currentConversationId && (isShared || isSharedWithFriends)) {
      updateTypingStatus(true);
    }

    // Set timeout to clear typing status after 1 second of no typing
    const timeout = setTimeout(() => {
      if (currentConversationId && (isShared || isSharedWithFriends)) {
        updateTypingStatus(false);
      }
    }, 1000);

    setTypingTimeout(timeout);
  }, [currentConversationId, isShared, isSharedWithFriends, typingTimeout, updateTypingStatus]);

  // Cleanup typing timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const userMsg: Message = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, userMsg]);

    let assistantContent = '';
    const upsertAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantContent } : m));
        }
        return [...prev, { role: 'assistant', content: assistantContent }];
      });
    };

    try {
      // Force refresh to get a fresh, valid token
      console.log('Refreshing session to get fresh token...');
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();

      if (sessionError) {
        console.error('Session refresh error:', sessionError);
        throw new Error('Failed to refresh session');
      }

      if (!session?.access_token) {
        console.error('No access token after refresh');
        throw new Error('Not authenticated. Please log in again.');
      }

      console.log('Fresh auth token retrieved');

      await streamChat({
        messages: [...messages, userMsg],
        onDelta: (chunk) => upsertAssistant(chunk),
        authToken: session.access_token,
        apiKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        onDone: async () => {
          setLoading(false);
          
          // Save conversation after AI response
          const finalMessages: Message[] = [
            ...messages, 
            userMsg, 
            { role: 'assistant' as const, content: assistantContent }
          ];
          try {
            const savedConversation = await saveConversation({
              conversationId: currentConversationId,
              messages: finalMessages,
              teamId: team?.id,
            });
            
            if (savedConversation && !currentConversationId) {
              setCurrentConversationId(savedConversation.id);
              setIsStarred(savedConversation.is_starred);
            }
          } catch (error) {
            console.error("Failed to save conversation:", error);
          }
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: error,
            variant: "destructive",
          });
          setLoading(false);
        },
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get coaching response. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    if (messages.length > 0 && !currentConversationId) {
      if (!confirm("Start a new conversation? Current conversation will be lost if not saved.")) {
        return;
      }
    }
    setMessages([]);
    setInput('');
    setCurrentConversationId(null);
    setIsStarred(false);
    setIsShared(false);
    setIsSharedWithFriends(false);
  };

  const handleSelectConversation = (conversation: any) => {
    setCurrentConversationId(conversation.id);
    setIsStarred(conversation.is_starred);
    setIsShared(conversation.is_shared);
    setIsSharedWithFriends(conversation.share_with_friends);
    // Messages will be loaded by useConversationMessages hook
  };

  // Sync messages from database
  useEffect(() => {
    if (dbMessages && dbMessages.length > 0) {
      setMessages(dbMessages.map(m => ({ role: m.role, content: m.content })));
    }
  }, [dbMessages]);

  const handleToggleStar = () => {
    if (!currentConversationId) {
      toast({
        title: "Cannot star",
        description: "Please send a message first to create a conversation",
        variant: "destructive",
      });
      return;
    }
    starConversation({ id: currentConversationId, isStarred: !isStarred });
    setIsStarred(!isStarred);
  };

  const handleDeleteConversation = (id: string) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    
    deleteConversation(id);
    
    if (id === currentConversationId) {
      setMessages([]);
      setCurrentConversationId(null);
      setIsStarred(false);
    }
  };

  // Memoize current conversation title to avoid repeated array searches
  const currentTitle = useMemo(() => {
    if (!currentConversationId) return "New Conversation";
    
    const conversation = 
      starredConversations.find((c) => c.id === currentConversationId) ||
      myConversations.find((c) => c.id === currentConversationId) ||
      sharedConversations.find((c) => c.id === currentConversationId);
    
    return conversation?.title || "Untitled Conversation";
  }, [currentConversationId, starredConversations, myConversations, sharedConversations]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar with subtle background */}
      <div className="bg-gradient-to-b from-indigo-50/20 to-background">
        <ConversationSidebar
          starredConversations={starredConversations}
          myConversations={myConversations}
          sharedConversations={sharedConversations}
          friendsSharedConversations={friendsSharedConversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onStarConversation={(id, starred) => starConversation({ id, isStarred: starred })}
          onDeleteConversation={handleDeleteConversation}
        />
      </div>

      <div className="flex-1 flex flex-col">
        {currentConversationId && (
          <div className="border-b p-3 flex items-center justify-between bg-gradient-to-r from-indigo-50/30 to-white dark:from-indigo-900/10 dark:to-background">
            <h2 className="font-semibold">{currentTitle}</h2>
            <div className="flex items-center gap-3">
              {(isShared || isSharedWithFriends) && <ConversationPresence users={presenceUsers} />}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onClick={() => {
                      toggleShare({ id: currentConversationId, isShared: !isShared });
                      setIsShared(!isShared);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    <span className="flex-1">{isShared ? 'Unshare from Team' : 'Share with Team'}</span>
                    {isShared && <span className="text-xs text-muted-foreground">✓</span>}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      toggleShareWithFriends({ id: currentConversationId, shareWithFriends: !isSharedWithFriends });
                      setIsSharedWithFriends(!isSharedWithFriends);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    <span className="flex-1">{isSharedWithFriends ? 'Unshare from Friends' : 'Share with Friends'}</span>
                    {isSharedWithFriends && <span className="text-xs text-muted-foreground">✓</span>}
                  </DropdownMenuItem>
                  {(isShared || isSharedWithFriends) && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        {isShared && isSharedWithFriends && 'Shared with team & friends'}
                        {isShared && !isSharedWithFriends && 'Shared with team'}
                        {!isShared && isSharedWithFriends && 'Shared with friends'}
                      </div>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {messages.length === 0 ? (
            <div className="max-w-4xl mx-auto space-y-8">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <MessageSquare className="h-8 w-8 text-primary" />
                  Coaches Corner
                </h1>
                <p className="text-muted-foreground mt-2">
                  Get expert advice on scripts, dialogues, SMS, business planning, and more from your virtual board of directors
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-chart-1/20 hover:border-chart-1/40 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-chart-1" />
                      Business Management Board
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-chart-1 shrink-0 mt-0.5" />
                        <span>Scaling strategies and team building frameworks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-chart-1 shrink-0 mt-0.5" />
                        <span>Systems automation and process optimization</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-chart-1 shrink-0 mt-0.5" />
                        <span>Financial planning and business metrics</span>
                      </li>
                    </ul>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        <strong>Experts:</strong> Josh Phegan, Ryan Serhant, Tom Ferry, Barbara Corcoran
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-chart-2/20 hover:border-chart-2/40 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-chart-2" />
                      High-Performance Agent Council
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
                        <span>Sales mastery and closing techniques</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
                        <span>Negotiation tactics and objection handling</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-chart-2 shrink-0 mt-0.5" />
                        <span>Prospecting and pipeline management</span>
                      </li>
                    </ul>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        <strong>Experts:</strong> Josh Tesolin, Alexander Phillips, Vivian Yap
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-chart-3/20 hover:border-chart-3/40 transition-colors">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-chart-3" />
                      World-Class Marketing Council
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="text-sm space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-chart-3 shrink-0 mt-0.5" />
                        <span>Brand positioning and messaging strategy</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-chart-3 shrink-0 mt-0.5" />
                        <span>Content creation and social media presence</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-chart-3 shrink-0 mt-0.5" />
                        <span>Lead generation and conversion optimization</span>
                      </li>
                    </ul>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        <strong>Experts:</strong> Phil M. Jones, Chris Voss, Jason Pantana
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="border-2 border-primary/20 hover:border-primary/40 focus-within:border-primary bg-gradient-to-br from-primary/5 to-transparent shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Ask about scripts, dialogues, SMS, business planning, strategy, marketing..."
                        value={input}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                          }
                        }}
                        className="min-h-[120px] border-2 border-muted-foreground/20 focus:border-primary bg-background/50 text-base transition-all duration-200"
                        disabled={loading}
                      />
                      <Button 
                        onClick={handleSubmit} 
                        disabled={loading || !input.trim()}
                        size="icon"
                        className="shrink-0 hover:scale-105 transition-transform"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3 text-center flex items-center justify-center gap-1">
                      <ArrowDown className="h-3 w-3" />
                      Or click an example below to get started
                    </p>
                  </CardContent>
                </Card>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Try asking:</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={shuffleQuestions}
                      className="h-8 w-8 p-0"
                      title="Get new suggestions"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {randomQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleInputChange(q)}
                        className="text-left text-sm p-3 rounded-lg bg-muted hover:bg-accent transition-colors border border-transparent hover:border-accent-foreground/10"
                      >
                        "{q}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Advisory Board Conversation
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNewConversation}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New Chat
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[calc(100vh-24rem)] pr-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          {message.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-chart-4/10 flex items-center justify-center shrink-0">
                              <Users className="h-4 w-4 text-chart-4" />
                            </div>
                          )}
                          <div
                            className={`rounded-lg p-4 max-w-[85%] ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {message.role === 'user' ? (
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            ) : (
                              <div className="prose prose-base dark:prose-invert max-w-none [&_p]:mb-4 [&_p]:leading-relaxed [&_strong]:font-bold [&_strong]:text-foreground [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:mt-5 [&_h3]:mb-2">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                          {message.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </div>
                      ))}
                      {loading && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-chart-4/10 flex items-center justify-center shrink-0">
                            <Users className="h-4 w-4 text-chart-4" />
                          </div>
                          <div className="bg-muted rounded-lg p-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                              <span className="text-sm">Consulting the board...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {isShared && typingUsersList.length > 0 && (
                        <TypingIndicator users={typingUsersList} />
                      )}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2 pt-4">
                    <Textarea
                      placeholder="Do you want to explore this topic further or ask any extra questions?"
                      value={input}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit();
                        }
                      }}
                      className="min-h-[100px] flex-1"
                      disabled={loading}
                    />
                    <div className="flex flex-col gap-2">
                      {isSupported && (
                        <Button
                          onClick={isListening ? stopListening : startListening}
                          disabled={loading}
                          variant={isListening ? "default" : "ghost"}
                          size="icon"
                          className={isListening ? "animate-pulse shrink-0" : "shrink-0"}
                          title={isListening ? "Stop listening" : "Start voice input"}
                        >
                          {isListening ? (
                            <MicOff className="h-4 w-4" />
                          ) : (
                            <Mic className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button 
                        onClick={handleSubmit} 
                        disabled={loading || !input.trim()}
                        size="icon"
                        className="shrink-0"
                        title="Send message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoachesCorner;
