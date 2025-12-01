import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Sparkles, Target, TrendingUp, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { BugDetailDrawer } from '../BugDetailDrawer';

export function BugHuntDashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [aiStatusFilter, setAiStatusFilter] = useState('all');
  const [selectedBugId, setSelectedBugId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: bugs, isLoading } = useQuery({
    queryKey: ['bug-hunt-dashboard', statusFilter, moduleFilter, aiStatusFilter],
    queryFn: async () => {
      let query = supabase
        .from('bug_reports')
        .select('*')
        .in('status', ['pending', 'investigating'])
        .order('created_at', { ascending: false });

      if (moduleFilter !== 'all') {
        query = query.eq('workspace_module', moduleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter by AI status
      let filteredData = data;
      if (aiStatusFilter === 'analyzed') {
        filteredData = data.filter(b => b.ai_analysis !== null);
      } else if (aiStatusFilter === 'not_analyzed') {
        filteredData = data.filter(b => b.ai_analysis === null);
      } else if (aiStatusFilter === 'needs_info') {
        filteredData = data.filter(b => {
          const analysis = b.ai_analysis as any;
          return analysis?.needs_more_info === true;
        });
      }

      return filteredData;
    },
  });

  const bulkAnalyzeMutation = useMutation({
    mutationFn: async (bugIds: string[]) => {
      const results = await Promise.allSettled(
        bugIds.map(id => 
          supabase.functions.invoke('analyze-bug-report', { body: { bugId: id } })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed };
    },
    onSuccess: ({ successful, failed }) => {
      toast.success(`Analyzed ${successful} bugs${failed > 0 ? `, ${failed} failed` : ''}`);
      queryClient.invalidateQueries({ queryKey: ['bug-hunt-dashboard'] });
    },
    onError: (error: Error) => {
      toast.error(`Bulk analysis failed: ${error.message}`);
    },
  });

  const filteredBugs = bugs?.filter(bug =>
    bug.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bug.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Calculate quick wins (high confidence + low/moderate complexity)
  const quickWins = filteredBugs.filter(b => {
    const analysis = b.ai_analysis as any;
    return b.ai_analysis && 
      b.ai_confidence &&
      b.ai_confidence >= 0.7 && 
      analysis?.estimated_fix_complexity &&
      ['trivial', 'easy', 'moderate'].includes(analysis.estimated_fix_complexity);
  });

  // Calculate critical path (high impact)
  const criticalPath = filteredBugs.filter(b =>
    b.severity === 'critical' || (b.ai_analysis && b.ai_impact === 'critical')
  );

  const unanalyzedBugs = filteredBugs.filter(b => !b.ai_analysis);

  const handleBulkAnalyze = () => {
    const unanalyzedIds = unanalyzedBugs.map(b => b.id);
    if (unanalyzedIds.length === 0) {
      toast.info('All bugs have been analyzed');
      return;
    }
    bulkAnalyzeMutation.mutate(unanalyzedIds);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🎯 Bug Hunt Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            AI-powered bug triage and quick fix identification
          </p>
        </div>
        <Button
          onClick={handleBulkAnalyze}
          disabled={bulkAnalyzeMutation.isPending || unanalyzedBugs.length === 0}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {bulkAnalyzeMutation.isPending ? 'Analyzing...' : `Analyze All (${unanalyzedBugs.length})`}
        </Button>
      </div>

      {/* Summary Widgets */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-green-600" />
              Quick Wins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{quickWins.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              High confidence + low complexity
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-red-600" />
              Critical Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{criticalPath.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Critical/high impact bugs
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              Pending Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{unanalyzedBugs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Not yet analyzed by AI
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bugs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
              </SelectContent>
            </Select>

            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="OPERATE">OPERATE</SelectItem>
                <SelectItem value="PROSPECT">PROSPECT</SelectItem>
                <SelectItem value="TRANSACT">TRANSACT</SelectItem>
                <SelectItem value="GROW">GROW</SelectItem>
                <SelectItem value="ENGAGE">ENGAGE</SelectItem>
              </SelectContent>
            </Select>

            <Select value={aiStatusFilter} onValueChange={setAiStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="AI Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All AI Status</SelectItem>
                <SelectItem value="analyzed">Analyzed</SelectItem>
                <SelectItem value="not_analyzed">Not Analyzed</SelectItem>
                <SelectItem value="needs_info">Needs More Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bug Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && (
          <>
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </>
        )}

        {!isLoading && filteredBugs.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No bugs found matching your filters</p>
              </CardContent>
            </Card>
          </div>
        )}

        {filteredBugs.map((bug) => (
          <Card
            key={bug.id}
            className="hover:border-primary transition-all cursor-pointer h-full flex flex-col"
            onClick={() => setSelectedBugId(bug.id)}
          >
            <CardContent className="p-4 flex-1 flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm line-clamp-2 flex-1 pr-2">{bug.summary}</h3>
                {!bug.ai_analysis && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      bulkAnalyzeMutation.mutate([bug.id]);
                    }}
                  >
                    <Sparkles className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {bug.description}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap gap-1 mb-3">
                <Badge 
                  variant={bug.severity === 'critical' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {bug.severity}
                </Badge>
                <Badge variant="outline" className="text-xs">{bug.status}</Badge>
                {bug.workspace_module && (
                  <Badge variant="secondary" className="text-xs">{bug.workspace_module}</Badge>
                )}
              </div>

              {/* AI Insights */}
              {bug.ai_analysis && (
                <div className="text-xs bg-primary/5 p-2 rounded mb-2 flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <Sparkles className="h-3 w-3" />
                    <span className="font-medium">AI:</span>
                    <Badge variant="outline" className="text-xs">
                      {bug.ai_impact}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">
                    {(bug.ai_analysis as any)?.root_cause_hypothesis || 'Analysis available'}
                  </p>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {(bug.ai_analysis as any)?.estimated_fix_complexity || 'unknown'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {Math.round((bug.ai_confidence || 0) * 100)}%
                    </Badge>
                  </div>
                </div>
              )}

              {/* Date at bottom */}
              <div className="text-xs text-muted-foreground mt-auto pt-2 border-t">
                {format(new Date(bug.created_at), 'MMM d, yyyy')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bug Detail Drawer */}
      {selectedBugId && (
        <BugDetailDrawer
          bugId={selectedBugId}
          open={!!selectedBugId}
          onClose={() => setSelectedBugId(null)}
          isAdmin={true}
        />
      )}
    </div>
  );
}