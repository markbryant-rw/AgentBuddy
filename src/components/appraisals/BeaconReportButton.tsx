import { Button } from "@/components/ui/button";
import { Loader2, FileText, ExternalLink, Copy, Check } from "lucide-react";
import { useBeaconIntegration } from "@/hooks/useBeaconIntegration";
import { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BeaconReportButtonProps {
  appraisalId: string;
  beaconReportUrl?: string | null;
  beaconPersonalizedUrl?: string | null;
  compact?: boolean;
}

export const BeaconReportButton = ({
  appraisalId,
  beaconReportUrl,
  beaconPersonalizedUrl,
  compact = false,
}: BeaconReportButtonProps) => {
  const { isBeaconEnabled, createBeaconReport, isCreatingReport } = useBeaconIntegration();
  const [copied, setCopied] = useState(false);

  if (!isBeaconEnabled) {
    return null;
  }

  const handleCreateReport = () => {
    createBeaconReport.mutate(appraisalId);
  };

  const handleCopyLink = async () => {
    if (beaconPersonalizedUrl) {
      await navigator.clipboard.writeText(beaconPersonalizedUrl);
      setCopied(true);
      toast.success('Vendor link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Report already exists - show view/copy options
  if (beaconReportUrl) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size={compact ? "sm" : "default"}
            className="gap-2"
          >
            <FileText className="h-4 w-4 text-teal-600" />
            {!compact && "Beacon Report"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={beaconReportUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              View Report
            </a>
          </DropdownMenuItem>
          {beaconPersonalizedUrl && (
            <DropdownMenuItem onClick={handleCopyLink} className="flex items-center gap-2">
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              Copy Vendor Link
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // No report yet - show create button
  return (
    <Button
      variant="outline"
      size={compact ? "sm" : "default"}
      onClick={handleCreateReport}
      disabled={isCreatingReport}
      className="gap-2"
    >
      {isCreatingReport ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      {!compact && (isCreatingReport ? "Creating..." : "Create Beacon Report")}
    </Button>
  );
};
