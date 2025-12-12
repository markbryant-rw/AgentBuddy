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
  Loader2,
  ExternalLink,
  Code2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
  details?: string;
}

interface TestSummary {
  passed: number;
  total: number;
  allPassed: boolean;
  totalDuration: number;
}

export const BeaconDeveloperToolsCard = () => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testSummary, setTestSummary] = useState<TestSummary | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());
  
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

  const toggleTestExpanded = (index: number) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleRunTests = async () => {
    if (!team?.id) {
      toast.error('No team ID available');
      return;
    }

    setIsRunningTests(true);
    setTestResults([
      { name: 'Team Data', status: 'running' },
      { name: 'API Key Config', status: 'pending' },
      { name: 'Beacon API Health', status: 'pending' },
      { name: 'Search Reports API', status: 'pending' },
      { name: 'Fetch Reports API', status: 'pending' },
      { name: 'Integration Settings', status: 'pending' },
      { name: 'Webhook Config', status: 'pending' },
    ]);
    setTestSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-beacon-integration', {
        body: { teamId: team.id },
      });

      if (error) throw error;

      setTestResults(data.results || []);
      setTestSummary(data.summary || null);
      
      const passed = data.summary?.passed || 0;
      const total = data.summary?.total || 0;
      
      if (data.summary?.allPassed) {
        toast.success(`All ${total} tests passed in ${data.summary.totalDuration}ms`);
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

  const hasTeamNotSynced = testResults.some(t => t.details === 'TEAM_NOT_SYNCED');

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
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Test Results
              </p>
              {testSummary && (
                <Badge 
                  variant={testSummary.allPassed ? 'default' : 'destructive'}
                  className="text-[10px]"
                >
                  {testSummary.passed}/{testSummary.total} passed • {testSummary.totalDuration}ms
                </Badge>
              )}
            </div>
            
            {/* TEAM_NOT_SYNCED Warning */}
            {hasTeamNotSynced && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="text-amber-700">
                  Team not synced to Beacon. Click "Force Team Sync" above to fix.
                </span>
              </div>
            )}
            
            <div className="space-y-1">
              {testResults.map((test, index) => (
                <Collapsible key={index} open={expandedTests.has(index)}>
                  <div 
                    className={`flex items-center justify-between p-2 rounded border text-xs transition-colors ${
                      test.status === 'passed' 
                        ? 'bg-green-500/5 border-green-500/20' 
                        : test.status === 'failed'
                        ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <TestStatusIcon status={test.status} />
                      <span className="font-medium">{test.name}</span>
                      {test.message && (
                        <span className="text-muted-foreground truncate">
                          — {test.message}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {test.duration !== undefined && (
                        <span className="text-muted-foreground font-mono">{test.duration}ms</span>
                      )}
                      {test.details && (
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => toggleTestExpanded(index)}
                          >
                            {expandedTests.has(index) ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                  </div>
                  {test.details && (
                    <CollapsibleContent>
                      <div className="ml-6 mt-1 p-2 bg-muted/30 rounded text-xs font-mono break-all">
                        {test.details}
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
