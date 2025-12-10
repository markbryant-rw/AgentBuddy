import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, User, Users, Settings as SettingsIcon, HelpCircle, Sparkles, CreditCard, Plug } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

// Import setup components
import { PreferencesCard } from "@/components/setup/PreferencesCard";
import { AccountManagementCard } from "@/components/setup/AccountManagementCard";
import { HelpSupportCard } from "@/components/setup/HelpSupportCard";
import { BillingTab } from "@/components/setup/BillingTab";
import IntegrationsTab from "@/components/settings/IntegrationsTab";

// Import settings components
import { UserProfileSection } from "@/components/settings/UserProfileSection";
import { TeamManagementSection } from "@/components/settings/TeamManagementSection";

const Setup = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "profile";
  const [searchQuery, setSearchQuery] = useState("");

  // Tab configuration - 6 core tabs
  const tabs = [
    { value: "profile", label: "Profile", icon: User, description: "Personal information and avatar" },
    { value: "team", label: "Team", icon: Users, description: "Your team information" },
    { value: "billing", label: "Billing", icon: CreditCard, description: "Subscription and payment" },
    { value: "integrations", label: "Integrations", icon: Plug, description: "Connect external services" },
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

      {/* Search Bar with inline tip */}
      <div className="flex items-center gap-4 max-w-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {!searchQuery && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Search to quickly find any setting</span>
          </div>
        )}
      </div>

      {/* Main Settings Tabs */}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-2 h-auto p-2 bg-muted/50">
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

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-6 space-y-6">
          <BillingTab />
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="mt-6">
          <IntegrationsTab />
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
    </div>
  );
};

export default Setup;
