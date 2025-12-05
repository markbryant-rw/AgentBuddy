import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import SocialSettingsTab from "@/components/settings/SocialSettingsTab";
import PreferencesTab from "@/components/settings/PreferencesTab";

const Settings = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your platform configuration and preferences
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Lead sources are now managed at the office level. Office managers can configure them in the Office Manager Hub.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="general" disabled>General</TabsTrigger>
          <TabsTrigger value="team" disabled>Team</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="mt-6">
          <PreferencesTab />
        </TabsContent>

        <TabsContent value="social" className="mt-6">
          <SocialSettingsTab />
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">General settings will be available here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Settings</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Team settings will be available here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
