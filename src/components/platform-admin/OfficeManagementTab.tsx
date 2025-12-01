import { usePlatformOffices } from '@/hooks/usePlatformOffices';
import { OfficeCard } from '@/components/platform-admin/OfficeCard';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, Building2, Users, Shield, Users2, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlatformStatsCard } from '@/components/platform/PlatformStatsCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const OfficeManagementTab = () => {
  const navigate = useNavigate();
  const { data: offices, isLoading, error } = usePlatformOffices();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch platform-level user stats
  const { data: platformStats, isLoading: statsLoading } = useQuery({
    queryKey: ['platform-user-stats'],
    queryFn: async () => {
      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Office managers
      const { count: officeManagers } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'office_manager')
        .is('revoked_at', null);

      // Users with primary teams (in teams)
      const { count: usersInTeams } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .not('primary_team_id', 'is', null);

      // Solo agents (no primary team)
      const { count: soloAgents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('primary_team_id', null);

      return {
        totalUsers: totalUsers || 0,
        officeManagers: officeManagers || 0,
        usersInTeams: usersInTeams || 0,
        soloAgents: soloAgents || 0,
      };
    },
  });

  const filteredOffices = offices?.filter(office =>
    office.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    office.active_users > 0
  ) || [];

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error loading offices: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Metrics */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <PlatformStatsCard
            title="Total Users"
            value={platformStats?.totalUsers || 0}
            icon={Users}
            subtitle="Active users"
          />
          <PlatformStatsCard
            title="Office Managers"
            value={platformStats?.officeManagers || 0}
            icon={Shield}
            subtitle="Admins"
          />
          <PlatformStatsCard
            title="In Teams"
            value={platformStats?.usersInTeams || 0}
            icon={Users2}
            subtitle="Team members"
          />
          <PlatformStatsCard
            title="Solo Agents"
            value={platformStats?.soloAgents || 0}
            icon={UserCircle}
            subtitle="Independent users"
          />
        </div>
      )}

      {/* Search & Actions */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search offices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Button
          onClick={() => navigate('/platform-admin/offices/create')}
          className="gap-2"
        >
          <Building2 className="h-4 w-4" />
          Add Office
        </Button>
      </div>

      {/* Office Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredOffices.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? 'No offices found matching your search' : 'No offices found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOffices.map((office) => (
            <OfficeCard
              key={office.id}
              office={office}
              onClick={() => navigate(`/platform-admin/users/office/${office.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
