import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StarRating } from '@/components/ui/star-rating';
import { Listing, ListingComment } from '@/hooks/useListingPipeline';
import { useAssignableTeamMembers } from '@/hooks/useAssignableTeamMembers';
import { useLeadSources } from '@/hooks/useLeadSources';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import LocationFixSection from '@/components/shared/LocationFixSection';
import { OwnersEditor, Owner, legacyToOwners, ownersToLegacy, getPrimaryOwner } from '@/components/shared/OwnersEditor';
import { BeaconPropertyTab } from '@/components/shared/BeaconPropertyTab';
import { FileText, Activity } from 'lucide-react';

interface ListingDetailDialogProps {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, updates: Partial<Listing>) => void;
  onDelete: (id: string) => void;
}

export const ListingDetailDialog = ({ listing, open, onOpenChange, onUpdate, onDelete }: ListingDetailDialogProps) => {
  const [editedListing, setEditedListing] = useState<Listing | null>(null);
  const [comments, setComments] = useState<ListingComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showStageConfirm, setShowStageConfirm] = useState(false);
  const [showWonDialog, setShowWonDialog] = useState(false);
  const [showLossReasonDialog, setShowLossReasonDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [lossReason, setLossReason] = useState('');
  const [moveToTC, setMoveToTC] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const { user } = useAuth();
  const { team } = useTeam();
  const { assignableMembers, isLoading: membersLoading } = useAssignableTeamMembers();
  const { activeLeadSources, isLoading: leadSourcesLoading } = useLeadSources();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (listing) {
      // Initialize owners from existing data
      const owners = legacyToOwners(listing.vendor_name || '', undefined, undefined, listing.owners);
      setEditedListing({ ...listing, owners });
      fetchComments();
    }
  }, [listing]);

  const fetchComments = async () => {
    if (!listing) return;
    try {
      const { data: commentsData, error } = await supabase.from('listing_comments').select('*').eq('listing_id', listing.id).order('created_at', { ascending: true });
      if (error) throw error;
      const userIds = [...new Set(commentsData?.map((c) => c.user_id) || [])];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
        if (profilesData) {
          const profilesMap = new Map(profilesData.map(p => [p.id, p]));
          const commentsWithProfiles = commentsData?.map((comment) => ({ ...comment, profiles: profilesMap.get(comment.user_id) }));
          setComments(commentsWithProfiles || []);
        } else {
          setComments(commentsData || []);
        }
      } else {
        setComments(commentsData || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async () => {
    if (!listing || !user || !newComment.trim()) return;
    try {
      await supabase.from('listing_comments').insert({ listing_id: listing.id, user_id: user.id, comment: newComment.trim() });
      fetchComments();
      setNewComment('');
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleMarkAsWon = () => {
    setShowWonDialog(true);
  };

  const confirmWon = async (moveToTC: boolean) => {
    const updates = { ...editedListing!, outcome: 'won' as const };
    onUpdate(editedListing!.id, updates);
    setShowWonDialog(false);
    
    // Close the detail dialog immediately to prevent any map-related issues
    onOpenChange(false);

    // If this opportunity came from an appraisal, mark it WON too
    if ((editedListing as any)?.appraisal_id) {
      try {
        await supabase
          .from('logged_appraisals')
          .update({ 
            outcome: 'WON',
            stage: 'LAP',
            intent: 'high',
            converted_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', (editedListing as any).appraisal_id);
        
        queryClient.invalidateQueries({ queryKey: ['logged_appraisals'] });
      } catch (error) {
        console.error('Failed to update linked appraisal:', error);
        // Don't fail the main operation
      }
    }
    
    if (moveToTC) {
      // Create transaction in Transaction Coordinating
      try {
        const transactionData = {
          team_id: editedListing!.team_id,
          created_by: user?.id,
          last_edited_by: user?.id,
          address: editedListing!.address,
          suburb: editedListing!.suburb || null,
          stage: 'signed',
          transaction_type: 'sale',
          warmth: 'active',
          on_hold: false,
          archived: false,
          lead_source: editedListing!.lead_source || null,
          vendor_names: editedListing!.vendor_name 
            ? [{ first_name: editedListing!.vendor_name, last_name: '' }] 
            : [],
          owners: (editedListing as any)?.owners?.length 
            ? (editedListing as any).owners 
            : editedListing!.vendor_name 
              ? [{ id: crypto.randomUUID(), name: editedListing!.vendor_name, is_primary: true }] 
              : [],
          listing_signed_date: new Date().toISOString().split('T')[0],
          listing_id: editedListing!.id, // Link to source opportunity
          property_id: (editedListing as any)?.property_id, // Copy property_id for lifecycle tracking
        };

        const { error } = await supabase
          .from('transactions')
          .insert(transactionData as any);

        if (error) throw error;
        
        // Invalidate transactions query to refresh Transaction Coordinating module
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        
        toast.success('🎉 Opportunity won and moved to Transaction Coordinating!');
      } catch (error) {
        console.error('Error creating transaction:', error);
        toast.error('Won marked but failed to create transaction');
      }
    } else {
      toast.success('🎉 Congratulations! Opportunity marked as WON');
    }
  };

  const handleMarkAsLost = () => {
    setShowLossReasonDialog(true);
  };

  const confirmLoss = () => {
    const updates = { 
      ...editedListing!, 
      outcome: 'lost' as const, 
      loss_reason: lossReason, 
      lost_date: new Date().toISOString().split('T')[0] 
    };
    onUpdate(editedListing!.id, updates);
    setShowLossReasonDialog(false);
    setLossReason('');
    toast.info('Opportunity marked as LOST');
    onOpenChange(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedListing) return;
    // Sync primary owner back to vendor_name for backward compatibility
    const legacy = ownersToLegacy(editedListing.owners || []);
    onUpdate(editedListing.id, { ...editedListing, vendor_name: legacy.vendor_name || editedListing.vendor_name });
    onOpenChange(false);
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!listing) return;
    onDelete(listing.id);
    setShowDeleteDialog(false);
    onOpenChange(false);
  };

  const handleLocationUpdated = (data: { address: string; suburb: string; latitude: number; longitude: number }) => {
    // Update local state with new coordinates
    setEditedListing(prev => prev ? {
      ...prev,
      address: data.address,
      suburb: data.suburb,
      latitude: data.latitude,
      longitude: data.longitude,
      geocode_error: null,
      geocoded_at: new Date().toISOString(),
    } : prev);
    // Invalidate cache to refresh map and list views
    queryClient.invalidateQueries({ queryKey: ['listings', team?.id] });
  };

  if (!editedListing) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader><DialogTitle className="text-2xl">Opportunity Details</DialogTitle></DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start h-auto bg-transparent border-b rounded-none mb-4">
              <TabsTrigger value="details" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2">
                <FileText className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="beacon" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none gap-2">
                <Activity className="h-4 w-4" />
                Beacon
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-0 flex-1">
              <ScrollArea className="max-h-[calc(90vh-12rem)] pr-4">
                <form onSubmit={handleSave} className="space-y-6">
              {/* Property Details Section */}
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Property Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Address <span className="text-destructive">*</span></Label>
                    <Input 
                      value={editedListing.address} 
                      onChange={(e) => setEditedListing({ ...editedListing, address: e.target.value })} 
                      required 
                      className="h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Suburb</Label>
                    <Input 
                      value={editedListing.suburb || ''} 
                      onChange={(e) => setEditedListing({ ...editedListing, suburb: e.target.value })} 
                      className="h-10" 
                    />
                  </div>
                  <div className="col-span-2">
                    <OwnersEditor
                      owners={editedListing.owners || []}
                      onChange={(owners) => {
                        const legacy = ownersToLegacy(owners);
                        setEditedListing({ 
                          ...editedListing, 
                          owners, 
                          vendor_name: legacy.vendor_name || editedListing.vendor_name 
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Lead Salesperson Section */}
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Lead Salesperson</h3>
                <div className="space-y-2">
                  <Select 
                    value={editedListing.assigned_to || ''}
                    onValueChange={(value) => setEditedListing({ ...editedListing, assigned_to: value || undefined })}
                    disabled={membersLoading || assignableMembers.length === 0}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={
                        membersLoading ? "Loading..." :
                        assignableMembers.length === 0 ? "No members available" :
                        "Select lead salesperson"
                      } />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {assignableMembers.map((member) => (
                        <SelectItem key={member.user_id} value={member.user_id}>
                          {member.full_name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Estimated Value and Lead Source Section */}
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Property Value & Source</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Estimated Value</Label>
                    <Input 
                      type="number" 
                      value={editedListing.estimated_value || ''} 
                      onChange={(e) => setEditedListing({ ...editedListing, estimated_value: e.target.value ? Number(e.target.value) : null })} 
                      placeholder="e.g., 525000" 
                      className="h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Lead Source</Label>
                    <Select 
                      value={editedListing.lead_source || ''}
                      onValueChange={(value) => setEditedListing({ ...editedListing, lead_source: value || undefined })}
                      disabled={leadSourcesLoading}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder={leadSourcesLoading ? "Loading..." : "Select lead source"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {activeLeadSources.map((source) => (
                          <SelectItem key={source.id} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Tracking Section */}
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Tracking</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Warmth <span className="text-destructive">*</span></Label>
                    <Select value={editedListing.warmth} onValueChange={(value: any) => setEditedListing({ ...editedListing, warmth: value })}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
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
                        value={editedListing.likelihood} 
                        onChange={(value) => setEditedListing({ ...editedListing, likelihood: value })} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Last Contact <span className="text-destructive">*</span></Label>
                    <Input 
                      type="date" 
                      value={editedListing.last_contact} 
                      onChange={(e) => setEditedListing({ ...editedListing, last_contact: e.target.value })} 
                      required 
                      className="h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Expected Month</Label>
                    <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center text-sm font-medium">
                      {format(new Date(editedListing.expected_month), 'MMMM yyyy')}
                    </div>
                    <p className="text-xs text-muted-foreground">Drag card to a different month to change</p>
                  </div>
                </div>
              </div>

              {/* Fix Location Section */}
              <LocationFixSection
                entityId={editedListing.id}
                entityType="listing"
                address={editedListing.address}
                suburb={editedListing.suburb || undefined}
                latitude={editedListing.latitude}
                longitude={editedListing.longitude}
                geocodeError={editedListing.geocode_error}
                geocodedAt={editedListing.geocoded_at}
                onLocationUpdated={handleLocationUpdated}
              />
              
              {/* Opportunity Information Section */}
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Opportunity Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label className="text-sm font-medium">Stage</Label>
                    <Select value={editedListing.stage || ''} onValueChange={(value) => setEditedListing({ ...editedListing, stage: value as any })}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select stage" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="vap">VAP</SelectItem>
                        <SelectItem value="map">MAP</SelectItem>
                        <SelectItem value="lap">LAP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Won/Lost Action Buttons or Status Display */}
                {editedListing.outcome === 'won' ? (
                  <div className="p-4 rounded-lg bg-emerald-50 border-2 border-emerald-500 text-center">
                    <div className="text-2xl font-bold text-emerald-700 mb-1">🎉 OPPORTUNITY WON!</div>
                    <p className="text-sm text-emerald-600">This opportunity has been marked as won</p>
                  </div>
                ) : editedListing.outcome === 'lost' ? (
                  <div className="p-4 rounded-lg bg-red-50 border-2 border-red-500 text-center">
                    <div className="text-2xl font-bold text-red-700 mb-1">✕ OPPORTUNITY LOST</div>
                    <p className="text-sm text-red-600">Reason: {editedListing.loss_reason || 'Not specified'}</p>
                    {editedListing.lost_date && (
                      <p className="text-xs text-red-500 mt-1">Lost on: {format(new Date(editedListing.lost_date), 'PPP')}</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      type="button"
                      onClick={handleMarkAsWon}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold"
                    >
                      ✓ Mark as WON
                    </Button>
                    <Button
                      type="button"
                      onClick={handleMarkAsLost}
                      variant="destructive"
                      className="h-12 text-base font-semibold"
                    >
                      ✕ Mark as LOST
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <h3 className="text-base font-semibold text-foreground border-b border-border pb-2">Comments</h3>
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-background">
                      <Avatar className="h-8 w-8"><AvatarImage src={comment.profiles?.avatar_url || ''} /><AvatarFallback>{comment.profiles?.full_name?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                      <div className="flex-1"><div className="flex items-center gap-2"><span className="font-medium text-sm">{comment.profiles?.full_name || 'Unknown User'}</span><span className="text-xs text-muted-foreground">{format(new Date(comment.created_at), 'PPp')}</span></div><p className="text-sm mt-1">{comment.comment}</p></div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2"><Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(); } }} className="h-10" /><Button type="button" onClick={addComment} className="px-6">Add</Button></div>
              </div>
              
              <div className="flex justify-between gap-3 pt-6 border-t">
                <Button type="button" variant="destructive" onClick={handleDelete} className="px-6">Delete</Button>
                <div className="flex gap-3"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="px-6">Cancel</Button><Button type="submit" className="px-6">Save Changes</Button></div>
              </div>
                </form>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="beacon" className="mt-0 flex-1">
              <ScrollArea className="max-h-[calc(90vh-12rem)] pr-4">
                {(editedListing as any)?.property_id ? (
                  <BeaconPropertyTab 
                    propertyId={(editedListing as any).property_id}
                    appraisalId={(editedListing as any)?.appraisal_id}
                    module="opportunity"
                    fallbackStats={{
                      propensity_score: (editedListing as any).beacon_propensity_score || 0,
                      is_hot_lead: (editedListing as any).beacon_is_hot_lead || false,
                      last_activity: (editedListing as any).beacon_last_activity || undefined,
                    }}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No property linked</p>
                    <p className="text-sm mt-1">This opportunity needs a linked property to show Beacon reports.</p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      {/* Won Dialog */}
      <AlertDialog open={showWonDialog} onOpenChange={setShowWonDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">🎉 Congratulations!</AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              You've won this opportunity! Would you like to move it to Transaction Coordinating to begin managing the sale?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-3 py-4">
            <input
              type="checkbox"
              id="moveToTC"
              checked={moveToTC}
              onChange={(e) => setMoveToTC(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="moveToTC" className="text-sm font-medium cursor-pointer">
              Yes, move to Transaction Coordinating
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMoveToTC(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmWon(moveToTC)} className="bg-emerald-600 hover:bg-emerald-700">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Lost Dialog */}
      <AlertDialog open={showLossReasonDialog} onOpenChange={setShowLossReasonDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as LOST</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for losing this opportunity. This helps improve future performance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., Went with another agent, pricing concerns, timing not right..."
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLossReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLoss} disabled={!lossReason.trim()}>
              Confirm Loss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Opportunity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this opportunity? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
