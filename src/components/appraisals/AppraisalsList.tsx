import { useState, useMemo } from 'react';
import { LoggedAppraisal, GroupedProperty, useLoggedAppraisals } from '@/hooks/useLoggedAppraisals';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useAppraisalTaskCounts } from '@/hooks/useAppraisalTaskCounts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Calendar, Trash2, RotateCcw, X, LayoutList, Building2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, subMonths } from 'date-fns';
import { StatusBadge } from '@/components/ui/status-badge';
import { StageInfoTooltip } from '@/components/appraisals/StageInfoTooltip';
import { AppraisalStage } from '@/hooks/useAppraisalTemplates';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { getCurrentQuarter } from '@/utils/quarterCalculations';
import { cn } from '@/lib/utils';
import { PropertyAppraisalCard } from './PropertyAppraisalCard';

import { AppraisalTaskCount } from '@/hooks/useAppraisalTaskCounts';

interface AppraisalsListProps {
  appraisals: LoggedAppraisal[];
  loading: boolean;
  onAppraisalClick: (appraisal: LoggedAppraisal) => void;
  taskCounts?: Record<string, AppraisalTaskCount>;
}

type DateRange = 'all' | 'week' | 'month' | 'year' | 'currentQuarter' | 'lastQuarter' | 'custom';
type ViewMode = 'property' | 'visit';

