import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface JoinOfficeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinOfficeDialog({ open, onOpenChange }: JoinOfficeDialogProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [agencies, setAgencies] = useState<any[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const handleSearch = useCallback(async (term: string) => {
    const trimmedTerm = term.trim();
    
    if (!trimmedTerm) {
      setAgencies([]);
      return;
    }

    if (trimmedTerm.length < 2) {
      return;
    }

    setSearching(true);
    console.log('Searching for offices with term:', trimmedTerm);
    
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name, bio, is_archived')
        .ilike('name', `%${trimmedTerm}%`)
        .eq('is_archived', false)
        .limit(10);

      if (error) throw error;
      
      console.log(`Found ${data?.length || 0} offices matching "${trimmedTerm}"`, data);
      setAgencies(data || []);
      
      if (data && data.length === 0) {
        toast.info(`No offices found matching "${trimmedTerm}"`);
      }
    } catch (error) {
      console.error('Error searching agencies:', error);
      toast.error('Failed to search offices');
    } finally {
      setSearching(false);
    }
  }, []);

  // Auto-search with debounce
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      handleSearch(searchTerm);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, handleSearch]);

  const handleJoinOffice = async (agencyId: string, agencyName: string) => {
    if (!user) return;

    try {
      // Step 1: Get user's current team membership (only one team per user now)
      const { data: currentMemberships, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, access_level, teams!inner(id, name, agency_id, created_by)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) throw memberError;

      // Step 2: Check if user is a team admin
      const isTeamAdmin = currentMemberships?.access_level === 'admin';
      const currentTeam = currentMemberships?.teams as any;
      const currentTeamId = currentMemberships?.team_id;

      // Step 3: If user is team admin, move entire team to new office
      if (isTeamAdmin && currentTeam) {
        setConfirmDialog({
          open: true,
          title: 'Move Your Team?',
          description: `This will move your entire team "${currentTeam.name}" to ${agencyName}. All team members will be transferred to the new office.`,
          onConfirm: async () => {
            try {
              const { error: updateError } = await supabase
                .from('teams')
                .update({ agency_id: agencyId })
                .eq('id', currentTeamId);

              if (updateError) throw updateError;

              toast.success(`Your team "${currentTeam.name}" has been moved to ${agencyName}!`);
              setConfirmDialog(null);
              onOpenChange(false);
              window.location.reload();
            } catch (error) {
              console.error('Error moving team:', error);
              toast.error('Failed to move team');
              setConfirmDialog(null);
            }
          }
        });
        return;
      }

      // Step 4: If non-admin, leave current team and become solo agent
      if (currentTeam) {
        setConfirmDialog({
          open: true,
          title: 'Leave Your Current Team?',
          description: `You will leave your current team "${currentTeam.name}" and join ${agencyName} as a solo agent. You can join another team later if needed.`,
          onConfirm: async () => {
            try {
              // Remove from old team
              await supabase
                .from('team_members')
                .delete()
                .eq('team_id', currentTeamId)
                .eq('user_id', user.id);

              // Set user as solo agent in the office
              await supabase
                .from('profiles')
                .update({ 
                  primary_team_id: null,
                  office_id: agencyId 
                })
                .eq('id', user.id);

              toast.success(`Successfully joined ${agencyName}!`);
              setConfirmDialog(null);
              onOpenChange(false);
              window.location.reload();
            } catch (error) {
              console.error('Error leaving team:', error);
              toast.error('Failed to leave team');
              setConfirmDialog(null);
            }
          }
        });
        return;
      }

      // Step 5: Set user as solo agent in the office (no team to leave)
      await supabase
        .from('profiles')
        .update({ 
          primary_team_id: null,
          office_id: agencyId 
        })
        .eq('id', user.id);

      toast.success(`Successfully joined ${agencyName}!`);
      onOpenChange(false);
      window.location.reload();

    } catch (error) {
      console.error('Error joining office:', error);
      toast.error('Failed to join office');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Switch Office</DialogTitle>
            <DialogDescription>
              Find and join a new office
            </DialogDescription>
          </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <div className="relative">
              <Input
                placeholder="Search for office name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {searchTerm.trim().length === 0 
                ? "Start typing to search for offices (minimum 2 characters)"
                : searchTerm.trim().length < 2
                ? "Type at least 2 characters to search"
                : agencies.length > 0
                ? `Found ${agencies.length} office${agencies.length === 1 ? '' : 's'}`
                : searching
                ? "Searching..."
                : "No offices found - try a different search term"}
            </p>
          </div>

          {/* Results */}
          {agencies.length > 0 && (
            <div className="space-y-3">
              {agencies.map((agency) => (
                <Card key={agency.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-primary" />
                        <div>
                          <div className="font-semibold">{agency.name}</div>
                          <div className="text-sm text-muted-foreground">{agency.bio || 'No description'}</div>
                        </div>
                      </div>
                      <Button onClick={() => handleJoinOffice(agency.id, agency.name)}>
                        Join Office
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {agencies.length === 0 && searchTerm.trim().length >= 2 && !searching && (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No offices found matching "{searchTerm}"</p>
              <p className="text-xs mt-2">Try searching for: "Ray White", "Harcourts", or another agency name</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog */}
    <AlertDialog 
      open={confirmDialog?.open || false} 
      onOpenChange={(open) => !open && setConfirmDialog(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <AlertDialogTitle>{confirmDialog?.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base">
            {confirmDialog?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDialog?.onConfirm}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
