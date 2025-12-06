import { PageHeaderWithBack } from '@/components/PageHeaderWithBack';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, Search, UserPlus, Mail, Building2, Shield, Wrench, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { RepairUserDialog } from '@/components/platform/RepairUserDialog';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  created_at: string;
  office_id: string | null;
  primary_team_id: string | null;
  status?: string;
  office_name?: string;
  team_name?: string;
  user_roles?: Array<{ role: string }>;
}

const PAGE_SIZE = 20;

export default function UsersPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [selectedUserForRepair, setSelectedUserForRepair] = useState<UserProfile | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['platform-admin-users'],
    queryFn: async () => {
      // Get all users with their profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          created_at,
          office_id,
          primary_team_id,
          status
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get office names
      const officeIds = [...new Set(profiles?.map(p => p.office_id).filter(Boolean))];
      const { data: offices } = await supabase
        .from('agencies')
        .select('id, name')
        .in('id', officeIds);

      // Get team names
      const teamIds = [...new Set(profiles?.map(p => p.primary_team_id).filter(Boolean))];
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds);

      // Get user roles
      const userIds = profiles?.map(p => p.id) || [];
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds)
        .is('revoked_at', null);

      // Combine the data
      return profiles?.map(profile => ({
        ...profile,
        office_name: offices?.find(o => o.id === profile.office_id)?.name,
        team_name: teams?.find(t => t.id === profile.primary_team_id)?.name,
        user_roles: userRoles?.filter(r => r.user_id === profile.id).map(r => ({ role: r.role })) || []
      })) as UserProfile[];
    }
  });

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.full_name?.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.office_name?.toLowerCase().includes(query) ||
      user.team_name?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      platform_admin: 'Platform Admin',
      office_manager: 'Office Manager',
      team_leader: 'Team Leader',
      salesperson: 'Salesperson',
      assistant: 'Assistant'
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    if (role === 'platform_admin') return 'destructive';
    if (role === 'office_manager') return 'default';
    if (role === 'team_leader') return 'secondary';
    return 'outline';
  };

  const isOrphaned = (user: UserProfile) => {
    return !user.office_id || !user.primary_team_id;
  };

  const handleRepairClick = (user: UserProfile) => {
    setSelectedUserForRepair(user);
    setRepairDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeaderWithBack
        title="Users Management"
        description="View and manage all users across the platform"
        backPath="/platform-admin"
      />
      
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Users
                  <Badge variant="secondary" className="ml-2">
                    {filteredUsers.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Manage users, roles, and permissions across all offices
                </CardDescription>
              </div>
              <Button onClick={() => navigate('/platform-admin/users/invite')}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, office, or team..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Users List */}
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No users found matching your search' : 'No users found'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {paginatedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user.avatar_url || ''} />
                            <AvatarFallback>
                              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold truncate">
                                {user.full_name || 'No name set'}
                              </h4>
                              {user.user_roles && user.user_roles.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {user.user_roles.map((roleObj, idx) => (
                                    <Badge
                                      key={idx}
                                      variant={getRoleBadgeVariant(roleObj.role)}
                                      className="text-xs"
                                    >
                                      <Shield className="h-3 w-3 mr-1" />
                                      {getRoleLabel(roleObj.role)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </span>
                              {user.office_name && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {user.office_name}
                                </span>
                              )}
                              {user.team_name && (
                                <span className="text-xs px-2 py-0.5 bg-muted rounded">
                                  {user.team_name}
                                </span>
                              )}
                            </div>
                            
                            <div className="text-xs text-muted-foreground mt-1">
                              Joined {format(new Date(user.created_at), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isOrphaned(user) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleRepairClick(user)}
                              className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                            >
                              <Wrench className="mr-2 h-4 w-4" />
                              Repair
                            </Button>
                          )}
                          {user.status === 'inactive' && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Inactive
                            </Badge>
                          )}
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1 px-2">
                        <span className="text-sm font-medium">{currentPage}</span>
                        <span className="text-sm text-muted-foreground">of</span>
                        <span className="text-sm font-medium">{totalPages}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Repair User Dialog */}
      <RepairUserDialog
        open={repairDialogOpen}
        onOpenChange={setRepairDialogOpen}
        user={selectedUserForRepair}
      />
    </div>
  );
}
