import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Search, User, Users, Settings as SettingsIcon, Shield, Sparkles, CreditCard, HelpCircle, Layers, Share2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

// Import existing setup components
import { PreferencesCard } from "@/components/setup/PreferencesCard";
import { PrivacyCard } from "@/components/setup/PrivacyCard";
import { ModuleAccessCard } from "@/components/setup/ModuleAccessCard";
import { BillingCard } from "@/components/setup/BillingCard";
import { AccountManagementCard } from "@/components/setup/AccountManagementCard";
import { HelpSupportCard } from "@/components/setup/HelpSupportCard";

// Import settings components
import LeadSourceManager from "@/components/settings/LeadSourceManager";
import SocialSettingsTab from "@/components/settings/SocialSettingsTab";

// Import new profile component
import { UserProfileSection } from "@/components/settings/UserProfileSection";
import { TeamManagementSection } from "@/components/settings/TeamManagementSection";

const Setup = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "profile";
  const [searchQuery, setSearchQuery] = useState("");

  // Tab configuration with icons and descriptions
  const tabs = [
    { value: "profile", label: "Profile", icon: User, description: "Personal information and avatar" },
    { value: "team", label: "Team", icon: Users, description: "Team settings and members" },
    { value: "preferences", label: "Preferences", icon: SettingsIcon, description: "Theme and notifications" },
    { value: "privacy", label: "Privacy", icon: Shield, description: "Visibility and security" },
    { value: "social", label: "Social", icon: Share2, description: "Social feeds and reflections" },
    { value: "workspace", label: "Workspace", icon: Layers, description: "Lead sources and modules" },
    { value: "modules", label: "Module Access", icon: Sparkles, description: "Available features" },
    { value: "billing", label: "Billing", icon: CreditCard, description: "Subscription and payments" },
    { value: "help", label: "Help & Support", icon: HelpCircle, description: "Documentation and feedback" },
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
          Manage your account, preferences, and platform configuration
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
        <TabsList className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 h-auto p-2 bg-muted/50">
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

        {/* Team Tab */}
        <TabsContent value="team" className="mt-6 space-y-6">
          <TeamManagementSection />
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="mt-6">
          <PreferencesCard />
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="mt-6">
          <PrivacyCard />
        </TabsContent>

        {/* Social Tab */}
        <TabsContent value="social" className="mt-6">
          <SocialSettingsTab />
        </TabsContent>

        {/* Workspace Tab */}
        <TabsContent value="workspace" className="mt-6 space-y-6">
          <LeadSourceManager />
          
          <Card>
            <CardHeader>
              <CardTitle>Additional Workspace Settings</CardTitle>
              <CardDescription>
                More workspace configuration options coming soon
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Features like custom fields, workflow automation, and data import/export will be available here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module Access Tab */}
        <TabsContent value="modules" className="mt-6">
          <ModuleAccessCard />
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="mt-6">
          <BillingCard />
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
              Use the search bar above to quickly find any setting. You can also use keyboard shortcuts: 
              <kbd className="ml-2 px-2 py-1 text-xs bg-muted rounded">Ctrl+K</kbd> to search
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Setup;