const AppraisalsList = ({ appraisals, loading, onAppraisalClick, taskCounts: externalTaskCounts }: AppraisalsListProps) => {
  const { updateAppraisal, deleteAppraisal } = useLoggedAppraisals();
  const { members } = useTeamMembers();
  const { usesFinancialYear, fyStartMonth } = useFinancialYear();
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('all');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedAppraisals, setSelectedAppraisals] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('property');

  // Fetch global task counts (single cached query for all appraisals)
  const { data: globalTaskCounts } = useAppraisalTaskCounts();
  const taskCounts = externalTaskCounts || globalTaskCounts;

  const filteredAppraisals = useMemo(() => {
    return appraisals.filter(appraisal => {
      const matchesSearch = 
        appraisal.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (appraisal.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        appraisal.suburb?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStage = stageFilter === 'all' || appraisal.stage === stageFilter;
      const matchesOutcome = outcomeFilter === 'all' || appraisal.outcome === outcomeFilter;
      const matchesIntent = intentFilter === 'all' || appraisal.intent === intentFilter;
      const matchesAgent = selectedAgents.size === 0 || (appraisal.agent_id && selectedAgents.has(appraisal.agent_id));

      // Date range filtering
      let matchesDate = true;
      if (dateRange !== 'all') {
        const appraisalDate = parseISO(appraisal.appraisal_date);
        const now = new Date();
        
        switch (dateRange) {
          case 'week':
            matchesDate = appraisalDate >= startOfWeek(now) && appraisalDate <= endOfWeek(now);
            break;
          case 'month':
            matchesDate = appraisalDate >= startOfMonth(now) && appraisalDate <= endOfMonth(now);
            break;
          case 'year':
            matchesDate = appraisalDate >= startOfYear(now) && appraisalDate <= endOfYear(now);
            break;
          case 'currentQuarter': {
            const currentQuarter = getCurrentQuarter(usesFinancialYear, fyStartMonth, now);
            matchesDate = appraisalDate >= currentQuarter.startDate && appraisalDate <= currentQuarter.endDate;
            break;
          }
          case 'lastQuarter': {
            const threeMonthsAgo = subMonths(now, 3);
            const lastQuarter = getCurrentQuarter(usesFinancialYear, fyStartMonth, threeMonthsAgo);
            matchesDate = appraisalDate >= lastQuarter.startDate && appraisalDate <= lastQuarter.endDate;
            break;
          }
        }
      }

      return matchesSearch && matchesStage && matchesOutcome && matchesIntent && matchesDate && matchesAgent;
    });
  }, [appraisals, searchTerm, stageFilter, outcomeFilter, intentFilter, dateRange, selectedAgents, usesFinancialYear, fyStartMonth]);

  // Create grouped properties from the filtered appraisals prop (respecting parent filter like hot leads)
  const filteredGroupedAppraisals = useMemo(() => {
    // Group the already-filtered appraisals by address
    const addressMap = new Map<string, LoggedAppraisal[]>();
    
    appraisals.forEach(appraisal => {
      const key = appraisal.address.toLowerCase().trim();
      if (!addressMap.has(key)) {
        addressMap.set(key, []);
      }
      addressMap.get(key)!.push(appraisal);
    });
    
    // Convert to grouped properties format (matching GroupedProperty interface)
    const grouped: GroupedProperty[] = [];
    addressMap.forEach((visits, normalizedKey) => {
      // Sort by date descending to get latest, ascending for first
      const sortedVisits = [...visits].sort((a, b) => 
        new Date(b.appraisal_date).getTime() - new Date(a.appraisal_date).getTime()
      );
      const firstVisitDate = sortedVisits[sortedVisits.length - 1].appraisal_date;
      const latestDate = new Date(sortedVisits[0].appraisal_date);
      const firstDate = new Date(firstVisitDate);
      const durationMonths = Math.max(0, Math.round((latestDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      
      grouped.push({
        normalizedAddress: normalizedKey,
        latestAppraisal: sortedVisits[0],
        visits: sortedVisits,
        visitCount: sortedVisits.length,
        firstVisitDate,
        durationMonths,
      });
    });
    
    // Apply additional filters (search, stage, outcome, etc.)
    return grouped.filter(property => {
      const appraisal = property.latestAppraisal;
      
      const matchesSearch = 
        appraisal.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (appraisal.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        appraisal.suburb?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStage = stageFilter === 'all' || appraisal.stage === stageFilter;
      const matchesOutcome = outcomeFilter === 'all' || appraisal.outcome === outcomeFilter;
      const matchesIntent = intentFilter === 'all' || appraisal.intent === intentFilter;
      const matchesAgent = selectedAgents.size === 0 || (appraisal.agent_id && selectedAgents.has(appraisal.agent_id));

      // Date range filtering
      let matchesDate = true;
      if (dateRange !== 'all') {
        const appraisalDate = parseISO(appraisal.appraisal_date);
        const now = new Date();
        
        switch (dateRange) {
          case 'week':
            matchesDate = appraisalDate >= startOfWeek(now) && appraisalDate <= endOfWeek(now);
            break;
          case 'month':
            matchesDate = appraisalDate >= startOfMonth(now) && appraisalDate <= endOfMonth(now);
            break;
          case 'year':
            matchesDate = appraisalDate >= startOfYear(now) && appraisalDate <= endOfYear(now);
            break;
          case 'currentQuarter': {
            const currentQuarter = getCurrentQuarter(usesFinancialYear, fyStartMonth, now);
            matchesDate = appraisalDate >= currentQuarter.startDate && appraisalDate <= currentQuarter.endDate;
            break;
          }
          case 'lastQuarter': {
            const threeMonthsAgo = subMonths(now, 3);
            const lastQuarter = getCurrentQuarter(usesFinancialYear, fyStartMonth, threeMonthsAgo);
            matchesDate = appraisalDate >= lastQuarter.startDate && appraisalDate <= lastQuarter.endDate;
            break;
          }
        }
      }

      return matchesSearch && matchesStage && matchesOutcome && matchesIntent && matchesDate && matchesAgent;
    });
  }, [appraisals, searchTerm, stageFilter, outcomeFilter, intentFilter, dateRange, selectedAgents, usesFinancialYear, fyStartMonth]);

  const toggleAgent = (agentId: string) => {
    const newSelected = new Set(selectedAgents);
    if (newSelected.has(agentId)) {
      newSelected.delete(agentId);
    } else {
      newSelected.add(agentId);
    }
    setSelectedAgents(newSelected);
  };

  const clearAgentFilter = () => {
    setSelectedAgents(new Set());
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAppraisals(new Set(filteredAppraisals.map(a => a.id)));
    } else {
      setSelectedAppraisals(new Set());
    }
  };

  const handleSelectAppraisal = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedAppraisals);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedAppraisals(newSelected);
  };

  const handleBulkStageUpdate = async (newStage: 'VAP' | 'MAP' | 'LAP') => {
    const promises = Array.from(selectedAppraisals).map(id =>
      updateAppraisal(id, { stage: newStage })
    );
    await Promise.all(promises);
    setSelectedAppraisals(new Set());
  };

  const handleBulkOutcomeUpdate = async (newOutcome: 'In Progress' | 'WON' | 'LOST') => {
    // When setting to WON, also auto-set stage to LAP and intent to high
    const updates = newOutcome === 'WON' 
      ? { outcome: newOutcome, stage: 'LAP' as const, intent: 'high' as const }
      : { outcome: newOutcome };
    
    const promises = Array.from(selectedAppraisals).map(id =>
      updateAppraisal(id, updates)
    );
    await Promise.all(promises);
    setSelectedAppraisals(new Set());
  };

  const handleBulkIntentUpdate = async (newIntent: string) => {
    const promises = Array.from(selectedAppraisals).map(id =>
      updateAppraisal(id, { intent: newIntent as any })
    );
    await Promise.all(promises);
    setSelectedAppraisals(new Set());
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedAppraisals.size} appraisals?`)) return;
    const promises = Array.from(selectedAppraisals).map(id => deleteAppraisal(id));
    await Promise.all(promises);
    setSelectedAppraisals(new Set());
  };

  const getIntentColor = (intent?: string) => {
    switch (intent) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return '';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading appraisals...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Agent Filter */}
      {members.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Filter by agent:</span>
          {members.map((member) => (
            <button
              key={member.user_id}
              onClick={() => toggleAgent(member.user_id)}
              className={cn(
                "relative rounded-full transition-all",
                selectedAgents.has(member.user_id)
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "opacity-60 hover:opacity-100"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatar_url} alt={member.full_name} />
                <AvatarFallback className="text-xs">{getInitials(member.full_name)}</AvatarFallback>
              </Avatar>
            </button>
          ))}
          {selectedAgents.size > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAgentFilter} className="h-8 px-2">
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedAppraisals.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {selectedAppraisals.size} appraisal{selectedAppraisals.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Select onValueChange={(value) => handleBulkStageUpdate(value as 'VAP' | 'MAP' | 'LAP')}>
              <SelectTrigger className="w-[160px] h-8">
                <SelectValue placeholder="Set Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VAP">
                  <div className="flex items-center gap-2">VAP <StageInfoTooltip stage="VAP" /></div>
                </SelectItem>
                <SelectItem value="MAP">
                  <div className="flex items-center gap-2">MAP <StageInfoTooltip stage="MAP" /></div>
                </SelectItem>
                <SelectItem value="LAP">
                  <div className="flex items-center gap-2">LAP <StageInfoTooltip stage="LAP" /></div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={(value) => handleBulkOutcomeUpdate(value as 'In Progress' | 'WON' | 'LOST')}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Set Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="WON">WON</SelectItem>
                <SelectItem value="LOST">LOST</SelectItem>
              </SelectContent>
            </Select>
            <Select onValueChange={handleBulkIntentUpdate}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue placeholder="Set Intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address, vendor, or suburb..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Time Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="currentQuarter">Current Quarter</SelectItem>
            <SelectItem value="lastQuarter">Last Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="VAP">
              <div className="flex items-center gap-2">VAP <StageInfoTooltip stage="VAP" /></div>
            </SelectItem>
            <SelectItem value="MAP">
              <div className="flex items-center gap-2">MAP <StageInfoTooltip stage="MAP" /></div>
            </SelectItem>
            <SelectItem value="LAP">
              <div className="flex items-center gap-2">LAP <StageInfoTooltip stage="LAP" /></div>
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="WON">WON</SelectItem>
            <SelectItem value="LOST">LOST</SelectItem>
          </SelectContent>
        </Select>
        <Select value={intentFilter} onValueChange={setIntentFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Intent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Intent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count and view toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {viewMode === 'property' ? (
            <>Showing {filteredGroupedAppraisals.length} properties ({filteredAppraisals.length} visits)</>
          ) : (
            <>Showing {filteredAppraisals.length} of {appraisals.length} appraisals</>
          )}
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="property" className="h-7 px-3 text-xs gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="visit" className="h-7 px-3 text-xs gap-1.5">
              <LayoutList className="h-3.5 w-3.5" />
              All Visits
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Property View */}
      {viewMode === 'property' && (
        <div className="space-y-3">
          {filteredGroupedAppraisals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border rounded-md">
              No properties found
            </div>
          ) : (
            filteredGroupedAppraisals.map((property) => (
              <PropertyAppraisalCard
                key={property.normalizedAddress}
                property={property}
                onClick={onAppraisalClick}
                taskCount={taskCounts?.[property.latestAppraisal.id]}
              />
            ))
          )}
        </div>
      )}

      {/* Visit Table View */}
      {viewMode === 'visit' && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Intent</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppraisals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No appraisals found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppraisals.map((appraisal) => (
                  <TableRow 
                    key={appraisal.id} 
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      appraisal.outcome === 'WON' && "bg-emerald-50/50 dark:bg-emerald-950/20",
                      appraisal.outcome === 'LOST' && "bg-gray-100/50 dark:bg-gray-800/30"
                    )}
                    onClick={() => onAppraisalClick(appraisal)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(appraisal.appraisal_date), 'dd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div>
                          <div>{appraisal.address}</div>
                          {appraisal.suburb && (
                            <div className="text-sm text-muted-foreground">{appraisal.suburb}</div>
                          )}
                        </div>
                        {appraisal.visit_number && appraisal.visit_number > 1 && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Visit #{appraisal.visit_number}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{appraisal.vendor_name || '-'}</TableCell>
                    <TableCell>
                      {appraisal.agent ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={appraisal.agent.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {getInitials(appraisal.agent.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{appraisal.agent.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {appraisal.intent ? (
                        <Badge variant="outline" className={getIntentColor(appraisal.intent)}>
                          {appraisal.intent}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {appraisal.estimated_value ? (
                          <div className="text-sm font-medium">
                            ${appraisal.estimated_value.toLocaleString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {appraisal.lead_source && (
                          <div className="text-xs text-muted-foreground capitalize">
                            {appraisal.lead_source.replace(/_/g, ' ')}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {appraisal.last_contact ? (
                        format(new Date(appraisal.last_contact), 'dd MMM yyyy')
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge stage={appraisal.stage} outcome={appraisal.outcome} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AppraisalsList;
