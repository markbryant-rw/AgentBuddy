import { useBugReports } from "@/hooks/useBugReports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bug, Search, Filter, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { BugDetailDrawer } from "../BugDetailDrawer";

export function BugManagementTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBug, setSelectedBug] = useState<string | null>(null);
  
  const { bugReports, isLoadingReports } = useBugReports(statusFilter);

  const filteredBugs = bugReports?.filter(bug =>
    bug.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bug.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: bugReports?.length || 0,
    critical: bugReports?.filter(b => b.severity === 'critical').length || 0,
    triage: bugReports?.filter(b => b.status === 'triage').length || 0,
    fixed: bugReports?.filter(b => b.status === 'fixed').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Triage</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.triage}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fixed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.fixed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bug reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="triage">Triage</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bug Reports List */}
      <div className="space-y-3">
        {isLoadingReports ? (
          <div className="text-center py-8">Loading bug reports...</div>
        ) : filteredBugs && filteredBugs.length > 0 ? (
          filteredBugs.map((bug) => (
            <Card key={bug.id} className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedBug(bug.id)}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{bug.summary}</h3>
                      <Badge variant={bug.status === 'fixed' ? 'default' : 'secondary'}>
                        {bug.status}
                      </Badge>
                      <Badge variant={bug.severity === 'critical' ? 'destructive' : 'outline'}>
                        {bug.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {bug.description.substring(0, 150)}...
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Reported by: {bug.profiles?.full_name || 'Unknown'}</span>
                      <span>Module: {bug.module}</span>
                      <span>{new Date(bug.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <Bug className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No bug reports found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bug Detail Drawer */}
      {selectedBug && (
        <BugDetailDrawer
          bugId={selectedBug}
          open={!!selectedBug}
          onClose={() => setSelectedBug(null)}
          isAdmin={true}
        />
      )}
    </div>
  );
}
