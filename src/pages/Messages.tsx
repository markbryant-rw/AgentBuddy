import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Hash, Users, Search } from "lucide-react";
import { ConversationList } from "@/components/messages/ConversationList";
import { ConversationView } from "@/components/messages/ConversationView";
import { NewConversationDialog } from "@/components/messages/NewConversationDialog";
import { CreateChannelDialog } from "@/components/messages/CreateChannelDialog";
import { MessagesLayout } from "@/components/messages/MessagesLayout";
import { MessagesHeader } from "@/components/messages/MessagesHeader";
import { useConversations } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Messages() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();
  const { conversations, createDirectConversation } = useConversations();
  const isMobile = useIsMobile();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [conversationType, setConversationType] = useState<"all" | "channels" | "direct">("all");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Calculate conversation counts for tabs
  const conversationCounts = useMemo(() => {
    const all = conversations.length;
    const channels = conversations.filter(c => c.type === 'group').length;
    const direct = conversations.filter(c => c.type === 'direct').length;
    return { all, channels, direct };
  }, [conversations]);

  // Determine back label based on active role
  const backLabel = useMemo(() => {
    switch (activeRole) {
      case 'platform_admin':
        return 'Back to Admin';
      case 'office_manager':
        return 'Back to Office Manager';
      default:
        return 'Back to Operate';
    }
  }, [activeRole]);

  // Determine back path based on active role
  const getBackPath = () => {
    switch (activeRole) {
      case 'platform_admin':
        return '/platform-admin/operate';
      case 'office_manager':
        return '/office-manager/operate';
      default:
        return '/operate-dashboard';
    }
  };

  // Handle navigation state (from dashboard widget clicks)
  useEffect(() => {
    const stateConversationId = location.state?.conversationId;
    if (stateConversationId) {
      setSelectedConversationId(stateConversationId);
      if (isMobile) setMobileView("chat");
      // Clear the state to prevent re-triggering on back navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state, isMobile]);

  // Handle deep linking to create conversation with specific user
  useEffect(() => {
    const targetUserId = searchParams.get("user");
    if (targetUserId && user) {
      const initConversation = async () => {
        try {
          const conversationId = await createDirectConversation(targetUserId);
          setSelectedConversationId(conversationId);
          if (isMobile) setMobileView("chat");
          setSearchParams({});
        } catch (error) {
          console.error("Failed to create conversation:", error);
        }
      };
      initConversation();
    }
  }, [searchParams, user, createDirectConversation, setSearchParams, isMobile]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    if (isMobile) {
      setMobileView("chat");
    }
  };

  const handleBackToList = () => {
    setMobileView("list");
  };

  return (
    <div className="fixed inset-0 top-[64px] flex flex-col bg-background pb-16 md:pb-0">
      <MessagesLayout
        header={
          <MessagesHeader
            variant="page"
            title="Messages"
            subtitle="Stay connected with your team"
            showBackButton
            onBack={() => navigate(getBackPath())}
            backLabel={backLabel}
            actions={
              <>
                {/* Desktop Actions */}
                <div className="hidden md:flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button onClick={() => setShowCreateChannel(true)} variant="outline" size="sm">
                    <Hash className="h-4 w-4 mr-2" />
                    New Channel
                  </Button>
                  <Button onClick={() => setShowNewConversation(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Message
                  </Button>
                </div>

                {/* Mobile Actions */}
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowCreateChannel(true)}>
                        <Hash className="h-4 w-4 mr-2" />
                        New Channel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowNewConversation(true)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        New Message
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            }
          />
        }
        sidebar={
          <div className="flex flex-col h-full">{/* Conversation Type Filter */}
            <div className="border-b bg-card/50 px-4 py-3">
              <Tabs value={conversationType} onValueChange={(v) => setConversationType(v as any)}>
                <TabsList className="w-full grid grid-cols-3 gap-1 h-11 p-1 bg-muted/50 rounded-full">
                  <TabsTrigger 
                    value="all" 
                    className={cn(
                      "flex items-center justify-center gap-1.5 text-xs sm:text-sm rounded-full",
                      "data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500 data-[state=active]:to-purple-600",
                      "data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                    )}
                  >
                    <Users className="h-4 w-4" />
                    <span>All</span>
                    <span className="text-[10px] sm:text-xs opacity-70">({conversationCounts.all})</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="channels" 
                    className={cn(
                      "flex items-center justify-center gap-1.5 text-xs sm:text-sm rounded-full",
                      "data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600",
                      "data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                    )}
                  >
                    <Hash className="h-4 w-4" />
                    <span>Channels</span>
                    <span className="text-[10px] sm:text-xs opacity-70">({conversationCounts.channels})</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="direct" 
                    className={cn(
                      "flex items-center justify-center gap-1.5 text-xs sm:text-sm rounded-full",
                      "data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500 data-[state=active]:to-purple-600",
                      "data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Direct</span>
                    <span className="text-[10px] sm:text-xs opacity-70">({conversationCounts.direct})</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Conversation List */}
            <ConversationList
              selectedId={selectedConversationId}
              onSelect={handleSelectConversation}
              filterType={conversationType}
            />
          </div>
        }
        main={
          isMobile ? (
            // Mobile Layout: Single view at a time
            mobileView === "list" ? (
              <div className="flex flex-col h-full">
                {/* Conversation Type Filter */}
                <div className="border-b bg-card/50 px-4 py-2">
                  <Tabs value={conversationType} onValueChange={(v) => setConversationType(v as any)}>
                    <TabsList className="w-full grid grid-cols-3 gap-1 h-11 p-1 bg-muted/50 rounded-full">
                      <TabsTrigger 
                        value="all" 
                        className={cn(
                          "flex items-center justify-center gap-1.5 text-xs rounded-full",
                          "data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500 data-[state=active]:to-purple-600",
                          "data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                        )}
                      >
                        <Users className="h-4 w-4" />
                        <span>All</span>
                        <span className="text-[10px] opacity-70">({conversationCounts.all})</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="channels" 
                        className={cn(
                          "flex items-center justify-center gap-1.5 text-xs rounded-full",
                          "data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600",
                          "data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                        )}
                      >
                        <Hash className="h-4 w-4" />
                        <span>Channels</span>
                        <span className="text-[10px] opacity-70">({conversationCounts.channels})</span>
                      </TabsTrigger>
                      <TabsTrigger 
                        value="direct" 
                        className={cn(
                          "flex items-center justify-center gap-1.5 text-xs rounded-full",
                          "data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500 data-[state=active]:to-purple-600",
                          "data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                        )}
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Direct</span>
                        <span className="text-[10px] opacity-70">({conversationCounts.direct})</span>
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Conversation List */}
                <ConversationList
                  selectedId={selectedConversationId}
                  onSelect={handleSelectConversation}
                  filterType={conversationType}
                />
              </div>
            ) : (
              <ConversationView
                conversationId={selectedConversationId!}
                onBack={handleBackToList}
                showBackButton
              />
            )
          ) : (
            // Desktop Layout: Show conversation or empty state
            selectedConversationId ? (
              <ConversationView conversationId={selectedConversationId} />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-background">
                <div className="text-center space-y-4">
                  <MessageSquare className="h-20 w-20 mx-auto text-muted-foreground/40" />
                  <p className="text-xl font-semibold">No conversation selected</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a conversation or start a new one
                  </p>
                </div>
              </div>
            )
          )
        }
      />

      {/* Dialogs */}
        <NewConversationDialog
          open={showNewConversation}
          onOpenChange={setShowNewConversation}
          onConversationCreated={(id) => {
            setSelectedConversationId(id);
            setShowNewConversation(false);
          }}
        />

      <CreateChannelDialog
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
        onChannelCreated={(id) => {
          setSelectedConversationId(id);
          setShowCreateChannel(false);
        }}
      />
    </div>
  );
}
