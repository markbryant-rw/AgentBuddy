import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Bell } from 'lucide-react';
import { Listing } from '@/hooks/useListingPipeline';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currencyUtils';
import { useTeamMembers } from '@/hooks/useTeamMembers';

interface ListingCardProps {
  listing: Listing;
  onClick: () => void;
  onUpdate: (id: string, updates: Partial<Listing>) => void;
  onDelete: (id: string) => void;
}

const warmthEmoji = {
  hot: '🔥',
  warm: '☀️',
  cold: '❄️',
};

const stageLabels: Record<string, string> = {
  call: 'Call/SMS',
  vap: 'VAP (Virtual Appraisal)',
  map: 'MAP (Market Appraisal)',
  lap: 'LAP (Listing Appointment)',
  won: 'WON',
  lost: 'LOST',
};

const stageBadgeColors: Record<string, string> = {
  call: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  vap: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  map: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  lap: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  won: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// Color code cards by stage
const stageCardColors: Record<string, string> = {
  call: 'bg-blue-50 border-blue-300 dark:bg-blue-950/30 dark:border-blue-800',
  vap: 'bg-purple-50 border-purple-300 dark:bg-purple-950/30 dark:border-purple-800',
  map: 'bg-orange-50 border-orange-300 dark:bg-orange-950/30 dark:border-orange-800',
  lap: 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800',
  won: 'bg-green-50 border-green-400 dark:bg-green-950/30 dark:border-green-800',
  lost: 'bg-gray-100 border-gray-400 dark:bg-gray-900/30 dark:border-gray-700',
};

export const ListingCard = ({ listing, onClick }: ListingCardProps) => {
  const { members } = useTeamMembers();
  
  // Determine card color based on outcome first, then stage
  let cardColorClass = '';
  if (listing.outcome === 'won') {
    cardColorClass = 'bg-green-50 border-green-400 dark:bg-green-950/30 dark:border-green-800';
  } else if (listing.outcome === 'lost') {
    cardColorClass = 'bg-gray-100 border-gray-400 dark:bg-gray-900/30 dark:border-gray-700';
  } else if (listing.stage) {
    cardColorClass = stageCardColors[listing.stage] || '';
  }
  
  // Check if follow-up is needed (7+ days since last contact)
  const needsFollowUp = listing.last_contact 
    ? differenceInDays(new Date(), new Date(listing.last_contact)) >= 7
    : true; // No contact date means definitely needs follow-up
  
  // Find assigned team member
  const assignedMember = listing.assigned_to 
    ? members.find(m => m.id === listing.assigned_to)
    : null;
  
  // Simplified layout for WON/LOST listings
  const isWonOrLost = listing.outcome === 'won' || listing.outcome === 'lost';
  
  if (isWonOrLost) {
    return (
      <Card 
        className={cn(
          "p-3 hover:shadow-md transition-all duration-200 cursor-pointer border h-[56px] relative",
          cardColorClass
        )}
        onClick={onClick}
      >
        {/* Assigned person avatar */}
        {assignedMember && (
          <div className="absolute -top-2 -left-2 z-10">
            <Avatar className="h-6 w-6 border-2 border-background">
              <AvatarImage src={assignedMember.avatar_url || ''} />
              <AvatarFallback className="text-[10px]">
                {assignedMember.full_name?.charAt(0) || assignedMember.email?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
        
        <div className="flex flex-col justify-center h-full">
          <h3 className="font-semibold text-sm line-clamp-1">
            {listing.address}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {listing.vendor_name}
          </p>
        </div>
      </Card>
    );
  }
  
  return (
    <Card 
      className={cn(
        "p-1.5 hover:shadow-md transition-all duration-200 cursor-pointer border h-[56px] relative",
        cardColorClass
      )}
      onClick={onClick}
    >
      {/* Assigned person avatar */}
      {assignedMember && (
        <div className="absolute -top-2 -left-2 z-10">
          <Avatar className="h-5 w-5 border-2 border-background">
            <AvatarImage src={assignedMember.avatar_url || ''} />
            <AvatarFallback className="text-[8px]">
              {assignedMember.full_name?.charAt(0) || assignedMember.email?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      {/* Follow-up notification badge */}
      {needsFollowUp && (
        <div className="absolute -top-1 -right-1 z-10">
          <div className="relative">
            <Bell className="h-3 w-3 text-orange-600 fill-orange-600 animate-pulse" />
            <span className="absolute top-0 right-0 block h-1 w-1 rounded-full bg-red-600 ring-1 ring-background" />
          </div>
        </div>
      )}
      
      <div className="flex flex-col justify-between h-full">
        {/* Row 1: Address + Stars inline */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-start gap-0.5 flex-1 min-w-0">
            <span className="text-sm leading-none pt-0.5">{warmthEmoji[listing.warmth]}</span>
            <h3 className="font-semibold text-xs line-clamp-1 flex-1">
              {listing.address}
            </h3>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-2 w-2',
                  i < listing.likelihood
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-muted text-muted'
                )}
              />
            ))}
          </div>
        </div>
        
        {/* Row 2: Vendor • Value • Last contact */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="truncate max-w-[100px]">{listing.vendor_name}</span>
          {listing.estimated_value && (
            <>
              <span>•</span>
              <span className="font-semibold text-foreground">{formatCurrency(listing.estimated_value)}</span>
            </>
          )}
          <span>•</span>
          <span className={cn(
            "whitespace-nowrap",
            needsFollowUp && "text-orange-600 font-medium"
          )}>
            {listing.last_contact
              ? formatDistanceToNow(new Date(listing.last_contact), { addSuffix: true })
              : 'No contact'}
          </span>
        </div>
        
        {/* Row 3: Stage badge */}
        {listing.stage && (
          <div className="flex items-center">
            <Badge 
              variant="secondary" 
              className={cn("text-[9px] h-3.5 px-1", stageBadgeColors[listing.stage])}
            >
              Stage: {stageLabels[listing.stage]}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};
