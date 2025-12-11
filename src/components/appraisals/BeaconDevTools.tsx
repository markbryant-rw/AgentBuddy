import { useState } from "react";
import { LoggedAppraisal } from "@/hooks/useLoggedAppraisals";
import { useBeaconIntegration } from "@/hooks/useBeaconIntegration";
import { useBeaconReports } from "@/hooks/useBeaconReports";
import { useTeam } from "@/hooks/useTeam";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  Copy, 
  Check, 
  RefreshCw, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Wrench,
  Loader2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface BeaconDevToolsProps {
  appraisal: LoggedAppraisal;
}

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

export const BeaconDevTools = ({ appraisal }: BeaconDevToolsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  
  const { team } = useTeam();
  const { user } = useAuth();
  const { reports } = useBeaconReports(appraisal.id);
  const { syncTeamToBeacon, isSyncingTeam } = useBeaconIntegration();
  
  const latestReport = reports[0];

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
      { name: 'Report Creation', status: 'pending' },
      { name: 'Webhook Endpoint', status: 'pending' },
    ]);

    try {
      const { data, error } = await supabase.functions.invoke('test-beacon-integration', {
        body: { teamId: team.id, appraisalId: appraisal.id },
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

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <Wrench className="h-4 w-4" />
                Developer Tools
              </CardTitle>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* IDs & References */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                IDs & References
              </p>
              <div className="grid gap-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-background rounded border">
                  <span className="text-muted-foreground">Appraisal ID</span>
                  <div className="flex items-center gap-2">
                    <code className="font-mono bg-muted px-1 rounded">{appraisal.id}</code>
                    <CopyButton value={appraisal.id} field="appraisal_id" />
                  </div>
                </div>
                
                {team?.id && (
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-muted-foreground">Team ID</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono bg-muted px-1 rounded">{team.id}</code>
                      <CopyButton value={team.id} field="team_id" />
                    </div>
                  </div>
                )}

                {latestReport?.beacon_report_id && (
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-muted-foreground">Beacon Report ID</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono bg-muted px-1 rounded">{latestReport.beacon_report_id}</code>
                      <CopyButton value={latestReport.beacon_report_id} field="beacon_report_id" />
                    </div>
                  </div>
                )}

                {appraisal.beacon_report_id && !latestReport?.beacon_report_id && (
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-muted-foreground">Legacy Beacon ID</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono bg-muted px-1 rounded">{appraisal.beacon_report_id}</code>
                      <CopyButton value={appraisal.beacon_report_id} field="legacy_beacon_id" />
                    </div>
                  </div>
                )}

                {latestReport?.report_url && (
                  <div className="flex items-center justify-between p-2 bg-background rounded border">
                    <span className="text-muted-foreground">Edit URL</span>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
                        <a href={latestReport.report_url} target="_blank" rel="noopener noreferrer">
                          Open <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                      <CopyButton value={latestReport.report_url} field="edit_url" />
                    </div>
                  </div>
                )}
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
                  className="h-7 text-xs"
                  onClick={handleForceSyncTeam}
                  disabled={isSyncingTeam}
                >
                  {isSyncingTeam ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Force Team Sync
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleRunTests}
                  disabled={isRunningTests}
                >
                  {isRunningTests ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3 mr-1" />
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
                      className="flex items-center justify-between p-2 bg-background rounded border text-xs"
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
                  <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs">
                    <p className="font-medium text-red-600 mb-1">Errors:</p>
                    {testResults.filter(t => t.message).map((t, i) => (
                      <p key={i} className="text-red-600/80">{t.name}: {t.message}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* API Health */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                API Info
              </p>
              <div className="p-2 bg-background rounded border text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Beacon API</span>
                  <span className="font-mono">beacon.lovable.app</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-muted-foreground">Webhook</span>
                  <span className="font-mono text-[10px]">beacon-propensity-webhook</span>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
