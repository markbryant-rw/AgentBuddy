import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBeaconIntegration, REPORT_TYPE_LABELS, REPORT_TYPE_ICONS, BeaconReportType } from "@/hooks/useBeaconIntegration";
import { Loader2, Search, Link2, FileText, ExternalLink, Check, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BeaconSearchReport {
  reportId: string;
  address: string;
  reportType: string;
  createdAt: string;
  isLinked?: boolean;
  linkedTo?: string;
  propensityScore?: number;
  totalViews?: number;
  personalizedUrl?: string;
  reportUrl?: string;
}

interface LinkBeaconReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appraisalId: string;
  propertyId?: string;
  address: string;
  teamId: string;
  onSuccess?: () => void;
}

export const LinkBeaconReportDialog = ({
  open,
  onOpenChange,
  appraisalId,
  propertyId,
  address,
  teamId,
  onSuccess,
}: LinkBeaconReportDialogProps) => {
  const { searchBeaconReports, linkBeaconReport, isLinkingReport } = useBeaconIntegration();
  
  const [activeTab, setActiveTab] = useState<"search" | "url">("search");
  const [searchResults, setSearchResults] = useState<BeaconSearchReport[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  // URL paste state
  const [pastedUrl, setPastedUrl] = useState("");
  const [extractedReportId, setExtractedReportId] = useState<string | null>(null);
  
  const [selectedReport, setSelectedReport] = useState<BeaconSearchReport | null>(null);

  // Auto-search on open
  useEffect(() => {
    if (open && address && !hasSearched) {
      handleSearch();
    }
  }, [open, address]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchResults([]);
      setSearchError(null);
      setHasSearched(false);
      setPastedUrl("");
      setExtractedReportId(null);
      setSelectedReport(null);
      setActiveTab("search");
    }
  }, [open]);

  const handleSearch = async () => {
    if (!address) return;
    
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);
    
    try {
      // Use linkedStatus=unlinked to only fetch orphan reports for cleaner linking UX
      const results = await searchBeaconReports({ address, linkedStatus: 'unlinked' });
      setSearchResults(results || []);
    } catch (error: any) {
      console.error("Search error:", error);
      setSearchError(error.message || "Failed to search reports");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Extract report ID from various Beacon URL formats
  const extractReportIdFromUrl = (url: string): string | null => {
    if (!url) return null;
    
    try {
      // Try to parse as URL
      const urlObj = new URL(url);
      
      // Common patterns:
      // https://beacon.app/reports/REPORT_ID
      // https://beacon.app/r/REPORT_ID
      // https://beacon.app/v/REPORT_ID (personalized)
      // https://beacon.app/edit/REPORT_ID
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts.length >= 2) {
        const lastPart = pathParts[pathParts.length - 1];
        // UUID or alphanumeric ID
        if (/^[a-zA-Z0-9-]{8,}$/.test(lastPart)) {
          return lastPart;
        }
      }
      
      // Check query params
      const reportId = urlObj.searchParams.get('reportId') || urlObj.searchParams.get('id');
      if (reportId) return reportId;
      
      return null;
    } catch {
      // Not a valid URL, try as direct ID
      if (/^[a-zA-Z0-9-]{8,}$/.test(url.trim())) {
        return url.trim();
      }
      return null;
    }
  };

  useEffect(() => {
    const reportId = extractReportIdFromUrl(pastedUrl);
    setExtractedReportId(reportId);
  }, [pastedUrl]);

  const handleLinkReport = async (reportId: string) => {
    try {
      await linkBeaconReport.mutateAsync({
        appraisalId,
        propertyId,
        reportId,
        teamId,
        address,
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error already handled by mutation
      console.error("Link error:", error);
    }
  };

  const handleLinkFromUrl = async () => {
    if (!extractedReportId) {
      toast.error("Could not extract report ID from URL");
      return;
    }
    
    await handleLinkReport(extractedReportId);
  };

  // With linkedStatus=unlinked filter, all results should be unlinked
  // Keep filter as fallback for backward compatibility if Beacon hasn't deployed yet
  const unlinkedReports = searchResults.filter(r => !r.isLinked);
  const linkedReports = searchResults.filter(r => r.isLinked);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-teal-600" />
            Link Existing Report
          </DialogTitle>
          <DialogDescription>
            Connect an existing Beacon report to this property
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "search" | "url")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link2 className="h-4 w-4" />
              Paste URL
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Searching for reports matching:
              </Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={address} 
                  disabled 
                  className="flex-1 text-sm bg-muted"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSearch}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Results */}
            <div className="min-h-[200px]">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <span className="text-sm">Searching Beacon...</span>
                </div>
              ) : searchError ? (
                <div className="flex flex-col items-center justify-center py-8 text-destructive">
                  <AlertCircle className="h-6 w-6 mb-2" />
                  <span className="text-sm">{searchError}</span>
                  <Button variant="outline" size="sm" className="mt-3" onClick={handleSearch}>
                    Try Again
                  </Button>
                </div>
              ) : hasSearched && searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="h-6 w-6 mb-2" />
                  <span className="text-sm">No matching reports found</span>
                  <p className="text-xs mt-1 text-center max-w-xs">
                    Try pasting the report URL directly, or create a new report instead.
                  </p>
                </div>
              ) : hasSearched ? (
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {/* Unlinked reports first */}
                    {unlinkedReports.map((report) => (
                      <ReportSearchCard
                        key={report.reportId}
                        report={report}
                        isSelected={selectedReport?.reportId === report.reportId}
                        onSelect={() => setSelectedReport(report)}
                        onLink={() => handleLinkReport(report.reportId)}
                        isLinking={isLinkingReport}
                      />
                    ))}
                    
                    {/* Already linked reports (disabled) */}
                    {linkedReports.length > 0 && (
                      <>
                        <div className="text-xs text-muted-foreground pt-2 pb-1">
                          Already linked to other records:
                        </div>
                        {linkedReports.map((report) => (
                          <ReportSearchCard
                            key={report.reportId}
                            report={report}
                            isSelected={false}
                            onSelect={() => {}}
                            onLink={() => {}}
                            isLinking={false}
                            disabled
                          />
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              ) : null}
            </div>
          </TabsContent>

          {/* URL Paste Tab */}
          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="beacon-url">Beacon Report URL or ID</Label>
              <Input
                id="beacon-url"
                placeholder="Paste Beacon report URL or report ID..."
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
              />
              {pastedUrl && (
                <div className="flex items-center gap-2 text-sm">
                  {extractedReportId ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-muted-foreground">
                        Report ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{extractedReportId}</code>
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-amber-600 text-xs">
                        Could not extract report ID from this URL
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleLinkFromUrl}
              disabled={!extractedReportId || isLinkingReport}
            >
              {isLinkingReport ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Link Report
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Sub-component for search results
const ReportSearchCard = ({
  report,
  isSelected,
  onSelect,
  onLink,
  isLinking,
  disabled,
}: {
  report: BeaconSearchReport;
  isSelected: boolean;
  onSelect: () => void;
  onLink: () => void;
  isLinking: boolean;
  disabled?: boolean;
}) => {
  const typeIcon = REPORT_TYPE_ICONS[report.reportType as BeaconReportType] || '📊';
  const typeLabel = REPORT_TYPE_LABELS[report.reportType as BeaconReportType] || report.reportType;

  return (
    <div
      className={cn(
        "border rounded-lg p-3 transition-all",
        disabled && "opacity-50 cursor-not-allowed",
        !disabled && "cursor-pointer hover:border-teal-500/50",
        isSelected && "border-teal-500 bg-teal-500/5"
      )}
      onClick={() => !disabled && onSelect()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-lg">{typeIcon}</span>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{report.address}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{typeLabel}</span>
              <span>•</span>
              <span>{format(new Date(report.createdAt), 'MMM d, yyyy')}</span>
            </div>
            {report.isLinked && (
              <Badge variant="secondary" className="mt-1 text-[10px]">
                Already linked
              </Badge>
            )}
          </div>
        </div>
        
        {!disabled && (
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            className="shrink-0 gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onLink();
            }}
            disabled={isLinking}
          >
            {isLinking ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Link2 className="h-3 w-3" />
                Link
              </>
            )}
          </Button>
        )}
      </div>

      {/* Stats preview if available */}
      {(report.totalViews || report.propensityScore) && (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t text-xs text-muted-foreground">
          {report.totalViews !== undefined && (
            <span>{report.totalViews} views</span>
          )}
          {report.propensityScore !== undefined && (
            <span>Score: {report.propensityScore}%</span>
          )}
        </div>
      )}
    </div>
  );
};
