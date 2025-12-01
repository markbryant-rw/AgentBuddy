import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { X, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RoleBadge } from '@/components/RoleBadge';

export const ViewAsBanner = () => {
  const { isViewingAs, viewAsUser, stopViewingAs } = useAuth();

  const { data: userTeam } = useQuery({
    queryKey: ['viewAsUserTeam', viewAsUser?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('team_members')
        .select('teams(name)')
        .eq('user_id', viewAsUser!.id)
        .single();
      return data?.teams?.name || 'No Team';
    },
    enabled: !!viewAsUser,
  });

  const { data: accessLevel } = useQuery({
    queryKey: ['viewAsUserRole', viewAsUser?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('team_members')
        .select('access_level')
        .eq('user_id', viewAsUser!.id)
        .single();
      return data?.access_level;
    },
    enabled: !!viewAsUser,
  });

  if (!isViewingAs || !viewAsUser) return null;

  return (
    <Alert className="fixed top-0 left-0 right-0 z-40 rounded-none border-x-0 border-t-0 bg-amber-500/95 text-white border-amber-600 backdrop-blur supports-[backdrop-filter]:bg-amber-500/90">
      <Eye className="h-4 w-4 text-white" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-semibold">
            🔍 Viewing as: {viewAsUser.user_metadata?.full_name || viewAsUser.email}
            {userTeam && <span className="ml-2 text-amber-200">({userTeam})</span>}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-amber-100 text-xs">{viewAsUser.email}</span>
            {accessLevel && (
              <RoleBadge role={accessLevel} size="sm" />
            )}
          </div>
        </div>
        <Button
          onClick={stopViewingAs}
          variant="ghost"
          size="sm"
          className="text-white hover:bg-amber-600 hover:text-white"
        >
          <X className="h-4 w-4 mr-1" />
          Exit View Mode
        </Button>
      </AlertDescription>
    </Alert>
  );
};
