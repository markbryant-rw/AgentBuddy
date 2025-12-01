import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users } from 'lucide-react';
import FeedTab from '@/components/community/FeedTab';
import FriendsTab from '@/components/people/FriendsTab';
import TeamsTab from '@/components/people/TeamsTab';
import OfficesTab from '@/components/people/OfficesTab';
import GlobalTab from '@/components/people/GlobalTab';
import { CommunityAnalytics } from '@/components/community/CommunityAnalytics';
import { WeeklyReflectionModal } from '@/components/social/WeeklyReflectionModal';

export default function Community() {
  const [reflectionModalOpen, setReflectionModalOpen] = useState(false);
  const location = useLocation();

  // Handle URL parameter to auto-open reflection modal
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('modal') === 'reflection') {
      setReflectionModalOpen(true);
      // Clean URL
      window.history.replaceState({}, '', '/community');
    }
  }, [location]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <Users className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Community</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Share, celebrate, and stay connected
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="offices">Offices</TabsTrigger>
          <TabsTrigger value="global">Global</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-6">
          <FeedTab />
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
          <CommunityAnalytics />
        </TabsContent>
        <TabsContent value="friends" className="mt-6">
          <FriendsTab />
        </TabsContent>
        <TabsContent value="teams" className="mt-6">
          <TeamsTab />
        </TabsContent>
        <TabsContent value="offices" className="mt-6">
          <OfficesTab />
        </TabsContent>
        <TabsContent value="global" className="mt-6">
          <GlobalTab />
        </TabsContent>
      </Tabs>

      {/* Weekly Reflection Modal */}
      <WeeklyReflectionModal 
        open={reflectionModalOpen} 
        onOpenChange={setReflectionModalOpen} 
      />
    </div>
  );
}
