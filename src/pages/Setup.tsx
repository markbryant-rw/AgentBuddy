import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, User, Users, Settings as SettingsIcon, HelpCircle, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

// Import setup components
import { PreferencesCard } from "@/components/setup/PreferencesCard";
import { AccountManagementCard } from "@/components/setup/AccountManagementCard";
import { HelpSupportCard } from "@/components/setup/HelpSupportCard";

// Import settings components
import { UserProfileSection } from "@/components/settings/UserProfileSection";
import { TeamManagementSection } from "@/components/settings/TeamManagementSection";

const Setup = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "profile";
  const [searchQuery, setSearchQuery] = useState("");

  // Simplified tab configuration - 4 core tabs
  const tabs = [
    { value: "profile", label: "Profile", icon: User, description: "Personal information and avatar" },
    { value: "team", label: "Team", icon: Users, description: "Your team information" },
    { value: "preferences", label: "Preferences", icon: SettingsIcon, description: "Theme, notifications, and privacy" },
    { value: "help", label: "Help & Support", icon: HelpCircle, description: "Get help and export data" },
  ];

  // Filter tabs based on search
  const filteredTabs = tabs.filter(tab => 
    tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search settings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Main Settings Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-2 h-auto p-2 bg-muted/50">
          {filteredTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background",
                  "data-[state=active]:shadow-sm transition-all"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-6 space-y-6">
          <UserProfileSection />
        </TabsContent>

        {/* Team Tab - Read Only */}
        <TabsContent value="team" className="mt-6 space-y-6">
          <TeamManagementSection />
        </TabsContent>

        {/* Preferences Tab - Merged with Privacy */}
        <TabsContent value="preferences" className="mt-6">
          <PreferencesCard />
        </TabsContent>

        {/* Help & Support Tab */}
        <TabsContent value="help" className="mt-6 space-y-6">
          <HelpSupportCard />
          <AccountManagementCard />
        </TabsContent>
      </Tabs>

      {/* Quick Tips */}
      {!searchQuery && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Quick Tip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use the search bar above to quickly find any setting.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Setup;
