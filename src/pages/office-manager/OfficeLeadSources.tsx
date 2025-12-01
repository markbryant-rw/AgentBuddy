import { useState } from "react";
import LeadSourceManager from "@/components/settings/LeadSourceManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOfficeSwitcher } from "@/hooks/useOfficeSwitcher";
import { useLeadSources } from "@/hooks/useLeadSources";
import { AlertCircle, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const defaultLeadSources = [
  { value: 'referral', label: 'Referral', sort_order: 1 },
  { value: 'past_client', label: 'Past Client', sort_order: 2 },
  { value: 'cold_call', label: 'Cold Call', sort_order: 3 },
  { value: 'online_inquiry', label: 'Online Inquiry', sort_order: 4 },
  { value: 'social_media', label: 'Social Media', sort_order: 5 },
  { value: 'sign_board', label: 'Sign Board', sort_order: 6 },
  { value: 'open_home', label: 'Open Home', sort_order: 7 },
  { value: 'database', label: 'Database', sort_order: 8 },
  { value: 'networking', label: 'Networking Event', sort_order: 9 },
  { value: 'other', label: 'Other', sort_order: 10 },
];

export default function OfficeLeadSources() {
  const { activeOffice, isLoading } = useOfficeSwitcher();
  const { leadSources, addLeadSource } = useLeadSources();
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);

  const handleLoadDefaults = async () => {
    if (!activeOffice) return;
    
    // Check if office already has lead sources
    if (leadSources.length > 0) {
      setShowConfirmDialog(true);
      return;
    }
    
    await loadDefaults();
  };

  const loadDefaults = async () => {
    setIsLoading2(true);
    try {
      for (const source of defaultLeadSources) {
        await addLeadSource({ value: source.value, label: source.label });
      }
      toast({
        title: "Success",
        description: "Default lead sources added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add default lead sources",
        variant: "destructive",
      });
    } finally {
      setIsLoading2(false);
      setShowConfirmDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!activeOffice) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select an office to manage lead sources
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Lead Sources</h2>
          <p className="text-muted-foreground mt-1">
            Manage lead source options for {activeOffice.name}. These will be available across all teams in this office.
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Office-Wide Lead Sources</CardTitle>
                <CardDescription>
                  Lead sources configured here will be used for appraisals, transactions, and past sales across all teams in this office.
                </CardDescription>
              </div>
              <Button 
                onClick={handleLoadDefaults} 
                variant="outline"
                disabled={isLoading2}
              >
                <Download className="h-4 w-4 mr-2" />
                {isLoading2 ? "Loading..." : "Load Default Sources"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <LeadSourceManager />
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="z-[11001]">
          <AlertDialogHeader>
            <AlertDialogTitle>Load Default Sources?</AlertDialogTitle>
            <AlertDialogDescription>
              This office already has {leadSources.length} lead source(s) configured. 
              Do you want to add the 10 default lead sources anyway? This will not remove existing sources.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={loadDefaults}>
              Yes, Add Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
