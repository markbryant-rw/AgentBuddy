import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";

interface ReportFilterBarProps {
  onExport?: () => void;
}

export const ReportFilterBar = ({ onExport }: ReportFilterBarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-lg">
      <Select defaultValue="30">
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Date Range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
        </SelectContent>
      </Select>

      <Select defaultValue="all">
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Stage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stages</SelectItem>
          <SelectItem value="signed">01. Signed</SelectItem>
          <SelectItem value="live">02. Live</SelectItem>
          <SelectItem value="contract">03. Under Contract</SelectItem>
          <SelectItem value="unconditional">04. Unconditional</SelectItem>
          <SelectItem value="settled">05. Settled</SelectItem>
        </SelectContent>
      </Select>

      <div className="ml-auto">
        <Button onClick={onExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>
    </div>
  );
};
