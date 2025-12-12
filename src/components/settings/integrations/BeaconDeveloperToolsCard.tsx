import { useState } from "react";
import { useBeaconIntegration } from "@/hooks/useBeaconIntegration";
import { useTeam } from "@/hooks/useTeam";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Copy, 
  Check, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Wrench,
  Loader2,
  ExternalLink,
  Code2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

export const BeaconDeveloperToolsCard = () => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  
  const { team } = useTeam();
  const { 
    isBeaconEnabled, 
    syncTeamToBeacon, 
    isSyncingTeam,
    integrationSettings,
  } = useBeaconIntegration();

  const handleCopy = async (value: string, field: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleForceSyncTeam = () => {
    if (team?.id) {
      syncTeamToBeacon.mutate(team.id);
    }
  };

  const handleRunTests = async () => {
    if (!team?.id) {
      toast.error('No team ID available');
      return;
    }

    setIsRunningTests(true);
    setTestResults([
      { name: 'Team Sync', status: 'pending' },
      { name: 'Search API', status: 'pending' },
      { name: 'Subscription Check', status: 'pending' },
    ]);

    try {
      const { data, error } = await supabase.functions.invoke('test-beacon-integration', {
        body: { teamId: team.id },
      });

      if (error) throw error;

      setTestResults(data.results || []);
      
      const passed = data.results?.filter((r: TestResult) => r.status === 'passed').length || 0;
      const total = data.results?.length || 0;
      
      if (passed === total) {
        toast.success(`All ${total} tests passed!`);
      } else {
        toast.warning(`${passed}/${total} tests passed`);
      }
    } catch (error: any) {
      console.error('Integration test error:', error);
      toast.error('Failed to run integration tests');
      setTestResults(prev => prev.map(t => ({ ...t, status: 'failed', message: error.message })));
    } finally {
      setIsRunningTests(false);
    }
  };

  const CopyButton = ({ value, field }: { value: string; field: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 w-6 p-0"
      onClick={() => handleCopy(value, field)}
    >
      {copiedField === field ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );

  const TestStatusIcon = ({ status }: { status: TestResult['status'] }) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-teal-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!isBeaconEnabled) {
    return null;
  }

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
            <Code2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">Beacon Developer Tools</CardTitle>
            <CardDescription>
              Technical debugging and integration testing
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* IDs & References */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            IDs & References
          </p>
          <div className="grid gap-2 text-xs">
            {team?.id && (
              <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                <span className="text-muted-foreground">Team ID</span>
                <div className="flex items-center gap-2">
                  <code className="font-mono bg-background px-2 py-0.5 rounded">{team.id}</code>
                  <CopyButton value={team.id} field="team_id" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
              <span className="text-muted-foreground">Beacon API</span>
              <div className="flex items-center gap-2">
                <code className="font-mono bg-background px-2 py-0.5 rounded">beacon.lovable.app</code>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                  <a href="https://beacon.lovable.app" target="_blank" rel="noopener noreferrer">
                    Open <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-muted/50 rounded border">
              <span className="text-muted-foreground">Connected At</span>
              <span className="font-mono text-xs">
                {integrationSettings?.connected_at 
                  ? new Date(integrationSettings.connected_at).toLocaleDateString()
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Debug Actions */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Debug Actions
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleForceSyncTeam}
              disabled={isSyncingTeam}
            >
              {isSyncingTeam ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              )}
              Force Team Sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleRunTests}
              disabled={isRunningTests}
            >
              {isRunningTests ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 mr-1.5" />
              )}
              Run Integration Tests
            </Button>
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Test Results
            </p>
            <div className="space-y-1">
              {testResults.map((test, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 bg-muted/50 rounded border text-xs"
                >
                  <div className="flex items-center gap-2">
                    <TestStatusIcon status={test.status} />
                    <span>{test.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {test.duration && (
                      <span className="text-muted-foreground">{test.duration}ms</span>
                    )}
                    <Badge 
                      variant={test.status === 'passed' ? 'default' : test.status === 'failed' ? 'destructive' : 'secondary'}
                      className="text-[10px] h-5"
                    >
                      {test.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {testResults.some(t => t.message) && (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
                <p className="font-medium text-destructive mb-1">Errors:</p>
                {testResults.filter(t => t.message).map((t, i) => (
                  <p key={i} className="text-destructive/80">{t.name}: {t.message}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
