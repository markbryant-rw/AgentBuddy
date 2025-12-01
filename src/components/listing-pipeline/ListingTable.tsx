import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Listing } from '@/hooks/useListingPipeline';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { MoreVertical, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ListingTableProps {
  listings: Listing[];
  onListingClick: (listing: Listing) => void;
  onUpdate: (id: string, updates: Partial<Listing>) => void;
  onDelete: (id: string) => void;
}

export const ListingTable = ({ listings, onListingClick, onUpdate, onDelete }: ListingTableProps) => {
  const daysSinceContact = (lastContact: string | null) => {
    if (!lastContact) return 999;
    return differenceInDays(new Date(), new Date(lastContact));
  };

  const handleMarkWon = (listing: Listing) => {
    onUpdate(listing.id, { outcome: 'won' });
  };

  const handleMarkLost = (listing: Listing) => {
    onUpdate(listing.id, { outcome: 'lost' });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="w-24">Warmth</TableHead>
              <TableHead className="w-32">Stage</TableHead>
              <TableHead className="w-28">Confidence</TableHead>
              <TableHead className="w-32">Expected</TableHead>
              <TableHead className="w-32">Last Contact</TableHead>
              <TableHead className="w-24 text-right">Value</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No listings found
                </TableCell>
              </TableRow>
            ) : (
              listings.map((listing) => {
                const daysSince = daysSinceContact(listing.last_contact);
                
                return (
                  <TableRow
                    key={listing.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onListingClick(listing)}
                  >
                    <TableCell className="font-medium">{listing.address}</TableCell>
                    <TableCell className="text-muted-foreground">{listing.vendor_name}</TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          listing.warmth === 'hot' && 'bg-red-500 hover:bg-red-600',
                          listing.warmth === 'warm' && 'bg-orange-500 hover:bg-orange-600',
                          listing.warmth === 'cold' && 'bg-blue-500 hover:bg-blue-600'
                        )}
                      >
                        {listing.warmth}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {listing.stage?.replace('_', ' ') || 'call'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={cn(
                              'h-3 w-3',
                              i <= (listing.likelihood || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            )}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {listing.expected_month
                        ? new Date(listing.expected_month).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {listing.last_contact ? (
                        <span
                          className={cn(
                            daysSince > 14 && 'text-red-500',
                            daysSince > 7 && daysSince <= 14 && 'text-orange-500',
                            daysSince <= 7 && 'text-green-500'
                          )}
                        >
                          {formatDistanceToNow(new Date(listing.last_contact), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {listing.estimated_value
                        ? `$${(listing.estimated_value / 1000).toFixed(0)}k`
                        : '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onListingClick(listing)}>
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkWon(listing)}>
                            Mark as Won
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleMarkLost(listing)}>
                            Mark as Lost
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => onDelete(listing.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
