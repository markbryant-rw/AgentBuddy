import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { usePresence } from '@/hooks/usePresence';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BugReportDialog } from '@/components/feedback/BugReportDialog';
import { FeatureRequestDialog } from '@/components/feedback/FeatureRequestDialog';
import { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Users, Settings, LogOut, ChevronDown, Lightbulb, Bug, Circle, RefreshCw, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { refetchTeamData } from '@/lib/cacheUtils';
import { memo } from 'react';

const UserMenuDropdownComponent = () => {
  const navigate = useNavigate();
  const { user, signOut, isViewingAs, stopViewingAs } = useAuth();
  const { profile, loading } = useProfile();
  const { myPresence, updatePresence } = usePresence();
  const queryClient = useQueryClient();
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [featureRequestOpen, setFeatureRequestOpen] = useState(false);

  const handleRefreshData = async () => {
    try {
      toast.loading('Refreshing session...');
      await supabase.auth.refreshSession();
      queryClient.invalidateQueries();
      toast.dismiss();
      toast.success('Session refreshed!');
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to refresh session');
      console.error('Refresh error:', error);
    }
  };

  const handleForceRefreshTeamData = () => {
    try {
      toast.loading('Clearing cache and refreshing data...');
      refetchTeamData();
      toast.dismiss();
      toast.success('Team data refreshed! Your data should now be visible.');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to refresh team data');
      console.error('Refresh error:', error);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = user?.email ? getInitials(profile?.full_name, user.email) : 'U';

  const presenceColors = {
    active: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-400',
    focus: 'bg-purple-500',
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${presenceColors[myPresence]}`} />
          </div>
          <span className="hidden lg:inline">{displayName}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
              {profile?.total_bug_points ? (
                <Badge variant="secondary" className="text-xs">
                  🐛 {profile.total_bug_points}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        
        <RoleSwitcher />
        
        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Circle className={`mr-2 h-4 w-4 fill-current ${presenceColors[myPresence].replace('bg-', 'text-')}`} />
            Presence
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => updatePresence('active')}>
              <Circle className="mr-2 h-4 w-4 fill-current text-green-500" />
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updatePresence('away')}>
              <Circle className="mr-2 h-4 w-4 fill-current text-yellow-500" />
              Away
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updatePresence('focus')}>
              <Circle className="mr-2 h-4 w-4 fill-current text-purple-500" />
              Focus Mode
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updatePresence('offline')}>
              <Circle className="mr-2 h-4 w-4 fill-current text-gray-400" />
              Appear Offline
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        
        {isViewingAs && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={stopViewingAs}
              className="text-amber-600 focus:text-amber-600 font-semibold"
            >
              <Eye className="mr-2 h-4 w-4" />
              Exit View Mode
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate('/setup')}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => setFeatureRequestOpen(true)}>
              <Lightbulb className="mr-2 h-4 w-4" />
              Suggest Feature
            </DropdownMenuItem>

        <DropdownMenuItem onClick={() => setBugReportOpen(true)}>
          <Bug className="mr-2 h-4 w-4" />
          Report Bug
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleRefreshData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Session
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleForceRefreshTeamData} className="text-primary">
          <RefreshCw className="mr-2 h-4 w-4" />
          Force Refresh Team Data
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
      
      <BugReportDialog open={bugReportOpen} onOpenChange={setBugReportOpen} />
      <FeatureRequestDialog open={featureRequestOpen} onOpenChange={setFeatureRequestOpen} />
    </DropdownMenu>
  );
};

export const UserMenuDropdown = memo(UserMenuDropdownComponent);
