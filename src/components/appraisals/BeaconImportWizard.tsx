import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, Check, AlertCircle, Link2, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { useBeaconIntegration } from '@/hooks/useBeaconIntegration';
import { useLoggedAppraisals } from '@/hooks/useLoggedAppraisals';
import { matchReportsToAppraisals, AddressMatch, MatchConfidence } from '@/lib/addressMatcher';
import { cn } from '@/lib/utils';

interface BeaconImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BeaconReportItem {
  id: string;
  address: string;
  propertySlug: string;
  reportType: string;
  ownerName?: string;
  ownerEmail?: string;
  createdAt: string;
  status: string;
  totalViews: number;
  propensityScore: number;
  isLinkedToAgentbuddy: boolean;
  externalLeadId?: string;
}

type WizardStep = 'fetch' | 'match' | 'confirm' | 'complete';

const confidenceColors: Record<MatchConfidence, string> = {
  high: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  low: 'bg-red-500/10 text-red-600 border-red-500/20',
  none: 'bg-muted text-muted-foreground',
};

const confidenceLabels: Record<MatchConfidence, string> = {
  high: 'High Match',
  medium: 'Possible Match',
  low: 'Weak Match',
  none: 'No Match',
};

export const BeaconImportWizard = ({ open, onOpenChange }: BeaconImportWizardProps) => {
  const { fetchAllTeamReports, linkBeaconReport, teamId } = useBeaconIntegration();
  const { appraisals } = useLoggedAppraisals();
  
  const [step, setStep] = useState<WizardStep>('fetch');
  const [isLoading, setIsLoading] = useState(false);
  const [beaconReports, setBeaconReports] = useState<BeaconReportItem[]>([]);
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [unmatched, setUnmatched] = useState<BeaconReportItem[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });

  const handleFetchReports = async () => {
    if (!teamId) {
      toast.error('Team not found');
      return;
    }
    
    setIsLoading(true);
    try {
      const reports = await fetchAllTeamReports(teamId);
      
      // Filter to only unlinked reports
      const unlinkedReports = reports.filter((r: BeaconReportItem) => !r.isLinkedToAgentbuddy);
      
      if (unlinkedReports.length === 0) {
        toast.info('All Beacon reports are already linked');
        onOpenChange(false);
        return;
      }
      
      setBeaconReports(unlinkedReports);
      
      // Perform matching
      const matchResults = matchReportsToAppraisals(
        unlinkedReports.map(r => ({
          id: r.id,
          address: r.address,
          ownerName: r.ownerName,
          ownerEmail: r.ownerEmail,
        })),
        appraisals.map(a => ({
          id: a.id,
          address: a.address,
          vendor_name: a.vendor_name || undefined,
          vendor_email: a.vendor_email || undefined,
        }))
      );
      
      setMatches(matchResults);
      
      // Pre-select high confidence matches
      const highConfidenceIds = new Set(
        matchResults
          .filter(m => m.confidence === 'high')
          .map(m => m.beaconReportId)
      );
      setSelectedMatches(highConfidenceIds);
      
      // Find unmatched reports
      const matchedIds = new Set(matchResults.map(m => m.beaconReportId));
      const unmatchedReports = unlinkedReports.filter(r => !matchedIds.has(r.id));
      setUnmatched(unmatchedReports);
      
      setStep('match');
    } catch (error: any) {
      console.error('Failed to fetch reports:', error);
      toast.error(error.message || 'Failed to fetch Beacon reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMatch = (reportId: string) => {
    setSelectedMatches(prev => {
      const next = new Set(prev);
      if (next.has(reportId)) {
        next.delete(reportId);
      } else {
        next.add(reportId);
      }
      return next;
    });
  };

  const handleConfirmMatches = () => {
    if (selectedMatches.size === 0) {
      toast.error('Select at least one match to import');
      return;
    }
    setStep('confirm');
  };

  const handleImport = async () => {
    setIsLoading(true);
    setImportProgress(0);
    
    const selectedMatchList = matches.filter(m => selectedMatches.has(m.beaconReportId));
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < selectedMatchList.length; i++) {
      const match = selectedMatchList[i];
      try {
        await linkBeaconReport.mutateAsync({
          appraisalId: match.appraisalId,
          reportId: match.beaconReportId,
        });
        success++;
      } catch (error) {
        console.error(`Failed to link ${match.beaconReportId}:`, error);
        failed++;
      }
      setImportProgress(((i + 1) / selectedMatchList.length) * 100);
    }
    
    setImportResults({ success, failed });
    setStep('complete');
    setIsLoading(false);
  };

  const handleClose = () => {
    setStep('fetch');
    setBeaconReports([]);
    setMatches([]);
    setSelectedMatches(new Set());
    setUnmatched([]);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });
    onOpenChange(false);
  };

  const groupedMatches = useMemo(() => {
    const groups: Record<MatchConfidence, AddressMatch[]> = {
      high: [],
      medium: [],
      low: [],
      none: [],
    };
    matches.forEach(m => groups[m.confidence].push(m));
    return groups;
  }, [matches]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-teal-600" />
            Import Historic Beacon Reports
          </DialogTitle>
        </DialogHeader>

        {step === 'fetch' && (
          <div className="py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-teal-500/10 flex items-center justify-center mx-auto mb-4">
              <Download className="h-8 w-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Import Existing Reports</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Fetch all unlinked Beacon reports and match them to your existing appraisals using smart address matching.
            </p>
            <Button
              onClick={handleFetchReports}
              disabled={isLoading}
              className="bg-gradient-to-r from-teal-500 to-cyan-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching Reports...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Fetch Reports
                </>
              )}
            </Button>
          </div>
        )}

        {step === 'match' && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Found {beaconReports.length} unlinked reports, {matches.length} potential matches
                </span>
                <Badge variant="outline">
                  {selectedMatches.size} selected
                </Badge>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {/* High confidence */}
                  {groupedMatches.high.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-emerald-600 mb-2 flex items-center gap-2">
                        <Check className="h-4 w-4" />
                        High Confidence ({groupedMatches.high.length})
                      </h4>
                      <div className="space-y-2">
                        {groupedMatches.high.map(match => (
                          <MatchRow
                            key={match.beaconReportId}
                            match={match}
                            selected={selectedMatches.has(match.beaconReportId)}
                            onToggle={() => handleToggleMatch(match.beaconReportId)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medium confidence */}
                  {groupedMatches.medium.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Possible Matches ({groupedMatches.medium.length})
                      </h4>
                      <div className="space-y-2">
                        {groupedMatches.medium.map(match => (
                          <MatchRow
                            key={match.beaconReportId}
                            match={match}
                            selected={selectedMatches.has(match.beaconReportId)}
                            onToggle={() => handleToggleMatch(match.beaconReportId)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Low confidence */}
                  {groupedMatches.low.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-600 mb-2 flex items-center gap-2">
                        <X className="h-4 w-4" />
                        Weak Matches ({groupedMatches.low.length})
                      </h4>
                      <div className="space-y-2">
                        {groupedMatches.low.map(match => (
                          <MatchRow
                            key={match.beaconReportId}
                            match={match}
                            selected={selectedMatches.has(match.beaconReportId)}
                            onToggle={() => handleToggleMatch(match.beaconReportId)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Unmatched */}
                  {unmatched.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        No Match Found ({unmatched.length})
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        These reports don't match any existing appraisals. You can manually link them later.
                      </p>
                      <div className="space-y-1">
                        {unmatched.slice(0, 5).map(report => (
                          <div key={report.id} className="text-xs text-muted-foreground py-1">
                            {report.address}
                          </div>
                        ))}
                        {unmatched.length > 5 && (
                          <div className="text-xs text-muted-foreground">
                            + {unmatched.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={handleConfirmMatches}
                disabled={selectedMatches.size === 0}
                className="bg-gradient-to-r from-teal-500 to-cyan-500"
              >
                Continue with {selectedMatches.size} matches
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'confirm' && (
          <>
            <div className="py-6 text-center">
              <div className="h-16 w-16 rounded-full bg-teal-500/10 flex items-center justify-center mx-auto mb-4">
                <Link2 className="h-8 w-8 text-teal-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Confirm Import</h3>
              <p className="text-muted-foreground mb-4">
                You're about to link {selectedMatches.size} Beacon reports to existing appraisals.
                This will sync engagement data from Beacon.
              </p>
              
              {isLoading && (
                <div className="space-y-2 mb-4">
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    Importing... {Math.round(importProgress)}%
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('match')} disabled={isLoading}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={isLoading}
                className="bg-gradient-to-r from-teal-500 to-cyan-500"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Import {selectedMatches.size} Reports
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'complete' && (
          <div className="py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
            <p className="text-muted-foreground mb-4">
              Successfully linked {importResults.success} reports
              {importResults.failed > 0 && `, ${importResults.failed} failed`}.
            </p>
            <Button onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface MatchRowProps {
  match: AddressMatch;
  selected: boolean;
  onToggle: () => void;
}

const MatchRow = ({ match, selected, onToggle }: MatchRowProps) => (
  <div
    className={cn(
      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
      selected ? "border-teal-500/50 bg-teal-500/5" : "border-border hover:bg-muted/50"
    )}
    onClick={onToggle}
  >
    <Checkbox checked={selected} className="pointer-events-none" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium truncate">{match.beaconAddress}</span>
        <Badge variant="outline" className={cn("text-[10px]", confidenceColors[match.confidence])}>
          {confidenceLabels[match.confidence]} ({match.score}%)
        </Badge>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
        <ArrowRight className="h-3 w-3" />
        <span className="truncate">{match.appraisalAddress}</span>
      </div>
    </div>
  </div>
);
