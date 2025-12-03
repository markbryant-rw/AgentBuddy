import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Star, BarChart3, ChevronDown, ChevronRight, Map } from 'lucide-react';
import { toast } from 'sonner';
import { useListingPipeline, Listing } from '@/hooks/useListingPipeline';
import { useListingGeocoding } from '@/hooks/useListingGeocoding';
import { useAuth } from '@/hooks/useAuth';
import { DraggableListingCard } from '@/components/listing-pipeline/DraggableListingCard';
import { ListingFilterBar } from '@/components/listing-pipeline/ListingFilterBar';
import { ListingViewSelector } from '@/components/listing-pipeline/ListingViewSelector';
import { ListingPipelineAnalyticsEnhanced } from '@/components/listing-pipeline/ListingPipelineAnalyticsEnhanced';
import { ListingDetailDialog } from '@/components/ListingDetailDialog';
import { ListingTable } from '@/components/listing-pipeline/ListingTable';
import { CardDescription } from '@/components/ui/card';
import { format, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { DndContext, DragEndEvent, closestCorners, PointerSensor, useSensor, useSensors, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { ListingCard } from '@/components/listing-pipeline/ListingCard';
import { Badge } from '@/components/ui/badge';
import { QuarterlyKanbanSection } from '@/components/listing-pipeline/QuarterlyKanbanSection';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { QuarterNavigator } from '@/components/listing-pipeline/QuarterNavigator';
import { OpportunityMapModal } from '@/components/listing-pipeline/OpportunityMapModal';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StarRating } from '@/components/ui/star-rating';
import { useTeamMembers } from '@/hooks/useTeamMembers';

export default function ListingPipeline() {
  const { listings, loading, addListing, updateListing, deleteListing, stats } = useListingPipeline();
  const { usesFinancialYear, fyStartMonth, currentQuarter, getQuarterInfo } = useFinancialYear();
  const { geocodeAll, isGeocoding } = useListingGeocoding();
  const { members } = useTeamMembers();
  const { user } = useAuth();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [expandedQuarters, setExpandedQuarters] = useState<Set<string>>(new Set(['current']));
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set(['current']));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [quarterOffset, setQuarterOffset] = useState(0); // 0 = current+next, -1 = previous 2, +1 = future 2

  // Filter states
  const [warmthFilter, setWarmthFilter] = useState<string[]>([]);
  const [salespersonFilter, setSalespersonFilter] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [newListing, setNewListing] = useState<{
    address: string;
    vendor_name: string;
    suburb?: string;
    warmth: 'cold' | 'warm' | 'hot';
    likelihood: number;
    expected_month: string;
    last_contact: string;
    estimated_value?: number;
    assigned_to?: string;
  }>({
    address: '',
    vendor_name: '',
    suburb: '',
    warmth: 'cold',
    likelihood: 3,
    expected_month: format(new Date(), 'yyyy-MM-dd'),
    last_contact: format(new Date(), 'yyyy-MM-dd'),
    assigned_to: user?.id,
  });

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Apply warmth filter
    if (warmthFilter.length > 0) {
      result = result.filter(l => warmthFilter.includes(l.warmth));
    }

    // Apply salesperson filter
    if (salespersonFilter.length > 0) {
      result = result.filter(l => l.assigned_to && salespersonFilter.includes(l.assigned_to));
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.address.toLowerCase().includes(term) ||
        (l.vendor_name && l.vendor_name.toLowerCase().includes(term))
      );
    }

    return result;
  }, [listings, warmthFilter, salespersonFilter, searchTerm]);

  // Auto-scroll when dragging card near edges
  useEffect(() => {
    if (!isDraggingCard) return;

    let animationFrameId: number;

    const handleAutoScroll = () => {
      const container = document.querySelector('[data-kanban-scroll]') as HTMLElement;
      if (!container) return;

      const mouseX = (window.event as MouseEvent)?.clientX;
      if (!mouseX) return;

      const rect = container.getBoundingClientRect();
      const distanceFromLeft = mouseX - rect.left;
      const distanceFromRight = rect.right - mouseX;

      const EDGE_THRESHOLD = 100;
      const SCROLL_SPEED = 15;

      if (distanceFromLeft < EDGE_THRESHOLD && distanceFromLeft > 0) {
        container.scrollLeft -= SCROLL_SPEED;
      } else if (distanceFromRight < EDGE_THRESHOLD && distanceFromRight > 0) {
        container.scrollLeft += SCROLL_SPEED;
      }

      animationFrameId = requestAnimationFrame(handleAutoScroll);
    };

    animationFrameId = requestAnimationFrame(handleAutoScroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isDraggingCard]);

  // Generate 6 months (2 quarters) based on financial year settings and offset
  const quarters = useMemo(() => {
    // Get current quarter info
    const currentQ = currentQuarter.quarter;
    const currentYear = currentQuarter.year;
    
    // Calculate which quarters to display based on offset
    // offset 0: current + next
    // offset -1: prev prev + prev (2 quarters back)
    // offset +1: next next + next next (2 quarters ahead)
    
    let firstQ = currentQ + (quarterOffset * 2);
    let firstYear = currentYear;
    
    // Handle year wrapping
    while (firstQ < 1) {
      firstQ += 4;
      firstYear -= 1;
    }
    while (firstQ > 4) {
      firstQ -= 4;
      firstYear += 1;
    }
    
    // Calculate second quarter (always firstQ + 1)
    let secondQ = firstQ + 1;
    let secondYear = firstYear;
    if (secondQ > 4) {
      secondQ = 1;
      secondYear += 1;
    }
    
    // Get quarter info
    const firstQInfo = getQuarterInfo(firstQ, firstYear);
    const secondQInfo = getQuarterInfo(secondQ, secondYear);
    
    // Generate 6 months (3 per quarter)
    const allMonths = [];
    
    // First quarter - 3 months
    for (let i = 0; i < 3; i++) {
      const date = addMonths(firstQInfo.startDate, i);
      allMonths.push({
        id: format(date, 'yyyy-MM-dd'),
        label: format(date, 'MMM'),
        date: date,
        isCurrent: quarterOffset === 0 && i === 0,
        isPast: date < new Date(),
      });
    }
    
    // Second quarter - 3 months
    for (let i = 0; i < 3; i++) {
      const date = addMonths(secondQInfo.startDate, i);
      allMonths.push({
        id: format(date, 'yyyy-MM-dd'),
        label: format(date, 'MMM'),
        date: date,
        isCurrent: false,
        isPast: date < new Date(),
      });
    }
    
    // Quarter colors that cycle based on quarter number (1-4)
    const quarterColorMap: Record<number, string> = {
      1: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
      2: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
      3: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
      4: 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
    };
    
    return [
      {
        id: `Q${firstQ}-${firstYear}`,
        label: firstQInfo.label,
        color: quarterColorMap[firstQ],
        months: allMonths.slice(0, 3),
      },
      {
        id: `Q${secondQ}-${secondYear}`,
        label: secondQInfo.label,
        color: quarterColorMap[secondQ],
        months: allMonths.slice(3, 6),
      },
    ];
  }, [currentQuarter, getQuarterInfo, quarterOffset]);

  const getListingsForMonth = (monthDate: Date) => {
    const monthListings = filteredListings.filter(listing => {
      if (!listing.expected_month) return false;
      const listingDate = new Date(listing.expected_month);
      return (
        listingDate.getMonth() === monthDate.getMonth() &&
        listingDate.getFullYear() === monthDate.getFullYear()
      );
    });

    // Default sort: WON → Hot → Warm → Cold → LOST
    return [...monthListings].sort((a, b) => {
      // Primary sort by outcome/warmth priority
      const getPriority = (listing: Listing) => {
        if (listing.outcome === 'won') return 0;
        if (listing.outcome === 'lost') return 4;
        if (listing.warmth === 'hot') return 1;
        if (listing.warmth === 'warm') return 2;
        return 3; // cold
      };

      const aPriority = getPriority(a);
      const bPriority = getPriority(b);

      return aPriority - bPriority;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (typeof event.active.id !== 'string') {
      console.error('Expected string ID for drag event');
      return;
    }
    setActiveId(event.active.id);
    setIsDraggingCard(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setIsDraggingCard(false);

    if (!over) return;

    if (typeof active.id !== 'string' || typeof over.id !== 'string') {
      console.error('Expected string IDs for drag event');
      return;
    }

    const listingId = active.id;
    let newMonthId = over.id;

    // If we dropped on another listing instead of the column, find that listing's month
    const overListing = listings.find((l) => l.id === newMonthId);
    if (overListing) {
      newMonthId = overListing.expected_month;
    }

    const listing = listings.find((l) => l.id === listingId);
    if (!listing) {
      console.error('Listing not found:', listingId);
      toast.error('Could not find listing');
      return;
    }

    if (listing.expected_month === newMonthId) {
      return;
    }

    console.log(`Moving listing from ${listing.expected_month} to ${newMonthId}`);

    try {
      await updateListing(listingId, { expected_month: newMonthId });
      toast.success(`Moved to ${format(new Date(newMonthId), 'MMM yyyy')}`);
    } catch (error: any) {
      console.error('Failed to update listing:', error);
      toast.error(`Failed to move listing: ${error?.message || 'Please try again.'}`);
    }
  };

  const activeListing = activeId 
    ? listings.find(l => l.id === activeId) 
    : null;

  const handleAddListing = async () => {
    await addListing(newListing);
    setAddDialogOpen(false);
    setNewListing({
      address: '',
      vendor_name: '',
      suburb: '',
      warmth: 'cold',
      likelihood: 3,
      expected_month: format(new Date(), 'yyyy-MM-dd'),
      last_contact: format(new Date(), 'yyyy-MM-dd'),
      estimated_value: undefined,
      assigned_to: user?.id,
    });
  };

  const handleCardClick = (listing: Listing) => {
    setSelectedListing(listing);
    setDetailOpen(true);
  };

  const toggleQuarter = (quarter: string) => {
    const newExpanded = new Set(expandedQuarters);
    if (newExpanded.has(quarter)) {
      newExpanded.delete(quarter);
    } else {
      newExpanded.add(quarter);
    }
    setExpandedQuarters(newExpanded);
  };

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const clearFilters = () => {
    setWarmthFilter([]);
    setSalespersonFilter([]);
    setSearchTerm('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading pipeline...</p>
      </div>
    );
  }


  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCorners} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setIsDraggingCard(false);
      }}
    >
      <div className="space-y-6 pb-20 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Opportunity Pipeline</h1>
            <p className="text-muted-foreground mt-1">Track potential opportunities through your sales funnel</p>
          </div>
        </div>

        {/* Combined Controls Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Left: Quarter Navigation */}
          <QuarterNavigator
            quarters={quarters}
            offset={quarterOffset}
            onNavigate={setQuarterOffset}
            compact
          />
          
          {/* Right: Analytics Toggle + Search and Filters */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Analytics Toggle */}
            <Button
              variant={showAnalytics ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            
            <ListingFilterBar
              warmthFilter={warmthFilter}
              salespersonFilter={salespersonFilter}
              searchTerm={searchTerm}
              teamMembers={members}
              onWarmthChange={setWarmthFilter}
              onSalespersonChange={setSalespersonFilter}
              onSearchChange={setSearchTerm}
              onClearFilters={clearFilters}
            />
          </div>
        </div>

        {/* Analytics section - appears below controls */}
        {showAnalytics && (
          <div className="animate-in slide-in-from-top duration-300">
            <ListingPipelineAnalyticsEnhanced 
              listings={filteredListings} 
              visibleQuarters={quarters}
            />
          </div>
        )}

        {/* Kanban View */}
        <div 
          data-kanban-scroll
          className="flex gap-3 h-[calc(100vh-280px)] overflow-x-auto pb-4"
        >
          {quarters.map((quarter) => (
            <QuarterlyKanbanSection
              key={quarter.id}
              quarter={quarter.label}
              quarterColor={quarter.color}
              months={quarter.months}
              getListingsForMonth={getListingsForMonth}
              onAddCard={(monthId) => {
                const monthDate = quarter.months.find(m => m.id === monthId)?.date;
                if (monthDate) {
                  setNewListing({
                    ...newListing,
                    expected_month: format(monthDate, 'yyyy-MM-dd'),
                  });
                  setAddDialogOpen(true);
                }
              }}
              renderCard={(listing) => (
                <DraggableListingCard
                  listing={listing}
                  onClick={() => handleCardClick(listing)}
                  onUpdate={updateListing}
                  onDelete={deleteListing}
                />
              )}
            />
          ))}
        </div>

        <DragOverlay>
          {activeListing && (
            <div className="rotate-3 opacity-95 shadow-2xl">
              <ListingCard 
                listing={activeListing}
                onClick={() => {}}
                onUpdate={() => {}}
                onDelete={() => {}}
              />
            </div>
          )}
        </DragOverlay>

        <ListingDetailDialog
          listing={selectedListing}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onUpdate={updateListing}
          onDelete={deleteListing}
        />

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl">Add New Opportunity</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-8rem)] pr-4">
              <form onSubmit={(e) => { e.preventDefault(); handleAddListing(); }} className="space-y-6">
                {/* Property Details */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                  <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Property Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Address <span className="text-destructive">*</span></Label>
                      <Input 
                        value={newListing.address}
                        onChange={(e) => setNewListing({ ...newListing, address: e.target.value })}
                        placeholder="123 Main St"
                        required
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Suburb</Label>
                      <Input 
                        value={newListing.suburb || ''}
                        onChange={(e) => setNewListing({ ...newListing, suburb: e.target.value })}
                        placeholder="Suburb"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-sm font-medium">Vendor Name <span className="text-destructive">*</span></Label>
                      <Input 
                        value={newListing.vendor_name}
                        onChange={(e) => setNewListing({ ...newListing, vendor_name: e.target.value })}
                        placeholder="John Smith"
                        required
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Opportunity Information */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                  <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Opportunity Information</h3>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Stage</Label>
                    <Select 
                      value="call"
                      onValueChange={() => {}}
                      disabled
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Call</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">New opportunities start at "Call" stage</p>
                  </div>
                </div>

                {/* Tracking */}
                <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                  <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Tracking</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Warmth <span className="text-destructive">*</span></Label>
                      <Select 
                        value={newListing.warmth}
                        onValueChange={(value: 'cold' | 'warm' | 'hot') => setNewListing({ ...newListing, warmth: value })}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hot">🔥 Hot</SelectItem>
                          <SelectItem value="warm">☀️ Warm</SelectItem>
                          <SelectItem value="cold">❄️ Cold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Likelihood <span className="text-destructive">*</span></Label>
                      <div className="pt-2">
                        <StarRating 
                          value={newListing.likelihood}
                          onChange={(value) => setNewListing({ ...newListing, likelihood: value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Last Contact <span className="text-destructive">*</span></Label>
                      <Input 
                        type="date"
                        value={newListing.last_contact}
                        onChange={(e) => setNewListing({ ...newListing, last_contact: e.target.value })}
                        required
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Expected Month</Label>
                      <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center text-sm font-medium">
                        {format(new Date(newListing.expected_month), 'MMMM yyyy')}
                      </div>
                      <p className="text-xs text-muted-foreground">Based on the column you clicked "Add" in</p>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-sm font-medium">Estimated Value</Label>
                      <Input 
                        type="number"
                        placeholder="e.g., 525000"
                        onChange={(e) => setNewListing({ ...newListing, estimated_value: e.target.value ? Number(e.target.value) : undefined })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-sm font-medium">Lead Salesperson</Label>
                      <Select 
                        value={newListing.assigned_to || ''}
                        onValueChange={(value) => setNewListing({ ...newListing, assigned_to: value })}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select lead salesperson" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.full_name || member.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)} className="px-6">
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    disabled={!newListing.address || !newListing.vendor_name}
                    className="px-6"
                  >
                    Add Opportunity
                  </Button>
                </div>
              </form>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <OpportunityMapModal
          open={showMapModal}
          onOpenChange={setShowMapModal}
          listings={filteredListings}
          searchQuery={searchTerm}
          onListingSelect={(listing) => {
            setSelectedListing(listing);
            setDetailOpen(true);
            setShowMapModal(false);
          }}
          onEditClick={(listing) => {
            setSelectedListing(listing);
            setDetailOpen(true);
            setShowMapModal(false);
          }}
        />
      </div>
    </DndContext>
  );
}
