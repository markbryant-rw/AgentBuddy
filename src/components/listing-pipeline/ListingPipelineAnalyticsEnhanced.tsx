import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Listing } from '@/hooks/useListingPipeline';
import { calculateGCI, formatGCI } from '@/lib/currencyUtils';
import { useState, useMemo, useCallback } from 'react';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { QuarterFunnelChart } from './QuarterFunnelChart';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTeamMembers } from '@/hooks/useTeamMembers';

interface MonthColumn {
  id: string;
  label: string;
  date: Date;
  isCurrent: boolean;
  isPast: boolean;
}

interface Quarter {
  id: string;
  label: string;
  color: string;
  months: MonthColumn[];
}

interface ListingPipelineAnalyticsEnhancedProps {
  listings: Listing[];
  visibleQuarters?: Quarter[];
}

export const ListingPipelineAnalyticsEnhanced = ({ listings, visibleQuarters }: ListingPipelineAnalyticsEnhancedProps) => {
  const { currentQuarter, getQuarterInfo } = useFinancialYear();
  const { members } = useTeamMembers();
  const [activeTab, setActiveTab] = useState<'quarterly' | 'monthly'>('quarterly');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  const handleSectionClick = useCallback((sectionId: string) => {
    setExpandedSection(prev => prev === sectionId ? null : sectionId);
  }, []);

  const groupListingsBySalesperson = useCallback((listings: Listing[]) => {
    const grouped = new Map<string, Listing[]>();

    listings.forEach(listing => {
      const assignedTo = listing.assigned_to || 'unassigned';
      if (!grouped.has(assignedTo)) {
        grouped.set(assignedTo, []);
      }
      grouped.get(assignedTo)!.push(listing);
    });

    // Optimize: Create Map for O(1) member lookups instead of O(n) find()
    const memberMap = new Map(members.map(m => [m.id, m]));

    return Array.from(grouped.entries()).map(([userId, listings]) => {
      const member = memberMap.get(userId);
      return {
        userId,
        name: member?.full_name || 'Unassigned',
        listings,
        totalGCI: listings.reduce((sum, l) => sum + calculateGCI(l.estimated_value), 0)
      };
    });
  }, [members]);

  // Generate all 4 quarters of the year for quarterly view
  const allQuarters = [];
  for (let i = 1; i <= 4; i++) {
    const qInfo = getQuarterInfo(i, currentQuarter.year);
    allQuarters.push({
      quarter: i,
      year: currentQuarter.year,
      label: qInfo.label,
      start: qInfo.startDate,
      end: qInfo.endDate,
      isCurrent: i === currentQuarter.quarter && currentQuarter.year === currentQuarter.year,
    });
  }
  
  // Calculate quarterly data
  const quarterlyData = useMemo(() => {
    return allQuarters.map(q => {
    const quarterListings = listings.filter(l => {
      const date = new Date(l.expected_month);
      return date >= q.start && date <= q.end;
    });
    
    const wonListings = quarterListings.filter(l => l.outcome === 'won');
    const lostListings = quarterListings.filter(l => l.outcome === 'lost');
    
    return {
      label: q.label,
      count: quarterListings.length,
      totalGCI: quarterListings.reduce((sum, l) => sum + calculateGCI(l.estimated_value), 0),
      wonGCI: wonListings.reduce((sum, l) => sum + calculateGCI(l.estimated_value), 0),
      wonCount: wonListings.length,
      wonListings: wonListings,
      lostGCI: lostListings.reduce((sum, l) => sum + calculateGCI(l.estimated_value), 0),
      lostCount: lostListings.length,
      lostListings: lostListings,
      isCurrent: q.isCurrent,
      funnelData: {
        call: quarterListings.filter(l => l.stage === 'call').length,
        vap: quarterListings.filter(l => l.stage === 'vap').length,
        map: quarterListings.filter(l => l.stage === 'map').length,
        lap: quarterListings.filter(l => l.stage === 'lap').length,
        won: wonListings.length,
      }
    };
    });
  }, [listings, allQuarters]);

  // Calculate monthly data for the 6 visible months
  const monthlyData = useMemo(() => {
    return visibleQuarters?.flatMap(quarter => 
    quarter.months.map(month => {
      const monthListings = listings.filter(l => {
        if (!l.expected_month) return false;
        const listingDate = new Date(l.expected_month);
        return (
          listingDate.getMonth() === month.date.getMonth() &&
          listingDate.getFullYear() === month.date.getFullYear()
        );
      });
      
      const wonListings = monthListings.filter(l => l.outcome === 'won');
      const lostListings = monthListings.filter(l => l.outcome === 'lost');
      
      return {
        label: format(month.date, 'MMM yyyy'),
        count: monthListings.length,
        totalGCI: monthListings.reduce((sum, l) => sum + calculateGCI(l.estimated_value), 0),
        wonGCI: wonListings.reduce((sum, l) => sum + calculateGCI(l.estimated_value), 0),
        wonCount: wonListings.length,
        wonListings: wonListings,
        lostGCI: lostListings.reduce((sum, l) => sum + calculateGCI(l.estimated_value), 0),
        lostCount: lostListings.length,
        lostListings: lostListings,
        isCurrent: month.isCurrent,
        funnelData: {
          call: monthListings.filter(l => l.stage === 'call').length,
          vap: monthListings.filter(l => l.stage === 'vap').length,
          map: monthListings.filter(l => l.stage === 'map').length,
          lap: monthListings.filter(l => l.stage === 'lap').length,
          won: wonListings.length,
        }
      };
    })
    ) || [];
  }, [listings, visibleQuarters]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'quarterly' | 'monthly')}>
          <TabsList className="grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>
          
          <TabsContent value="quarterly" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quarterlyData.map((q) => (
                <Card key={q.label} className={q.isCurrent ? 'border-2 border-primary' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      {q.label}
                      {q.isCurrent && <Badge variant="secondary" className="text-xs">Current</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Opportunities</span>
                      <span className="text-2xl font-bold">{q.count}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total GCI</span>
                      <span className="text-lg font-semibold text-primary">{formatGCI(q.totalGCI)}</span>
                    </div>
                    
                    <Separator />
                    
                    {/* WON Section - Clickable */}
                    <div>
                      <button
                        onClick={() => handleSectionClick(`${q.label}-won`)}
                        className={cn(
                          "w-full flex items-center justify-between text-base py-1 hover:bg-muted/50 rounded px-2 -mx-2 transition-colors",
                          q.wonCount === 0 && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={q.wonCount === 0}
                      >
                        <div className="flex items-center gap-2">
                          {expandedSection === `${q.label}-won` ? (
                            <ChevronDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          )}
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">WON:</span>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {q.wonCount} ({formatGCI(q.wonGCI)})
                        </span>
                      </button>
                      
                      {/* Expanded WON listings */}
                      {expandedSection === `${q.label}-won` && q.wonCount > 0 && (
                        <div className="mt-2 space-y-2 pl-6">
                          {groupListingsBySalesperson(q.wonListings).map((group) => (
                            <div key={group.userId} className="text-xs space-y-1">
                              <div className="font-medium text-emerald-600 dark:text-emerald-400">
                                {group.name} ({group.listings.length})
                              </div>
                              <div className="pl-2 space-y-0.5">
                                {group.listings.map((listing) => (
                                  <div key={listing.id} className="text-muted-foreground">
                                    • {listing.address} - {formatGCI(calculateGCI(listing.estimated_value))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* LOST Section - Clickable */}
                    <div>
                      <button
                        onClick={() => handleSectionClick(`${q.label}-lost`)}
                        className={cn(
                          "w-full flex items-center justify-between text-base py-1 hover:bg-muted/50 rounded px-2 -mx-2 transition-colors",
                          q.lostCount === 0 && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={q.lostCount === 0}
                      >
                        <div className="flex items-center gap-2">
                          {expandedSection === `${q.label}-lost` ? (
                            <ChevronDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                          <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                          <span className="font-medium text-red-600 dark:text-red-400">LOST:</span>
                        </div>
                        <span className="font-bold text-red-600 dark:text-red-400">
                          {q.lostCount} ({formatGCI(q.lostGCI)})
                        </span>
                      </button>
                      
                      {/* Expanded LOST listings */}
                      {expandedSection === `${q.label}-lost` && q.lostCount > 0 && (
                        <div className="mt-2 space-y-2 pl-6">
                          {groupListingsBySalesperson(q.lostListings).map((group) => (
                            <div key={group.userId} className="text-xs space-y-1">
                              <div className="font-medium text-red-600 dark:text-red-400">
                                {group.name} ({group.listings.length})
                              </div>
                              <div className="pl-2 space-y-0.5">
                                {group.listings.map((listing) => (
                                  <div key={listing.id} className="text-muted-foreground">
                                    • {listing.address} - {formatGCI(calculateGCI(listing.estimated_value))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <QuarterFunnelChart data={q.funnelData} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="monthly" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {monthlyData.map((m) => (
                <Card key={m.label} className={m.isCurrent ? 'border-2 border-primary' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-medium flex items-center justify-between">
                      {m.label}
                      {m.isCurrent && <Badge variant="secondary" className="text-[10px]">Current</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Opportunities</span>
                      <span className="text-lg font-bold">{m.count}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total GCI</span>
                      <span className="text-sm font-semibold text-primary">{formatGCI(m.totalGCI)}</span>
                    </div>
                    
                    <Separator />
                    
                    {/* WON Section - Clickable */}
                    <div>
                      <button
                        onClick={() => handleSectionClick(`${m.label}-won`)}
                        className={cn(
                          "w-full flex items-center justify-between text-sm py-0.5 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors",
                          m.wonCount === 0 && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={m.wonCount === 0}
                      >
                        <div className="flex items-center gap-1">
                          {expandedSection === `${m.label}-won` ? (
                            <ChevronDown className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          )}
                          <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">WON:</span>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {m.wonCount} ({formatGCI(m.wonGCI)})
                        </span>
                      </button>
                      
                      {/* Expanded WON listings */}
                      {expandedSection === `${m.label}-won` && m.wonCount > 0 && (
                        <div className="mt-1 space-y-1 pl-4">
                          {groupListingsBySalesperson(m.wonListings).map((group) => (
                            <div key={group.userId} className="text-[10px] space-y-0.5">
                              <div className="font-medium text-emerald-600 dark:text-emerald-400">
                                {group.name} ({group.listings.length})
                              </div>
                              <div className="pl-2 space-y-0.5">
                                {group.listings.map((listing) => (
                                  <div key={listing.id} className="text-muted-foreground truncate">
                                    • {listing.address}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* LOST Section - Clickable */}
                    <div>
                      <button
                        onClick={() => handleSectionClick(`${m.label}-lost`)}
                        className={cn(
                          "w-full flex items-center justify-between text-sm py-0.5 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors",
                          m.lostCount === 0 && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={m.lostCount === 0}
                      >
                        <div className="flex items-center gap-1">
                          {expandedSection === `${m.label}-lost` ? (
                            <ChevronDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-red-600 dark:text-red-400" />
                          )}
                          <div className="h-2 w-2 rounded-full bg-red-500"></div>
                          <span className="font-medium text-red-600 dark:text-red-400">LOST:</span>
                        </div>
                        <span className="font-bold text-red-600 dark:text-red-400">
                          {m.lostCount} ({formatGCI(m.lostGCI)})
                        </span>
                      </button>
                      
                      {/* Expanded LOST listings */}
                      {expandedSection === `${m.label}-lost` && m.lostCount > 0 && (
                        <div className="mt-1 space-y-1 pl-4">
                          {groupListingsBySalesperson(m.lostListings).map((group) => (
                            <div key={group.userId} className="text-[10px] space-y-0.5">
                              <div className="font-medium text-red-600 dark:text-red-400">
                                {group.name} ({group.listings.length})
                              </div>
                              <div className="pl-2 space-y-0.5">
                                {group.listings.map((listing) => (
                                  <div key={listing.id} className="text-muted-foreground truncate">
                                    • {listing.address}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <QuarterFunnelChart data={m.funnelData} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
