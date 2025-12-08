import { Calendar, Check, Loader2, Unlink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export function GoogleCalendarCard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    isConnected,
    isLoadingConnection,
    settings,
    isLoadingSettings,
    connect,
    isConnecting,
    disconnect,
    isDisconnecting,
    updateSettings,
    isUpdatingSettings,
  } = useGoogleCalendar();

  // Handle OAuth callback result
  useEffect(() => {
    const calendarStatus = searchParams.get('calendar');
    if (calendarStatus === 'success') {
      toast.success('Google Calendar connected successfully!');
      searchParams.delete('calendar');
      setSearchParams(searchParams);
    } else if (calendarStatus === 'error') {
      toast.error('Failed to connect Google Calendar');
      searchParams.delete('calendar');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  if (isLoadingConnection) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Google Calendar</CardTitle>
              <CardDescription>Loading...</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-green-500/10">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Google Calendar
                {isConnected && (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                    <Check className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Sync your AgentBuddy events to Google Calendar
              </CardDescription>
            </div>
          </div>
          
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => disconnect()}
              disabled={isDisconnecting}
              className="text-destructive hover:text-destructive"
            >
              {isDisconnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unlink className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </Button>
          ) : (
            <Button
              onClick={() => connect()}
              disabled={isConnecting}
              className="bg-gradient-to-r from-blue-600 to-blue-500"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Connect
            </Button>
          )}
        </div>
      </CardHeader>

      {isConnected && (
        <CardContent className="space-y-4 pt-0">
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">What to sync</h4>
            
            {isLoadingSettings ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading settings...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-planner" className="text-sm">
                    Daily Planner items
                  </Label>
                  <Switch
                    id="sync-planner"
                    checked={settings?.sync_daily_planner ?? true}
                    onCheckedChange={(checked) => updateSettings({ sync_daily_planner: checked })}
                    disabled={isUpdatingSettings}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-appraisals" className="text-sm">
                    Appraisal appointments
                  </Label>
                  <Switch
                    id="sync-appraisals"
                    checked={settings?.sync_appraisals ?? true}
                    onCheckedChange={(checked) => updateSettings({ sync_appraisals: checked })}
                    disabled={isUpdatingSettings}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="sync-transactions" className="text-sm">
                    Transaction milestones
                  </Label>
                  <Switch
                    id="sync-transactions"
                    checked={settings?.sync_transactions ?? true}
                    onCheckedChange={(checked) => updateSettings({ sync_transactions: checked })}
                    disabled={isUpdatingSettings}
                  />
                </div>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground">
            Events sync one-way to a dedicated "AgentBuddy" calendar in your Google account.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
